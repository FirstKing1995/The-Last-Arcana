// Cenário do Vale das Cinzas em alta densidade: céu, camadas de parallax, marco do campanário e tiles.
// Paleta da ficha da AREA_01: carvão #292A32, cinza de neve #AEB9C5, bronze gasto #80664C, brasa residual #C86C43.
import { TILE } from './physics.js';
import { S, r2, canvas } from './hd.js';

const VW = 384, VH = 216;
export function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

// ---------- céu ----------
let sky = null;
function makeSky() {
  const [c, x] = canvas(VW * S, VH * S);
  const g = x.createLinearGradient(0, 0, 0, VH * S);
  g.addColorStop(0, '#11131a'); g.addColorStop(0.35, '#1d2029'); g.addColorStop(0.62, '#31323c'); g.addColorStop(0.8, '#4a4044'); g.addColorStop(0.92, '#6a4a40'); g.addColorStop(1, '#5a3c34');
  x.fillStyle = g; x.fillRect(0, 0, VW * S, VH * S);
  const r = x.createRadialGradient(VW * 1.3, VH * 1.62, 8, VW * 1.3, VH * 1.62, VW * 1.1);
  r.addColorStop(0, 'rgba(200,108,67,0.4)'); r.addColorStop(1, 'rgba(200,108,67,0)');
  x.fillStyle = r; x.fillRect(0, 0, VW * S, VH * S);
  // nuvens de fuligem em faixas pixeladas
  for (let i = 0; i < 46; i++) {
    const y = 20 + hash(i) * 210, w = 60 + hash(i + 3) * 170, px = hash(i + 7) * VW * S - 60;
    x.fillStyle = i % 3 ? 'rgba(14,15,20,0.22)' : 'rgba(120,124,140,0.07)';
    for (let k = 0; k < 6; k++) { const ww = w * (1 - Math.abs(k - 2.5) / 4); x.fillRect(Math.round((px + (w - ww) / 2) / 2) * 2, Math.round((y + k * 3) / 2) * 2, Math.round(ww / 2) * 2, 4); }
  }
  for (let i = 0; i < 50; i++) { x.fillStyle = `rgba(174,185,197,${0.1 + hash(i) * 0.25})`; x.fillRect(Math.floor(hash(i + 9) * VW * S), Math.floor(hash(i + 3) * VH * 0.7), 2, 2); }
  return c;
}

