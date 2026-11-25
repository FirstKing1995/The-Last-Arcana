import { Input } from './input.js';
import { initAudio, sfx, toggleMute, isMuted } from './audio.js';
import { newProgress, loadProgress, hasSave, clearSave } from './state.js';
import { setupUI, openMenu, isMenuOpen, menuKey } from './ui.js';
import { World, VW, VH } from './world.js';
import { renderWorld, renderAsh, text } from './render.js';
import { setupTouch, tryFullscreenLandscape } from './touch.js';
import { artReady, img } from './art.js';
import { S } from './hd.js';
import { makePost } from './post.js';

const canvas = document.getElementById('game');
canvas.width = VW * S; canvas.height = VH * S;
const off = document.createElement('canvas'); off.width = VW * S; off.height = VH * S;
const ctx = off.getContext('2d', { alpha: false });
const post = makePost(canvas, off);
if (document.fonts && document.fonts.load) document.fonts.load(`8px ${'Silkscreen'}`).catch(() => {});
ctx.imageSmoothingEnabled = false;

function fit() {
  // Escala inteira quando cabe (pixels nítidos); no celular, ocupa a tela toda.
  let s = Math.min(window.innerWidth / VW, window.innerHeight / VH);
  if (s >= 2) s = Math.floor(s * S) / S;
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
  ['A / D', 'mover'], ['W / Espaço', 'pular (S+Espaço desce)'], ['Shift', 'rolar; com S correndo, desliza'],
  ['J / clique', 'atacar (combo de 3)'], ['K / dir.', 'pesado; no ar, queda'], ['L / meio', 'aparar'], ['T / roda', 'trocar de arma'],
  ['Q', 'beber a poção'], ['R', 'trocar a poção'], ['F', 'habilidade do Arcano'],
  ['Tab', 'trocar Arcano'], ['E', 'interagir / finalizar'], ['C / V', 'usar / trocar item rápido'],
  ['I / N', 'inventário / mapa'], ['Esc', 'pausa'],
];

const TOUCH_CONTROLS = [
  ['Esquerda', 'arraste para mover'], ['↓ + PULAR', 'desce da plataforma'], ['ESQUIVA', 'rola; ↓ correndo desliza'],
  ['ATACAR', 'combo de 3 golpes'], ['PESADO', 'segure para carregar'], ['APARAR', 'no aviso amarelo'],
  ['POÇÃO', 'beber'], ['TIPO', 'cura/defesa/dano'], ['ARC', 'habilidade Arcano'],
  ['⇄', 'trocar Arcano'], ['E', 'falar / finalizar'], ['ITEM', 'usa o item rápido'],
  ['INV / MAPA', 'equipamento e mapa'], ['❚❚', 'pausa'],
];

const game = { state: 'title', world: null, time: 0, deathT: 0, titleT: 0, sel: 0, confirmNew: false };
window.__game = game; // usado pelos testes automatizados

Input.onAny = () => initAudio();
Input.mouseOn = (e) => game.state === 'play' && !isMenuOpen() && (!e.target || e.target === canvas || e.target === document.body);
let tapOption = -1;
window.addEventListener('pointerdown', (e) => {
  canvas.focus();
  if (game.state !== 'title') return;
  if (Input.touchMode) tryFullscreenLandscape();
  // toque/clique sobre uma opção do título
  const r = canvas.getBoundingClientRect();
  const y = (e.clientY - r.top) / r.height * VH;
  const opts = titleOptions();
  const i = Math.floor((y - 134) / 14);
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
      if (!w.dialog && (Input.pressed('inventory') || Input.pressed('map') || w.menu)) {
        const kind = w.menu || (Input.pressed('map') ? 'map' : 'inventory');
        Input.consume('inventory'); Input.consume('map'); w.menu = null;
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

function drawTitle() {
  const t = game.time;
  const im = img.capa, k = 1.05 + Math.sin(t * 0.12) * 0.012, w = VW * k, h = w * im.height / im.width;
  ctx.fillStyle = '#07080b'; ctx.fillRect(0, 0, VW, VH);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(im, (VW - w) * (0.55 + Math.sin(t * 0.09) * 0.2), (VH - h) * 0.45, w, h);
  ctx.imageSmoothingEnabled = false;
  const g0 = ctx.createLinearGradient(0, 0, VW * 0.55, 0); g0.addColorStop(0, 'rgba(6,8,12,0.82)'); g0.addColorStop(1, 'rgba(6,8,12,0)'); ctx.fillStyle = g0; ctx.fillRect(0, 0, VW, VH);
  renderAsh(ctx, t);
  const cx = 104;
  ctx.fillStyle = '#80664c'; ctx.fillRect(cx - 72, 60, 144, 0.5); ctx.fillRect(cx - 72, 108, 144, 0.5);
  ctx.fillStyle = '#d4b66f'; ctx.fillRect(cx - 73, 59, 2, 2); ctx.fillRect(cx + 71, 59, 2, 2); ctx.fillRect(cx - 73, 107, 2, 2); ctx.fillRect(cx + 71, 107, 2, 2);
  text(ctx, 'THE LAST', cx, 80, '#f0dcb4', 'center', 16);
  text(ctx, 'ARCANA', cx, 98, '#f0dcb4', 'center', 16);
  text(ctx, 'VALE DAS CINZAS', cx, 120, '#e08a52', 'center', 8);
  const opts = titleOptions();
  opts.forEach((o, i) => {
    const on = i === game.sel;
    let label = o === 'continuar' ? 'CONTINUAR' : 'NOVO JOGO';
    if (o === 'novo' && game.confirmNew && on) label = 'APAGAR SAVE? CONFIRME';
    const y = 144 + i * 14;
    if (on) { ctx.globalAlpha = 0.75; ctx.fillStyle = '#5a3a2a'; ctx.fillRect(cx - 62, y - 9, 124, 12); ctx.globalAlpha = 1; ctx.fillStyle = '#ffb070'; ctx.fillRect(cx - 68, y - 5, 3, 3); }
    text(ctx, label, cx, y, on ? '#fff0d0' : '#b0a69c', 'center', 8);
  });
  text(ctx, Input.touchMode ? 'toque numa opção · gire o celular' : 'setas e enter, ou clique', cx, 144 + opts.length * 14 + 10, '#8a827b', 'center', 8);
}

let lastRender = performance.now();
function render() {
  const now = performance.now();
  const dt = Math.min(0.1, (now - lastRender) / 1000);
  lastRender = now;
  ctx.setTransform(S, 0, 0, S, 0, 0);
  ctx.imageSmoothingEnabled = false;
  if (game.state === 'title') { drawTitle(); post.draw({ time: game.time }); return; }
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
  const w = game.world;
  post.draw({ time: game.time, ab: w ? Math.min(0.012, w.hitstop * 0.05 + w.shake * 0.0007) : 0, hurt: w ? Math.max(0, w.hurtFlash) * 2 : 0, low: w && w.player && !w.player.dead ? Math.max(0, 0.28 - w.player.hp / w.player.maxHp) * 2.4 : w && w.player.dead ? 1 : 0 });
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
artReady.then(() => requestAnimationFrame(frame));
canvas.focus();
game.update = update; game.render = render; // usado pelos testes automatizados
