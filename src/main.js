import { Input } from './input.js';
import { initAudio, sfx, toggleMute, ambiente, abafar } from './audio.js';
import { newProgress, loadProgress, hasSave, clearSave } from './state.js';
import { setupUI, openMenu, isMenuOpen, menuKey } from './ui.js';
import { World } from './world.js';
import { VW, VH, setView } from './view.js';
import { renderWorld, renderAsh } from './render.js';
import { setupTouch, tryFullscreenLandscape, touchUpdate } from './touch.js';
import { setupHUD, hudFit, hudMostra, hudUpdate } from './hud.js';
import { setupTelas, abre, some, telaAberta, telaKey, morte } from './telas.js';
import { Q, medir, vibrar } from './config.js';
import { artReady, img } from './art.js';
import { S } from './hd.js';
import { makePost } from './post.js';

const canvas = document.getElementById('game');
const off = document.createElement('canvas');
const ctx = off.getContext('2d', { alpha: false });
let post = null;
if (document.fonts && document.fonts.load) document.fonts.load(`8px ${'Silkscreen'}`).catch(() => {});

function fit() {
  // A altura do mundo é fixa; a largura segue a tela.
  const W = window.innerWidth, H = window.innerHeight;
  let s = Math.min(H / VH, W / 340);
  setView(W / s);
  if (off.width !== VW * S) { off.width = VW * S; off.height = VH * S; ctx.imageSmoothingEnabled = false; }
  // o quadro final sai na resolução da tela (até 1920 de largura)
  const dpr = Math.min(window.devicePixelRatio || 1, 1920 / (VW * s)), cw = Math.max(VW * S, Math.round(VW * s * dpr)), ch = Math.round(cw * VH / VW);
  if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
  canvas.style.width = VW * s + 'px';
  canvas.style.height = VH * s + 'px';
  hudFit(canvas.getBoundingClientRect());
  if (game.world) game.world.snapCamera();
}
window.addEventListener('resize', () => fit());
window.addEventListener('orientationchange', () => setTimeout(fit, 200));
const game = { state: 'title', world: null, time: 0, deathT: 0 };
window.__game = game; // usado pelos testes automatizados
setupHUD();
setupUI();
setupTelas({
  jogar: (cont) => { if (Input.touchMode) tryFullscreenLandscape(); initAudio(); sfx.bell(196, 0.1); startGame(cont); },
  continuar: () => { some(); Input.clear(); if (game.state === 'pause') { game.state = 'play'; abafar(false); } else if (game.state === 'title') abre('titulo'); },
  inventario: () => { some(); abafar(false); menu('inventory'); }, mapa: () => { some(); abafar(false); menu('map'); },
  titulo: () => { game.world.save(); game.world = null; game.state = 'title'; abafar(false); abre('titulo'); },
  renascer: () => { const w = game.world; some(); Input.clear(); w.deathPending = false; w.onPlayerDeath(); game.state = 'play'; sfx.rest(); },
});
setupTouch(() => fit());
fit();
post = makePost(canvas, off);
Input.interceptor = (code) => (/^F[0-9]+$/.test(code) ? false : isMenuOpen() ? menuKey(code) : telaKey(code));
abre('titulo');

Input.onAny = () => initAudio();
Input.mouseOn = (e) => game.state === 'play' && !isMenuOpen() && (!e.target || e.target === canvas || e.target === document.body);
window.addEventListener('pointerdown', (e) => { if (e.target === canvas) canvas.focus(); }, true);

function menu(kind) { game.state = 'menu'; openMenu(game.world, kind, () => { game.state = 'play'; Input.clear(); }); }

function startGame(fromSave) {
  const prog = (fromSave && loadProgress()) || newProgress();
  if (!fromSave) clearSave();
  game.world = new World(prog);
  game.state = 'play';
  some(); Input.clear();
  if (!fromSave) game.world.toast('Encontre a arma no baú e siga até Cinzeiral', 5);
  else game.world.toast(`Progresso carregado: ${game.world.checkpoint.name}`, 3);
}

// Salva ao sair da página (a posição volta para a última pira)
document.addEventListener('visibilitychange', () => { if (!document.hidden || !game.world) return; game.world.save(); if (game.state === 'play' && Input.touchMode) { game.state = 'pause'; abre('pausa'); } });

