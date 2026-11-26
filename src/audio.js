// Efeitos sonoros sintetizados com WebAudio (sem arquivos externos).
import { cfg, onCfg } from './config.js';
let ac = null;
let master = null, sfxBus = null, musBus = null, rev = null, revG = null;
let abafado = false;

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
  const bus = ac.createGain(); bus.gain.value = 0.0; bus.connect(musBus);
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
    a.el.volume = Math.max(0, Math.min(1, a.v * cfg.vmus * (abafado ? 0.35 : 1)));
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
  musBus = ac.createGain(); musBus.connect(master); musBus.gain.value = cfg.vmus;
  sfxBus = ac.createGain(); sfxBus.connect(master); sfxBus.gain.value = cfg.vsfx;
  // eco de pedra: só entra quando há teto por cima
  rev = ac.createConvolver(); const n = ac.sampleRate * 2.2, ib = ac.createBuffer(2, n, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ib.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2) * (i < 900 ? i / 900 : 1); }
  rev.buffer = ib; revG = ac.createGain(); revG.gain.value = 0; sfxBus.connect(rev); rev.connect(revG); revG.connect(master);
  onCfg(() => { musBus.gain.value = cfg.vmus; sfxBus.gain.value = cfg.vsfx; });
  startWind(); startAmb();
  loadSamples();
  startMusic();
  playTrack(musicMode);
}

function out(vol, pan) {
  const g = ac.createGain();
  g.gain.value = vol;
  if (pan && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = Math.max(-0.8, Math.min(0.8, pan)); g.connect(p); p.connect(sfxBus); } else g.connect(sfxBus);
  return g;
}

function tone(freq, type, dur, vol, slideTo, delay = 0, pan = 0) {
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const o = ac.createOscillator();
  const g = out(0, pan);
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

function noise(dur, vol, freq, type = 'lowpass', delay = 0, pan = 0) {
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const s = ac.createBufferSource();
  s.buffer = getNoise();
  const f = ac.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  const g = out(0, pan);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f); f.connect(g);
  s.start(t0, Math.random());
  s.stop(t0 + dur + 0.05);
}

