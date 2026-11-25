// Terreno pré-desenhado em pedaços de 16×16 tiles. Cada pedaço é pintado uma vez (textura, sombra suave, bordas,
// apoios de madeira e fachadas) e depois vira uma única imagem por quadro.
import { TILE } from './physics.js';
import { S, r2, canvas } from './hd.js';
import { img } from './art.js';
import { VW, VH } from './view.js';

const CT = 16, PX = CT * TILE, M = 4, N = (CT + M * 2) * 2;
export function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
const sm = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

const tc = new Map();
function tile(key, fn, w = 32, h = 32) { let c = tc.get(key); if (!c) { const [cv, x] = canvas(w, h); fn(x); c = cv; tc.set(key, c); } return c; }
// camada de cinza sobre a pedra: monte irregular, pingos e tufos
function cap(v, cave) {
  return tile(`c${v}${cave}`, (c) => {
    const C = cave ? ['#7d8290', '#565a66', '#3a3d46'] : ['#e3e9ef', '#aab4c0', '#6f7783'];
    for (let x = 0; x < 32; x++) {
      const h = (cave ? 4 : 8) + Math.round(Math.sin((x + v * 32) * 0.31) * 2 + Math.sin((x + v * 32) * 0.11) * 2);
      const drip = !cave && hash(x * 7 + v * 13) > 0.8 ? 4 + Math.round(hash(x + v) * 8) : 0;
      const up = hash(x * 5 + v * 3) > 0.7 ? 1 : 0;
      c.fillStyle = C[2]; c.fillRect(x, 4 - up, 1, h + 3 + drip);
      c.fillStyle = C[1]; c.fillRect(x, 4 - up, 1, h);
      c.fillStyle = C[0]; c.fillRect(x, 4 - up, 1, cave ? 1 : 2 + (hash(x + v * 5) > 0.5 ? 1 : 0));
      if (drip) { c.fillStyle = C[0]; c.fillRect(x, 4 + h, 1, 2); }
      if (!cave && hash(x * 3 + v * 7) > 0.95) { c.fillStyle = '#ff8a4a'; c.fillRect(x, 7, 1, 2); }
      if (hash(x * 11 + v * 17) > 0.95) { c.fillStyle = cave ? '#4b5058' : '#8f98a4'; c.fillRect(x, 1, 1, 4); c.fillRect(x + 1, 2, 1, 3); }
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
  });
}
function bars(t) {
  return tile('bars' + t, (c) => {
    for (const x of [2, 12, 22]) { c.fillStyle = '#0b0a0d'; c.fillRect(x, 0, 8, 32); c.fillStyle = '#4b4d56'; c.fillRect(x + 1, 0, 5, 32); c.fillStyle = '#8a8e9a'; c.fillRect(x + 1, 0, 1, 32); }
    const k = t === 'K' ? '#7a2a2a' : t === 'M' ? '#80664c' : '#5a5c66';
    c.fillStyle = '#0b0a0d'; c.fillRect(0, 12, 32, 8); c.fillStyle = k; c.fillRect(0, 13, 32, 5); c.fillStyle = t === 'K' ? '#e0504a' : t === 'M' ? '#c0a070' : '#8a8e9a'; c.fillRect(0, 13, 32, 1);
  });
}
const tex = (c, im, tx, ty, sx, sy) => { const u = ((tx * 32) % 512 + 512) % 512, v = ((ty * 32) % 512 + 512) % 512; c.drawImage(im, u, v, 32, 32, sx, sy, TILE, TILE); };

// viga de madeira (vertical ou inclinada)
function beam(c, x0, y0, x1, y1, w) {
  const dx = x1 - x0, dy = y1 - y0, n = Math.max(1, Math.round(Math.hypot(dx, dy) * 2));
  for (const [col, o, ww] of [['#0c090b', -0.5, w + 1], ['#3a2b23', 0, w], ['#5a4433', 0, w * 0.35]]) {
    c.fillStyle = col;
    for (let i = 0; i <= n; i++) { const x = x0 + dx * i / n, y = y0 + dy * i / n; if (Math.abs(dx) > Math.abs(dy)) c.fillRect(r2(x), r2(y + o), 0.5, ww); else c.fillRect(r2(x + o), r2(y), ww, 0.5); }
  }
}
function chainTo(c, x, y0, y1) { for (let y = y0; y < y1; y += 3) { c.fillStyle = '#0b0a0d'; c.fillRect(x - 1, y, 2, 3); c.fillStyle = y % 6 < 3 ? '#5a5c66' : '#3a3c44'; c.fillRect(x - 0.5, y, 1, 2.5); } }

let A = null, B = null, small = null;
function bake(l, cx, cy) {
  const [cv, c] = canvas(PX * S, PX * S);
  if (!A) { A = canvas(PX * S, PX * S); B = canvas(PX * S, PX * S); small = canvas(N, N, true); }
  const x0 = cx * CT, y0 = cy * CT, ox = x0 * TILE, oy = y0 * TILE;
  const prep = (q) => { q.setTransform(1, 0, 0, 1, 0, 0); q.globalCompositeOperation = 'source-over'; q.globalAlpha = 1; q.clearRect(0, 0, PX * S, PX * S); q.setTransform(S, 0, 0, S, -ox * S, -oy * S); q.imageSmoothingEnabled = false; };
  const [ac, a] = A, [bc, b] = B;
  prep(a); prep(b); c.setTransform(S, 0, 0, S, -ox * S, -oy * S); c.imageSmoothingEnabled = false;
  // campos de distância em meia-tile: rocha→ar (profundidade) e ar→rocha (sombra de contato)
  const gx = x0 - M, gy = y0 - M, sol = new Uint8Array(N * N), d1 = new Float32Array(N * N), d2 = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const t = l.get(gx + (i >> 1), gy + (j >> 1)), s = t === '#' || t === 'X' ? 1 : 0; sol[j * N + i] = s; d1[j * N + i] = s ? 99 : 0; d2[j * N + i] = s ? 0 : 99; }
  for (const d of [d1, d2]) {
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i; let v = d[k];
      if (i) v = Math.min(v, d[k - 1] + 1);
      if (j) { v = Math.min(v, d[k - N] + 1); if (i) v = Math.min(v, d[k - N - 1] + 1.41); if (i < N - 1) v = Math.min(v, d[k - N + 1] + 1.41); }
      d[k] = v;
    }
    for (let j = N - 1; j >= 0; j--) for (let i = N - 1; i >= 0; i--) {
      const k = j * N + i; let v = d[k];
      if (i < N - 1) v = Math.min(v, d[k + 1] + 1);
      if (j < N - 1) { v = Math.min(v, d[k + N] + 1); if (i) v = Math.min(v, d[k + N - 1] + 1.41); if (i < N - 1) v = Math.min(v, d[k + N + 1] + 1.41); }
      d[k] = v;
    }
  }
  const [sc, sx] = small;
  const shade = (q, f) => {
    const im = sx.createImageData(N, N);
    for (let k = 0; k < N * N; k++) { im.data[k * 4] = 5; im.data[k * 4 + 1] = 6; im.data[k * 4 + 2] = 10; im.data[k * 4 + 3] = Math.max(0, Math.min(255, f(k) * 255)); }
    sx.putImageData(im, 0, 0); q.imageSmoothingEnabled = true; q.globalCompositeOperation = 'source-atop'; q.drawImage(sc, gx * TILE, gy * TILE, N * 8, N * 8); q.globalCompositeOperation = 'source-over'; q.imageSmoothingEnabled = false;
  };
  const each = (f) => { for (let ty = y0 - 2; ty <= y0 + CT + 1; ty++) for (let tx = x0 - 2; tx <= x0 + CT + 1; tx++) f(tx, ty, l.get(tx, ty), tx * TILE, ty * TILE); };
  const solid = (tx, ty) => { const t = l.get(tx, ty); return t === '#' || t === 'X'; };

  // ---------- fundo: paredes internas e fachadas ----------
  each((tx, ty, t, px, py) => {
    const cave = l.isCave(tx, ty), bk = l.backAt(tx, ty);
    if ((!cave && !bk) || t === '#') return;
    const w = l.wallTex(tx, ty);
    tex(a, img[cave ? w : bk], tx, ty, px, py);
    if (!cave || w !== 'parede') { a.globalAlpha = 0.5; a.fillStyle = '#0a0c14'; a.fillRect(px, py, TILE, TILE); a.globalAlpha = 1; }
  });
  shade(a, (k) => 0.66 * (1 - sm(0.2, 4.2, d2[k])) + (k >= N && sol[k - N] ? 0.12 : 0));
  // batentes: onde o interior encontra o céu aberto há um pilar de pedra
  each((tx, ty, t, px, py) => {
    if (t === '#' || (!l.isCave(tx, ty) && !l.backAt(tx, ty))) return;
    for (const d of [-1, 1]) {
      const troca = d > 0 && l.isCave(tx, ty) && l.isCave(tx + 1, ty) && !solid(tx + 1, ty) && l.wallTex(tx, ty) !== l.wallTex(tx + 1, ty);
      if (!troca && (solid(tx + d, ty) || l.isCave(tx + d, ty) || l.backAt(tx + d, ty))) continue;
      const w = 8 + (ty % 2 ? 4 : 0), x = troca ? px + TILE - w / 2 : d < 0 ? px - 4 : px + TILE + 4 - w;
      a.fillStyle = '#08090c'; a.fillRect(x - 0.5, py, w + 1, TILE);
      a.drawImage(img.tijolo, ((tx * 32) % 480 + 480) % 480, ((ty * 32) % 480 + 480) % 480, w * 2, 32, x, py, w, TILE);
      a.fillStyle = 'rgba(190,200,215,0.28)'; a.fillRect(d < 0 ? x : x + w - 1, py, 1, TILE); a.fillRect(x, py, w, 0.5);
      a.fillStyle = 'rgba(4,5,9,0.5)'; a.fillRect(d < 0 ? x + w - 2 : x, py, 2, TILE); a.fillRect(x, py + TILE - 0.5, w, 0.5);
      if (hash(tx * 3 + ty * 7) > 0.8) { a.fillStyle = 'rgba(8,9,12,0.6)'; a.fillRect(x + 2, py + 5, 4, 0.5); a.fillRect(x + 4, py + 5.5, 1, 4); }
    }
  });
  // ---------- apoios: nada fica solto no ar ----------
  const drop = (tx, ty, max) => { for (let k = 1; k <= max; k++) if (solid(tx, ty + k)) return (ty + k) * TILE; return 0; };
  const roof = (tx, ty, max) => { for (let k = 1; k <= max; k++) if (solid(tx, ty - k)) return (ty - k + 1) * TILE; return 0; };
  for (let ty = y0 - 18; ty <= y0 + CT + 14; ty++) for (let tx = x0 - 8; tx <= x0 + CT + 1; tx++) {
    if (l.get(tx, ty) !== '=' || l.get(tx - 1, ty) === '=') continue;
    let e = tx; while (l.get(e + 1, ty) === '=') e++;
    const py = ty * TILE + 5, xl = tx * TILE, xr = (e + 1) * TILE, wl = solid(tx - 1, ty), wr = solid(e + 1, ty), cave = l.isCave(tx, ty);
    if (wl && wr) { beam(a, xl, py, xr, py, 3); continue; }
    if (wl) beam(a, xl, py + 13, xl + 13, py, 2.5);
    if (wr) beam(a, xr, py + 13, xr - 13, py, 2.5);
    const ends = []; if (!wl) ends.push([tx, xl + 5]); if (!wr) ends.push([e, xr - 5]);
    for (const [q, x] of ends) {
      const h = cave ? roof(q, ty, 13) : 0, g = drop(q, ty, 16);
      if (h && (!g || py - h < g - py + 30)) { chainTo(a, x, h, ty * TILE + 1); a.fillStyle = '#4b4d56'; a.fillRect(x - 2, h, 4, 2); } else if (g) beam(a, x, py, x, g, 3);
    }
    const g = drop(tx, ty, 16), g2 = drop(e, ty, 16);
    if (!cave && !wl && !wr && g && g2) {
      const end = Math.min(g, g2);
      for (let y = py + 3; y < end - 8; y += 46) { const y2 = Math.min(y + 40, end - 2); beam(a, xl + 6, y, xr - 5, y2, 1.5); beam(a, xr - 5, y, xl + 6, y2, 1.5); }
    }
  }
  for (const [bx0, by, bx1] of l.posts) {
    if (bx1 < x0 - 2 || bx0 > x0 + CT + 2 || by > y0 + CT || by < y0 - 26) continue;
    for (let tx = bx0; tx <= bx1; tx += Math.max(2, Math.floor((bx1 - bx0) / 2))) { const g = drop(tx, by, 26); if (g) { beam(a, tx * TILE + 8, by * TILE + 12, tx * TILE + 8, g, 5); beam(a, tx * TILE + 8, by * TILE + 34, tx * TILE - 6, by * TILE + 16, 2.5); beam(a, tx * TILE + 11, by * TILE + 34, tx * TILE + 24, by * TILE + 16, 2.5); } }
  }
  c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(ac, 0, 0); c.setTransform(S, 0, 0, S, -ox * S, -oy * S);

  // ---------- rocha ----------
  each((tx, ty, t, px, py) => { if (t === '#' || t === 'X' || t === 'G') tex(b, img[l.matAt(tx, ty)], tx, ty, px, py); });
  shade(b, (k) => sm(1.2, 7, d1[k]) * 0.97);
  // saliências: a pedra natural não termina em linha reta
  each((tx, ty, t, px, py) => {
    if (!solid(tx, ty)) return;
    const m = l.matAt(tx, ty), nat = m === 'rocha', up = solid(tx, ty - 1), lf = solid(tx - 1, ty), rg = solid(tx + 1, ty), dn = solid(tx, ty + 1);
    const chip = (side) => {
      for (let y = 0; y < TILE; y++) {
        const w = r2(nat ? Math.max(0, Math.sin((py + y) * 0.37 + tx) + Math.sin((py + y) * 0.13) * 1.3) * 1.2 : (Math.floor((py + y) / 8) % 2 ? 1 : 0));
        if (w <= 0) continue;
        b.fillStyle = side < 0 ? '#3c414c' : '#3a322f'; b.fillRect(side < 0 ? px - w : px + TILE, py + y, w, 1);
      }
    };
    if (!lf) { chip(-1); b.globalAlpha = 0.55; b.fillStyle = '#7d8696'; b.fillRect(px, py, 0.5, TILE); b.globalAlpha = 0.16; b.fillRect(px + 0.5, py, 3, TILE); b.globalAlpha = 1; }
    if (!rg) { chip(1); b.globalAlpha = 0.5; b.fillStyle = '#a0603c'; b.fillRect(px + TILE - 1, py, 1, TILE); b.globalAlpha = 0.14; b.fillStyle = '#c86c43'; b.fillRect(px + TILE - 4, py, 3, TILE); b.globalAlpha = 1; }
    if (!dn) {
      b.globalAlpha = 0.5; b.fillStyle = '#04050a'; b.fillRect(px, py + TILE - 4, TILE, 4); b.globalAlpha = 1;
      if (nat) {
        b.fillStyle = '#1b1d24';
        for (let x = 0; x < TILE; x++) { const q = Math.max(0, Math.sin((px + x) * 0.9) + Math.sin((px + x) * 0.31) * 1.5 - 0.6) * 2.4; if (q > 0) b.fillRect(px + x, py + TILE, 1, r2(q)); }
      } else {
        b.fillStyle = '#241b17'; b.fillRect(px, py + TILE, TILE, 2); b.fillStyle = '#4a372b'; b.fillRect(px, py + TILE, TILE, 0.5);
        if (tx % 2 === 0) { b.fillStyle = '#0c090b'; b.fillRect(px + 5, py + TILE, 5, 5); b.fillStyle = '#3a2b23'; b.fillRect(px + 5.5, py + TILE, 4, 4.5); }
      }
    }
    if (!up && m === 'telha') { // beiral
      if (!lf) { b.fillStyle = '#0c0b0d'; b.fillRect(px - 5, py + 1, 5, 4); b.fillStyle = '#5c4434'; b.fillRect(px - 4.5, py + 1, 5, 3); }
      if (!rg) { b.fillStyle = '#0c0b0d'; b.fillRect(px + TILE, py + 1, 5, 4); b.fillStyle = '#5c4434'; b.fillRect(px + TILE, py + 1, 4.5, 3); }
    }
  });
  each((tx, ty, t, px, py) => {
    const v = Math.floor(hash(tx * 13 + ty * 7) * 6), cave = l.isCave(tx, ty);
    if (t === '=') b.drawImage(plank(v % 3, cave), px, py, TILE, TILE);
    else if (t === 'D') { b.fillStyle = '#0d0e11'; b.fillRect(px, py + 6, TILE, 10); b.drawImage(plank(v % 3, false), px, py, TILE, TILE); } else if (t === 'H' || t === 'M' || t === 'K') b.drawImage(bars(t), px, py, TILE, TILE);
    else if (t === 'G') { b.fillStyle = '#0d0e11'; b.fillRect(px, py, 1, TILE); b.fillRect(px + 15, py, 1, TILE); }
  });
  each((tx, ty, t, px, py) => {
    if (t === '#' && !l.solid(tx, ty - 1)) b.drawImage(cap(((tx * 7) % 5 + 5) % 5, l.isCave(tx, ty - 1)), px, py - 2, TILE, 20);
  });
  c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(bc, 0, 0);
  return cv;
}

