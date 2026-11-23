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

export function initAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  master = ac.createGain();
  master.gain.value = muted ? 0 : 0.45;
  master.connect(ac.destination);
  startWind();
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
  swing() { noise(0.09, 0.18, 2600, 'bandpass'); },
  heavy() { noise(0.18, 0.25, 900, 'bandpass'); tone(90, 'sawtooth', 0.15, 0.06, 50); },
  charge() { tone(200, 'triangle', 0.3, 0.05, 420); },
  hit() { noise(0.07, 0.35, 1400); tone(160, 'square', 0.07, 0.07, 70); },
  guard() { tone(520, 'square', 0.06, 0.06, 300); noise(0.05, 0.2, 3000, 'highpass'); },
  parry() { tone(1500, 'triangle', 0.35, 0.18); tone(2250, 'sine', 0.4, 0.12); noise(0.05, 0.25, 5000, 'highpass'); },
  dodge() { noise(0.16, 0.12, 700); },
  perfect() { tone(880, 'sine', 0.25, 0.08, 1320); },
  hurt() { tone(220, 'sawtooth', 0.2, 0.12, 80); noise(0.12, 0.3, 900); },
  jump() { tone(260, 'triangle', 0.08, 0.04, 420); },
  land() { noise(0.06, 0.12, 400); },
  heal() { tone(440, 'sine', 0.5, 0.06, 660); tone(660, 'sine', 0.6, 0.04, 990, 0.1); },
  fire() { noise(0.25, 0.22, 1200, 'bandpass'); tone(300, 'sawtooth', 0.18, 0.05, 120); },
  burn() { noise(0.08, 0.06, 1800, 'bandpass'); },
  explode() { noise(0.45, 0.45, 500); tone(80, 'sine', 0.4, 0.2, 35); },
  caw() { tone(900, 'sawtooth', 0.09, 0.05, 500); tone(800, 'sawtooth', 0.09, 0.05, 450, 0.12); },
  bell(base = 196, vol = 0.12) {
    [1, 2.76, 5.4, 8.93].forEach((m, i) => tone(base * m, 'sine', 2.4 / (i + 1), vol / (i + 1)));
  },
  crackedBell() { sfx.bell(147, 0.14); noise(0.4, 0.12, 2500, 'bandpass'); },
  rest() { sfx.bell(330, 0.06); tone(523, 'sine', 1.2, 0.05, 523, 0.2); },
  death() { tone(330, 'sine', 1.8, 0.1, 110); noise(1.2, 0.15, 600); },
  ui() { tone(660, 'square', 0.05, 0.04); },
  chest() { tone(392, 'triangle', 0.15, 0.06); tone(523, 'triangle', 0.2, 0.06, null, 0.12); tone(784, 'triangle', 0.4, 0.06, null, 0.24); },
  breakWall() { noise(0.5, 0.4, 700); tone(120, 'square', 0.2, 0.06, 40); },
  roar() { tone(120, 'sawtooth', 0.8, 0.1, 60); noise(0.8, 0.2, 400); },
  victory() { [262, 330, 392, 523].forEach((f, i) => tone(f, 'triangle', 1.2, 0.06, null, i * 0.18)); sfx.bell(262, 0.08); },
};
