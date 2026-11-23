// Cenário, iluminação e HUD — Vale das Cinzas.
// Paleta-base (Atlas, Vol. III): carvão #25252A, cinza #625B58, brasa #B66A3B, tecido queimado #D9B58A, runa #A72F2F.
import { TILE } from './physics.js';
import { VW, VH } from './world.js';
import { drawErrante, drawMob, drawAsgmor, drawNPC } from './sprites.js';
import { ARCANA } from './data.js';
import { Input } from './input.js';

export const FONT = 'Silkscreen, "Courier New", monospace';

function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
function noise1(x) { const i = Math.floor(x), f = x - i; const u = f * f * (3 - 2 * f); return hash(i) * (1 - u) + hash(i + 1) * u; }

// ---------- luzes (brilho aditivo) ----------
const glowCache = new Map();
function glow(color, r) {
  const key = color + r;
  let c = glowCache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = r * 2;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, color); g.addColorStop(0.35, color + '88'); g.addColorStop(1, color + '00');
  x.fillStyle = g; x.fillRect(0, 0, r * 2, r * 2);
  glowCache.set(key, c);
  return c;
}
function light(ctx, x, y, r, color, a = 1) {
  ctx.globalAlpha = a;
  ctx.drawImage(glow(color, r), Math.round(x - r), Math.round(y - r));
  ctx.globalAlpha = 1;
}

