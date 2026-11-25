// Controles de toque para celular na horizontal: analógico à esquerda, botões à direita.
import { Input } from './input.js';

const CSS = `
#touch { position: fixed; inset: 0; pointer-events: none; z-index: 5; display: none;
  -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; touch-action: none;
  font-family: Silkscreen, monospace; }
#touch.on { display: block; }
#touch .zone { position: absolute; left: 0; bottom: 0; width: 42%; height: 78%; pointer-events: auto; touch-action: none; }
#touch .stick { position: absolute; width: 96px; height: 96px; margin: -48px 0 0 -48px; border-radius: 50%;
  border: 2px solid rgba(217,181,138,.35); background: rgba(20,18,22,.25); display: none; }
#touch .knob { position: absolute; left: 50%; top: 50%; width: 42px; height: 42px; margin: -21px 0 0 -21px; border-radius: 50%;
  background: rgba(217,181,138,.45); }
#touch .hint { position: absolute; left: calc(env(safe-area-inset-left, 0px) + 28px); bottom: calc(env(safe-area-inset-bottom, 0px) + 22px);
  color: rgba(217,181,138,.35); font-size: 11px; }
#touch .b { position: absolute; pointer-events: auto; touch-action: none; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; text-align: center; line-height: 1;
  color: #f0e6d6; font-size: 10px; letter-spacing: .02em;
  background: rgba(30,27,32,.55); border: 2px solid rgba(217,181,138,.45); }
#touch .b.big { width: 66px; height: 66px; font-size: 12px; }
#touch .b.mid { width: 54px; height: 54px; }
#touch .b.sm { width: 40px; height: 40px; font-size: 10px; }
#touch .b.down { background: rgba(217,181,138,.5); color: #1a1719; }
#touch .b.atk { border-color: rgba(225,122,61,.7); }
#touch .b.par { border-color: rgba(255,210,58,.7); }
#rotate { position: fixed; inset: 0; z-index: 10; display: none; align-items: center; justify-content: center; flex-direction: column; gap: 12px;
  background: #0d0c0f; color: #d9b58a; font: 15px monospace; text-align: center; padding: 24px; }
#rotate .ph { width: 34px; height: 58px; border: 3px solid #d9b58a; border-radius: 6px; animation: rot 2s ease-in-out infinite; }
@keyframes rot { 0%, 30% { transform: rotate(0); } 60%, 100% { transform: rotate(-90deg); } }
@media (prefers-reduced-motion: reduce) { #rotate .ph { animation: none; transform: rotate(-90deg); } }
@media (orientation: portrait) { body.touch #rotate { display: flex; } }
`;

// [rótulo, ações, classe, right, bottom] — posições em px a partir do canto inferior direito
const BUTTONS = [
  ['PULAR', ['jump', 'confirm'], 'big', 18, 18],
  ['ATACAR', ['light'], 'big atk', 96, 30],
  ['ESQUIVA', ['dodge'], 'mid', 22, 100],
  ['PESADO', ['heavy'], 'mid atk', 178, 24],
  ['APARAR', ['parry'], 'mid par', 104, 118],
  ['E', ['interact', 'confirm'], 'sm', 184, 98],
  ['POÇÃO', ['potion'], 'sm', 244, 74],
  ['TIPO', ['nextpotion'], 'sm', 244, 22],
];
const TOP = [
  ['❚❚', ['pause'], 12],
  ['INV', ['inventory'], 62],
  ['⇄', ['swap'], 112],
  ['ARC', ['ability'], 162],
  ['ITEM', ['item'], 212],
  ['MAPA', ['map'], 262],
];

function makeButton(root, label, actions, cls, style) {
  const b = document.createElement('div');
  b.className = 'b ' + cls;
  b.textContent = label;
  Object.assign(b.style, style);
  const ids = new Set();
  const down = (e) => {
    e.preventDefault();
    ids.add(e.pointerId);
    try { b.setPointerCapture(e.pointerId); } catch (_) {}
    b.classList.add('down');
    Input.virtualPress(actions);
  };
  const up = (e) => {
    if (!ids.delete(e.pointerId)) return;
    if (ids.size === 0) { b.classList.remove('down'); Input.virtualRelease(actions); }
  };
  b.addEventListener('pointerdown', down);
  b.addEventListener('pointerup', up);
  b.addEventListener('pointercancel', up);
  b.addEventListener('lostpointercapture', up);
  b.addEventListener('contextmenu', (e) => e.preventDefault());
  root.appendChild(b);
}

