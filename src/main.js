import { Input } from './input.js';
import { initAudio, sfx } from './audio.js';
import { World, VW, VH } from './world.js';
import { renderWorld, text } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

function fit() {
  const s = Math.max(1, Math.floor(Math.min(window.innerWidth / VW, window.innerHeight / VH)));
  canvas.style.width = VW * s + 'px';
  canvas.style.height = VH * s + 'px';
}
window.addEventListener('resize', fit);
fit();

const CONTROLS = [
  ['A / D', 'mover'], ['W / Espaço', 'pular (S+Espaço desce)'], ['Shift', 'esquiva (segure: correr)'],
  ['J', 'ataque leve (combo)'], ['K', 'pesado (segure: carregar)'], ['L', 'aparar (parry)'],
  ['Q', 'frasco de cura'], ['R', 'feitiço do grimório'], ['F', 'habilidade do Arcano'],
  ['Tab', 'trocar Arcano'], ['E', 'interagir / finalizar'], ['Esc', 'pausa'],
];

const game = { state: 'title', world: null, time: 0, deathT: 0, titleT: 0 };
window.__game = game; // usado pelos testes automatizados

Input.onAny = () => initAudio();
let clickedStart = false;
canvas.addEventListener('pointerdown', () => {
  canvas.focus();
  if (game.state === 'title') clickedStart = true;
});

function newGame() {
  game.world = new World();
  game.state = 'play';
  Input.clear();
  game.world.toast('Converse com Elion e descanse na pira [E]', 5);
}

function update(dt) {
  game.time += dt;
  Input.pollGamepad();
  const w = game.world;
  switch (game.state) {
    case 'title':
      game.titleT += dt;
      if (game.titleT > 0.3 && (Input.pressed('confirm') || clickedStart)) { Input.consume('confirm'); clickedStart = false; initAudio(); sfx.bell(196, 0.1); newGame(); }
      break;
    case 'play': {
      if (Input.pressed('pause')) { Input.consume('pause'); game.state = 'pause'; break; }
      if (w.dialog) {
        const d = w.dialog;
        const msg = d.lines[d.i][1];
        d.chars = Math.min(msg.length, d.chars + dt * 70);
        d.age = (d.age || 0) + dt;
        if (d.age > 0.25 && Input.pressed('confirm')) {
          Input.clear();
          if (d.chars < msg.length) d.chars = msg.length;
          else if (++d.i >= d.lines.length) { w.dialog = null; d.onDone && d.onDone(); }
          else { d.chars = 0; d.age = 0; }
        }
        // Faixas e avisos continuam animando
        w.toasts.forEach((t) => (t.t += dt));
        break;
      }
      w.update(dt);
      if (w.deathPending) { game.state = 'dead'; game.deathT = 0; }
      break;
    }
    case 'pause':
      if (Input.pressed('pause') || Input.pressed('confirm')) { Input.clear(); game.state = 'play'; }
      break;
    case 'dead':
      game.deathT += dt;
      if (game.deathT > 1.2 && Input.pressed('confirm')) {
        Input.clear(); w.deathPending = false; w.onPlayerDeath(); game.state = 'play'; sfx.rest();
      }
      break;
  }
}

function drawTitle() {
  const t = game.time;
  ctx.fillStyle = '#121115'; ctx.fillRect(0, 0, VW, VH);
  for (let i = 0; i < 90; i++) {
    const x = (i * 97.3 + t * 12) % VW, y = (i * 53.7 + t * (14 + (i % 5) * 4)) % VH;
    ctx.globalAlpha = 0.2 + (i % 4) * 0.1; ctx.fillStyle = '#8a827b'; ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  ctx.globalAlpha = 1;
  // Runa
  const g = 0.6 + Math.sin(t * 2) * 0.4;
  ctx.globalAlpha = g; ctx.fillStyle = '#a72f2f';
  ctx.fillRect(VW / 2 - 2, 40, 4, 16); ctx.fillRect(VW / 2 - 8, 46, 16, 3);
  ctx.globalAlpha = 1;
  text(ctx, 'THE LAST ARCANA', VW / 2, 86, '#e8e0d0', 'center', 22);
  text(ctx, 'Região 1 — Vale das Cinzas', VW / 2, 104, '#b66a3b', 'center', 9);
  CONTROLS.forEach(([k, d], i) => {
    const col = i < 6 ? 0 : 1;
    const x = col === 0 ? 48 : 262, y = 132 + (i % 6) * 12;
    text(ctx, k, x, y, '#d9b58a', 'left', 8);
    text(ctx, d, x + (col === 0 ? 62 : 30), y, '#a59d95', 'left', 8);
  });
  if (Math.sin(t * 4) > -0.3) text(ctx, 'Clique ou pressione ENTER para despertar', VW / 2, 222, '#e8e0d0', 'center', 9);
  text(ctx, 'Controle compatível · demonstração — protótipo jogável', VW / 2, 252, '#5a544f', 'center', 7);
}

let lastRender = performance.now();
function render() {
  const now = performance.now();
  const dt = Math.min(0.1, (now - lastRender) / 1000);
  lastRender = now;
  if (game.state === 'title') return drawTitle();
  renderWorld(ctx, game.world, game.time, dt);
  if (game.state === 'pause') {
    ctx.globalAlpha = 0.75; ctx.fillStyle = '#0c0b0d'; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1;
    text(ctx, 'PAUSA', VW / 2, 50, '#e8e0d0', 'center', 14);
    CONTROLS.forEach(([k, d], i) => { text(ctx, k, 120, 76 + i * 13, '#d9b58a'); text(ctx, d, 200, 76 + i * 13, '#a59d95'); });
    text(ctx, 'Esc para voltar', VW / 2, 250, '#8a827b', 'center');
  }
  if (game.state === 'dead') {
    const a = Math.min(1, game.deathT / 1.2);
    ctx.globalAlpha = a * 0.7; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = a;
    text(ctx, 'VOCÊ SE DESFEZ EM CINZAS', VW / 2, VH / 2 - 6, '#a72f2f', 'center', 16);
    text(ctx, `A cinza te devolve em: ${game.world.checkpoint.name}`, VW / 2, VH / 2 + 12, '#a59d95', 'center');
    if (game.deathT > 1.2) text(ctx, 'ENTER para continuar', VW / 2, VH / 2 + 30, '#e8e0d0', 'center');
    ctx.globalAlpha = 1;
  }
}

const STEP = 1 / 60;
let acc = 0, last = performance.now();
function frame(now) {
  let d = (now - last) / 1000; last = now;
  if (d > 0.1) d = 0.1;
  acc += d;
  while (acc >= STEP) { update(STEP); acc -= STEP; }
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
canvas.focus();
