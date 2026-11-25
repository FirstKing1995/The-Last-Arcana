// Entrada de teclado e controle, com buffer curto de comandos.
const BIND = {
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  down: ['KeyS', 'ArrowDown'],
  jump: ['Space', 'KeyW', 'ArrowUp'],
  dodge: ['ShiftLeft', 'ShiftRight'],
  light: ['KeyJ', 'KeyZ', 'Mouse0'],
  heavy: ['KeyK', 'KeyX', 'Mouse2'],
  nextweapon: ['KeyT'],
  parry: ['KeyL', 'Mouse1'],
  potion: ['KeyQ'],
  interact: ['KeyE'],
  nextpotion: ['KeyR'],
  map: ['KeyN'],
  ability: ['KeyF'],
  swap: ['Tab'],
  pause: ['Escape', 'KeyP'],
  item: ['KeyC'],
  cycle: ['KeyV'],
  inventory: ['KeyI'],
  up: ['KeyW', 'ArrowUp'],
  mute: ['KeyM'],
  confirm: ['Enter', 'KeyE', 'KeyJ', 'Space', 'Mouse0'],
};

// Controle padrão (Xbox/PS): botão -> ação
const PAD = {
  0: ['jump', 'confirm'], 1: ['dodge'], 2: ['light'], 3: ['heavy'],
  4: ['parry'], 5: ['ability'], 6: ['nextpotion'], 7: ['interact', 'confirm'],
  8: ['inventory'], 9: ['pause'], 10: ['item'], 11: ['nextweapon'], 12: ['swap', 'up'], 13: ['potion'], 14: ['left'], 15: ['right'],
};

const codeDown = new Set();
const padDown = new Set();
const virtDown = new Set(); // controles de toque
const pressTime = {};
const now = () => performance.now() / 1000;

function actionsFor(code) {
  const out = [];
  for (const a in BIND) if (BIND[a].includes(code)) out.push(a);
  return out;
}

window.addEventListener('keydown', (e) => {
  if (Input.interceptor && !e.repeat && Input.interceptor(e.code)) { e.preventDefault(); return; }
  const acts = actionsFor(e.code);
  if (acts.length) e.preventDefault();
  if (e.repeat) return;
  codeDown.add(e.code);
  for (const a of acts) pressTime[a] = now();
  Input.onAny && Input.onAny();
});
window.addEventListener('keyup', (e) => { codeDown.delete(e.code); });
// Mouse: esquerdo ataca, direito golpe pesado, meio apara, roda troca de arma
window.addEventListener('mousedown', (e) => {
  if (Input.touchMode || !Input.mouseOn || !Input.mouseOn(e)) return;
  e.preventDefault();
  const code = 'Mouse' + e.button;
  codeDown.add(code);
  for (const a of actionsFor(code)) pressTime[a] = now();
  Input.onAny && Input.onAny();
});
window.addEventListener('mouseup', (e) => { codeDown.delete('Mouse' + e.button); });
window.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('wheel', (e) => { if (Input.mouseOn && Input.mouseOn(e) && Math.abs(e.deltaY) > 10) pressTime.nextweapon = now(); }, { passive: true });
window.addEventListener('blur', () => { codeDown.clear(); padDown.clear(); virtDown.clear(); });
window.addEventListener('pointerdown', () => { Input.onAny && Input.onAny(); });

export const Input = {
  onAny: null,
  interceptor: null,
  mouseOn: null,
  down(a) {
    if (BIND[a] && BIND[a].some((c) => codeDown.has(c))) return true;
    return padDown.has(a) || virtDown.has(a);
  },
  touchMode: false,
  virtualPress(actions) {
    for (const a of actions) { if (!virtDown.has(a)) pressTime[a] = now(); virtDown.add(a); }
    Input.onAny && Input.onAny();
  },
  virtualRelease(actions) { for (const a of actions) virtDown.delete(a); },
  soltaTudo() { virtDown.clear(); },
  virtualHold(a, on) { if (on) virtDown.add(a); else virtDown.delete(a); },
  pressed(a, buffer = 0.14) {
    const t = pressTime[a];
    return t !== undefined && now() - t <= buffer;
  },
  consume(a) { delete pressTime[a]; },
  clear() { for (const k in pressTime) delete pressTime[k]; },
  pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads && Array.from(pads).find((p) => p);
    if (!pad) return;
    const next = new Set();
    pad.buttons.forEach((b, i) => { if (b.pressed && PAD[i]) PAD[i].forEach((a) => next.add(a)); });
    const ax = pad.axes[0] || 0;
    if (ax < -0.4) next.add('left');
    if (ax > 0.4) next.add('right');
    if ((pad.axes[1] || 0) > 0.6) next.add('down');
    for (const a of next) if (!padDown.has(a)) { pressTime[a] = now(); Input.onAny && Input.onAny(); }
    padDown.clear();
    for (const a of next) padDown.add(a);
  },
};