const cache = new Map(); let ver = -1, lvl = null;
export function drawTiles(ctx, world, cam, time) {
  const l = world.level;
  if (l !== lvl || l.ver !== ver) { cache.clear(); lvl = l; ver = l.ver; }
  const cx0 = Math.floor(cam.x / PX), cx1 = Math.floor((cam.x + VW) / PX), cy0 = Math.floor(cam.y / PX), cy1 = Math.floor((cam.y + VH) / PX);
  const get = (x, y) => {
    const k = x * 1000 + y; let c = cache.get(k);
    if (!c) { c = bake(l, x, y); cache.set(k, c); if (cache.size > 22) cache.delete(cache.keys().next().value); } else if (cache.size > 16) { cache.delete(k); cache.set(k, c); }
    return c;
  };
  for (let y = cy0; y <= cy1; y++) for (let x = cx0; x <= cx1; x++) ctx.drawImage(get(x, y), x * PX - cam.x, y * PX - cam.y, PX, PX);
  // adianta o próximo pedaço na direção do movimento (um por quadro)
  const d = world.player && world.player.vx < 0 ? cx0 - 1 : cx1 + 1;
  for (let y = cy0; y <= cy1; y++) if (!cache.has(d * 1000 + y)) { get(d, y); break; }
  // brilhos vivos
  const X0 = Math.floor(cam.x / TILE), X1 = Math.ceil((cam.x + VW) / TILE), Y0 = Math.floor(cam.y / TILE), Y1 = Math.ceil((cam.y + VH) / TILE);
  const fr = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
  for (let ty = Y0; ty <= Y1; ty++) for (let tx = X0; tx <= X1; tx++) {
    const t = l.get(tx, ty);
    if (t !== 'X' && t !== 'K' && t !== 'G') continue;
    const sx = tx * TILE - cam.x, sy = ty * TILE - cam.y;
    if (t === 'X') { ctx.globalAlpha = 0.65 + Math.sin(time * 3 + ty) * 0.3; fr(sx + 7, sy, 1, 5, '#ff8a4a'); fr(sx + 6, sy + 5, 1, 4, '#ff8a4a'); fr(sx + 8, sy + 9, 1, 7, '#ff8a4a'); fr(sx + 3, sy + 7, 3, 0.5, '#ff8a4a'); fr(sx + 10, sy + 3, 2, 0.5, '#ff8a4a'); } else if (t === 'K') { ctx.globalAlpha = 0.5 + Math.sin(time * 3) * 0.3; fr(sx + 6, sy + 6, 4, 4, '#ff5a4a'); } else { ctx.globalAlpha = 0.6 + Math.sin(time * 4) * 0.3; fr(sx + 7.5, sy + 3, 1, 3, '#ff4a4a'); fr(sx + 6, sy + 10, 4, 0.5, '#ff4a4a'); }
    ctx.globalAlpha = 1;
  }
}

// Máscara de interior (1 px por tile): escurece só onde há teto, com passagem suave para fora
let mask = null, maskL = null, maskV = -1;
export function caveMask(l) {
  if (mask && maskL === l && maskV === l.ver) return mask;
  const W = l.g[0].length, H = l.g.length, [c, x] = canvas(W, H, true), im = x.createImageData(W, H);
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
    let a;
    if (!l.solid(tx, ty)) a = l.isCave(tx, ty) ? 1 : 0;
    else {
      let cv = 0, n = 0;
      for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) if (!l.solid(tx + i, ty + j)) { const w = 1 / (1 + i * i + j * j); n += w; if (l.isCave(tx + i, ty + j)) cv += w; }
      a = n ? cv / n : 0.8;
    }
    const k = (ty * W + tx) * 4; im.data[k] = 110; im.data[k + 1] = 117; im.data[k + 2] = 142; im.data[k + 3] = a * 255;
  }
  x.putImageData(im, 0, 0); mask = c; maskL = l; maskV = l.ver;
  return c;
}
