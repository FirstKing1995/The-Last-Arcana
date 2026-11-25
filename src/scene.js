// Cenário do Vale das Cinzas: céu e ruínas pintados, parallax, névoa, raios de sol e tiles com textura.
// Paleta da ficha da AREA_01: carvão #292A32, cinza de neve #AEB9C5, bronze gasto #80664C, brasa residual #C86C43.
import { TILE } from './physics.js';
import { S, r2, canvas } from './hd.js';
import { img } from './art.js';

const VW = 384, VH = 216;
export function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

// faixa horizontal que se repete
function strip(ctx, im, camx, p, y, k = 1) {
  const w = im.width / S * k, h = im.height / S * k;
  if (w < 8) return;
  let x = -((camx * p) % w); if (x > 0) x -= w;
  for (; x < VW; x += w) ctx.drawImage(im, r2(x), r2(y), w, h);
}
let hazeC = null, fogC = null;
function haze(ctx, y0, y1, rgb, a) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, `rgba(${rgb},0)`); g.addColorStop(1, `rgba(${rgb},${a})`);
  ctx.fillStyle = g; ctx.fillRect(0, y0, VW, VH - y0);
}
function makeFog() {
  const [c, x] = canvas(512, 96);
  for (let i = 0; i < 70; i++) {
    const px = hash(i) * 512, py = 40 + hash(i + 9) * 50, r = 22 + hash(i + 4) * 46;
    for (const dx of [-512, 0, 512]) {
      const g = x.createRadialGradient(px + dx, py, 0, px + dx, py, r);
      g.addColorStop(0, 'rgba(200,190,196,0.10)'); g.addColorStop(1, 'rgba(200,190,196,0)');
      x.fillStyle = g; x.fillRect(px + dx - r, py - r, r * 2, r * 2);
    }
  }
  return c;
}
export function fog(ctx, cam, time, y, par, a, speed) {
  if (!fogC) fogC = makeFog();
  ctx.globalAlpha = a; ctx.imageSmoothingEnabled = true;
  let x = -(((cam.x * par + time * speed) % 384) + 384) % 384;
  for (; x < VW; x += 384) ctx.drawImage(fogC, x, y, 384, 72);
  ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 1;
}

