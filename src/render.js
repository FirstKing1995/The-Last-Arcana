import { TILE } from './physics.js';
import { VW, VH } from './world.js';
import { drawErrante, drawMob, drawAsgmor, drawNPC } from './sprites.js';
import { ARCANA, PLAYER } from './data.js';

// Paleta-base do Vale das Cinzas
const C = { carvao: '#25252a', cinza: '#625b58', brasa: '#b66a3b', tecido: '#d9b58a', runa: '#a72f2f' };

let skyCache = null;
function sky(ctx) {
  if (!skyCache) {
    skyCache = document.createElement('canvas');
    skyCache.width = VW; skyCache.height = VH;
    const c = skyCache.getContext('2d');
    const g = c.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, '#141317'); g.addColorStop(0.55, '#241f22'); g.addColorStop(0.85, '#3a2722'); g.addColorStop(1, '#4a2c22');
    c.fillStyle = g; c.fillRect(0, 0, VW, VH);
  }
  ctx.drawImage(skyCache, 0, 0);
}

function hash(n) { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }

function parallax(ctx, cam, time, world) {
  // Clarões distantes antes de trovões abafados
  const flashT = (time % 9.5);
  if (flashT < 0.25 && Math.floor(time / 9.5) % 2 === 0) {
    ctx.globalAlpha = 0.15 * (1 - flashT / 0.25);
    ctx.fillStyle = '#e8c9a0'; ctx.fillRect(0, 0, VW, VH * 0.7);
    ctx.globalAlpha = 1;
  }
  // Montanhas
  const off1 = cam.x * 0.1;
  ctx.fillStyle = '#2a2427';
  for (let i = -1; i < 12; i++) {
    const bx = i * 60 - (off1 % 60), id = Math.floor(off1 / 60) + i;
    const h = 40 + hash(id) * 50;
    ctx.beginPath(); ctx.moveTo(bx - 40, 200); ctx.lineTo(bx + 20, 200 - h); ctx.lineTo(bx + 80, 200); ctx.fill();
  }
  ctx.fillRect(0, 200 - cam.y * 0.1, VW, VH);
  // Campanários distantes
  const off2 = cam.x * 0.3;
  ctx.fillStyle = '#1e1b1e';
  for (let i = -1; i < 8; i++) {
    const id = Math.floor(off2 / 90) + i;
    const bx = i * 90 - (off2 % 90) + hash(id + 7) * 30;
    const h = 60 + hash(id + 3) * 50;
    const by = 230 - cam.y * 0.2;
    ctx.fillRect(bx, by - h, 14, h);
    ctx.fillRect(bx - 3, by - h - 4, 20, 5);
    ctx.fillRect(bx + 2, by - h - 14, 10, 10);
    ctx.fillRect(bx + 6, by - h - 20, 2, 6);
    if (hash(id + 11) > 0.5) { ctx.fillStyle = '#5a3a2a'; ctx.fillRect(bx + 5, by - h - 10, 4, 4); ctx.fillStyle = '#1e1b1e'; }
  }
  ctx.fillRect(0, 230 - cam.y * 0.2, VW, VH);
  // Cinza oblíqua caindo (ou subindo após libertar o Louco)
  ctx.fillStyle = '#8a827b';
  const up = world.ashUp ? -1 : 1;
  for (let i = 0; i < 70; i++) {
    const sp = 20 + hash(i) * 25;
    const x = ((hash(i + 50) * VW * 1.5 + time * 18 - cam.x * 0.6) % (VW + 20) + VW + 20) % (VW + 20) - 10;
    const y = ((hash(i + 99) * VH + up * time * sp - cam.y * 0.6) % VH + VH) % VH;
    ctx.globalAlpha = 0.25 + hash(i + 3) * 0.4;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1 + (hash(i) > 0.8 ? 1 : 0));
  }
  ctx.globalAlpha = 1;
}

