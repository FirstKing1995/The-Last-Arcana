import { Input } from './input.js';
import { initAudio, sfx, toggleMute, isMuted } from './audio.js';
import { newProgress, loadProgress, hasSave, clearSave } from './state.js';
import { setupUI, openMenu, isMenuOpen, menuKey } from './ui.js';
import { World, VW, VH } from './world.js';
import { renderWorld, renderBackdrop, text, light, drawVignette, FONT } from './render.js';
import { drawErrante } from './sprites.js';
import { setupTouch, tryFullscreenLandscape } from './touch.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
if (document.fonts && document.fonts.load) document.fonts.load(`8px ${'Silkscreen'}`).catch(() => {});
ctx.imageSmoothingEnabled = false;

function fit() {
  // Escala inteira quando cabe (pixels nítidos); no celular, ocupa a tela toda.
  let s = Math.min(window.innerWidth / VW, window.innerHeight / VH);
  if (s >= 2) s = Math.floor(s);
  canvas.style.width = VW * s + 'px';
  canvas.style.height = VH * s + 'px';
}
window.addEventListener('resize', fit);
window.addEventListener('orientationchange', () => setTimeout(fit, 200));
fit();
setupTouch(fit);
setupUI();
Input.interceptor = (code) => (isMenuOpen() ? menuKey(code) : false);

const CONTROLS = [
  ['A / D', 'mover'], ['W / Espaço', 'pular (S+Espaço desce)'], ['Shift', 'esquiva (segure: correr)'],
  ['J', 'ataque leve (combo)'], ['K', 'pesado (segure: carregar)'], ['L', 'aparar (parry)'],
  ['Q', 'frasco de cura'], ['R', 'feitiço do grimório'], ['F', 'habilidade do Arcano'],
  ['Tab', 'trocar Arcano'], ['E', 'interagir / finalizar'], ['C / V', 'usar / trocar item rápido'],
  ['I', 'inventário'], ['M', 'som liga/desliga'], ['Esc', 'pausa'],
];

const TOUCH_CONTROLS = [
  ['Esquerda', 'arraste para mover'], ['↓ + PULAR', 'desce da plataforma'], ['ESQUIVA', 'segure p/ correr'],
  ['ATACAR', 'combo de 3 golpes'], ['PESADO', 'segure para carregar'], ['APARAR', 'no aviso amarelo'],
  ['CURA', 'frasco'], ['FOGO', 'feitiço'], ['ARC', 'habilidade Arcano'],
  ['⇄', 'trocar Arcano'], ['E', 'falar / finalizar'], ['ITEM', 'usa o item rápido'],
  ['INV', 'inventário e equipamento'], ['❚❚', 'pausa'],
];

const game = { state: 'title', world: null, time: 0, deathT: 0, titleT: 0, sel: 0, confirmNew: false };
window.__game = game; // usado pelos testes automatizados

Input.onAny = () => initAudio();
let tapOption = -1;
window.addEventListener('pointerdown', (e) => {
  canvas.focus();
  if (game.state !== 'title') return;
  if (Input.touchMode) tryFullscreenLandscape();
  // toque/clique sobre uma opção do título
  const r = canvas.getBoundingClientRect();
  const y = (e.clientY - r.top) / r.height * VH;
  const opts = titleOptions();
  const i = Math.floor((y - 122) / 14);
  tapOption = i >= 0 && i < opts.length ? i : (opts.length === 1 ? 0 : -1);
}, true);

function titleOptions() { return hasSave() ? ['continuar', 'novo'] : ['novo']; }

function startGame(fromSave) {
  const prog = (fromSave && loadProgress()) || newProgress();
  if (!fromSave) clearSave();
  game.world = new World(prog);
  game.state = 'play';
  Input.clear();
  if (!fromSave) game.world.toast('Converse com Elion e descanse na pira [E]', 5);
  else game.world.toast(`Progresso carregado: ${game.world.checkpoint.name}`, 3);
}

function chooseTitle(i) {
  const opt = titleOptions()[i];
  if (opt === 'novo' && hasSave() && !game.confirmNew) { game.confirmNew = true; sfx.ui(); return; }
  initAudio(); sfx.bell(196, 0.1);
  startGame(opt === 'continuar');
}

// Salva ao sair da página (a posição volta para a última pira)
document.addEventListener('visibilitychange', () => { if (document.hidden && game.world) game.world.save(); });

