// O que faz o vale parecer vivo: capim que dobra, pegadas, fumaça, brasas, goteiras, revoadas, água e coisas que balançam.
import { TILE } from './physics.js';
import { S, r2, canvas } from './hd.js';
import { VW, VH } from './view.js';
import { CENA } from './cenameta.js';
import { img, piece } from './art.js';
import { hash } from './chunks.js';
import { Q } from './config.js';
import { rajada } from './audio.js';

// Fontes de fogo do mapa: servem para luz, brasas e som. [dx, dy, raio, cor, força]
export const FOGOS = {
  torch: [[0, -16, 54, '#f08a44', 0.72]], velas: [[0, -10, 34, '#ffb060', 0.6]], candelabro: [[0, -38, 46, '#ffb060', 0.62]], lustre: [[0, 42, 62, '#ffb868', 0.7]], altar: [[0, -24, 36, '#ffb060', 0.55]],
  lampiao: [[-11, -50, 60, '#ffa850', 0.8]], suporte: [[4, -10, 44, '#ffa850', 0.65]], forjaria: [[24, -16, 48, '#ff8a40', 0.75]],
};
export function fogos(level) {
  if (level.fogos) return level.fogos;
  const out = [];
  for (const p of level.props) for (const [dx, dy, r, col, a] of FOGOS[p.type] || []) out.push({ x: p.x + (p.flip ? -dx : dx), y: p.y + dy, r, col, a, t: p.type, s: hash(p.x) * 10 });
  for (const s of level.spawns) if (s.type === 'shrine') out.push({ x: s.x, y: s.y - 18, r: 66, col: '#e0783a', a: 0.78, t: 'pira', s: hash(s.x) * 10 });
  return (level.fogos = out);
}

const onda = (n, t) => 0.86 + 0.09 * Math.sin(t * 9 + n) + 0.05 * Math.sin(t * 23 + n * 3);
export const cintila = onda;

// ---------- balanço dos pendurados ----------
export function pendulo(pr, world, time, len) {
  const p = world.player;
  pr.a = pr.a || 0; pr.va = pr.va || 0;
  const dt = 1 / 60, alvo = Math.sin(time * 0.9 + pr.x) * 0.02;
  pr.va += ((alvo - pr.a) * 16 - pr.va * 0.9) * dt;
  if (Math.abs(p.cx() - pr.x) < 16 && p.y < pr.y + len && p.y + p.h > pr.y) pr.va += p.vx * 0.0007;
  if (world.shake > 2) pr.va += (Math.random() - 0.5) * world.shake * 0.012;
  pr.a = Math.max(-0.6, Math.min(0.6, pr.a + pr.va * dt));
  return pr.a;
}
// pano que ondula: a arte é fatiada em faixas
export function pano(ctx, nm, x, yTop, time, amp, flip) {
  const [sx, sy, w, h] = CENA[nm], k = 1 / S, st = 3;
  for (let i = 0; i < h; i += st) {
    const f = i / h, dx = r2((Math.sin(time * 2.1 + x * 0.7 - f * 4) + rajada(time) * 0.8) * amp * f * f * 2);
    const hh = Math.min(st, h - i);
    ctx.drawImage(img.atlas, sx, sy + i, w, hh, r2(x - w * k / 2) + dx, r2(yTop + i * k), w * k, hh * k);
  }
}

// ---------- capim ----------
const COR = ['#4c535e', '#68717d', '#858f9b', '#5c5651'];
export function capim(ctx, world, cam, time) {
  const l = world.level, x0 = Math.floor(cam.x / TILE) - 1, x1 = Math.ceil((cam.x + VW) / TILE), y0 = Math.floor(cam.y / TILE), y1 = Math.ceil((cam.y + VH) / TILE);
  const at = [world.player, ...world.mobs.filter((m) => !m.dead && Math.abs(m.cx() - world.player.cx()) < 260)];
  const vento = Math.sin(time * 0.7) * 0.5 + Math.sin(time * 1.9) * 0.25;
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (l.get(tx, ty) !== '#' || l.solid(tx, ty - 1) || l.isCave(tx, ty - 1) || l.matAt(tx, ty) === 'telha') continue;
    const h = hash(tx * 3.7 + ty);
    if (h < 0.42) continue;
    const n = h > 0.82 ? 6 : 3, gy = ty * TILE - cam.y;
    for (let i = 0; i < n; i++) {
      const q = hash(tx * 17 + i * 5 + ty), wx = tx * TILE + q * 15, alt = 3 + hash(tx + i * 9) * (h > 0.82 ? 7 : 4);
      const onda = Math.max(0, Math.sin((wx - time * 70) * 0.012)) ** 3 * rajada(time) * 1.6;
      let b = vento * 0.35 + onda + Math.sin(time * 2.4 + wx * 0.2) * (0.14 + onda * 0.2);
      for (const a of at) { const d = wx - a.cx(), fy = a.y + a.h - ty * TILE; if (Math.abs(d) < 13 && fy > -14 && fy < 6) b += Math.sign(d || 1) * (1 - Math.abs(d) / 13) * 1.1; }
      ctx.fillStyle = COR[Math.floor(q * 4)];
      for (let k = 0; k < alt; k += 1.5) { const f = k / alt; ctx.fillRect(r2(wx - cam.x + b * f * f * alt * 0.8), r2(gy - k - 1), f > 0.6 ? 0.5 : 1, 1.5); }
    }
  }
}

