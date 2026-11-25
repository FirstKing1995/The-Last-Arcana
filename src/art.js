// Errante, Asgmor e carregamento da arte.
// O Errante é renderizado do modelo 3D (tools/errante3d.py) em pixel art: corpo numa folha e uma folha por arma.
import { HEROI } from './heroimeta.js';
import { CENA } from './cenameta.js';
import { S, r2, canvas } from './hd.js';

export const img = {};
const LIST = {
  h_errante: 'sprites/h_errante.png', h_fio: 'sprites/h_fio.png', h_lanca: 'sprites/h_lanca.png', h_machado: 'sprites/h_machado.png', h_agulhas: 'sprites/h_agulhas.png', h_ruptura: 'sprites/h_ruptura.png',
  atlas: 'cena/atlas.png', ceu: 'cena/ceu.webp', torres: 'cena/torres.webp', ruinas: 'cena/ruinas.webp', parede: 'cena/parede.webp', rocha: 'cena/rocha.webp', capa: 'cena/capa.webp',
};
let done = 0;
export const progress = { f: 0 };
// rede de celular falha: cada arquivo tenta até 4 vezes
export const artReady = Promise.all(Object.entries(LIST).map(([k, f]) => new Promise((ok) => {
  let n = 0;
  const go = () => {
    const i = new Image();
    i.onload = () => { img[k] = i; done++; progress.f = done / Object.keys(LIST).length; const b = document.getElementById('lb'); if (b) b.style.width = progress.f * 100 + '%'; ok(); };
    i.onerror = () => { if (++n < 4) setTimeout(go, 400 * n); else { console.error('arte não carregou: ' + f); img[k] = canvas(2, 2)[0]; ok(); } };
    i.src = 'assets/' + f + (n ? '?t=' + n : '');
  };
  go();
})));

// Peça do atlas. (x, y) em unidades do mundo: centro-baixo da peça.
export function piece(ctx, name, x, y, o = {}) {
  const q = CENA[name];
  if (!q) return;
  const [sx, sy, w, h] = q, k = (o.scale || 1) / S;
  const ox = q.length > 4 ? q[4] : -w / 2, oy = q.length > 4 ? q[5] : -h;
  if (!o.flip && !o.rot && !o.sx && !o.sy) { ctx.drawImage(img.atlas, sx, sy, w, h, r2(x + ox * k), r2(y + oy * k), w * k, h * k); return; }
  ctx.save();
  ctx.translate(r2(x), r2(y)); if (o.rot) ctx.rotate(o.rot);
  ctx.scale((o.flip ? -1 : 1) * (o.sx || 1), o.sy || 1);
  ctx.drawImage(img.atlas, sx, sy, w, h, ox * k, oy * k, w * k, h * k);
  ctx.restore();
}
export const has = (n) => !!CENA[n];
export const size = (n) => (CENA[n] ? [CENA[n][2] / S, CENA[n][3] / S] : [0, 0]);