export function backdrop(ctx, cam, time, world) {
  const dy = cam.y - 640;
  ctx.fillStyle = '#0d1119'; ctx.fillRect(0, 0, VW, VH);
  strip(ctx, img.ceu, cam.x, 0.045, -66 - dy * 0.05, 1);
  // raios de sol
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const a = 0.035 + 0.03 * Math.sin(time * 0.35 + i * 1.7), x = 330 - i * 62 + Math.sin(time * 0.1 + i) * 10 - cam.x * 0.02 % 60;
    if (a <= 0) continue;
    const g = ctx.createLinearGradient(x, 20, x - 90, 210);
    g.addColorStop(0, `rgba(255,170,110,${a * 1.6})`); g.addColorStop(1, 'rgba(255,170,110,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, 10); ctx.lineTo(x + 26, 10); ctx.lineTo(x - 70, VH); ctx.lineTo(x - 150, VH); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  const ft = time % 11, flash = ft < 0.35 ? 1 - ft / 0.35 : 0;
  if (flash > 0) { ctx.globalAlpha = 0.14 * flash; ctx.fillStyle = '#e8c9a0'; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1; }
  const ty = 196 - dy * 0.17;
  if (img.torres.height > 4) { ctx.globalAlpha = 0.82; strip(ctx, img.torres, cam.x, 0.16, ty - img.torres.height / S, 1); ctx.globalAlpha = 1; ctx.fillStyle = '#2d3138'; ctx.fillRect(0, ty - 1, VW, VH); }
  haze(ctx, ty - 110, ty + 10, '150,104,92', 0.5);
  fog(ctx, cam, time, ty - 60, 0.2, 0.8, 5);
  const ry = 262 - dy * 0.36;
  if (img.ruinas.height > 4) { strip(ctx, img.ruinas, cam.x, 0.4, ry - img.ruinas.height / S, 1); ctx.fillStyle = '#0d0e12'; ctx.fillRect(0, ry - 1, VW, Math.max(0, VH - ry + 1)); }
  haze(ctx, Math.max(60, ry - 150), ry, '70,52,52', 0.34);
  fog(ctx, cam, time, Math.min(170, ry - 96), 0.45, 0.6, 9);
}

// Cinza e neve de cinza, oblíquas (ou subindo, depois que O Louco é libertado)
export function ashFall(ctx, cam, time, world, front) {
  const up = world.ashUp ? -1 : 1, n = front ? 34 : 90, par = front ? 1.25 : 0.6;
  for (let i = 0; i < n; i++) {
    const s = i + (front ? 500 : 0), sp = 14 + hash(s) * 26;
    const x = ((hash(s + 50) * VW * 2 + time * (22 + hash(s + 4) * 18) + Math.sin(time * 1.3 + s) * 6 - cam.x * par) % (VW + 20) + VW + 20) % (VW + 20) - 10;
    const y = ((hash(s + 99) * VH + up * time * sp - cam.y * par) % VH + VH) % VH;
    const ember = hash(s + 8) > 0.86;
    ctx.globalAlpha = (front ? 0.55 : 0.2 + hash(s + 3) * 0.45) * (ember ? 0.7 + 0.3 * Math.sin(time * 5 + s) : 1);
    ctx.fillStyle = ember ? '#ff9a52' : '#c3ccd6';
    const w = front && hash(s) > 0.6 ? 1.5 : hash(s + 1) > 0.7 ? 1 : 0.5;
    ctx.fillRect(r2(x), r2(y), w, w);
  }
  ctx.globalAlpha = 1;
}

// ---------- tiles ----------
const tc = new Map();
function tile(key, fn, w = 32, h = 32) { let c = tc.get(key); if (!c) { const [cv, x] = canvas(w, h); fn(x); c = cv; tc.set(key, c); } return c; }
// borda de cinza sobre a pedra: monte irregular com pingos
function cap(v, cave) {
  return tile(`c${v}${cave}`, (c) => {
    const C = cave ? ['#7d8290', '#565a66', '#3a3d46'] : ['#e3e9ef', '#aab4c0', '#6f7783'];
    for (let x = 0; x < 32; x++) {
      const h = (cave ? 5 : 8) + Math.round(Math.sin((x + v * 32) * 0.31) * 2 + Math.sin((x + v * 32) * 0.11) * 2);
      const drip = !cave && hash(x * 7 + v * 13) > 0.8 ? 4 + Math.round(hash(x + v) * 8) : 0;
      const up = hash(x * 5 + v * 3) > 0.7 ? 1 : 0;
      c.fillStyle = C[2]; c.fillRect(x, 4 - up, 1, h + 3 + drip);
      c.fillStyle = C[1]; c.fillRect(x, 4 - up, 1, h);
      c.fillStyle = C[0]; c.fillRect(x, 4 - up, 1, cave ? 1 : 2 + (hash(x + v * 5) > 0.5 ? 1 : 0));
      if (drip) { c.fillStyle = C[0]; c.fillRect(x, 4 + h, 1, 2); }
      if (!cave && hash(x * 3 + v * 7) > 0.95) { c.fillStyle = '#ff8a4a'; c.fillRect(x, 7, 1, 2); }
      // tufos e pedrinhas
      if (hash(x * 11 + v * 17) > 0.93) { c.fillStyle = cave ? '#4b5058' : '#8f98a4'; c.fillRect(x, 1, 1, 4); c.fillRect(x + 1, 2, 1, 3); }
    }
  }, 32, 40);
}
function plank(v, cave) {
  return tile(`p${v}${cave}`, (c) => {
    c.fillStyle = '#0e0b0d'; c.fillRect(0, 0, 32, 12);
    c.fillStyle = '#4a372b'; c.fillRect(0, 1, 32, 9);
    c.fillStyle = '#7a5a42'; c.fillRect(0, 1, 32, 2);
    c.fillStyle = '#34261f'; c.fillRect(0, 7, 32, 2); c.fillRect(9 + v * 5, 1, 1, 9); c.fillRect((25 + v * 7) % 32, 1, 1, 9);
    c.fillStyle = '#95734f'; c.fillRect(3 + v * 4, 2, 6, 1); c.fillRect(20, 3, 5, 1);
    c.fillStyle = '#5c4433'; for (let i = 0; i < 5; i++) c.fillRect(Math.floor(hash(v * 7 + i) * 28), 4 + (i % 3), 4, 1);
    c.fillStyle = '#9aa0aa'; c.fillRect(6, 4, 2, 2); c.fillRect(24, 4, 2, 2);
    if (!cave) { c.fillStyle = '#c3ccd6'; for (let x = 0; x < 32; x++) if (hash(x + v * 40) > 0.3) c.fillRect(x, 0, 1, 2); }
    c.fillStyle = '#0e0b0d'; c.fillRect(6 + v * 6, 11, 4, 8); c.fillStyle = '#3f2f26'; c.fillRect(7 + v * 6, 11, 2, 7);
  });
}
function bars(t) {
  return tile('bars' + t, (c) => {
    for (const x of [2, 12, 22]) { c.fillStyle = '#0b0a0d'; c.fillRect(x, 0, 8, 32); c.fillStyle = '#4b4d56'; c.fillRect(x + 1, 0, 5, 32); c.fillStyle = '#8a8e9a'; c.fillRect(x + 1, 0, 1, 32); }
    const k = t === 'K' ? '#7a2a2a' : t === 'M' ? '#80664c' : '#5a5c66';
    c.fillStyle = '#0b0a0d'; c.fillRect(0, 12, 32, 8); c.fillStyle = k; c.fillRect(0, 13, 32, 5); c.fillStyle = t === 'K' ? '#e0504a' : t === 'M' ? '#c0a070' : '#8a8e9a'; c.fillRect(0, 13, 32, 1);
  });
}

export function drawTiles(ctx, world, cam, time) {
  const l = world.level;
  const x0 = Math.floor(cam.x / TILE) - 1, x1 = Math.ceil((cam.x + VW) / TILE), y0 = Math.floor(cam.y / TILE) - 1, y1 = Math.ceil((cam.y + VH) / TILE);
  const fr = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
  const tex = (im, tx, ty, sx, sy) => { const u = ((tx * 32) % 512 + 512) % 512, v = ((ty * 32) % 512 + 512) % 512; ctx.drawImage(im, u, v, 32, 32, sx, sy, TILE, TILE); };
  // parede do fundo primeiro
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (!l.isCave(tx, ty) || l.get(tx, ty) === '#') continue;
    const sx = tx * TILE - cam.x, sy = ty * TILE - cam.y;
    tex(img.parede, tx, ty, sx, sy);
    const up = l.get(tx, ty - 1) === '#', dn = l.get(tx, ty + 1) === '#', lf = l.get(tx - 1, ty) === '#', rg = l.get(tx + 1, ty) === '#';
    // sombra de contato junto da pedra
    if (up) { ctx.globalAlpha = 0.5; fr(sx, sy, TILE, 3, '#04050a'); ctx.globalAlpha = 0.3; fr(sx, sy + 3, TILE, 5, '#04050a'); ctx.globalAlpha = 1; }
    if (dn) { ctx.globalAlpha = 0.28; fr(sx, sy + 9, TILE, 7, '#04050a'); ctx.globalAlpha = 1; }
    if (lf) { ctx.globalAlpha = 0.35; fr(sx, sy, 4, TILE, '#04050a'); ctx.globalAlpha = 1; }
    if (rg) { ctx.globalAlpha = 0.35; fr(sx + 12, sy, 4, TILE, '#04050a'); ctx.globalAlpha = 1; }
  }
  const caps = [];
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const c = l.get(tx, ty);
    if (c === '.') continue;
    const sx = tx * TILE - cam.x, sy = ty * TILE - cam.y;
    const v = Math.floor(hash(tx * 13 + ty * 7) * 6), cave = l.isCave(tx, ty);
    if (c === '#') {
      const up = l.solid(tx, ty - 1), lf = l.solid(tx - 1, ty), rg = l.solid(tx + 1, ty), dn = l.solid(tx, ty + 1);
      let d = 9;
      for (let k = 1; k <= 4 && d === 9; k++) if (!l.solid(tx, ty - k) || !l.solid(tx - k, ty) || !l.solid(tx + k, ty) || !l.solid(tx, ty + k)) d = k;
      if (d === 9) { fr(sx, sy, TILE, TILE, '#07080b'); continue; }
      tex(img.rocha, tx, ty, sx, sy);
      const sh = [0, 0, 0.3, 0.58, 0.8][d];
      if (sh) { ctx.globalAlpha = sh; fr(sx, sy, TILE, TILE, '#07080b'); ctx.globalAlpha = 1; }
      // arestas com luz e sombra
      if (!lf) { fr(sx, sy, 0.5, TILE, '#06070a'); fr(sx + 0.5, sy, 1, TILE, '#6a6f7c'); ctx.globalAlpha = 0.25; fr(sx + 1.5, sy, 3, TILE, '#9aa4b4'); ctx.globalAlpha = 1; }
      if (!rg) { fr(sx + TILE - 0.5, sy, 0.5, TILE, '#06070a'); fr(sx + TILE - 1.5, sy, 1, TILE, '#a0603c'); ctx.globalAlpha = 0.22; fr(sx + TILE - 5, sy, 3.5, TILE, '#c86c43'); ctx.globalAlpha = 1; }
      if (!dn) { ctx.globalAlpha = 0.55; fr(sx, sy + TILE - 5, TILE, 5, '#04050a'); ctx.globalAlpha = 1; fr(sx, sy + TILE - 0.5, TILE, 0.5, '#04050a'); if (v === 1) { fr(sx + 5, sy + TILE, 1, 4, '#2a2d36'); fr(sx + 11, sy + TILE, 0.5, 6, '#2a2d36'); } }
      if (!up) caps.push([tx, ty, sx, sy]);
    } else if (c === '=') ctx.drawImage(plank(v % 3, cave), sx, sy, TILE, TILE);
    else if (c === 'X') {
      tex(img.rocha, tx, ty, sx, sy);
      ctx.globalAlpha = 0.65 + Math.sin(time * 3 + ty) * 0.3;
      fr(sx + 7, sy, 1, 5, '#ff8a4a'); fr(sx + 6, sy + 5, 1, 4, '#ff8a4a'); fr(sx + 8, sy + 9, 1, 7, '#ff8a4a'); fr(sx + 3, sy + 7, 3, 0.5, '#ff8a4a'); fr(sx + 10, sy + 3, 2, 0.5, '#ff8a4a');
      ctx.globalAlpha = 1;
    } else if (c === 'D') { fr(sx, sy + 6, TILE, 10, '#0d0e11'); ctx.drawImage(plank(v % 3, false), sx, sy, TILE, TILE); } else if (c === 'H' || c === 'M' || c === 'K') {
      ctx.drawImage(bars(c), sx, sy, TILE, TILE);
      if (c === 'K') { ctx.globalAlpha = 0.5 + Math.sin(time * 3) * 0.3; fr(sx + 6, sy + 6, 4, 4, '#ff5a4a'); ctx.globalAlpha = 1; }
    } else if (c === 'G') {
      tex(img.rocha, tx, ty, sx, sy); fr(sx, sy, 1, TILE, '#0d0e11'); fr(sx + 15, sy, 1, TILE, '#0d0e11');
      ctx.globalAlpha = 0.6 + Math.sin(time * 4) * 0.3; fr(sx + 7.5, sy + 3, 1, 3, '#ff4a4a'); fr(sx + 6, sy + 10, 4, 0.5, '#ff4a4a'); ctx.globalAlpha = 1;
    }
  }
  for (const [tx, ty, sx, sy] of caps) ctx.drawImage(cap((tx * 7) % 5, l.isCave(tx, ty - 1)), sx, sy - 2, TILE, 20);
}