// ---------- pegadas na cinza ----------
export function pegadas(ctx, world, cam) {
  const P = world.pegadas; if (!P) return;
  for (const g of P) { const x = g.x - cam.x; if (x < -5 || x > VW + 5) continue; ctx.globalAlpha = Math.min(0.5, g.t * 0.12); ctx.fillStyle = '#4a5160'; ctx.fillRect(r2(x), r2(g.y - cam.y), 3, 0.5); ctx.fillRect(r2(x + (g.f > 0 ? 2 : -0.5)), r2(g.y - cam.y - 0.5), 1, 0.5); }
  ctx.globalAlpha = 1;
}

// ---------- sombra no chão ----------
export function sombra(ctx, level, cx, feet, w, cam) {
  const g = level.groundBelow(cx, feet - 4), d = g - feet;
  if (d > 90 || d < -8) return;
  const k = Math.max(0, 1 - d / 90), rx = w * (0.55 + 0.25 * k), x = cx - cam.x, y = g - cam.y + 1;
  ctx.fillStyle = `rgba(3,4,8,${0.16 * k})`; ctx.beginPath(); ctx.ellipse(x, y, rx * 1.3, 3, 0, 0, 6.2832); ctx.fill();
  ctx.fillStyle = `rgba(3,4,8,${0.34 * k})`; ctx.beginPath(); ctx.ellipse(x, y, rx * 0.8, 2, 0, 0, 6.2832); ctx.fill();
}

// ---------- revoada ao longe ----------
export function revoada(ctx, cam, time) {
  for (let g = 0; g < 2; g++) {
    const per = 46 + g * 23, t = (time + g * 19) % per, bx = VW + 40 - t * (VW + 160) / (per * 0.55) - (cam.x * 0.06) % 40, by = 40 + g * 26 + Math.sin(time * 0.4 + g) * 8;
    if (bx < -80) continue;
    ctx.fillStyle = 'rgba(14,13,20,0.75)';
    for (let i = 0; i < 6; i++) {
      const x = bx + i * 9 + Math.sin(i * 7 + time) * 3, y = by + Math.abs(i - 2) * 4 + Math.sin(time * 2 + i) * 1.5, w = Math.sin(time * 9 + i * 1.7);
      ctx.fillRect(r2(x), r2(y), 1, 1);
      for (let k = 1; k < 4; k++) { ctx.fillRect(r2(x - k), r2(y - w * k * 0.7), 1, 0.5); ctx.fillRect(r2(x + k), r2(y - w * k * 0.7), 1, 0.5); }
    }
  }
}

// ---------- água parada com reflexo ----------
let tmp = null;
export function agua(ctx, world, cam, time) {
  for (const [x0, x1, wy] of world.level.water || []) {
    const sx0 = Math.max(0, x0 * TILE - cam.x), sx1 = Math.min(VW, (x1 + 1) * TILE - cam.x), y = r2(wy - cam.y), hh = 9;
    if (sx1 <= sx0 || y < 4 || y > VH) continue;
    const w = Math.round(sx1 - sx0), cv = ctx.canvas;
    if (Q.nivel > 0) {
      if (!tmp || tmp[0].width < VW * S) tmp = canvas(500 * S, 40 * S);
      const [tc, tx] = tmp;
      tx.clearRect(0, 0, tc.width, tc.height); tx.drawImage(cv, Math.round(sx0 * S), Math.round((y - 30) * S), w * S, 30 * S, 0, 0, w * S, 30 * S);
      ctx.save(); ctx.beginPath(); ctx.rect(sx0, y, w, hh); ctx.clip();
      ctx.globalAlpha = 0.75;
      for (let i = 0; i < hh; i += 0.5) { const o = Math.sin(time * 2.2 + i * 1.6) * (0.4 + i * 0.2); ctx.drawImage(tc, 0, Math.round((30 - i * 2.6) * S), w * S, 1, sx0 + r2(o), y + i, w, 0.5); }
      ctx.restore();
    }
    ctx.globalAlpha = 0.34; ctx.fillStyle = '#0f2d38'; ctx.fillRect(sx0, y, w, hh);
    ctx.globalAlpha = 0.5; ctx.fillStyle = '#7fb0b8';
    for (let i = 0; i < w; i += 3) { const wx = i + sx0 + cam.x, a = Math.sin(wx * 0.13 + time * 1.3) + Math.sin(wx * 0.31 - time * 0.9); if (a > 0.5) ctx.fillRect(r2(sx0 + i), y + r2(Math.sin(wx * 0.2 + time * 2) * 0.5), 3, 0.5); if (a > 1.2) ctx.fillRect(r2(sx0 + i), y + 4, 2, 0.5); }
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#bfe4e6'; ctx.fillRect(sx0, y, w, 0.5); ctx.globalAlpha = 1;
  }
}
export function naAgua(world, x, feet) { for (const [x0, x1, wy] of world.level.water || []) if (x > x0 * TILE && x < (x1 + 1) * TILE && feet > wy && feet < wy + 20) return wy; return 0; }