// ---------- céu e camadas de fundo ----------
let skyC = null;
function sky(ctx) {
  if (!skyC) {
    skyC = document.createElement('canvas'); skyC.width = VW; skyC.height = VH;
    const c = skyC.getContext('2d');
    const g = c.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, '#0c0b0f'); g.addColorStop(0.45, '#1a1519'); g.addColorStop(0.72, '#33221f'); g.addColorStop(0.9, '#4e2e22'); g.addColorStop(1, '#5c3424');
    c.fillStyle = g; c.fillRect(0, 0, VW, VH);
    // brilho de brasas distante no horizonte
    const r = c.createRadialGradient(VW * 0.62, VH * 0.92, 4, VW * 0.62, VH * 0.92, VW * 0.6);
    r.addColorStop(0, 'rgba(182,106,59,0.35)'); r.addColorStop(1, 'rgba(182,106,59,0)');
    c.fillStyle = r; c.fillRect(0, 0, VW, VH);
    // pontos de céu
    for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(217,181,138,${0.1 + hash(i) * 0.2})`; c.fillRect(Math.floor(hash(i + 9) * VW), Math.floor(hash(i + 3) * VH * 0.4), 1, 1); }
  }
  ctx.drawImage(skyC, 0, 0);
}

function ridge(ctx, offX, baseY, amp, freq, seed, color, step = 2) {
  ctx.fillStyle = color;
  for (let x = 0; x < VW; x += step) {
    const wx = (x + offX) * freq;
    const h = noise1(wx + seed) * amp + noise1(wx * 2.7 + seed * 3) * amp * 0.35 + (hash(Math.floor(wx * 6) + seed) > 0.93 ? 4 : 0);
    const y = Math.round(baseY - h);
    ctx.fillRect(x, y, step, VH - y);
  }
}

function tower(ctx, x, base, h, w, color, win, id) {
  ctx.fillStyle = color;
  ctx.fillRect(x, base - h, w, h);
  ctx.fillRect(x - 2, base - h - 3, w + 4, 3);
  ctx.fillRect(x + 1, base - h - 13, w - 2, 10);
  ctx.fillRect(x + 2, base - h - 17, w - 4, 4);
  ctx.fillRect(x + Math.floor(w / 2) - 1, base - h - 24, 2, 7);
  // arco do campanário com o sino
  ctx.fillStyle = win;
  ctx.fillRect(x + 3, base - h - 11, w - 6, 6);
  ctx.fillStyle = color;
  ctx.fillRect(x + Math.floor(w / 2) - 2, base - h - 10, 4, 4);
  if (hash(id) > 0.4) { ctx.fillStyle = win; ctx.fillRect(x + 2, base - h + 10 + Math.floor(hash(id + 1) * 20), 2, 3); }
}

function deadTree(ctx, x, base, h, color, id) {
  ctx.fillStyle = color;
  ctx.fillRect(x, base - h, 3, h);
  for (let i = 0; i < 4; i++) {
    const by = base - h + 4 + i * Math.floor(h / 5);
    const dir = (i + id) % 2 ? 1 : -1, len = 5 + Math.floor(hash(id + i) * 7);
    for (let k = 0; k < len; k++) ctx.fillRect(x + 1 + dir * k, by - Math.floor(k / 2), 1, 1);
  }
}

function backdrop(ctx, cam, time, world) {
  sky(ctx);
  // clarões distantes iluminam os campanários antes de trovões abafados
  const ft = time % 11;
  const flash = ft < 0.35 ? (1 - ft / 0.35) : 0;
  if (flash > 0) { ctx.globalAlpha = 0.18 * flash; ctx.fillStyle = '#e8c9a0'; ctx.fillRect(0, 0, VW, VH * 0.75); ctx.globalAlpha = 1; }

  const yOff = -cam.y * 0.08;
  ridge(ctx, cam.x * 0.05, 150 + yOff, 46, 0.012, 1, '#2a2226');
  // névoa alta
  let g = ctx.createLinearGradient(0, 120 + yOff, 0, 175 + yOff);
  g.addColorStop(0, 'rgba(98,91,88,0)'); g.addColorStop(1, 'rgba(98,91,88,0.16)');
  ctx.fillStyle = g; ctx.fillRect(0, 100 + yOff, VW, 90);

  // campanários distantes
  const off2 = cam.x * 0.16, y2 = Math.round(176 - cam.y * 0.14);
  const win = flash > 0.2 ? '#c79a6a' : '#4f3326';
  for (let i = -1; i < 7; i++) {
    const id = Math.floor(off2 / 80) + i;
    const x = Math.round(i * 80 - (off2 % 80) + hash(id) * 30);
    tower(ctx, x, y2, 40 + Math.floor(hash(id + 5) * 46), 10 + Math.floor(hash(id + 2) * 4) * 2, '#1c181c', win, id);
  }
  ridge(ctx, cam.x * 0.16, y2 + 2, 10, 0.03, 7, '#1c181c');

  g = ctx.createLinearGradient(0, y2 - 30, 0, y2 + 10);
  g.addColorStop(0, 'rgba(60,40,34,0)'); g.addColorStop(1, 'rgba(60,40,34,0.35)');
  ctx.fillStyle = g; ctx.fillRect(0, y2 - 30, VW, 60);

  // camada média: árvores carbonizadas, postes tortos e arcos partidos
  const off3 = cam.x * 0.42, y3 = Math.round(198 - cam.y * 0.4);
  for (let i = -1; i < 6; i++) {
    const id = Math.floor(off3 / 96) + i + 100;
    const x = Math.round(i * 96 - (off3 % 96) + hash(id) * 40);
    const kind = Math.floor(hash(id + 7) * 3);
    if (kind === 0) deadTree(ctx, x, y3, 34 + Math.floor(hash(id + 1) * 20), '#141115', id);
    else if (kind === 1) {
      ctx.fillStyle = '#141115';
      ctx.fillRect(x, y3 - 44, 7, 44); ctx.fillRect(x + 26, y3 - 30, 7, 30);
      for (let k = 0; k < 14; k++) ctx.fillRect(x + 3 + k, y3 - 44 - Math.round(Math.sin(k / 13 * Math.PI) * 8), 2, 4);
      ctx.fillStyle = '#3a2620'; ctx.fillRect(x + 6, y3 - 44, 1, 44);
    } else {
      ctx.fillStyle = '#141115';
      for (let k = 0; k < 40; k++) ctx.fillRect(x + Math.floor(k / 14), y3 - k, 2, 1);
      ctx.fillRect(x + 2, y3 - 40, 10, 2);
      ctx.fillStyle = '#2a1d18'; ctx.fillRect(x + 8, y3 - 38, 5, 5);
    }
  }
  ridge(ctx, cam.x * 0.42, y3, 6, 0.05, 13, '#141115');
  // névoa baixa quente
  g = ctx.createLinearGradient(0, y3 - 24, 0, y3 + 30);
  g.addColorStop(0, 'rgba(90,52,36,0)'); g.addColorStop(1, 'rgba(90,52,36,0.28)');
  ctx.fillStyle = g; ctx.fillRect(0, y3 - 24, VW, 80);
}

// Cinza oblíqua (ou subindo após libertar O Louco)
function ashFall(ctx, cam, time, world, layer) {
  const up = world.ashUp ? -1 : 1;
  const n = layer ? 26 : 60, par = layer ? 1.3 : 0.6;
  for (let i = 0; i < n; i++) {
    const seed = i + (layer ? 500 : 0);
    const sp = 14 + hash(seed) * 24;
    const x = ((hash(seed + 50) * VW * 2 + time * (16 + hash(seed + 4) * 10) - cam.x * par) % (VW + 20) + VW + 20) % (VW + 20) - 10;
    const y = ((hash(seed + 99) * VH + up * time * sp - cam.y * par) % VH + VH) % VH;
    ctx.globalAlpha = layer ? 0.6 : 0.2 + hash(seed + 3) * 0.35;
    ctx.fillStyle = hash(seed + 8) > 0.85 ? '#d98a52' : '#8a827b';
    ctx.fillRect(Math.round(x), Math.round(y), layer ? 2 : 1, layer && hash(seed) > 0.5 ? 2 : 1);
  }
  ctx.globalAlpha = 1;
}

// ---------- tiles ----------
const tileCache = new Map();
function makeTile(key, fn) {
  let c = tileCache.get(key);
  if (!c) { c = document.createElement('canvas'); c.width = c.height = TILE; fn(c.getContext('2d')); tileCache.set(key, c); }
  return c;
}
const ROCK = [['#2c2a30', '#232128', '#37353d'], ['#252329', '#1c1b20', '#2e2c33'], ['#1d1c21', '#161519', '#25232a']];
function rockTile(v, depth) {
  return makeTile(`r${v}_${depth}`, (c) => {
    const [base, dark, hi] = ROCK[depth];
    c.fillStyle = base; c.fillRect(0, 0, 16, 16);
    // blocos de basalto rachado
    const my = 6 + (v % 3);
    c.fillStyle = dark;
    c.fillRect(0, my, 16, 1);
    const vx1 = 3 + v * 3 % 9, vx2 = (vx1 + 8) % 16;
    c.fillRect(vx1, 0, 1, my); c.fillRect(vx2, my + 1, 1, 15 - my);
    c.fillStyle = hi;
    c.fillRect(vx1 + 1, 1, 3, 1); c.fillRect(vx2 + 1, my + 2, 2, 1); c.fillRect(1, my + 2, 1, 2);
    for (let i = 0; i < 6; i++) { const h = hash(v * 31 + i + depth * 7); c.fillStyle = h > 0.5 ? dark : hi; c.fillRect(Math.floor(h * 16), Math.floor(hash(h * 99) * 16), 1, 1); }
  });
}
function ashCap(v) {
  return makeTile(`a${v}`, (c) => {
    for (let x = 0; x < 16; x++) {
      const h = 4 + Math.round(noise1((x + v * 16) * 0.35) * 2);
      const top = 5 - h + 1;
      c.fillStyle = '#4a4441'; c.fillRect(x, top + h - 1, 1, 2);
      c.fillStyle = '#625b58'; c.fillRect(x, top, 1, h - 1);
      c.fillStyle = '#7a726c'; c.fillRect(x, top, 1, 1);
      if (hash(x + v * 17) > 0.8) { c.fillStyle = '#958c84'; c.fillRect(x, top, 1, 1); }
      if (hash(x * 3 + v) > 0.95) { c.fillStyle = '#b66a3b'; c.fillRect(x, top + 2, 1, 1); }
    }
  });
}
function plankTile(v) {
  return makeTile(`p${v}`, (c) => {
    c.fillStyle = '#3a2a22'; c.fillRect(0, 0, 16, 5);
    c.fillStyle = '#5a4030'; c.fillRect(0, 0, 16, 1);
    c.fillStyle = '#6b4c38'; c.fillRect(2 + v * 3, 0, 4, 1);
    c.fillStyle = '#21181a'; c.fillRect(0, 4, 16, 1); c.fillRect(7 + v, 1, 1, 3);
    c.fillStyle = '#8a827b'; c.fillRect(3, 2, 1, 1); c.fillRect(12, 2, 1, 1);
    c.fillStyle = '#16100f'; c.fillRect(4 + v * 2, 5, 2, 3);
    if (v === 1) { c.fillStyle = '#b66a3b'; c.fillRect(10, 3, 2, 1); }
  });
}

function drawTiles(ctx, world, cam, time) {
  const lvl = world.level;
  const x0 = Math.floor(cam.x / TILE), x1 = Math.ceil((cam.x + VW) / TILE);
  const y0 = Math.floor(cam.y / TILE), y1 = Math.ceil((cam.y + VH) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const c = lvl.get(tx, ty);
      if (c === '.') continue;
      const sx = tx * TILE - cam.x, sy = ty * TILE - cam.y;
      const v = Math.floor(hash(tx * 13 + ty * 7) * 4);
      if (c === '#') {
        let depth = 0;
        if (lvl.solid(tx, ty - 1)) depth = lvl.solid(tx, ty - 2) ? 2 : 1;
        ctx.drawImage(rockTile(v, depth), sx, sy);
        if (!lvl.solid(tx, ty - 1)) ctx.drawImage(ashCap((tx * 7) % 5), sx, sy);
        if (!lvl.solid(tx - 1, ty)) { ctx.fillStyle = '#121114'; ctx.fillRect(sx, sy, 1, TILE); ctx.fillStyle = '#3d3a40'; ctx.fillRect(sx + 1, sy + 1, 1, TILE - 2); }
        if (!lvl.solid(tx + 1, ty)) { ctx.fillStyle = '#121114'; ctx.fillRect(sx + TILE - 1, sy, 1, TILE); }
        if (!lvl.solid(tx, ty + 1) && ty + 1 < lvl.g.length) { ctx.fillStyle = '#121114'; ctx.fillRect(sx, sy + TILE - 1, TILE, 1); }
      } else if (c === '=') {
        ctx.drawImage(plankTile(v % 3), sx, sy);
      } else if (c === 'X') {
        ctx.drawImage(rockTile(1, 1), sx, sy);
        ctx.globalAlpha = 0.55 + Math.sin(time * 3 + ty) * 0.35;
        ctx.fillStyle = '#e17a3d';
        ctx.fillRect(sx + 7, sy, 1, 5); ctx.fillRect(sx + 6, sy + 5, 1, 4); ctx.fillRect(sx + 8, sy + 9, 1, 7); ctx.fillRect(sx + 3, sy + 7, 3, 1); ctx.fillRect(sx + 10, sy + 3, 2, 1);
        ctx.globalAlpha = 1;
      } else if (c === 'G') {
        ctx.fillStyle = '#3d3238'; ctx.fillRect(sx + 1, sy, 14, TILE);
        ctx.fillStyle = '#2a2328'; ctx.fillRect(sx + 1, sy, 2, TILE); ctx.fillRect(sx + 1, sy + 7, 14, 1);
        ctx.fillStyle = '#524650'; ctx.fillRect(sx + 13, sy, 1, TILE);
        ctx.globalAlpha = 0.6 + Math.sin(time * 4) * 0.3; ctx.fillStyle = '#c0303a';
        ctx.fillRect(sx + 7, sy + 3, 2, 3); ctx.fillRect(sx + 6, sy + 10, 4, 1);
        ctx.globalAlpha = 1;
      }
    }
  }
}

// ---------- adereços ----------
function drawProp(ctx, pr, cam, time) {
  const sx = Math.round(pr.x - cam.x), sy = Math.round(pr.y - cam.y);
  if (sx < -90 || sx > VW + 90) return;
  const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(sx + x, sy + y, w, h); };
  switch (pr.type) {
    case 'house': {
      // casa de pedra vulcânica com telhado de chapa
      const w = 48, h = 30, l = -w / 2;
      R(l - 1, -h - 1, w + 2, h + 1, '#0e0d10');
      R(l, -h, w, h, '#2c282c');
      for (let r = 0; r < 5; r++) for (let k = 0; k < 6; k++) {
        const o = r % 2 ? 4 : 0;
        R(l + k * 8 + o, -h + r * 6, 7, 5, hash(r * 9 + k + pr.x) > 0.5 ? '#332e33' : '#2f2a2e');
      }
      R(l, -h, w, 2, '#3d373c');
      // telhado de chapa ondulada
      const rx = pr.v ? -8 : 8;
      for (let k = 0; k < 20; k++) {
        const y = -h - k;
        const half = Math.round((w / 2 + 6) * (1 - k / 20));
        R(rx * (k / 20) - half, y, half * 2, 1, k % 3 === 0 ? '#5c5f66' : '#4b4d52');
      }
      R(-w / 2 - 6, -h, w + 12, 1, '#2a2b30');
      R(l + 8, -h - 2, 2, 2, '#7a5a44');
      // porta e janela iluminada
      R(-5, -16, 10, 16, '#140f10'); R(-5, -16, 10, 1, '#3a2a22'); R(3, -9, 1, 1, '#b66a3b');
      const lit = 0.75 + Math.sin(time * 5 + pr.x) * 0.15;
      ctx.globalAlpha = lit; R(10, -24, 8, 6, '#d98a52'); ctx.globalAlpha = 1;
      R(13, -24, 1, 6, '#2c282c'); R(10, -21, 8, 1, '#2c282c');
      R(10, -18, 8, 1, '#3d373c');
      break;
    }
    case 'bellpost': {
      // poste torto com sino rachado (alarme de vento)
      for (let k = 0; k < 44; k++) R(Math.round(k / 15) - 1, -k, 3, 1, '#231a1c');
      R(1, -44, 14, 2, '#2e2224'); R(12, -44, 2, 5, '#231a1c');
      const sw = Math.round(Math.sin(time * 1.6 + pr.x) * 2);
      R(13 + sw, -42, 1, 4, '#625b58');
      R(9 + sw, -38, 9, 2, '#5a3d28'); R(8 + sw, -36, 11, 6, '#6d4b32'); R(8 + sw, -36, 3, 6, '#4a3424'); R(16 + sw, -36, 1, 5, '#8b633f');
      R(8 + sw, -30, 11, 1, '#e17a3d'); R(13 + sw, -35, 1, 4, '#b66a3b');
      break;
    }
    case 'fallenbell': {
      R(-13, -15, 26, 15, '#0e0d10');
      R(-12, -14, 24, 14, '#6d4b32'); R(-12, -14, 6, 14, '#4a3424'); R(6, -13, 2, 12, '#8b633f');
      R(-10, -17, 18, 4, '#5a3d28');
      R(-2, -12, 1, 6, '#e17a3d'); R(-1, -6, 1, 3, '#e17a3d'); R(4, -10, 1, 5, '#b66a3b');
      R(-14, -2, 28, 2, '#625b58'); R(-16, -1, 4, 1, '#7a726c');
      break;
    }
    case 'column': {
      const h = pr.broken ? 36 : 62;
      R(-8, -h - 1, 16, h + 1, '#0e0d10');
      R(-7, -h, 14, h, '#2b292e');
      R(-7, -h, 3, h, '#37343b'); R(-1, -h, 1, h, '#232126'); R(3, -h, 1, h, '#232126'); R(5, -h, 2, h, '#1d1c20');
      R(-9, -4, 18, 4, '#3a373f'); R(-9, -4, 18, 1, '#4a4650');
      if (pr.broken) { R(-7, -h - 3, 4, 3, '#2b292e'); R(-3, -h - 1, 3, 1, '#2b292e'); R(-12, -3, 5, 3, '#2b292e'); }
      else { R(-9, -h - 5, 18, 5, '#3a373f'); R(-9, -h - 5, 18, 1, '#4a4650'); }
      R(-7, -h, 14, 2, '#625b58');
      break;
    }
    case 'bigbell': {
      // grande sino do campanário caído, correntes e anéis de pedra no chão
      for (let k = 0; k < 4; k++) {
        const cx = [-70, -30, 34, 76][k];
        const sw = Math.round(Math.sin(time * (0.7 + k * 0.2) + k) * 3);
        for (let y = -200; y < -60 - k * 14; y += 3) { R(cx + Math.round(sw * (y + 200) / 140), y, 1, 2, '#4a4650'); R(cx + 1 + Math.round(sw * (y + 200) / 140), y + 1, 1, 1, '#2b2a2f'); }
      }
      R(-1, -200, 2, 92, '#2b2a2f');
      const sw = Math.round(Math.sin(time * 0.8) * 3);
      for (let y = 0; y < 34; y++) {
        const half = Math.round(10 + 12 * Math.pow(y / 34, 0.7));
        R(sw - half - 1, -108 + y, half * 2 + 2, 1, '#0e0d10');
        R(sw - half, -108 + y, half * 2, 1, '#4a3424');
        R(sw - half, -108 + y, Math.round(half * 0.5), 1, '#3a2a1e');
        R(sw + Math.round(half * 0.4), -108 + y, 2, 1, '#6d4b32');
      }
      R(sw - 24, -74, 48, 3, '#3a2a1e'); R(sw - 22, -72, 44, 1, '#b66a3b');
      // anéis quebrados do piso circular
      for (const [w, col] of [[150, '#4a4441'], [100, '#5a534f'], [52, '#6f6762']]) {
        for (let x = -w / 2; x < w / 2; x += 4) if (hash(x + w) > 0.18) R(x, -1, 3, 1, col);
      }
      break;
    }
  }
}

function drawInteractable(ctx, it, world, cam, time) {
  const sx = Math.round(it.x - cam.x), sy = Math.round(it.y - cam.y);
  if (sx < -40 || sx > VW + 40) return;
  const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(sx + x, sy + y, w, h); };
  if (it.type === 'shrine') {
    // pira de repouso: bacia de pedra com brasas vivas
    R(-11, -8, 22, 8, '#0e0d10'); R(-10, -7, 20, 7, '#3a3538'); R(-10, -7, 20, 1, '#524a4e'); R(-6, -1, 12, 1, '#2b2a2f');
    R(-8, -10, 16, 3, '#2b2a2f'); R(-8, -10, 16, 1, '#625b58');
    const f = Math.sin(time * 12), g = Math.sin(time * 17 + 1);
    R(-6, -15 + Math.round(f), 12, 5, '#b66a3b');
    R(-4, -20 + Math.round(g), 8, 7, '#e17a3d');
    R(-2, -24 - Math.round(f), 4, 7, '#ffb070');
    R(-1, -19, 2, 5, '#fff0c8');
    R(-3, -26 - Math.round(g), 1, 2, '#ffb070'); R(2, -23 + Math.round(f), 1, 2, '#e17a3d');
    if (Math.random() < 0.25) world.fx.parts.push({ x: it.x + (Math.random() - 0.5) * 8, y: it.y - 22, vx: (Math.random() - 0.5) * 8, vy: -26, life: 1, max: 1, color: Math.random() < 0.5 ? '#ffb070' : '#e17a3d', grav: 0, size: 1 });
  } else if (it.type === 'elion') {
    drawNPC(ctx, sx, sy, time);
  } else if (it.type === 'chest') {
    const open = world.flags.chests[it.id];
    R(-9, -11, 18, 11, '#0e0d10');
    R(-8, -10, 16, 10, '#4a3424'); R(-8, -10, 16, 1, '#6d4b32'); R(-8, -5, 16, 1, '#2a1e16');
    R(-8, -10, 2, 10, '#8b633f'); R(6, -10, 2, 10, '#8b633f');
    R(-1, -7, 2, 3, open ? '#3a2a1e' : '#d4b66f');
    if (open) { R(-8, -14, 16, 4, '#2a1e16'); R(-8, -14, 16, 1, '#4a3424'); }
    else { R(-8, -13, 16, 3, '#5a3d28'); R(-8, -13, 16, 1, '#7a5a44'); }
  } else if (it.type === 'stone') {
    R(-6, -21, 12, 21, '#0e0d10');
    R(-5, -20, 10, 20, '#3a373f'); R(-5, -20, 3, 20, '#2b2a2f'); R(-5, -20, 10, 1, '#4a4650');
    ctx.globalAlpha = 0.7 + Math.sin(time * 2) * 0.2;
    R(-1, -16, 4, 1, '#d98a52'); R(0, -14, 1, 5, '#d98a52'); R(-2, -9, 5, 1, '#d98a52');
    ctx.globalAlpha = 1;
  }
}

function lights(ctx, world, cam, time) {
  ctx.globalCompositeOperation = 'lighter';
  const L = (x, y, r, col, a) => light(ctx, x - cam.x, y - cam.y, r, col, a);
  for (const it of world.interactables) {
    if (it.type === 'shrine') L(it.x, it.y - 16, 56, '#b65a2b', 0.55 + Math.sin(time * 9) * 0.06);
    if (it.type === 'elion') L(it.x + 7, it.y - 24, 14, '#5aa6a0', 0.5);
    if (it.type === 'chest' && !world.flags.chests[it.id]) L(it.x, it.y - 6, 18, '#b0893a', 0.35);
    if (it.type === 'stone') L(it.x, it.y - 12, 16, '#b65a2b', 0.3);
  }
  for (const pr of world.level.props) {
    if (pr.type === 'house') L(pr.x + 14, pr.y - 21, 22, '#b65a2b', 0.45);
    if (pr.type === 'bellpost') L(pr.x + 13, pr.y - 30, 10, '#b65a2b', 0.25);
  }
  const p = world.player;
  L(p.cx() + (p.facing > 0 ? -1 : 1), p.y + 10, 10, '#a72f2f', 0.45 + Math.sin(time * 4) * 0.15);
  if (p.action === 'cast') L(p.cx() + p.facing * 8, p.y + 8, 20, '#d06a30', 0.6);
  for (const m of [...world.mobs, ...world.summons]) {
    if (m.dead) continue;
    const warn = m.state.endsWith('Wind') || m.state === 'windup' || m.state === 'wind';
    const col = m.type === 'sino' ? '#c0562a' : '#b0602a';
    L(m.cx(), m.cy(), m.type === 'sino' ? 34 : 14, col, warn ? 0.55 : 0.2);
  }
  const b = world.boss;
  if (b && !b.dead && b.state !== 'dormant') {
    const tel = b.telegraph();
    if (tel) L(b.cx(), b.y + 10, 30, tel === 'parry' ? '#b09a2a' : '#b0302a', 0.5);
    if (b.state === 'bellSway') L(b.cx() - b.facing * 9, b.y + 14, 26, '#d06a30', 0.7);
  }
  for (const o of world.fx.objs) {
    if (o.constructor.name === 'Projectile') L(o.x, o.y, o.owner === 'player' ? 22 : 12, o.owner === 'player' ? '#d06a30' : '#7a4a30', 0.6);
    else if (o.constructor.name === 'AshPatch') { const arming = o.t > o.fuse - o.warn; L(o.x, o.y - 3, arming ? 26 : 10, arming ? '#d0502a' : '#5a534f', arming ? 0.6 : 0.2); }
    else if (o.constructor.name === 'Shockwave') L(o.x, o.y - 5, 18, '#d06a30', 0.5);
  }
  ctx.globalCompositeOperation = 'source-over';
}

// Vinheta e tom geral, gerados uma vez
let vignette = null;
function drawVignette(ctx) {
  if (!vignette) {
    vignette = document.createElement('canvas'); vignette.width = VW; vignette.height = VH;
    const c = vignette.getContext('2d');
    const g = c.createRadialGradient(VW / 2, VH * 0.55, VH * 0.35, VW / 2, VH * 0.55, VW * 0.72);
    g.addColorStop(0, 'rgba(8,6,10,0)'); g.addColorStop(1, 'rgba(8,6,10,0.62)');
    c.fillStyle = g; c.fillRect(0, 0, VW, VH);
  }
  ctx.drawImage(vignette, 0, 0);
}

// ---------- HUD ----------
export function text(ctx, s, x, y, color = '#e8e0d0', align = 'left', size = 8, shadow = '#0a090c') {
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  if (shadow) { ctx.fillStyle = shadow; ctx.fillText(s, Math.round(x) + 1, Math.round(y) + 1); ctx.fillText(s, Math.round(x), Math.round(y) + 1); }
  ctx.fillStyle = color; ctx.fillText(s, Math.round(x), Math.round(y));
}
export function wrap(ctx, s, maxW, size = 8) {
  ctx.font = `${size}px ${FONT}`;
  const words = s.split(' '), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  return lines;
}

function frameBox(ctx, x, y, w, h, accent = '#6d4b32') {
  ctx.fillStyle = '#0a090c'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = accent; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = '#141216'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#1f1c21'; ctx.fillRect(x, y, w, 1);
}

function bar(ctx, x, y, w, h, frac, col, hi, ghost) {
  ctx.fillStyle = '#0a090c'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = '#3a2f2a'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = '#121014'; ctx.fillRect(x, y, w, h);
  const f = Math.max(0, Math.min(1, frac));
  if (ghost !== undefined) { ctx.fillStyle = '#d9b58a'; ctx.fillRect(x, y, Math.round(w * Math.max(0, Math.min(1, ghost))), h); }
  ctx.fillStyle = col; ctx.fillRect(x, y, Math.round(w * f), h);
  ctx.fillStyle = hi; ctx.fillRect(x, y, Math.round(w * f), 1);
  // pontas ornamentais
  ctx.fillStyle = '#8b633f'; ctx.fillRect(x - 3, y + Math.floor(h / 2) - 1, 2, 2); ctx.fillRect(x + w + 1, y + Math.floor(h / 2) - 1, 2, 2);
}

function rune(ctx, x, y, time) {
  ctx.fillStyle = '#0a090c'; ctx.fillRect(x - 6, y - 6, 13, 13);
  ctx.fillStyle = '#3a2f2a';
  for (let i = -5; i <= 5; i++) { const w = 6 - Math.abs(i); ctx.fillRect(x - w, y + i, w * 2 + 1, 1); }
  ctx.fillStyle = '#141216';
  for (let i = -4; i <= 4; i++) { const w = 5 - Math.abs(i); ctx.fillRect(x - w, y + i, w * 2 + 1, 1); }
  ctx.fillStyle = Math.sin(time * 3) > 0 ? '#e0404a' : '#a72f2f';
  ctx.fillRect(x, y - 3, 1, 7); ctx.fillRect(x - 2, y - 1, 5, 1);
}

function slot(ctx, x, y, label, active, drawIcon, cdFrac = 0, keyHint) {
  frameBox(ctx, x, y, 18, 18, active ? '#d4b66f' : '#4a3d34');
  drawIcon(ctx, x, y);
  if (cdFrac > 0) { ctx.globalAlpha = 0.72; ctx.fillStyle = '#000'; ctx.fillRect(x, y, 18, Math.round(18 * cdFrac)); ctx.globalAlpha = 1; }
  if (label) text(ctx, label, x + 17, y + 17, '#e8e0d0', 'right', 8);
  if (keyHint) text(ctx, keyHint, x + 9, y + 27, '#6a635e', 'center', 8);
}

const ghost = { hp: 1, boss: 1 };

function drawHUD(ctx, world, time, dt) {
  const p = world.player;
  const touch = Input.touchMode;
  const hpFrac = p.hp / p.maxHp;
  ghost.hp = ghost.hp > hpFrac ? Math.max(hpFrac, ghost.hp - dt * 0.4) : hpFrac;
  rune(ctx, 13, 13, time);
  bar(ctx, 24, 8, 112, 5, hpFrac, '#a72f2f', '#d0505a', ghost.hp);
  if (p.healLeft > 0) { ctx.globalAlpha = 0.6; ctx.fillStyle = '#7fc48a'; ctx.fillRect(24 + Math.round(112 * hpFrac), 8, Math.round(112 * p.healLeft / p.maxHp), 5); ctx.globalAlpha = 1; }
  bar(ctx, 24, 17, 84, 2, p.vigor / p.maxVigor, '#8fb36a', '#b9d494');
  bar(ctx, 24, 23, 84, 2, p.foco / p.maxFoco, '#6b9ea3', '#a6d2d6');

  // espaços: frasco, Arcano I, Arcano II, grimório (no celular ficam no alto, longe do polegar)
  const by = touch ? 34 : VH - 34;
  const keys = !touch;
  slot(ctx, 10, by, String(p.potions), false, (c, x, y) => {
    c.fillStyle = '#d8d0c2'; c.fillRect(x + 7, y + 2, 4, 3);
    c.fillStyle = '#0a090c'; c.fillRect(x + 4, y + 5, 10, 11);
    c.fillStyle = p.potions > 0 ? '#4f8f5e' : '#2e2e30'; c.fillRect(x + 5, y + 6, 8, 9);
    c.fillStyle = p.potions > 0 ? '#7fc48a' : '#3a3a3c'; c.fillRect(x + 6, y + 7, 2, 4);
  }, 0, keys ? 'Q' : null);
  for (let i = 0; i < 2; i++) {
    const a = p.arcana[i];
    const cd = a ? (p.cooldowns[a] || 0) / ARCANA[a].ability.cd : 0;
    slot(ctx, 36 + i * 24, by, null, p.activeSlot === i, (c, x, y) => {
      if (!a) { c.fillStyle = '#2a262b'; c.fillRect(x + 6, y + 8, 6, 2); return; }
      // carta de tarô em miniatura
      c.fillStyle = '#d4b66f'; c.fillRect(x + 4, y + 2, 10, 14);
      c.fillStyle = '#29272a'; c.fillRect(x + 5, y + 3, 8, 12);
      c.fillStyle = ARCANA[a].color; c.fillRect(x + 8, y + 5, 2, 2); c.fillRect(x + 7, y + 8, 4, 1); c.fillRect(x + 8, y + 9, 2, 4);
      c.fillStyle = '#d4b66f'; c.fillRect(x + 8, y + 13, 2, 1);
    }, cd, keys ? (i === 0 ? 'F' : 'Tab') : null);
  }
  slot(ctx, 88, by, null, false, (c, x, y) => {
    if (!world.flags.brasa) return;
    const ok = p.foco >= 18;
    c.fillStyle = ok ? '#b66a3b' : '#4a3020'; c.fillRect(x + 5, y + 8, 8, 7);
    c.fillStyle = ok ? '#e17a3d' : '#5a3a2a'; c.fillRect(x + 6, y + 5, 6, 7);
    c.fillStyle = ok ? '#ffd27a' : '#6a4a3a'; c.fillRect(x + 8, y + 3, 2, 7);
  }, 0, keys ? 'R' : null);

  // barra do chefe
  const b = world.boss;
  if (world.arenaLocked && b && !b.dead && b.state !== 'dormant') {
    const frac = b.hp / b.def.hp;
    ghost.boss = ghost.boss > frac ? Math.max(frac, ghost.boss - dt * 0.25) : frac;
    const w = touch ? 180 : 230, x = Math.round((VW - w) / 2) + (touch ? -40 : 30), y = touch ? 26 : VH - 20;
    text(ctx, b.def.name.toUpperCase(), x, y - 5, '#d9b58a', 'left', 8);
    bar(ctx, x, y, w, 4, frac, '#a72f2f', '#d0505a', ghost.boss);
    ctx.fillStyle = '#ffd27a'; ctx.fillRect(x + w / 2 - 30, y + 7, Math.round(60 * Math.min(1, b.posture / b.def.posture)), 1);
  }

  // indicação de interação
  if (!world.dialog && !p.action) {
    const fin = world.finisherTarget();
    const it = world.nearbyInteractable();
    let label = null, lx = 0, ly = 0;
    if (fin) { label = 'E  FINALIZAR'; lx = fin.cx(); ly = fin.y - 18; }
    else if (it) { label = 'E  ' + { shrine: 'DESCANSAR', elion: 'CONVERSAR', chest: 'ABRIR', stone: 'LER' }[it.type]; lx = it.x; ly = it.y - 36; }
    if (label) {
      const x = Math.round(lx - world.cam.x), y = Math.round(ly - world.cam.y);
      ctx.font = `8px ${FONT}`;
      const w = Math.ceil(ctx.measureText(label).width) + 8;
      ctx.globalAlpha = 0.8; ctx.fillStyle = '#0a090c'; ctx.fillRect(x - w / 2, y - 8, w, 11); ctx.globalAlpha = 1;
      ctx.fillStyle = '#d4b66f'; ctx.fillRect(x - w / 2, y + 3, w, 1);
      text(ctx, label, x, y, '#f0e0b8', 'center', 8, null);
    }
  }

  world.toasts.forEach((t, i) => {
    ctx.globalAlpha = Math.max(0, Math.min(1, (t.dur - t.t) * 3, t.t * 6));
    text(ctx, t.text, VW / 2, (touch ? 70 : 46) + i * 11, '#e8e0d0', 'center', 8);
    ctx.globalAlpha = 1;
  });

  if (world.banner) {
    const bn = world.banner;
    const a = Math.max(0, Math.min(1, bn.t * 2, (bn.dur - bn.t) * 2));
    ctx.globalAlpha = a * 0.75; ctx.fillStyle = '#0a090c'; ctx.fillRect(0, VH / 2 - 26, VW, 46);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#6d4b32'; ctx.fillRect(VW / 2 - 90, VH / 2 - 24, 180, 1); ctx.fillRect(VW / 2 - 90, VH / 2 + 18, 180, 1);
    text(ctx, bn.text, VW / 2, VH / 2 - 2, bn.small ? '#e8e0d0' : '#e8c98e', 'center', bn.small ? 8 : 16);
    text(ctx, bn.sub, VW / 2, VH / 2 + 12, '#a59d95', 'center', 8);
    ctx.globalAlpha = 1;
  }

  if (world.dialog) {
    const d = world.dialog;
    const [who, msg] = d.lines[d.i];
    const x = 20, w = VW - 40, h = 64, y = touch ? 34 : VH - h - 10;
    ctx.globalAlpha = 0.92; frameBox(ctx, x, y, w, h, '#6d4b32'); ctx.globalAlpha = 1;
    ctx.fillStyle = '#8b633f'; ctx.fillRect(x + 4, y + 4, 3, 3);
    text(ctx, who.toUpperCase(), x + 11, y + 10, '#d9b58a', 'left', 8);
    const shown = msg.slice(0, Math.floor(d.chars));
    wrap(ctx, shown, w - 18, 8).slice(0, 5).forEach((ln, i) => text(ctx, ln, x + 9, y + 22 + i * 9, '#e8e0d0', 'left', 8));
    if (d.chars >= msg.length && Math.sin(time * 6) > 0) { ctx.fillStyle = '#d4b66f'; ctx.fillRect(x + w - 10, y + h - 7, 5, 1); ctx.fillRect(x + w - 9, y + h - 6, 3, 1); ctx.fillRect(x + w - 8, y + h - 5, 1, 1); }
  }
}

// ---------- quadro completo ----------
export function renderWorld(ctx, world, time, dt) {
  const cam = { x: world.cam.x, y: world.cam.y };
  if (world.shake > 0) { cam.x += (Math.random() - 0.5) * world.shake; cam.y += (Math.random() - 0.5) * world.shake; }
  cam.x = Math.round(cam.x); cam.y = Math.round(cam.y);
  backdrop(ctx, cam, time, world);
  ashFall(ctx, cam, time, world, 0);
  for (const pr of world.level.props) drawProp(ctx, pr, cam, time);
  for (const it of world.interactables) drawInteractable(ctx, it, world, cam, time);
  drawTiles(ctx, world, cam, time);
  lights(ctx, world, cam, time);
  for (const m of [...world.mobs, ...world.summons]) {
    const sx = m.cx() - cam.x, sy = m.y + m.h - cam.y;
    if (sx < -50 || sx > VW + 50) continue;
    drawMob(ctx, m, sx, sy, time);
  }
  const b = world.boss;
  if (b) drawAsgmor(ctx, b, b.cx() - cam.x, b.y + b.h - cam.y, time);
  const p = world.player;
  drawErrante(ctx, p, p.cx() - cam.x, p.y + p.h - cam.y, time);
  world.fx.draw(ctx, cam);
  ashFall(ctx, cam, time, world, 1);
  drawVignette(ctx);
  if (world.flashScreen > 0) { ctx.globalAlpha = world.flashScreen * 3; ctx.fillStyle = '#fff3c4'; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1; }
  drawHUD(ctx, world, time, dt);
}

// Fundo reutilizado na tela-título
export function renderBackdrop(ctx, camX, time, world) {
  const cam = { x: camX, y: 120 };
  backdrop(ctx, cam, time, world);
  ashFall(ctx, cam, time, world, 0);
}
export { light, drawVignette };