function makeStick(root) {
  const zone = document.createElement('div');
  zone.className = 'zone';
  const stick = document.createElement('div');
  stick.className = 'stick';
  const knob = document.createElement('div');
  knob.className = 'knob';
  stick.appendChild(knob);
  zone.appendChild(stick);
  const hint = document.createElement('div');
  hint.className = 'hint';
  hint.textContent = '◀ arraste para mover ▶';
  root.appendChild(zone);
  root.appendChild(hint);
  let id = null, ox = 0, oy = 0;
  const set = (dx, dy) => {
    const len = Math.hypot(dx, dy), max = 34;
    const k = len > max ? max / len : 1;
    knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    Input.virtualHold('left', dx < -12);
    Input.virtualHold('right', dx > 12);
    Input.virtualHold('down', dy > 26);
  };
  zone.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (id !== null) return;
    id = e.pointerId; ox = e.clientX; oy = e.clientY;
    try { zone.setPointerCapture(id); } catch (_) {}
    const r = zone.getBoundingClientRect();
    stick.style.left = (ox - r.left) + 'px'; stick.style.top = (oy - r.top) + 'px';
    stick.style.display = 'block'; hint.style.display = 'none';
    set(0, 0);
    Input.onAny && Input.onAny();
  });
  zone.addEventListener('pointermove', (e) => { if (e.pointerId === id) set(e.clientX - ox, e.clientY - oy); });
  const end = (e) => {
    if (e.pointerId !== id) return;
    id = null; stick.style.display = 'none';
    set(0, 0);
  };
  zone.addEventListener('pointerup', end);
  zone.addEventListener('pointercancel', end);
  zone.addEventListener('lostpointercapture', end);
}

export function isTouchDevice() {
  return (window.matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
}

export function setupTouch(onFirstTouch) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const rotate = document.createElement('div');
  rotate.id = 'rotate';
  rotate.innerHTML = '<div class="ph"></div><div>Gire o celular para jogar<br>com a tela deitada</div>';
  document.body.appendChild(rotate);

  const root = document.createElement('div');
  root.id = 'touch';
  document.body.appendChild(root);
  makeStick(root);
  const safeR = 'env(safe-area-inset-right, 0px)', safeB = 'env(safe-area-inset-bottom, 0px)', safeT = 'env(safe-area-inset-top, 0px)';
  for (const [label, acts, cls, r, b] of BUTTONS) {
    makeButton(root, label, acts, cls, { right: `calc(${safeR} + ${r}px)`, bottom: `calc(${safeB} + ${b}px)` });
  }
  for (const [label, acts, r] of TOP) {
    makeButton(root, label, acts, 'sm', { right: `calc(${safeR} + ${r}px)`, top: `calc(${safeT} + 10px)` });
  }

  const enable = () => {
    if (Input.touchMode) return;
    Input.touchMode = true;
    root.classList.add('on');
    document.body.classList.add('touch');
    onFirstTouch && onFirstTouch();
  };
  if (isTouchDevice()) enable();
  window.addEventListener('touchstart', enable, { passive: true });
  // Teclado físico volta a esconder os botões
  window.addEventListener('keydown', () => {
    if (!Input.touchMode) return;
    Input.touchMode = false; root.classList.remove('on'); document.body.classList.remove('touch');
  });
}

// Tela cheia + travar na horizontal quando o navegador permite (Android). No iPhone é ignorado.
export function tryFullscreenLandscape() {
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!req || document.fullscreenElement) return;
  try {
    const p = req.call(el, { navigationUI: 'hide' });
    if (p && p.then) p.then(() => { try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}); } catch (_) {} }).catch(() => {});
  } catch (_) {}
}