// ---------- partículas e vida por quadro ----------
export function vida(world, dt) {
  const p = world.player, fx = world.fx, cam = world.cam, t = world.time, l = world.level;
  const vis = (x, y, m = 40) => x > cam.x - m && x < cam.x + VW + m && y > cam.y - m && y < cam.y + VH + m;
  const rico = Q.nivel > 0 ? 1 : 0.4;
  for (const f of fogos(l)) {
    if (!vis(f.x, f.y)) continue;
    const grande = f.t === 'torch' || f.t === 'pira' || f.t === 'forjaria';
    if (Math.random() < (grande ? 0.1 : 0.025) * rico) fx.parts.push({ x: f.x + (Math.random() - 0.5) * 6, y: f.y - 2, vx: (Math.random() - 0.5) * 14, vy: -18 - Math.random() * 26, life: 0.9 + Math.random(), max: 1.6, color: Math.random() < 0.5 ? '#ffb060' : '#ff7a38', grav: -8, size: Math.random() < 0.4 ? 1 : 0.5, glow: 1, sway: 1 });
  }
  // fumaça das chaminés
  for (const pr of l.props) {
    if (pr.type === 'casa1' && vis(pr.x, pr.y - 70, 60) && Math.random() < 0.09 * rico) fx.smoke(pr.x + (pr.flip ? 18 : -18), pr.y - 76);
    if (pr.type === 'forjaria' && vis(pr.x, pr.y - 70, 60) && Math.random() < 0.12 * rico) fx.smoke(pr.x + 24, pr.y - 70);
  }
  // interior: gotas e poeira caindo do teto
  if (world.inCave && Math.random() < 0.05 * rico) {
    const x = cam.x + Math.random() * VW, ty = Math.floor((p.y - 8) / TILE), tx = Math.floor(x / TILE);
    for (let k = 0; k < 12; k++) if (l.solid(tx, ty - k)) {
      const y = (ty - k + 1) * TILE;
      if (Math.random() < 0.5) fx.parts.push({ x, y, vx: 0, vy: 10, life: 1.6, max: 1.6, color: '#9fc4d0', grav: 300, size: 0.5, drop: 1 });
      else for (let i = 0; i < 4; i++) fx.parts.push({ x: x + Math.random() * 3, y, vx: (Math.random() - 0.5) * 4, vy: 8 + Math.random() * 10, life: 1.4, max: 1.4, color: '#7d7a78', grav: 24, size: 0.5 });
      break;
    }
  }
  // gotas que batem no chão ou na água
  for (const g of fx.parts) if (g.drop && l.solid(Math.floor(g.x / TILE), Math.floor(g.y / TILE))) { g.life = 0; fx.gotas = (fx.gotas || 0) + 1; for (let i = 0; i < 3; i++) fx.parts.push({ x: g.x, y: g.y - 2, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 20, life: 0.25, max: 0.25, color: '#9fc4d0', grav: 200, size: 0.5 }); }
  // pegadas e respingos
  const P = world.pegadas || (world.pegadas = []);
  for (const g of P) g.t -= dt;
  while (P.length && (P[0].t <= 0 || P.length > 60)) P.shift();
  if (p.onGround && Math.abs(p.vx) > 40) {
    world.passo = (world.passo || 0) + Math.abs(p.vx) * dt;
    if (world.passo > 20) {
      world.passo = 0;
      const wy = naAgua(world, p.cx(), p.y + p.h);
      if (wy) { for (let i = 0; i < 8; i++) fx.parts.push({ x: p.cx() + (Math.random() - 0.5) * 8, y: wy, vx: (Math.random() - 0.5) * 70 - p.vx * 0.1, vy: -40 - Math.random() * 60, life: 0.5, max: 0.5, color: Math.random() < 0.5 ? '#7fa4b0' : '#b0cdd2', grav: 320, size: 0.5 }); } else if (!world.inCave) P.push({ x: p.cx() - 1.5, y: p.y + p.h + 0.5, f: p.facing, t: 6 });
    }
  }
  // cinza que se ergue quando o vento sopra forte
  if (!world.inCave && rajada(t) > 0.5 && Math.random() < 0.35 * rajada(t) * rico) fx.parts.push({ x: cam.x - 6, y: cam.y + 60 + Math.random() * 120, vx: 170 + Math.random() * 90, vy: -6 + Math.random() * 12, life: 2.6, max: 2.6, color: '#c3ccd6', grav: 4, size: 0.5 });
}