function drawTiles(ctx, world, cam, time) {
  const lvl = world.level;
  const x0 = Math.floor(cam.x / TILE), x1 = Math.ceil((cam.x + VW) / TILE);
  const y0 = Math.floor(cam.y / TILE), y1 = Math.ceil((cam.y + VH) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const c = lvl.get(tx, ty);
      if (c === '.') continue;
      const sx = Math.round(tx * TILE - cam.x), sy = Math.round(ty * TILE - cam.y);
      const h = hash(tx * 31 + ty * 17);
      if (c === '#') {
        const exposed = !lvl.solid(tx, ty - 1);
        ctx.fillStyle = '#2b2a2f'; ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = '#232227';
        if (h > 0.5) ctx.fillRect(sx + 3, sy + 9, 6, 1);
        if (h > 0.7) ctx.fillRect(sx + 9, sy + 4, 1, 5);
        if (h < 0.2) { ctx.fillStyle = '#34323a'; ctx.fillRect(sx + 2, sy + 2, 3, 2); }
        if (exposed) {
          ctx.fillStyle = C.cinza; ctx.fillRect(sx, sy, TILE, 3);
          ctx.fillStyle = '#7a726c'; ctx.fillRect(sx + Math.floor(h * 10), sy, 4, 1);
          ctx.fillStyle = '#4a4441'; ctx.fillRect(sx, sy + 3, TILE, 1);
          if (h > 0.85) { ctx.fillStyle = '#b66a3b'; ctx.fillRect(sx + 6, sy + 1, 1, 1); }
        }
        if (!lvl.solid(tx - 1, ty) && lvl.get(tx - 1, ty) !== 'G') { ctx.fillStyle = '#1d1c20'; ctx.fillRect(sx, sy, 1, TILE); }
        if (!lvl.solid(tx + 1, ty)) { ctx.fillStyle = '#1d1c20'; ctx.fillRect(sx + TILE - 1, sy, 1, TILE); }
      } else if (c === '=') {
        ctx.fillStyle = '#3a2a22'; ctx.fillRect(sx, sy, TILE, 4);
        ctx.fillStyle = '#5a4030'; ctx.fillRect(sx, sy, TILE, 1);
        ctx.fillStyle = '#21181a'; ctx.fillRect(sx + 7, sy, 1, 4);
        if (h > 0.6) { ctx.fillStyle = '#b66a3b'; ctx.fillRect(sx + 3, sy + 2, 2, 1); }
      } else if (c === 'X') {
        // Parede frágil: rachaduras luminosas (pista ambiental)
        ctx.fillStyle = '#2f2c30'; ctx.fillRect(sx, sy, TILE, TILE);
        const g = 0.6 + Math.sin(time * 3 + ty) * 0.4;
        ctx.globalAlpha = g;
        ctx.fillStyle = '#e17a3d';
        ctx.fillRect(sx + 7, sy, 1, 5); ctx.fillRect(sx + 6, sy + 5, 1, 4); ctx.fillRect(sx + 8, sy + 9, 1, 7); ctx.fillRect(sx + 3, sy + 7, 3, 1);
        ctx.globalAlpha = 1;
      } else if (c === 'G') {
        // Porta de pedra que fecha atrás do jogador
        ctx.fillStyle = '#3d3238'; ctx.fillRect(sx + 2, sy, 12, TILE);
        ctx.fillStyle = '#2a2328'; ctx.fillRect(sx + 2, sy, 2, TILE);
        ctx.globalAlpha = 0.5 + Math.sin(time * 4) * 0.3;
        ctx.fillStyle = C.runa; ctx.fillRect(sx + 7, sy + 4, 2, 8);
        ctx.globalAlpha = 1;
      }
    }
  }
}

