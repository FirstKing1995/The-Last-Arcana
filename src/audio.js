// Efeitos sonoros sintetizados com WebAudio (sem arquivos externos).
let ac = null;
let master = null;

let muted = false;
export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.45;
  return muted;
}
export function isMuted() { return muted; }

// Amostras CC0 (Kenney: RPG Audio e Impact Sounds) em assets/sfx.
// Se o navegador não decodificar .ogg, cada efeito usa a versão sintetizada.
const SAMPLES = {
  swing: ['swing1', 'swing2'], heavy: ['heavy'], hit: ['hit1', 'hit2'], hitHeavy: ['hitheavy'], blade: ['blade1', 'blade2', 'blade3'],
  mobHurt: ['mobhurt1', 'mobhurt2'], mobDie: ['mobdie'], roar: ['roar1', 'roar2'], fire: ['fire1', 'fire2'], explode: ['explode'], chain: ['chain1', 'chain2'], gem: ['gem'], stones: ['stones'], guard: ['guard'],
  parry: ['parry'], bell: ['bell1', 'bell2'], land: ['land'], hurt: ['hurt'], breakWall: ['break'], chest: ['chest'],
  coins: ['coins'], dodge: ['dodge'], ui: ['ui'], step: ['step1', 'step2'],
};
const buffers = {};
function loadSamples() {
  const names = new Set(Object.values(SAMPLES).flat());
  for (const n of names) {
    fetch(`assets/sfx/${n}.ogg`).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject()))
      .then((b) => new Promise((res, rej) => ac.decodeAudioData(b, res, rej)))
      .then((buf) => { buffers[n] = buf; }).catch(() => {});
  }
}
function sample(key, vol = 0.5, rate = 1) {
  const list = SAMPLES[key];
  if (!ac || !list) return false;
  const buf = buffers[list[Math.floor(Math.random() * list.length)]];
  if (!buf) return false;
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate * (0.94 + Math.random() * 0.12);
  src.connect(out(vol));
  src.start();
  return true;
}

// ---------- trilha ambiente procedural: drone grave, sinos distantes; pulso na luta contra o chefe ----------
let music = null, musicMode = 'explore';
function startMusic() {
  const bus = ac.createGain(); bus.gain.value = 0.0; bus.connect(master);
  bus.gain.linearRampToValueAtTime(0.12, ac.currentTime + 4);
  const filt = ac.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 380; filt.connect(bus);
  const drones = [55, 82.4, 110.6].map((f, i) => {
    const o = ac.createOscillator(); o.type = i === 1 ? 'triangle' : 'sawtooth'; o.frequency.value = f;
    const g = ac.createGain(); g.gain.value = i === 0 ? 0.05 : 0.025;
    o.connect(g); g.connect(filt); o.start();
    return o;
  });
  const lfo = ac.createOscillator(); lfo.frequency.value = 0.05;
  const lg = ac.createGain(); lg.gain.value = 160; lfo.connect(lg); lg.connect(filt.frequency); lfo.start();
  const pulse = ac.createGain(); pulse.gain.value = 0; pulse.connect(bus);
  music = { bus, filt, drones, pulse, next: ac.currentTime + 6, beat: 0 };
  setInterval(tickMusic, 250);
}
function tickMusic() {
  if (!music || !ac || ac.state !== 'running') return;
  const now = ac.currentTime;
  if (musicMode === 'boss') {
    // pulso de tambor grave a ~100 bpm
    if (now >= music.next) {
      music.next = now + 0.6;
      music.beat++;
      tone(music.beat % 4 === 0 ? 55 : 49, 'sine', 0.35, 0.09, 30);
      if (music.beat % 8 === 4) tone(220, 'triangle', 0.5, 0.02, 207);
    }
  } else if (now >= music.next) {
    // sino distante e uma nota de pad em lá menor
    music.next = now + 9 + Math.random() * 10;
    const notes = [220, 261.6, 329.6, 196, 174.6];
    tone(notes[Math.floor(Math.random() * notes.length)], 'sine', 4, 0.018);
    if (Math.random() < 0.5) setTimeout(() => sfx.bell(98 + Math.random() * 30, 0.025), 1500);
  }
}
// Trilha gravada (CC0): ambiente do vale, da cripta e da luta. Troca com cruzamento suave.
const TRACKS = { explore: ['cinzas', 0.5], crypt: ['cripta', 0.55], boss: ['batalha', 0.42] };
const tr = {};
function playTrack(mode) {
  for (const k in TRACKS) {
    let a = tr[k];
    if (!a && k === mode) {
      a = tr[k] = { el: new Audio(`assets/musica/${TRACKS[k][0]}.mp3`), v: 0 };
      a.el.loop = true; a.el.volume = 0; a.el.preload = 'auto';
    }
    if (!a) continue;
    a.want = k === mode && !muted ? TRACKS[k][1] : 0;
    if (a.want > 0 && a.el.paused) a.el.play().catch(() => {});
  }
}
setInterval(() => {
  for (const k in tr) {
    const a = tr[k];
    if (muted) a.want = 0; else if (k === musicMode && ac) a.want = TRACKS[k][1];
    a.v += (a.want - a.v) * 0.12;
    if (Math.abs(a.v - a.want) < 0.005) a.v = a.want;
    a.el.volume = Math.max(0, Math.min(1, a.v));
    if (a.v === 0 && a.want === 0 && !a.el.paused) a.el.pause(); else if (a.want > 0 && a.el.paused && ac && ac.state === 'running') a.el.play().catch(() => {});
  }
}, 120);
document.addEventListener('visibilitychange', () => { if (document.hidden) for (const k in tr) tr[k].el.pause(); });
export function setMusicMode(mode) {
  if (mode === musicMode && tr[mode]) return;
  musicMode = mode;
  if (ac) playTrack(mode);
  if (!music) return;
  const t = ac.currentTime;
  music.filt.frequency.cancelScheduledValues(t);
  music.filt.frequency.linearRampToValueAtTime(mode === 'boss' ? 700 : mode === 'crypt' ? 220 : 380, t + 2);
  music.next = t + 0.5;
}