// ---------- camadas (faixas que se repetem) ----------
const LW = 1920, LH = 720, BASE = 400; // em pixels reais
function wave(x, seed, amps) { let h = 0; amps.forEach(([k, a], i) => { h += Math.sin(x / LW * Math.PI * 2 * k + seed * (i + 1) * 1.7) * a; }); return h; }
function ridge(c, seed, amps, base, col, snow, step = 2) {
  for (let x = 0; x < LW; x += step) {
    const h = wave(x, seed, amps) + (hash(Math.floor(x / 8) + seed * 77) - 0.5) * 8;
    const y = Math.round((base - h) / 2) * 2;
    c.fillStyle = col; c.fillRect(x, y, step, LH - y);
    if (snow) { c.fillStyle = snow; c.fillRect(x, y, step, 2 + (hash(x) > 0.6 ? 2 : 0)); }
  }
}
function haze(c, y0, y1, rgb, a) {
  const g = c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, `rgba(${rgb},0)`); g.addColorStop(1, `rgba(${rgb},${a})`);
  c.fillStyle = g; c.fillRect(0, y0, LW, LH - y0);
}
// Torre de campanário em silhueta com pedra, janela e sino
export function tower(c, x, base, w, h, o) {
  const R = (a, b, cc, d, col) => { c.fillStyle = col; c.fillRect(Math.round(a), Math.round(b), Math.round(cc), Math.round(d)); };
  const top = base - h;
  R(x, top, w, h, o.col);
  for (let y = top + 6; y < base; y += 14) for (let k = 0; k < w; k += 18) if (hash(y * 3 + k + x) > 0.55) R(x + k + ((y / 14) & 1 ? 6 : 0), y, 10, 2, o.lit);
  R(x, top, 2, h, o.lit); R(x + w - 4, top, 4, h, o.dark);
  // cornija, câmara do sino e telhado
  R(x - 6, top - 6, w + 12, 8, o.col); R(x - 6, top - 6, w + 12, 2, o.snow);
  const ch = w * 0.95;
  R(x + 2, top - 6 - ch, w - 4, ch, o.col);
  c.fillStyle = o.win; const aw = w * 0.52, ax = x + w / 2 - aw / 2, ay = top - 8;
  for (let k = 0; k < aw; k += 2) { const ah = ch * 0.45 + Math.sqrt(Math.max(0, 1 - ((k + 1) / (aw / 2) - 1) ** 2)) * ch * 0.35; c.fillRect(Math.round(ax + k), Math.round(ay - ah), 2, Math.round(ah)); }
  for (let k = 0; k < ch * 0.42; k += 2) { const hw = w * (0.07 + 0.15 * Math.pow(k / (ch * 0.42), 0.8)); R(x + w / 2 - hw, ay - ch * 0.62 + k, hw * 2, 2, o.bell); }
  R(x - 2, top - 10 - ch, w + 4, 6, o.col); R(x - 2, top - 10 - ch, w + 4, 2, o.snow);
  if (!o.broken) { for (let k = 0; k < w * 0.9; k += 2) { const hw = (w / 2 + 2) * (1 - k / (w * 0.9)); R(x + w / 2 - hw, top - 10 - ch - k, hw * 2, 2, o.col); if (k % 6 === 0) R(x + w / 2 - hw, top - 10 - ch - k, 4, 2, o.snow); } R(x + w / 2 - 1, top - 10 - ch - w * 0.9 - 14, 2, 16, o.col); } else { for (let k = 0; k < w; k += 4) R(x + k, top - 10 - ch - hash(k + x) * 22, 4, 24, o.col); }
}
function tree(c, x, base, h, col, snow, id) {
  c.fillStyle = col;
  for (let k = 0; k < h; k += 2) c.fillRect(Math.round(x + Math.sin(k / 22 + id) * 3), base - k, Math.max(2, 8 - Math.round(k / h * 6)), 2);
  for (let i = 0; i < 6; i++) {
    const by = base - h * (0.35 + i * 0.1), dir = (i + id) % 2 ? 1 : -1, len = 14 + hash(id + i) * 22;
    for (let k = 0; k < len; k += 2) { const xx = x + 3 + dir * k, yy = by - k * 0.6 - Math.sin(k / 6) * 2; c.fillStyle = col; c.fillRect(Math.round(xx), Math.round(yy), 3, 2); if (k % 6 === 0) { c.fillStyle = snow; c.fillRect(Math.round(xx), Math.round(yy) - 1, 2, 1); } }
  }
}
let layers = null;
function layer(fn) { const [c, x] = canvas(LW, LH); fn(x); return c; }
function build() {
  const t1 = { col: '#2c2e38', lit: '#363945', dark: '#24262e', snow: '#5b626f', win: '#7a5346', bell: '#2c2e38' };
  const t2 = { col: '#1f2027', lit: '#2a2c35', dark: '#181920', snow: '#59606d', win: '#94583d', bell: '#17181d' };
  layers = [
    { p: 0.05, v: 0.06, y: 158, c: layer((c) => { ridge(c, 2, [[2, 34], [5, 18], [11, 8]], BASE - 30, '#373943', '#4c505c'); haze(c, BASE - 90, BASE + 30, '90,86,92', 0.4); }) },
    { p: 0.12, v: 0.1, y: 172, c: layer((c) => {
      for (let i = 0; i < 12; i++) tower(c, 30 + i * 158 + hash(i) * 60, BASE + 10, 26 + Math.floor(hash(i + 4) * 3) * 6, 80 + hash(i + 5) * 110, { ...t1, broken: hash(i + 8) > 0.6 });
      ridge(c, 5, [[3, 14], [8, 7]], BASE + 4, '#2c2e38', '#4b515d'); haze(c, BASE - 50, BASE + 40, '86,70,68', 0.42);
    }) },
    { p: 0.26, v: 0.2, y: 186, c: layer((c) => {
      for (let i = 0; i < 9; i++) {
        const x = 40 + i * 212 + hash(i + 40) * 70, k = Math.floor(hash(i + 21) * 4);
        if (k === 0) tower(c, x, BASE + 8, 40, 96 + hash(i) * 60, { ...t2, broken: 1 });
        else if (k === 1) { // arco partido
          c.fillStyle = t2.col; c.fillRect(x, BASE - 96, 16, 110); c.fillRect(x + 74, BASE - 60, 16, 74);
          for (let q = 0; q < 60; q += 2) c.fillRect(Math.round(x + 6 + q), Math.round(BASE - 98 - Math.sin(q / 90 * Math.PI) * 22), 4, 12);
          c.fillStyle = t2.snow; c.fillRect(x, BASE - 98, 16, 3); c.fillRect(x + 74, BASE - 62, 16, 3);
        } else if (k === 2) { // casa de pedra com telhado de chapa
          c.fillStyle = t2.col; c.fillRect(x, BASE - 40, 70, 54);
          for (let q = 0; q < 34; q += 2) { c.fillRect(x - 8 + q * 0.7, BASE - 40 - q, 86 - q * 1.6, 2); }
          c.fillStyle = t2.snow; for (let q = 0; q < 34; q += 2) c.fillRect(Math.round(x - 8 + q * 0.7), BASE - 40 - q, 5, 2);
          c.fillStyle = '#c8713f'; c.fillRect(x + 42, BASE - 24, 10, 10);
        } else tree(c, x, BASE + 8, 110, t2.col, t2.snow, i);
      }
      ridge(c, 9, [[4, 10], [9, 6]], BASE + 2, '#1f2027', '#59606d'); haze(c, BASE - 30, BASE + 60, '70,46,40', 0.35);
    }) },
    { p: 0.48, v: 0.38, y: 206, c: layer((c) => {
      for (let i = 0; i < 12; i++) { const x = 20 + i * 160 + hash(i + 70) * 60; if (hash(i + 60) > 0.45) tree(c, x, BASE + 10, 120 + hash(i) * 50, '#14151a', '#454b57', i + 5); else { c.fillStyle = '#14151a'; c.fillRect(x, BASE - 70, 20, 90); c.fillRect(x - 4, BASE - 74, 28, 6); c.fillStyle = '#4b525f'; c.fillRect(x - 4, BASE - 76, 28, 2); } }
      ridge(c, 14, [[5, 8], [13, 5]], BASE, '#14151a', '#3d434e');
    }) },
  ];
  // marco: o Campanário Caído, visto de longe o vale inteiro
  const [m, x] = canvas(360, 640);
  const o = { col: '#24262f', lit: '#31343f', dark: '#1a1b22', snow: '#76808f', win: '#b8673c', bell: '#15161b', broken: 1 };
  x.fillStyle = o.col; for (let k = 0; k < 150; k += 2) x.fillRect(Math.round(40 + k * 0.05), 490 + k, Math.round(270 - k * 0.1), 2);
  tower(x, 118, 560, 96, 330, o);
  tower(x, 60, 560, 46, 180, { ...o, win: '#7a5346' }); tower(x, 232, 560, 52, 130, { ...o, win: '#7a5346' });
  for (let k = 0; k < 6; k++) { x.fillStyle = '#7a5346'; x.fillRect(160, 290 + k * 46, 8, 16); }
  landmark = m;
}
let landmark = null;