function drawProp(ctx, pr, cam, time) {
  const sx = Math.round(pr.x - cam.x), sy = Math.round(pr.y - cam.y);
  if (sx < -80 || sx > VW + 80) return;
  switch (pr.type) {
    case 'house': {
      const w = 44, h = 30;
      ctx.fillStyle = '#2f2b2e'; ctx.fillRect(sx - w / 2, sy - h, w, h);
      ctx.fillStyle = '#3a3538'; ctx.fillRect(sx - w / 2, sy - h, w, 3);
      ctx.fillStyle = '#4b4d52'; // telhado de chapa
      ctx.beginPath(); ctx.moveTo(sx - w / 2 - 4, sy - h); ctx.lineTo(sx + (pr.v ? -6 : 6), sy - h - 16); ctx.lineTo(sx + w / 2 + 4, sy - h); ctx.fill();
      ctx.fillStyle = '#5c5f66'; ctx.fillRect(sx - w / 2 - 4, sy - h - 1, w + 8, 1);
      ctx.fillStyle = '#1a1719'; ctx.fillRect(sx - 4, sy - 14, 8, 14);
      const lit = 0.6 + Math.sin(time * 5 + pr.x) * 0.15;
      ctx.globalAlpha = lit; ctx.fillStyle = '#b66a3b'; ctx.fillRect(sx + 9, sy - 22, 6, 5); ctx.globalAlpha = 1;
      break;
    }
    case 'bellpost': {
      ctx.fillStyle = '#2a2024'; ctx.fillRect(sx - 1, sy - 40, 3, 40);
      ctx.fillRect(sx - 1, sy - 40, 12, 2);
      const sw = Math.round(Math.sin(time * 1.5 + pr.x) * 2);
      ctx.fillStyle = '#625b58'; ctx.fillRect(sx + 8 + sw, sy - 38, 1, 5);
      ctx.fillStyle = '#6d4b32'; ctx.fillRect(sx + 5 + sw, sy - 33, 7, 6);
      ctx.fillStyle = '#e17a3d'; ctx.fillRect(sx + 8 + sw, sy - 31, 1, 3);
      break;
    }
    case 'fallenbell': {
      ctx.fillStyle = '#5a3d28'; ctx.fillRect(sx - 10, sy - 12, 20, 12);
      ctx.fillStyle = '#6d4b32'; ctx.fillRect(sx - 8, sy - 14, 14, 3);
      ctx.fillStyle = '#e17a3d'; ctx.fillRect(sx - 2, sy - 11, 1, 6); ctx.fillRect(sx + 3, sy - 9, 1, 5);
      break;
    }
    case 'column': {
      const h = pr.broken ? 34 : 56;
      ctx.fillStyle = '#29272c'; ctx.fillRect(sx - 6, sy - h, 12, h);
      ctx.fillStyle = '#33313a'; ctx.fillRect(sx - 6, sy - h, 3, h);
      ctx.fillStyle = '#3a373f'; ctx.fillRect(sx - 8, sy - 4, 16, 4);
      if (pr.broken) { ctx.fillStyle = '#29272c'; ctx.fillRect(sx - 6, sy - h - 4, 5, 4); }
      else { ctx.fillRect(sx - 8, sy - h - 4, 16, 4); }
      break;
    }
    case 'bigbell': {
      ctx.fillStyle = '#211d20'; ctx.fillRect(sx - 1, sy - 160, 2, 60);
      const sw = Math.round(Math.sin(time * 0.8) * 3);
      ctx.fillStyle = '#4a3424'; ctx.fillRect(sx - 18 + sw, sy - 100, 36, 30);
      ctx.fillStyle = '#3a2a1e'; ctx.fillRect(sx - 22 + sw, sy - 72, 44, 4);
      ctx.fillStyle = '#b66a3b'; ctx.globalAlpha = 0.6; ctx.fillRect(sx - 2 + sw, sy - 96, 1, 20); ctx.globalAlpha = 1;
      // círculo de cinza no chão
      ctx.fillStyle = '#7a726c'; ctx.globalAlpha = 0.35; ctx.fillRect(sx - 60, sy - 1, 120, 1); ctx.globalAlpha = 1;
      break;
    }
  }
}