export function initAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  master = ac.createGain();
  master.gain.value = muted ? 0 : 0.45;
  master.connect(ac.destination);
  startWind();
  loadSamples();
  startMusic();
  playTrack(musicMode);
}

function out(vol) {
  const g = ac.createGain();
  g.gain.value = vol;
  g.connect(master);
  return g;
}

function tone(freq, type, dur, vol, slideTo, delay = 0) {
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const o = ac.createOscillator();
  const g = out(0);
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

let noiseBuf = null;
function getNoise() {
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

function noise(dur, vol, freq, type = 'lowpass', delay = 0) {
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const s = ac.createBufferSource();
  s.buffer = getNoise();
  const f = ac.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  const g = out(0);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f); f.connect(g);
  s.start(t0, Math.random());
  s.stop(t0 + dur + 0.05);
}

function startWind() {
  const s = ac.createBufferSource();
  s.buffer = getNoise();
  s.loop = true;
  const f = ac.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 260;
  const g = out(0.05);
  const lfo = ac.createOscillator();
  const lg = ac.createGain();
  lfo.frequency.value = 0.12;
  lg.gain.value = 0.03;
  lfo.connect(lg); lg.connect(g.gain);
  s.connect(f); f.connect(g);
  s.start(); lfo.start();
}

export const sfx = {
  swing() { if (!sample('swing', 0.32)) noise(0.09, 0.18, 2600, 'bandpass'); },
  heavy() { if (!sample('heavy', 0.4, 0.85)) { noise(0.18, 0.25, 900, 'bandpass'); tone(90, 'sawtooth', 0.15, 0.06, 50); } },
  charge() { tone(200, 'triangle', 0.3, 0.05, 420); },
  hit() { sample('blade', 0.22, 1.05); if (!sample('hit', 0.45)) { noise(0.07, 0.35, 1400); tone(160, 'square', 0.07, 0.07, 70); } },
  hitHeavy() { sample('blade', 0.3, 0.85); if (!sample('hitHeavy', 0.55)) sfx.hit(); },
  guard() { if (!sample('guard', 0.45)) { tone(520, 'square', 0.06, 0.06, 300); noise(0.05, 0.2, 3000, 'highpass'); } },
  parry() { sample('parry', 0.5, 1.2); tone(1500, 'triangle', 0.35, 0.14); tone(2250, 'sine', 0.4, 0.1); },
  dodge() { if (!sample('dodge', 0.35)) noise(0.16, 0.12, 700); },
  perfect() { tone(880, 'sine', 0.25, 0.08, 1320); },
  hurt() { sample('hurt', 0.55, 0.8); tone(220, 'sawtooth', 0.2, 0.1, 80); },
  jump() { tone(260, 'triangle', 0.08, 0.04, 420); },
  land() { if (!sample('land', 0.3)) noise(0.06, 0.12, 400); },
  step() { sample('step', 0.08, 0.9); },
  heal() { tone(440, 'sine', 0.5, 0.06, 660); tone(660, 'sine', 0.6, 0.04, 990, 0.1); },
  fire() { if (sample('fire', 0.4)) return; noise(0.25, 0.22, 1200, 'bandpass'); tone(300, 'sawtooth', 0.18, 0.05, 120); },
  burn() { noise(0.08, 0.06, 1800, 'bandpass'); },
  explode() { sample('explode', 0.4); noise(0.45, 0.45, 500); tone(80, 'sine', 0.4, 0.2, 35); },
  caw() { tone(900, 'sawtooth', 0.09, 0.05, 500); tone(800, 'sawtooth', 0.09, 0.05, 450, 0.12); },
  bell(base = 196, vol = 0.12) {
    if (!sample('bell', Math.min(0.6, vol * 4), base / 196)) [1, 2.76, 5.4, 8.93].forEach((m, i) => tone(base * m, 'sine', 2.4 / (i + 1), vol / (i + 1)));
  },
  crackedBell() { sfx.bell(147, 0.14); noise(0.4, 0.12, 2500, 'bandpass'); },
  rest() { sfx.bell(330, 0.06); tone(523, 'sine', 1.2, 0.05, 523, 0.2); },
  death() { tone(330, 'sine', 1.8, 0.1, 110); noise(1.2, 0.15, 600); },
  ui() { if (!sample('ui', 0.3)) tone(660, 'square', 0.05, 0.04); },
  coins() { if (!sample('coins', 0.35)) tone(1200, 'square', 0.05, 0.03); },
  chest() { sample('chest', 0.4); tone(392, 'triangle', 0.15, 0.06); tone(523, 'triangle', 0.2, 0.06, null, 0.12); tone(784, 'triangle', 0.4, 0.06, null, 0.24); },
  breakWall() { if (!sample('breakWall', 0.5)) { noise(0.5, 0.4, 700); tone(120, 'square', 0.2, 0.06, 40); } },
  mobHurt() { sample('mobHurt', 0.16, 0.9); },
  mobDie() { sample('mobDie', 0.3, 0.85); sample('stones', 0.18); },
  chain() { sample('chain', 0.4); },
  roar() { sample('roar', 0.55, 0.8); tone(120, 'sawtooth', 0.8, 0.1, 60); noise(0.8, 0.2, 400); },
  victory() { [262, 330, 392, 523].forEach((f, i) => tone(f, 'triangle', 1.2, 0.06, null, i * 0.18)); sfx.bell(262, 0.08); },
};