// ---------- buffers para clarão, contorno e luz de borda ----------
const BW = 420, BH = 280, OX = 210, OY = 230;
const [buf, b] = canvas(BW, BH);
const [sil, s] = canvas(BW, BH);
function tint(color) {
  s.globalCompositeOperation = 'source-over'; s.clearRect(0, 0, BW, BH); s.drawImage(buf, 0, 0);
  s.globalCompositeOperation = 'source-in'; s.fillStyle = color; s.fillRect(0, 0, BW, BH);
  s.globalCompositeOperation = 'source-over';
}
function put(ctx, sx, sy, facing, o) {
  ctx.save();
  ctx.translate(r2(sx), r2(sy));
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale((facing < 0 ? -1 : 1) * (o.sx || 1) / S, (o.sy || 1) / S);
  ctx.globalAlpha = o.alpha === undefined ? 1 : Math.max(0, o.alpha);
  if (o.outline) { tint(o.outline); for (const [x, y] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.drawImage(sil, -OX + x, -OY + y); }
  if (o.flash) { tint('#fff6ea'); ctx.drawImage(sil, -OX, -OY); } else if (o.solid) { tint(o.solid); ctx.drawImage(sil, -OX, -OY); } else ctx.drawImage(buf, -OX, -OY);
  if (o.rim) { tint(o.rim); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= 0.32; ctx.drawImage(sil, -OX, -OY); }
  ctx.restore();
}
// Criatura do atlas com clarão (mobs)
export function creature(ctx, name, x, y, facing, o = {}) {
  const q = CENA[name];
  if (!q) return;
  const [sx, sy, w, h, ox, oy] = q;
  b.clearRect(0, 0, BW, BH);
  b.drawImage(img.atlas, sx, sy, w, h, OX + ox, OY + oy, w, h);
  put(ctx, x, y, facing, o);
}

// ---------- Errante ----------
export const FRAMES = (n) => HEROI.anims[n].n;
export const DUR = (n) => HEROI.anims[n].dur;
// base e ponta da arma no quadro (px da folha, relativo ao pé)
export function tipAt(anim, i, weapon) { const A = HEROI.anims[anim], t = A && A.tip[weapon]; return t ? t[Math.min(i, A.n - 1)] : null; }
function part(atlas, sheet, anim, i) {
  const T = HEROI.atlas[atlas] && HEROI.atlas[atlas][anim];
  const f = T && T[i];
  if (!f) return;
  b.drawImage(img[sheet], f[0], f[1], f[2], f[3], OX + f[4], OY + f[5], f[2], f[3]);
}
export function drawErrante(ctx, p, sx, sy, time, alphaMul = 1, outlineCol) {
  const an = p.an || { n: 'idle', f: Math.floor(time * 7) };
  const A = HEROI.anims[an.n] || HEROI.anims.idle;
  const i = Math.max(0, Math.min(A.n - 1, Math.floor(an.f) % A.n));
  const flash = p.flash > 0 && Math.floor(p.flash * 40) % 2 === 0;
  let alpha = 1;
  if (p.invuln > 0 && p.action !== 'hurt' && Math.floor(time * 30) % 2 === 0) alpha = 0.55;
  if (p.dead) alpha = Math.max(0, Math.min(1, (2.6 - p.deadT) / 0.6));
  b.clearRect(0, 0, BW, BH);
  part('errante', 'h_errante', an.n, i);
  const w = p.prog ? p.prog.equipped : p.showWeapon;
  if (w && !an.hide) part(w, 'h_' + w, an.n, i);
  if (an.item) {
    const h = A.hand[i], col = { cura: '#7fc48a', defesa: '#7fa8d8', dano: '#e0704a' }[p.drinking] || '#7fc48a';
    const hx = OX + h[0], hy = OY + h[1];
    b.fillStyle = '#0b090c'; b.fillRect(hx - 3, hy - 9, 8, 11); b.fillStyle = col; b.fillRect(hx - 2, hy - 6, 6, 7); b.fillStyle = '#d8d0c2'; b.fillRect(hx - 1, hy - 9, 4, 3);
  }
  put(ctx, sx, sy, p.facing, {
    flash, alpha: alpha * alphaMul, outline: outlineCol, sx: p.sqx || 1, sy: p.sqy || 1, rot: p.rot || 0, solid: p.ghost,
    rim: p.defBuff > 0 ? '#5a88c8' : p.dmgBuff > 0 ? '#c8503a' : p.empowered > 0 ? '#c8b890' : null,
  });
  if (p.perfectFlash > 0) {
    ctx.globalAlpha = Math.min(1, p.perfectFlash * 2.5); ctx.fillStyle = '#f6f2ea';
    ctx.fillRect(r2(sx) - 14, r2(sy) - 44, 28, 0.5); ctx.fillRect(r2(sx) - 8, r2(sy) - 46, 16, 0.5);
    ctx.globalAlpha = 1;
  }
}

// ---------- Asgmor: 16 poses feitas a partir da arte do Pedro, com peso, esticada e giro por código ----------
const A_POSE = {
  dormant: 0, recover: 0, recoil: 7, broken: 7, leapWind: 3, rollWind: 3, bellSway: 6, fanHop: 4, fanWind: 12, dragWind: 8, drag: 9, swipeWind: 3, swipe: 11, swingWind: 8, swing: 10, roll: 13, intro: 14, phaseShift: 14,
};
export function drawAsgmor(ctx, m, sx, sy, time) {
  if (m.dead && m.deathT > 3) return;
  const st = m.state, tel = m.telegraph();
  const alpha = m.dead ? Math.max(0, Math.min(1, (3 - m.deathT) / 1.2)) : m.isEcho ? 0.8 : 1;
  let n = A_POSE[st], sqx = 1, sqy = 1, rot = 0, oy = 0, ox = 0;
  if (n === undefined) n = Math.abs(m.vx) > 12 ? [1, 2][Math.floor(time * (m.phase === 2 ? 6.5 : 5)) % 2] : 0;
  if (st === 'leap') n = m.onGround ? 6 : m.vy < 40 ? 4 : 5;
  if (st === 'fanHop' && m.onGround && m.t > 0.1) n = 3;
  if (st === 'bellSway') { if (m.t > 0.45) n = 6; if (m.t < 0.2) { const k = 1 - m.t / 0.2; sqx = 1 + 0.2 * k; sqy = 1 - 0.2 * k; } else ox = Math.sin(time * 60) * 0.7; }
  if (m.dead) n = 15;
  if (!m.onGround && st !== 'roll') { const v = Math.min(0.12, Math.abs(m.vy) / 3200); sqx = 1 - v * 0.7; sqy = 1 + v; }
  if (/Wind$/.test(st)) { const k = Math.min(1, m.t * 3.2); sqx = 1 + 0.05 * k; sqy = 1 - 0.06 * k; ox = Math.sin(time * 64) * 0.6 * k; }
  if (st === 'drag' || st === 'swipe') { sqx = 1.06; sqy = 0.97; }
  if ((n === 1 || n === 2)) oy = -Math.abs(Math.sin(time * 10)) * 1.2;
  if (n === 0 && st !== 'dormant') { const b = Math.sin(time * 4); sqy = 1 + 0.015 * b; sqx = 1 - 0.01 * b; }
  if (m.hitT > 0 && !m.armoredNow) ox += m.hitDir * m.hitT * 8;
  if (st === 'roll') {
    const [, , w, h] = CENA.m_asg_13; ctx.save(); ctx.translate(r2(sx), r2(sy - h / S / 2)); ctx.rotate(m.facing * time * 16);
    ctx.drawImage(img.atlas, CENA.m_asg_13[0], CENA.m_asg_13[1], w, h, -w / S / 2, -h / S / 2, w / S, h / S); ctx.restore();
  } else creature(ctx, 'm_asg_' + n, sx + ox, sy + oy, m.facing, { flash: m.flash > 0, alpha, sx: sqx, sy: sqy, rot, rim: st === 'bellSway' && Math.sin(m.t * 30) > 0 ? '#d06a30' : m.phase === 2 && Math.sin(time * 7) > 0.2 ? '#a83020' : m.isEcho ? '#8a7a66' : null });

  if (tel && Math.sin(time * 26) > -0.2) {
    const col = tel === 'parry' ? '#ffd23a' : '#ff4a3a';
    const x = r2(sx), y = r2(sy) - 82;
    ctx.fillStyle = '#0a090c'; ctx.fillRect(x - 4, y - 1, 8, 10);
    ctx.fillStyle = col; ctx.fillRect(x - 3, y, 6, 8);
    ctx.fillStyle = '#fff6ea';
    if (tel === 'parry') { ctx.fillRect(x - 1, y + 1, 2, 6); ctx.fillRect(x - 2, y + 3, 4, 2); } else { ctx.fillRect(x - 0.5, y + 1, 1, 4); ctx.fillRect(x - 0.5, y + 6, 1, 1); }
  }
  if (st === 'leapWind' && m.leapTarget !== undefined) {
    const lx = r2(sx + (m.leapTarget - m.cx()));
    ctx.globalAlpha = 0.35 + 0.3 * Math.sin(time * 20);
    ctx.fillStyle = '#ff4a3a'; ctx.fillRect(lx - 22, r2(sy) - 1, 44, 1); ctx.fillRect(lx - 14, r2(sy) - 2, 28, 1);
    ctx.globalAlpha = 1;
  }
}