function drawInteractable(ctx, it, world, cam, time) {
  const sx = Math.round(it.x - cam.x), sy = Math.round(it.y - cam.y);
  if (sx < -40 || sx > VW + 40) return;
  if (it.type === 'shrine') {
    ctx.fillStyle = '#3a3538'; ctx.fillRect(sx - 8, sy - 6, 16, 6);
    ctx.fillStyle = '#2b2a2f'; ctx.fillRect(sx - 6, sy - 9, 12, 3);
    const f = Math.sin(time * 12) * 1.5;
    ctx.fillStyle = '#b66a3b'; ctx.fillRect(sx - 4, sy - 16 + f, 8, 7 - f);
    ctx.fillStyle = '#e17a3d'; ctx.fillRect(sx - 2, sy - 20 - f, 4, 8 + f);
    ctx.fillStyle = '#ffd27a'; ctx.fillRect(sx - 1, sy - 15, 2, 4);
    ctx.globalAlpha = 0.12; ctx.fillStyle = '#e17a3d'; ctx.fillRect(sx - 20, sy - 34, 40, 34); ctx.globalAlpha = 1;
    if (Math.random() < 0.2) world.fx.parts.push({ x: it.x + (Math.random() - 0.5) * 6, y: it.y - 18, vx: 0, vy: -25, life: 0.8, max: 0.8, color: '#ffb070', grav: 0, size: 1 });
  } else if (it.type === 'elion') {
    drawNPC(ctx, sx, sy, time);
  } else if (it.type === 'chest') {
    const open = world.flags.chests[it.id];
    ctx.fillStyle = '#4a3424'; ctx.fillRect(sx - 8, sy - 9, 16, 9);
    ctx.fillStyle = '#8b633f'; ctx.fillRect(sx - 8, sy - 9, 16, 1); ctx.fillRect(sx - 1, sy - 7, 2, 3);
    if (open) { ctx.fillStyle = '#2a1e16'; ctx.fillRect(sx - 8, sy - 13, 16, 4); }
    else { ctx.fillStyle = '#5a3d28'; ctx.fillRect(sx - 8, sy - 12, 16, 3); ctx.globalAlpha = 0.3 + Math.sin(time * 3) * 0.2; ctx.fillStyle = '#ffd27a'; ctx.fillRect(sx - 9, sy - 13, 18, 1); ctx.globalAlpha = 1; }
  } else if (it.type === 'stone') {
    ctx.fillStyle = '#3a373f'; ctx.fillRect(sx - 5, sy - 18, 10, 18);
    ctx.fillStyle = '#2b2a2f'; ctx.fillRect(sx - 5, sy - 18, 2, 18);
    ctx.fillStyle = '#b66a3b'; ctx.globalAlpha = 0.7; ctx.fillRect(sx - 1, sy - 15, 3, 1); ctx.fillRect(sx, sy - 12, 1, 4); ctx.globalAlpha = 1;
  }
}

function bar(ctx, x, y, w, h, frac, color, back = '#1a181b', ghost) {
  ctx.fillStyle = '#0c0b0d'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = back; ctx.fillRect(x, y, w, h);
  if (ghost !== undefined) { ctx.fillStyle = '#e8d6b0'; ctx.fillRect(x, y, Math.round(w * Math.max(0, Math.min(1, ghost))), h); }
  ctx.fillStyle = color; ctx.fillRect(x, y, Math.round(w * Math.max(0, Math.min(1, frac))), h);
}

function text(ctx, s, x, y, color = '#e8e0d0', align = 'left', size = 8) {
  ctx.font = `${size}px monospace`;
  ctx.textAlign = align;
  ctx.fillStyle = '#000'; ctx.fillText(s, x + 1, y + 1);
  ctx.fillStyle = color; ctx.fillText(s, x, y);
}

function wrap(ctx, s, maxW) {
  const words = s.split(' '), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  return lines;
}

const ghost = { hp: 1, boss: 1 };