function update(dt) {
  game.time += dt;
  Input.pollGamepad();
  const w = game.world;
  switch (game.state) {
    case 'title': {
      game.titleT += dt;
      const n = titleOptions().length;
      if (Input.pressed('down', 0.1)) { Input.consume('down'); game.sel = (game.sel + 1) % n; game.confirmNew = false; sfx.ui(); }
      if (Input.pressed('up', 0.1)) { Input.consume('up'); game.sel = (game.sel + n - 1) % n; game.confirmNew = false; sfx.ui(); }
      if (game.titleT > 0.3 && tapOption >= 0) { const i = tapOption; tapOption = -1; if (game.sel !== i) game.confirmNew = false; game.sel = i; chooseTitle(i); }
      else if (game.titleT > 0.3 && (Input.pressed('confirm') || Input.pressed('light'))) { Input.consume('confirm'); Input.consume('light'); chooseTitle(game.sel); }
      tapOption = -1;
      break;
    }
    case 'menu':
      if (!isMenuOpen()) { game.state = 'play'; Input.clear(); }
      break;
    case 'play': {
      if (Input.pressed('pause')) { Input.consume('pause'); game.state = 'pause'; break; }
      if (Input.pressed('mute')) { Input.consume('mute'); w.toast(toggleMute() ? 'Som desligado' : 'Som ligado'); }
      if (!w.dialog && (Input.pressed('inventory') || w.menu)) {
        const kind = w.menu || 'inventory';
        Input.consume('inventory'); w.menu = null;
        game.state = 'menu';
        openMenu(w, kind, () => { game.state = 'play'; Input.clear(); });
        break;
      }
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
      if (Input.pressed('mute')) { Input.consume('mute'); toggleMute(); }
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

const TITLE_HERO = { facing: 1, action: null, t: 0, flash: 0, invuln: 0, dead: false, onGround: true, vx: 0, vy: 0, walkPhase: 0, perfectFlash: 0, comboIndex: 0 };
function drawTitle() {
  const t = game.time;
  renderBackdrop(ctx, t * 10, t, { ashUp: false });
  // penhasco em primeiro plano
  ctx.fillStyle = '#0c0b0e';
  for (let x = 0; x < VW; x++) {
    const h = 26 + Math.round(Math.sin(x * 0.03) * 4 + Math.sin(x * 0.11) * 2) + (x > 250 && x < 330 ? 10 : 0);
    ctx.fillRect(x, VH - h, 1, h);
  }
  const hx = 292, hy = VH - 36;
  ctx.globalCompositeOperation = 'lighter';
  light(ctx, hx, hy - 12, 30, '#a72f2f', 0.35 + Math.sin(t * 2) * 0.1);
  ctx.globalCompositeOperation = 'source-over';
  drawErrante(ctx, TITLE_HERO, hx, hy, t);
  drawVignette(ctx);
  // moldura de carta de tarô em volta do título
  const cx = VW / 2 - 40;
  ctx.fillStyle = '#6d4b32';
  ctx.fillRect(cx - 120, 34, 240, 1); ctx.fillRect(cx - 120, 98, 240, 1);
  ctx.fillRect(cx - 120, 34, 1, 64); ctx.fillRect(cx + 119, 34, 1, 64);
  ctx.fillStyle = '#d4b66f';
  [[cx - 121, 33], [cx + 118, 33], [cx - 121, 97], [cx + 118, 97]].forEach(([x, y]) => ctx.fillRect(x, y, 3, 3));
  text(ctx, '0  ·  O LOUCO  ·  0', cx, 48, '#8b633f', 'center', 8);
  text(ctx, 'THE LAST ARCANA', cx, 72, '#e8d2a8', 'center', 16);
  text(ctx, 'VALE DAS CINZAS', cx, 89, '#b66a3b', 'center', 8);
  const g = 0.6 + Math.sin(t * 2) * 0.4;
  ctx.globalAlpha = g; ctx.fillStyle = '#c0303a';
  ctx.fillRect(cx, 18, 1, 9); ctx.fillRect(cx - 3, 21, 7, 1);
  ctx.globalAlpha = 1;
  const opts = titleOptions();
  opts.forEach((o, i) => {
    const on = i === game.sel;
    let label = o === 'continuar' ? 'CONTINUAR' : 'NOVO JOGO';
    if (o === 'novo' && game.confirmNew && on) label = 'APAGAR SAVE? CONFIRME';
    const y = 132 + i * 14;
    if (on) { ctx.fillStyle = '#6d4b32'; ctx.fillRect(cx - 60, y - 9, 120, 12); ctx.fillStyle = '#d4b66f'; ctx.fillRect(cx - 66, y - 5, 3, 3); }
    text(ctx, label, cx, y, on ? '#fff0d0' : '#8a827b', 'center', 8);
  });
  text(ctx, Input.touchMode ? 'toque numa opção · gire o celular' : 'setas e enter · esc mostra os controles', cx, 132 + opts.length * 14 + 8, '#6a635e', 'center', 8);
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
    text(ctx, 'PAUSA', VW / 2, 28, '#e8d2a8', 'center', 16);
    (Input.touchMode ? TOUCH_CONTROLS : CONTROLS).forEach(([k, d], i) => { text(ctx, k, 70, 46 + i * 11, '#d9b58a'); text(ctx, d, 160, 46 + i * 11, '#a59d95'); });
    text(ctx, (Input.touchMode ? 'toque em pular para voltar' : 'esc para voltar') + (isMuted() ? ' · som desligado' : ''), VW / 2, 206, '#7a726c', 'center');
  }
  if (game.state === 'dead') {
    const a = Math.min(1, game.deathT / 1.2);
    ctx.globalAlpha = a * 0.7; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = a;
    text(ctx, 'VOCÊ SE DESFEZ', VW / 2, VH / 2 - 14, '#c0303a', 'center', 16);
    text(ctx, 'EM CINZAS', VW / 2, VH / 2 + 2, '#c0303a', 'center', 16);
    text(ctx, `a cinza te devolve em: ${game.world.checkpoint.name}`, VW / 2, VH / 2 + 20, '#a59d95', 'center');
    if (game.deathT > 1.2) text(ctx, Input.touchMode ? 'toque em pular para continuar' : 'enter para continuar', VW / 2, VH / 2 + 36, '#e8e0d0', 'center');
    ctx.globalAlpha = 1;
  }
}

const STEP = 1 / 60;
let acc = 0, last = performance.now();
let lastErr = 0;
function frame(now) {
  requestAnimationFrame(frame); // agenda antes, para um erro não congelar o jogo
  let d = (now - last) / 1000; last = now;
  if (d > 0.1) d = 0.1;
  acc += d;
  try {
    while (acc >= STEP) { update(STEP); acc -= STEP; }
    render();
  } catch (e) {
    acc = 0;
    if (now - lastErr > 2000) { lastErr = now; console.error(e); }
  }
}
requestAnimationFrame(frame);
canvas.focus();