export function backdrop(ctx, cam, time, world) {
  if (!sky) sky = makeSky();
  if (!layers) build();
  ctx.drawImage(sky, 0, 0, VW, VH);
  const ft = time % 11, flash = ft < 0.35 ? 1 - ft / 0.35 : 0;
  if (flash > 0) { ctx.globalAlpha = 0.16 * flash; ctx.fillStyle = '#e8c9a0'; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1; }
  const high = world.room && /D17|D18|ARENA/.test(world.room.id);
  layers.forEach((l, i) => {
    const y = r2(l.y - (cam.y - 640) * l.v) - BASE / S;
    if (i === 2 && !high) {
      const lx = 192 + (4330 - (cam.x + VW / 2)) * 0.035 - 90;
      ctx.drawImage(landmark, r2(lx), r2(-78 - (cam.y - 640) * 0.12), 180, 320);
      const sw = Math.sin(time * 1.1);
      ctx.globalAlpha = 0.5 + sw * 0.2; ctx.fillStyle = '#ffb070'; ctx.fillRect(r2(lx + 82 + sw * 3), r2(9 - (cam.y - 640) * 0.12), 2, 2); ctx.globalAlpha = 1;
    }
    let x = -((cam.x * l.p) % (LW / S)); if (x > 0) x -= LW / S;
    for (; x < VW; x += LW / S) ctx.drawImage(l.c, r2(x), y, LW / S, LH / S);
  });
}