function drawHUD(ctx, world, time, dt) {
  const p = world.player;
  const hpFrac = p.hp / p.maxHp;
  ghost.hp = ghost.hp > hpFrac ? Math.max(hpFrac, ghost.hp - dt * 0.4) : hpFrac;
  bar(ctx, 10, 10, 130, 6, hpFrac, '#a72f2f', '#1a181b', ghost.hp);
  if (p.healLeft > 0) { ctx.fillStyle = '#9fe0a8'; ctx.globalAlpha = 0.5; ctx.fillRect(10 + Math.round(130 * hpFrac), 10, Math.round(130 * p.healLeft / p.maxHp), 6); ctx.globalAlpha = 1; }
  bar(ctx, 10, 19, 100, 3, p.vigor / p.maxVigor, '#8fb36a');
  bar(ctx, 10, 25, 100, 3, p.foco / p.maxFoco, '#6b9ea3');
  text(ctx, `${Math.ceil(p.hp)}`, 144, 16, '#c9b8a8');

  // Frascos
  const by = VH - 30;
  ctx.fillStyle = '#0c0b0d'; ctx.fillRect(9, by - 1, 20, 22);
  ctx.fillStyle = '#1e1c20'; ctx.fillRect(10, by, 18, 20);
  ctx.fillStyle = p.potions > 0 ? '#5aa06a' : '#3a3a3a'; ctx.fillRect(15, by + 7, 8, 10);
  ctx.fillStyle = '#c9c1b8'; ctx.fillRect(17, by + 3, 4, 4);
  text(ctx, `${p.potions}`, 26, by + 19, '#e8e0d0', 'right');
  text(ctx, 'Q', 19, by - 3, '#8a827b', 'center');

  // Dois Arcanos — posições fixas, indicador do ativo, recargas independentes
  for (let i = 0; i < 2; i++) {
    const x = 36 + i * 22;
    const a = p.arcana[i];
    const active = p.activeSlot === i;
    ctx.fillStyle = active ? '#d9b58a' : '#0c0b0d'; ctx.fillRect(x - 1, by - 1, 20, 22);
    ctx.fillStyle = '#1e1c20'; ctx.fillRect(x, by, 18, 20);
    if (a) {
      const A = ARCANA[a];
      ctx.fillStyle = A.color; ctx.fillRect(x + 3, by + 3, 12, 14);
      ctx.fillStyle = '#29272a'; ctx.fillRect(x + 5, by + 5, 8, 10);
      ctx.fillStyle = A.color; ctx.fillRect(x + 8, by + 7, 2, 2); ctx.fillRect(x + 7, by + 10, 4, 1); ctx.fillRect(x + 8, by + 11, 2, 3);
      const cd = p.cooldowns[a] || 0;
      if (cd > 0) { ctx.globalAlpha = 0.7; ctx.fillStyle = '#000'; ctx.fillRect(x, by, 18, Math.round(20 * cd / A.ability.cd)); ctx.globalAlpha = 1; }
    } else {
      ctx.fillStyle = '#2a282c'; ctx.fillRect(x + 6, by + 9, 6, 2);
    }
    text(ctx, i === 0 ? 'I' : 'II', x + 9, by - 3, active ? '#d9b58a' : '#8a827b', 'center');
  }
  text(ctx, 'F · Tab', 58, by + 30, '#6a635e', 'center', 7);
  // Grimório (feitiço de fogo)
  {
    const x = 84;
    ctx.fillStyle = '#0c0b0d'; ctx.fillRect(x - 1, by - 1, 20, 22);
    ctx.fillStyle = '#1e1c20'; ctx.fillRect(x, by, 18, 20);
    if (world.flags.brasa) {
      const ok = p.foco >= 18;
      ctx.fillStyle = ok ? '#e17a3d' : '#5a3a2a'; ctx.fillRect(x + 6, by + 6, 6, 8);
      ctx.fillStyle = ok ? '#ffd27a' : '#6a4a3a'; ctx.fillRect(x + 8, by + 4, 2, 6);
    }
    text(ctx, 'R', x + 9, by - 3, '#8a827b', 'center');
  }

  // Barra do chefe
  const b = world.boss;
  if (world.arenaLocked && b && !b.dead && b.state !== 'dormant') {
    const frac = b.hp / b.def.hp;
    ghost.boss = ghost.boss > frac ? Math.max(frac, ghost.boss - dt * 0.25) : frac;
    const w = 280, x = (VW - w) / 2 + 40, y = VH - 22;
    text(ctx, b.def.name, x, y - 4, '#e8e0d0');
    bar(ctx, x, y, w, 5, frac, '#a72f2f', '#1a181b', ghost.boss);
    bar(ctx, x + w / 2 - 40, y + 8, 80, 2, b.posture / b.def.posture, '#ffd27a');
  }

  // Indicação de interação
  if (!world.dialog && !p.action) {
    const fin = world.finisherTarget();
    const it = world.nearbyInteractable();
    let label = null, lx = 0, ly = 0;
    if (fin) { label = '[E] Finalizar'; lx = fin.cx(); ly = fin.y - 14; }
    else if (it) {
      label = { shrine: '[E] Descansar', elion: '[E] Conversar', chest: '[E] Abrir', stone: '[E] Ler' }[it.type];
      lx = it.x; ly = it.y - 34;
    }
    if (label) text(ctx, label, Math.round(lx - world.cam.x), Math.round(ly - world.cam.y), '#ffd27a', 'center');
  }

  // Avisos curtos
  world.toasts.forEach((t, i) => {
    ctx.globalAlpha = Math.min(1, (t.dur - t.t) * 3, t.t * 6);
    text(ctx, t.text, VW / 2, 44 + i * 11, '#e8e0d0', 'center');
    ctx.globalAlpha = 1;
  });

  // Faixa de título (chefe / Arcano liberto)
  if (world.banner) {
    const bn = world.banner;
    const a = Math.min(1, bn.t * 2, (bn.dur - bn.t) * 2);
    ctx.globalAlpha = a * 0.6; ctx.fillStyle = '#000'; ctx.fillRect(0, VH / 2 - 26, VW, 44); ctx.globalAlpha = a;
    text(ctx, bn.text, VW / 2, VH / 2 - 4, bn.small ? '#e8e0d0' : '#d9b58a', 'center', bn.small ? 10 : 16);
    text(ctx, bn.sub, VW / 2, VH / 2 + 10, '#a59d95', 'center');
    ctx.globalAlpha = 1;
  }

  // Diálogo
  if (world.dialog) {
    const d = world.dialog;
    const [who, msg] = d.lines[d.i];
    const x = 40, y = VH - 78, w = VW - 80, h = 62;
    ctx.globalAlpha = 0.88; ctx.fillStyle = '#121014'; ctx.fillRect(x, y, w, h); ctx.globalAlpha = 1;
    ctx.fillStyle = '#625b58'; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1);
    text(ctx, who, x + 8, y + 12, '#d9b58a');
    ctx.font = '8px monospace';
    const shown = msg.slice(0, Math.floor(d.chars));
    wrap(ctx, shown, w - 16).forEach((ln, i) => text(ctx, ln, x + 8, y + 25 + i * 10, '#e8e0d0'));
    if (d.chars >= msg.length && Math.sin(time * 6) > 0) text(ctx, '▼ E', x + w - 8, y + h - 5, '#8a827b', 'right');
  }
}

