// Cenário do Vale das Cinzas: céu e ruínas pintados, parallax, névoa, raios de sol e tiles com textura.
// Paleta da ficha da AREA_01: carvão #292A32, cinza de neve #AEB9C5, bronze gasto #80664C, brasa residual #C86C43.
import { TILE } from './physics.js';
import { S, r2, canvas } from './hd.js';
import { img } from './art.js';
import { revoada } from './vida.js';
import { Q } from './config.js';

import { VW, VH } from './view.js';
import { hash, drawTiles } from './chunks.js';
export { hash, drawTiles };

// faixa horizontal que se repete
function strip(ctx, im, camx, p, y, k = 1) {
  const w = im.width / S * k, h = im.height / S * k;
  if (w < 8) return;
  let x = -(((camx * p) % w) + w) % w; if (x > 0) x -= w;
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
  x.globalCompositeOperation = 'destination-in'; const v = x.createLinearGradient(0, 0, 0, 96); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.35, 'rgba(0,0,0,1)'); v.addColorStop(0.7, 'rgba(0,0,0,1)'); v.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = v; x.fillRect(0, 0, 512, 96);
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
  const dy = cam.y - 640, l = world.level;
  // se nenhum pedaço de céu aparece, não desenha nada lá atrás
  let aberto = false;
  for (let ty = Math.floor(cam.y / TILE); !aberto && ty <= Math.floor((cam.y + VH) / TILE); ty++) for (let tx = Math.floor(cam.x / TILE); tx <= Math.floor((cam.x + VW) / TILE); tx++) if (!l.solid(tx, ty) && !l.isCave(tx, ty)) { aberto = true; break; }
  if (!aberto) { ctx.fillStyle = '#07080c'; ctx.fillRect(0, 0, VW, VH); return; }
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
  revoada(ctx, cam, time);
  const ft = time % 11, flash = ft < 0.35 ? 1 - ft / 0.35 : 0;
  if (flash > 0) { ctx.globalAlpha = 0.14 * flash; ctx.fillStyle = '#e8c9a0'; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1; }
  const ty = 196 - dy * 0.17;
  if (img.torres.height > 4) { ctx.globalAlpha = 0.82; strip(ctx, img.torres, cam.x, 0.16, ty - img.torres.height / S, 1); ctx.globalAlpha = 1; ctx.fillStyle = '#2d3138'; ctx.fillRect(0, ty - 1, VW, VH); }
  haze(ctx, ty - 110, ty + 10, '150,104,92', 0.5);
  fog(ctx, cam, time, ty - 60, 0.2, 0.8, 5);
  const ry = 262 - dy * 0.36, alto = Math.max(0, Math.min(1, (cam.x - 3980) / 260)); // no alto do campanário entram os arcos quebrados
  if (alto < 1 && img.ruinas.height > 4) { ctx.globalAlpha = 1 - alto; strip(ctx, img.ruinas, cam.x, 0.4, ry - img.ruinas.height / S, 1); ctx.fillStyle = '#0d0e12'; ctx.fillRect(0, ry - 1, VW, Math.max(0, VH - ry + 1)); ctx.globalAlpha = 1; }
  if (alto > 0 && img.arena.height > 4) {
    const by = 22 * TILE - cam.y + 6;
    ctx.globalAlpha = alto; fog(ctx, cam, time, by - 92, 0.3, 0.7 * alto, 7); ctx.globalAlpha = alto;
    strip(ctx, img.arena, cam.x - 4000, 0.55, by - img.arena.height / S, 1); ctx.fillStyle = '#0d0e12'; ctx.fillRect(0, by - 1, VW, Math.max(0, VH - by + 1)); ctx.globalAlpha = 1;
  }
  haze(ctx, Math.max(60, Math.min(ry, 260) - 150), Math.min(ry, 260), '70,52,52', 0.34);
  if (Q.nivel > 0) fog(ctx, cam, time, Math.min(170, ry - 96), 0.45, 0.6, 9);
}

// Cinza e neve de cinza, oblíquas (ou subindo, depois que O Louco é libertado)
export function ashFall(ctx, cam, time, world, front) {
  const up = world.ashUp ? -1 : 1, n = [0.4, 0.7, 1][Q.nivel] * (front ? 34 : 90), par = front ? 1.25 : 0.6;
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

// Feixe de luz de uma janela
export function shaft(ctx, x, y, time, w = 26, len = 150, col = '255,214,140', a = 0.3, chao = false) {
  ctx.globalCompositeOperation = 'lighter';
  const k = 0.85 + Math.sin(time * 0.8 + x) * 0.15;
  for (const [m, q] of [[1, 1], [0.55, 0.7]]) {
    const g = ctx.createLinearGradient(x, y, x + len * 0.55, y + len);
    g.addColorStop(0, `rgba(${col},${a * k * q})`); g.addColorStop(1, `rgba(${col},${chao ? a * k * q * 0.22 : 0})`);
    ctx.fillStyle = g; ctx.beginPath();
    ctx.moveTo(x - w / 2 * m, y - 26); ctx.lineTo(x + w / 2 * m, y - 34); ctx.lineTo(x + w * 1.1 * m + len * 0.62, y + len); ctx.lineTo(x - w * 0.6 * m + len * 0.4, y + len); ctx.fill();
  }
  if (chao) { // poça de luz no piso
    const px = x + len * 0.51, py = y + len, g = ctx.createRadialGradient(px, py, 0, px, py, 30);
    g.addColorStop(0, `rgba(${col},${a * k * 0.9})`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.save(); ctx.translate(0, py * 0.82); ctx.scale(1, 0.18); ctx.fillStyle = g; ctx.fillRect(px - 32, py - 32, 64, 64); ctx.restore();
  }
  // poeira dançando na luz
  for (let i = 0; i < 12; i++) {
    const t = (time * 0.06 + hash(i + x)) % 1, px = x + len * 0.5 * t + Math.sin(time + i * 2) * 8 + (hash(i) - 0.5) * 20, py = y + len * t;
    ctx.globalAlpha = 0.5 * Math.sin(t * Math.PI); ctx.fillStyle = '#ffe6b0'; ctx.fillRect(r2(px), r2(py), 0.5, 0.5);
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