// Cinza e neve de cinza, oblíquas (ou subindo, depois que O Louco é libertado)
export function ashFall(ctx, cam, time, world, front) {
  const up = world.ashUp ? -1 : 1, n = front ? 30 : 90, par = front ? 1.25 : 0.6;
  for (let i = 0; i < n; i++) {
    const s = i + (front ? 500 : 0), sp = 14 + hash(s) * 26;
    const x = ((hash(s + 50) * VW * 2 + time * (18 + hash(s + 4) * 14) - cam.x * par) % (VW + 20) + VW + 20) % (VW + 20) - 10;
    const y = ((hash(s + 99) * VH + up * time * sp - cam.y * par) % VH + VH) % VH;
    ctx.globalAlpha = front ? 0.5 : 0.18 + hash(s + 3) * 0.4;
    ctx.fillStyle = hash(s + 8) > 0.88 ? '#d98a52' : '#aeb9c5';
    const w = front && hash(s) > 0.6 ? 1.5 : hash(s + 1) > 0.7 ? 1 : 0.5;
    ctx.fillRect(r2(x), r2(y), w, w);
  }
  ctx.globalAlpha = 1;
}

// ---------- tiles ----------
const tc = new Map();
function tile(key, fn) { let c = tc.get(key); if (!c) { const [cv, x] = canvas(32, 32); fn(x); c = cv; tc.set(key, c); } return c; }
const ROCK = [['#34353e', '#2a2b33', '#454752', '#1f2027'], ['#2b2c34', '#22232a', '#383a44', '#191a20'], ['#202127', '#191a1f', '#282a31', '#131418'], ['#18191d', '#141518', '#1d1e23', '#0f1012']];
function rock(v, d) {
  return tile(`r${v}_${d}`, (c) => {
    const [base, dark, hi, seam] = ROCK[d];
    c.fillStyle = base; c.fillRect(0, 0, 32, 32);
    if (d === 3) { for (let i = 0; i < 7; i++) { c.fillStyle = i % 2 ? dark : hi; c.fillRect(hash(v * 9 + i) * 30, hash(v * 5 + i + 3) * 30, 3, 2); } return; }
    // blocos irregulares de basalto
    const rows = [[0, 10 + (v % 3)], [10 + (v % 3), 21 + (v % 2) * 2], [21 + (v % 2) * 2, 32]];
    rows.forEach(([y0, y1], r) => {
      const cut = (6 + ((v * 11 + r * 13) % 20));
      [[0, cut], [cut, 32]].forEach(([x0, x1], k) => {
        const t = hash(v * 17 + r * 5 + k);
        c.fillStyle = t > 0.66 ? hi : t > 0.3 ? base : dark; c.globalAlpha = t > 0.66 ? 0.45 : 1; c.fillRect(x0, y0, x1 - x0, y1 - y0); c.globalAlpha = 1;
        c.fillStyle = hi; c.fillRect(x0 + 1, y0 + 1, x1 - x0 - 2, 1); c.fillRect(x0 + 1, y0 + 1, 1, y1 - y0 - 2);
        c.fillStyle = dark; c.fillRect(x0 + 1, y1 - 2, x1 - x0 - 1, 1); c.fillRect(x1 - 2, y0 + 2, 1, y1 - y0 - 2);
        c.fillStyle = seam; c.fillRect(x0, y1 - 1, x1 - x0, 1); c.fillRect(x1 - 1, y0, 1, y1 - y0);
      });
    });
    for (let i = 0; i < 9; i++) { const h = hash(v * 31 + i + d * 7); c.fillStyle = h > 0.5 ? dark : hi; c.fillRect(Math.floor(h * 30), Math.floor(hash(h * 99) * 30), 2, 1); }
    if (d === 0 && v === 2) { c.fillStyle = seam; let x = 8; for (let y = 0; y < 24; y += 2) { c.fillRect(x, y, 2, 2); x += hash(y + v) > 0.5 ? 2 : -1; } }
  });
}
function cap(v, cave) {
  return tile(`c${v}${cave}`, (c) => {
    const C = cave ? ['#6a6c76', '#50525b', '#3e4048'] : ['#c3ccd6', '#9aa4b0', '#6f7783'];
    for (let x = 0; x < 32; x++) {
      const h = (cave ? 4 : 7) + Math.round(Math.sin((x + v * 32) * 0.31) * 2 + Math.sin((x + v * 32) * 0.11) * 2);
      const drip = !cave && hash(x * 7 + v * 13) > 0.82 ? 4 + Math.round(hash(x + v) * 6) : 0;
      c.fillStyle = C[2]; c.fillRect(x, 0, 1, h + 2 + drip);
      c.fillStyle = C[1]; c.fillRect(x, 0, 1, h);
      c.fillStyle = C[0]; c.fillRect(x, 0, 1, cave ? 1 : 2 + (hash(x + v * 5) > 0.5 ? 1 : 0));
      if (drip) { c.fillStyle = '#dfe7ee'; c.fillRect(x, h, 1, 2); }
      if (!cave && hash(x * 3 + v * 7) > 0.94) { c.fillStyle = '#c86c43'; c.fillRect(x, 3, 1, 2); }
    }
  });
}
function plank(v, cave) {
  return tile(`p${v}${cave}`, (c) => {
    c.fillStyle = '#120f12'; c.fillRect(0, 0, 32, 11);
    c.fillStyle = '#4a372b'; c.fillRect(0, 1, 32, 8);
    c.fillStyle = '#6b4f3a'; c.fillRect(0, 1, 32, 2);
    c.fillStyle = '#34261f'; c.fillRect(0, 6, 32, 2); c.fillRect(9 + v * 5, 1, 1, 8); c.fillRect((25 + v * 7) % 32, 1, 1, 8);
    c.fillStyle = '#80664c'; c.fillRect(3 + v * 4, 2, 6, 1); c.fillRect(20, 3, 5, 1);
    c.fillStyle = '#8a8f98'; c.fillRect(6, 4, 2, 2); c.fillRect(24, 4, 2, 2);
    if (!cave) { c.fillStyle = '#aeb9c5'; for (let x = 0; x < 32; x++) if (hash(x + v * 40) > 0.35) c.fillRect(x, 0, 1, 2); }
    c.fillStyle = '#120f12'; c.fillRect(6 + v * 6, 10, 3, 6); c.fillStyle = '#34261f'; c.fillRect(7 + v * 6, 10, 1, 6);
  });
}
function wall(v) {
  return tile(`w${v}`, (c) => {
    c.fillStyle = '#15161b'; c.fillRect(0, 0, 32, 32);
    for (let r = 0; r < 4; r++) for (let k = -1; k < 3; k++) {
      const x = k * 16 + (r % 2 ? 8 : 0), t = hash(v * 23 + r * 7 + k);
      c.fillStyle = t > 0.75 ? '#1e2027' : t > 0.3 ? '#1a1b21' : '#17181d'; c.fillRect(x + 1, r * 8 + 1, 14, 6);
      c.fillStyle = '#23252d'; if (t > 0.5) c.fillRect(x + 2, r * 8 + 1, 9, 1);
    }
    if (v === 3) { c.fillStyle = '#101115'; c.fillRect(12, 8, 7, 9); c.fillStyle = '#3a2620'; c.fillRect(14, 11, 2, 2); }
    if (v === 5) { c.fillStyle = '#2a2d36'; for (let y = 0; y < 32; y += 2) c.fillRect(20 + Math.round(Math.sin(y / 5)), y, 1, 2); }
  });
}
function bars(t, time, open) {
  return tile('bars' + t, (c) => {
    for (const x of [2, 12, 22]) { c.fillStyle = '#0e0d10'; c.fillRect(x, 0, 8, 32); c.fillStyle = '#4b4d56'; c.fillRect(x + 1, 0, 5, 32); c.fillStyle = '#777a85'; c.fillRect(x + 1, 0, 1, 32); }
    c.fillStyle = '#0e0d10'; c.fillRect(0, 12, 32, 8); c.fillStyle = t === 'M' ? '#80664c' : '#5a5c66'; c.fillRect(0, 13, 32, 5); c.fillStyle = '#a08a6a'; if (t === 'M') c.fillRect(0, 13, 32, 1);
  });
}