export function renderWorld(ctx, world, time, dt) {
  const cam = { x: world.cam.x, y: world.cam.y };
  if (world.shake > 0) { cam.x += (Math.random() - 0.5) * world.shake; cam.y += (Math.random() - 0.5) * world.shake; }
  cam.x = Math.round(cam.x); cam.y = Math.round(cam.y);
  sky(ctx);
  parallax(ctx, cam, time, world);
  for (const pr of world.level.props) drawProp(ctx, pr, cam, time);
  for (const it of world.interactables) drawInteractable(ctx, it, world, cam, time);
  drawTiles(ctx, world, cam, time);
  for (const m of [...world.mobs, ...world.summons]) {
    const sx = m.cx() - cam.x, sy = m.y + m.h - cam.y;
    if (sx < -40 || sx > VW + 40) continue;
    drawMob(ctx, m, sx, sy, time);
  }
  const b = world.boss;
  if (b) drawAsgmor(ctx, b, b.cx() - cam.x, b.y + b.h - cam.y, time);
  const p = world.player;
  drawErrante(ctx, p, Math.round(p.cx() - cam.x), Math.round(p.y + p.h - cam.y), time);
  world.fx.draw(ctx, cam);
  // vinheta e luz quente
  ctx.globalAlpha = 0.18; ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, VW, 12); ctx.fillRect(0, VH - 12, VW, 12);
  ctx.globalAlpha = 1;
  if (world.flashScreen > 0) { ctx.globalAlpha = world.flashScreen * 3; ctx.fillStyle = '#fff3c4'; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1; }
  drawHUD(ctx, world, time, dt);
}

export { text, wrap };