// ---------- ambiente vivo: fogo, água, goteira, corvos, sinos ao longe, coração ----------
const amb = {};
function laco(fill, seg, tipo, freq) {
  const n = ac.sampleRate * seg, b = ac.createBuffer(1, n, ac.sampleRate); fill(b.getChannelData(0), n);
  const s = ac.createBufferSource(); s.buffer = b; s.loop = true; const g = ac.createGain(); g.gain.value = 0;
  const pan = ac.createStereoPanner ? ac.createStereoPanner() : null, f = ac.createBiquadFilter(); f.type = tipo; f.frequency.value = freq;
  s.connect(f); f.connect(g); if (pan) { g.connect(pan); pan.connect(sfxBus); } else g.connect(sfxBus); s.start(0, Math.random() * seg); return { g, pan, f, s };
}
function startAmb() {
  // estalos de lenha sobre um sopro grave
  amb.fogo = laco((d, n) => { let v = 0; for (let i = 0; i < n; i++) { v = v * 0.985 + (Math.random() - 0.5) * 0.16; d[i] = v * 0.5; } for (let k = 0; k < 46; k++) { const p = Math.floor(Math.random() * (n - 900)), a = 0.25 + Math.random() * 0.75, l = 60 + Math.random() * 500; for (let i = 0; i < l; i++) d[p + i] += (Math.random() * 2 - 1) * a * Math.pow(1 - i / l, 4); } }, 3, 'highpass', 220);
  amb.agua = laco((d, n) => { let v = 0; for (let i = 0; i < n; i++) { v = v * 0.96 + (Math.random() - 0.5) * 0.3; d[i] = v * (0.6 + 0.4 * Math.sin(i / n * 6.283 * 5)); } }, 4, 'bandpass', 620);
  amb.vento = laco((d, n) => { let v = 0; for (let i = 0; i < n; i++) { v = v * 0.97 + (Math.random() - 0.5) * 0.2; d[i] = v; } }, 5, 'bandpass', 420);
  amb.gota = laco((d) => d.fill(0), 1, 'lowpass', 16000);
  // gravações reais (CC0, Freesound via Openverse) substituem as sintetizadas assim que chegam
  for (const n of ['fogo', 'vento', 'agua', 'gota']) gravacao(n).then((b) => {
    if (!b) return; const a = amb[n], s = ac.createBufferSource(); s.buffer = b; s.loop = true; s.loopStart = 0.06; s.loopEnd = b.duration - 0.06;
    a.f.type = 'lowpass'; a.f.frequency.value = 16000; s.connect(a.f); s.start(0, Math.random() * (b.duration - 1)); try { a.s.stop(); } catch (_) {} a.s = s; a.real = true;
  });
  gravacao('corvos').then((b) => { amb.corvos = b; });
}
const gravacao = (n) => fetch(`assets/amb/${n}.mp3`).then((r) => (r.ok ? r.arrayBuffer() : null)).then((b) => b && new Promise((ok) => ac.decodeAudioData(b, ok, () => ok(null)))).catch(() => null);
const vai = (p, v) => p.setTargetAtTime(v, ac.currentTime, 0.25);
let tAmb = 0, prox = { gota: 3, corvo: 6, sino: 20, forja: 0, cora: 0, ran: 12 };
export function ambiente(w, dt) {
  if (!ac || !amb.fogo || ac.state !== 'running') return;
  const p = w.player;
  tAmb -= dt;
  if (tAmb <= 0) {
    tAmb = 0.12;
    let fv = 0, fp = 0;
    for (const q of w.level.fogos || []) { const dx = q.x - p.cx(), d = Math.hypot(dx, q.y - p.cy()), v = Math.max(0, 1 - d / 190) * (q.t === 'pira' || q.t === 'forjaria' ? 1 : q.t === 'torch' ? 0.6 : 0.22); if (v > 0) { fv += v * v; fp += v * dx / 190; } }
    vai(amb.fogo.g.gain, Math.min(amb.fogo.real ? 0.5 : 0.34, fv * (amb.fogo.real ? 0.45 : 0.3)));
    vai(amb.gota.g.gain, w.inCave ? 0.13 : 0); if (amb.fogo.pan) vai(amb.fogo.pan.pan, Math.max(-0.7, Math.min(0.7, fp)));
    let av = 0; for (const [x0, x1, wy] of w.level.water || []) { const dx = Math.max(0, x0 * 16 - p.cx(), p.cx() - x1 * 16); av = Math.max(av, 1 - Math.hypot(dx, wy - p.cy()) / 240); }
    vai(amb.agua.g.gain, Math.max(0, av) * (amb.agua.real ? 0.32 : 0.16));
    const k = amb.vento.real ? 1.6 : 1; vai(amb.vento.g.gain, k * (w.inCave ? 0.02 : 0.1 + 0.07 * Math.sin(w.time * 0.35) + (p.y < 400 ? 0.08 : 0) + rajada(w.time) * 0.08));
    vai(revG.gain, w.inCave ? 0.55 : 0.1);
  }
  for (const k in prox) prox[k] -= dt;
  if (w.inCave && prox.gota < 0) { prox.gota = 0.8 + Math.random() * 3.5; tone(900 + Math.random() * 900, 'sine', 0.09, 0.03, 420 + Math.random() * 200, 0, (Math.random() - 0.5) * 1.4); }
  if (!w.inCave && !w.arenaLocked && prox.corvo < 0) { prox.corvo = 9 + Math.random() * 16; const pan = (Math.random() - 0.5) * 1.6; if (amb.corvos) { const s = ac.createBufferSource(); s.buffer = amb.corvos; s.playbackRate.value = 0.9 + Math.random() * 0.2; const o = out(0.16 + Math.random() * 0.1, pan); s.connect(o); const t0 = Math.random() * 6; s.start(0, t0, 2 + Math.random() * 2); } else for (let i = 0; i < 2 + Math.random() * 2; i++) tone(760 + Math.random() * 120, 'sawtooth', 0.12, 0.012, 470, i * 0.22, pan); }
  if (prox.sino < 0) { prox.sino = 24 + Math.random() * 30; sfx.bell(82 + Math.random() * 30, 0.018); }
  if (w.inCave && prox.ran < 0) { prox.ran = 10 + Math.random() * 18; if (Math.random() < 0.5) sample('chain', 0.06, 0.8); else noise(0.5, 0.03, 240, 'lowpass'); }
  // martelo da Ysara acompanha a animação
  const ys = w.interactables.find((i) => i.type === 'ysara');
  if (ys) { const t = performance.now() && (window.__game.time % 2.4), dx = ys.x - p.cx(), v = Math.max(0, 1 - Math.abs(dx) / 230); if (v > 0 && t < 1.5 && t % 0.5 > 0.3 && prox.forja < 0 && !w.inCave) { prox.forja = 0.3; tone(2100 + Math.random() * 200, 'triangle', 0.22, 0.05 * v * v, 1800, 0, dx / 230); noise(0.05, 0.1 * v * v, 3800, 'highpass', 0, dx / 230); } }
  const hp = p.hp / p.maxHp;
  if (!p.dead && hp < 0.3 && prox.cora < 0) { prox.cora = 0.62 + hp; tone(58, 'sine', 0.16, 0.3, 40); tone(52, 'sine', 0.18, 0.22, 36, 0.17); }
}
// rajada de vento: o mesmo pulso move o capim e o som
export const rajada = (t) => Math.max(0, Math.sin(t * 0.23) * 1.4 - 0.4) * (0.6 + 0.4 * Math.sin(t * 1.7));
export function abafar(on) { abafado = on; }

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
  // cada piso tem o seu passo
  step(piso) {
    if (piso === 'neve') { noise(0.09, 0.09, 1500 + Math.random() * 500, 'bandpass'); noise(0.05, 0.05, 3600, 'highpass', 0.03); sample('step', 0.04, 0.8); } else if (piso === 'agua') { noise(0.16, 0.16, 900 + Math.random() * 400, 'bandpass'); tone(300 + Math.random() * 120, 'sine', 0.1, 0.03, 160); } else if (piso === 'madeira') { sample('step', 0.12, 0.7); tone(130 + Math.random() * 30, 'triangle', 0.07, 0.05, 90); } else sample('step', 0.11, 0.95);
  },
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
  passa() { tone(1250, 'sine', 0.045, 0.018, 1500); },
  clica() { noise(0.03, 0.1, 2400, 'bandpass'); tone(330, 'triangle', 0.09, 0.07, 210); tone(1320, 'sine', 0.14, 0.02); },
  abre() { noise(0.16, 0.08, 1100, 'bandpass'); tone(196, 'triangle', 0.3, 0.05, 294); sample('gem', 0.14, 0.8); },
  fecha() { noise(0.1, 0.06, 800, 'bandpass'); tone(294, 'triangle', 0.2, 0.04, 180); },
  compra() { sample('coins', 0.4); tone(880, 'triangle', 0.2, 0.03, 1320); },
  forja() { for (let i = 0; i < 3; i++) { tone(1900 + i * 160, 'triangle', 0.3, 0.1, 1600, i * 0.16); noise(0.06, 0.2, 3600, 'highpass', i * 0.16); } sfx.chest(); },
  fala(quem) { const b = { Elion: 150, Morren: 210, Ysara: 290 }[quem]; if (b) tone(b * (0.92 + Math.random() * 0.2), 'triangle', 0.05, 0.028, b * 0.85); else tone(700, 'sine', 0.02, 0.008); },
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