export function drawTiles(ctx, world, cam, time) {
  const l = world.level;
  const x0 = Math.floor(cam.x / TILE), x1 = Math.ceil((cam.x + VW) / TILE), y0 = Math.floor(cam.y / TILE), y1 = Math.ceil((cam.y + VH) / TILE);
  const fr = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const c = l.get(tx, ty), sx = tx * TILE - cam.x, sy = ty * TILE - cam.y;
    const v = Math.floor(hash(tx * 13 + ty * 7) * 6), cave = l.isCave(tx, ty);
    if (c === '#') {
      const up = l.solid(tx, ty - 1), lf = l.solid(tx - 1, ty), rg = l.solid(tx + 1, ty), dn = l.solid(tx, ty + 1);
      let d = 0;
      if (up && lf && rg && dn) { d = 1; let far = true; for (let k = 2; k <= 4 && far; k++) if (!l.solid(tx, ty - k) || !l.solid(tx - k, ty) || !l.solid(tx + k, ty) || !l.solid(tx, ty + k)) { far = false; if (k > 2) d = 2; } if (far) d = 3; }
      ctx.drawImage(rock(v, d), sx, sy, TILE, TILE);
      if (!lf) { fr(sx, sy, 0.5, TILE, '#0d0e11'); fr(sx + 0.5, sy, 1, TILE, '#4d505b'); }
      if (!rg) { fr(sx + TILE - 0.5, sy, 0.5, TILE, '#0d0e11'); fr(sx + TILE - 1.5, sy, 1, TILE, '#1d1e24'); }
      if (!dn) { fr(sx, sy + TILE - 1, TILE, 1, '#0d0e11'); if (v === 1 && cave === false) fr(sx + 5, sy + TILE, 1, 3, '#9aa4b0'); }
      if (!up) ctx.drawImage(cap((tx * 7) % 5, l.isCave(tx, ty - 1)), sx, sy, TILE, TILE);
      continue;
    }
    if (cave) {
      ctx.drawImage(wall(v), sx, sy, TILE, TILE);
      if (l.solid(tx, ty - 1) && l.get(tx, ty - 1) === '#') { ctx.globalAlpha = 0.5; fr(sx, sy, TILE, 4, '#08080b'); ctx.globalAlpha = 0.25; fr(sx, sy + 4, TILE, 4, '#08080b'); ctx.globalAlpha = 1; }
    }
    if (c === '=') ctx.drawImage(plank(v % 3, cave), sx, sy, TILE, TILE);
    else if (c === 'X') {
      ctx.drawImage(rock(1, 0), sx, sy, TILE, TILE);
      ctx.globalAlpha = 0.6 + Math.sin(time * 3 + ty) * 0.3;
      fr(sx + 7, sy, 1, 5, '#e17a3d'); fr(sx + 6, sy + 5, 1, 4, '#e17a3d'); fr(sx + 8, sy + 9, 1, 7, '#e17a3d'); fr(sx + 3, sy + 7, 3, 0.5, '#e17a3d'); fr(sx + 10, sy + 3, 2, 0.5, '#e17a3d');
      ctx.globalAlpha = 1;
    } else if (c === 'D') { ctx.drawImage(plank(v % 3, false), sx, sy, TILE, TILE); fr(sx, sy + 6, TILE, 10, '#0d0e11'); fr(sx + 2, sy + 2, 2, 1.5, '#8a8f98'); } else if (c === 'H' || c === 'M') ctx.drawImage(bars(c), sx, sy, TILE, TILE);
    else if (c === 'G') {
      ctx.drawImage(rock(0, 0), sx, sy, TILE, TILE); fr(sx, sy, 1, TILE, '#0d0e11'); fr(sx + 15, sy, 1, TILE, '#0d0e11');
      ctx.globalAlpha = 0.6 + Math.sin(time * 4) * 0.3; fr(sx + 7.5, sy + 3, 1, 3, '#c0303a'); fr(sx + 6, sy + 10, 4, 0.5, '#c0303a'); ctx.globalAlpha = 1;
    }
  }
}