// Feixe de luz de uma janela
export function shaft(ctx, x, y, time, w = 26, len = 150, col = '255,214,140', a = 0.3) {
  ctx.globalCompositeOperation = 'lighter';
  const k = 0.85 + Math.sin(time * 0.8 + x) * 0.15;
  for (const [m, q] of [[1, 1], [0.55, 0.7]]) {
    const g = ctx.createLinearGradient(x, y, x + len * 0.55, y + len);
    g.addColorStop(0, `rgba(${col},${a * k * q})`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g; ctx.beginPath();
    ctx.moveTo(x - w / 2 * m, y - 26); ctx.lineTo(x + w / 2 * m, y - 34); ctx.lineTo(x + w * 1.1 * m + len * 0.62, y + len); ctx.lineTo(x - w * 0.6 * m + len * 0.4, y + len); ctx.fill();
  }
  // poeira dançando na luz
  for (let i = 0; i < 12; i++) {
    const t = (time * 0.06 + hash(i + x)) % 1, px = x + len * 0.5 * t + Math.sin(time + i * 2) * 8 + (hash(i) - 0.5) * 20, py = y + len * t;
    ctx.globalAlpha = 0.5 * Math.sin(t * Math.PI); ctx.fillStyle = '#ffe6b0'; ctx.fillRect(r2(px), r2(py), 0.5, 0.5);
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