let vida0 = 0;
function update(dt) {
  if (game.world) { const hp = game.world.player.hp; if (hp < vida0 - 1) vibrar(game.world.player.dead ? 220 : 45); vida0 = hp; }
  game.time += dt;
  Input.pollGamepad();
  const w = game.world;
  switch (game.state) {
    case 'title': if (game.time > 0.5 && telaAberta() === 'titulo' && Input.pressed('confirm')) { Input.clear(); telaKey('Enter'); } break;
    case 'menu':
      if (!isMenuOpen()) { game.state = 'play'; Input.clear(); }
      break;
    case 'play': {
      if (Input.pressed('pause')) { Input.consume('pause'); game.state = 'pause'; abafar(true); sfx.abre(); abre('pausa'); break; }
      if (Input.pressed('mute')) { Input.consume('mute'); w.toast(toggleMute() ? 'Som desligado' : 'Som ligado'); }
      if (!w.dialog && (Input.pressed('inventory') || Input.pressed('map') || w.menu)) {
        const kind = w.menu || (Input.pressed('map') ? 'map' : 'inventory');
        Input.consume('inventory'); Input.consume('map'); w.menu = null;
        menu(kind);
        break;
      }
      if (w.dialog) {
        const d = w.dialog;
        const msg = d.lines[d.i][1], antes = Math.floor(d.chars / 3);
        d.chars = Math.min(msg.length, d.chars + dt * 62);
        if (Math.floor(d.chars / 3) !== antes) sfx.fala(d.lines[d.i][0]);
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
      if (w.deathPending) { game.state = 'dead'; game.deathT = 0; morte(`A cinza te devolve em ${w.checkpoint.name}`); }
      break;
    }
    case 'pause': if (telaAberta() === 'pausa' && Input.pressed('pause')) { Input.clear(); some(); game.state = 'play'; abafar(false); } break;
    case 'dead': game.deathT += dt; if (game.deathT > 1.2 && Input.pressed('confirm')) { Input.clear(); telaKey('Enter'); } break;
  }
}

function drawTitle() {
  const t = game.time, im = img.capa, k = 1.06 + Math.sin(t * 0.12) * 0.012, w = Math.max(VW, VH * im.width / im.height) * k, h = w * im.height / im.width;
  ctx.fillStyle = '#07080b'; ctx.fillRect(0, 0, VW, VH);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(im, (VW - w) * (0.55 + Math.sin(t * 0.09) * 0.2), (VH - h) * 0.45, w, h);
  ctx.imageSmoothingEnabled = false;
  renderAsh(ctx, t);
}

let lastRender = performance.now();
function render() {
  const now = performance.now();
  const dt = Math.min(0.1, (now - lastRender) / 1000);
  lastRender = now;
  ctx.setTransform(S, 0, 0, S, 0, 0);
  ctx.imageSmoothingEnabled = false;
  const w0 = game.world, jogando = game.state === 'play' || game.state === 'teste';
  hudMostra(!!w0 && game.state !== 'title' && game.state !== 'dead' && game.state !== 'menu' && game.state !== 'pause');
  touchUpdate(w0, game.state === 'play');
  if (!w0) { ctx.setTransform(S, 0, 0, S, 0, 0); drawTitle(); post.draw({ time: game.time, nivel: Q.nivel }); return; }
  renderWorld(ctx, w0, game.time, dt);
  hudUpdate(w0, dt);
  if (jogando) ambiente(w0, dt);
  const w = game.world;
  post.draw({ time: game.time, nivel: Q.nivel, ab: w ? Math.min(0.012, w.hitstop * 0.05 + w.shake * 0.0007) : 0, hurt: w ? Math.max(0, w.hurtFlash) * 2 : 0, low: w && w.player && !w.player.dead ? Math.max(0, 0.28 - w.player.hp / w.player.maxHp) * 2.4 : w && w.player.dead ? 1 : 0 });
}

const STEP = 1 / 60;
let acc = 0, last = performance.now();
let lastErr = 0;
function frame(now) {
  requestAnimationFrame(frame); // agenda antes, para um erro não congelar o jogo
  let d = (now - last) / 1000; last = now; if (!document.hidden && game.state === 'play') medir(d * 1000);
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
artReady.then(() => { const l = document.getElementById('load'); if (l) l.remove(); requestAnimationFrame(frame); });
canvas.focus();
game.update = update; game.render = render; // usado pelos testes automatizados
