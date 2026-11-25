// Errante e Asgmor: folhas geradas da arte oficial do Pedro (tools/montar_sprites.py).
// A animação do corpo vem da folha; o braço e a arma giram à parte, para acompanhar cada golpe.
import { SPRITES } from './spritemeta.js';
import { PLAYER } from './data.js';
import { S, r2, canvas } from './hd.js';

const img = {};
export const artReady = Promise.all([['errante', 'errante'], ['braco', 'errante_braco'], ['asgmor', 'asgmor']].map(([k, f]) => new Promise((ok) => {
  const i = new Image();
  i.onload = ok; i.onerror = () => { console.error('sprite não carregou: ' + f); ok(); };
  i.src = `assets/sprites/${f}.png`;
  img[k] = i;
})));

const BW = 300, BH = 220, OX = 150, OY = 180;
const [buf, b] = canvas(BW, BH);
const [sil, s] = canvas(BW, BH);

function frame(c, sheet, meta, i, dx = 0, dy = 0) {
  c.drawImage(img[sheet], (i % meta.cols) * meta.fw, Math.floor(i / meta.cols) * meta.fh, meta.fw, meta.fh, OX - meta.bx + dx, OY - meta.by + dy, meta.fw, meta.fh);
}
function tint(color) {
  s.globalCompositeOperation = 'source-over'; s.clearRect(0, 0, BW, BH); s.drawImage(buf, 0, 0);
  s.globalCompositeOperation = 'source-in'; s.fillStyle = color; s.fillRect(0, 0, BW, BH);
  s.globalCompositeOperation = 'source-over';
}
function put(ctx, sx, sy, facing, o) {
  ctx.save();
  ctx.translate(r2(sx), r2(sy));
  ctx.scale(facing < 0 ? -1 / S : 1 / S, 1 / S);
  ctx.globalAlpha = o.alpha === undefined ? 1 : Math.max(0, o.alpha);
  if (o.outline) { tint(o.outline); for (const [x, y] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.drawImage(sil, -OX + x, -OY + y); }
  if (o.flash) { tint('#fff6ea'); ctx.drawImage(sil, -OX, -OY); } else ctx.drawImage(buf, -OX, -OY);
  if (o.rim) { tint(o.rim); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= 0.35; ctx.drawImage(sil, -OX, -OY); }
  ctx.restore();
}

function line(c, x0, y0, x1, y1, w, col) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), ix = x0 < x1 ? 1 : -1, iy = y0 < y1 ? 1 : -1;
  let e = dx + dy; c.fillStyle = col; const o = w >> 1;
  for (;;) {
    c.fillRect(x0 - o, y0 - o, w, w);
    if (x0 === x1 && y0 === y1) break;
    const t = 2 * e; if (t >= dy) { e += dy; x0 += ix; } if (t <= dx) { e += dx; y0 += iy; }
  }
}

// Armas: cada uma com silhueta própria
const LOOK = {
  fio: { len: 34, w: 3, col: '#8f939c', hi: '#e6eaf0', grip: '#5a4030', guard: 1 },
  lanca: { len: 58, w: 2, col: '#4a3a30', hi: '#6d5846', tip: '#c3c8d0', grip: '#4a3a30', back: 22 },
  machado: { len: 38, w: 3, col: '#4a3a30', hi: '#6d5846', axe: '#8d9098', grip: '#4a3a30' },
  agulhas: { len: 22, w: 2, col: '#b9bdc6', hi: '#ffffff', grip: '#3a2f2a', twin: 1 },
  ruptura: { len: 40, w: 4, col: '#3a3238', hi: '#c86c43', grip: '#6d4b32', guard: 1, glow: 1 },
};
function weapon(c, hx, hy, a, id, time) {
  const L = LOOK[id] || LOOK.fio, cx = Math.cos(a), cy = Math.sin(a);
  const P = (d, n = 0) => [hx + cx * d - cy * n, hy + cy * d + cx * n];
  const seg = (d0, d1, w, col, n = 0) => { const [x0, y0] = P(d0, n), [x1, y1] = P(d1, n); line(c, x0, y0, x1, y1, w, col); };
  seg(-(L.back || 6), L.len, L.w + 2, '#0b090c');
  seg(-(L.back || 6), 3, L.w, L.grip);
  seg(3, L.len, L.w, L.col); seg(5, L.len - 2, 1, L.hi, -1);
  if (L.guard) { const [x0, y0] = P(4, -5), [x1, y1] = P(4, 5); line(c, x0, y0, x1, y1, 2, '#80664c'); }
  if (L.tip) { seg(L.len - 2, L.len + 9, 4, '#0b090c'); seg(L.len - 2, L.len + 8, 2, L.tip); }
  if (L.axe) { for (let k = 0; k < 12; k++) { const w = 4 + Math.round(Math.sin(k / 11 * Math.PI) * 5); const [x0, y0] = P(L.len - 13 + k, 1), [x1, y1] = P(L.len - 13 + k, w + 4); line(c, x0, y0, x1, y1, 2, k % 11 === 0 ? '#0b090c' : L.axe); const [x2, y2] = P(L.len - 13 + k, w + 5); line(c, x2, y2, x2, y2, 2, '#d8dce4'); } }
  if (L.glow) for (let k = 0; k < 4; k++) { const [x, y] = P(10 + k * 8, Math.sin(time * 6 + k) * 1.5); c.fillStyle = '#ff9a5a'; c.fillRect(Math.round(x), Math.round(y), 2, 2); }
}
function slash(c, cx, cy, r, a0, a1, col, wide = 5) {
  const n = 46;
  for (let i = 0; i <= n; i++) {
    const k = i / n, a = a0 + (a1 - a0) * k;
    c.globalAlpha = 0.1 + 0.8 * k * k;
    const w = Math.max(1, Math.round(wide * k));
    for (let j = 0; j < w; j++) { c.fillStyle = j > w - 3 ? '#ffffff' : col; const q = r - w + j * 1.6; c.fillRect(Math.round(cx + Math.cos(a) * q), Math.round(cy + Math.sin(a) * q), 2, 2); }
  }
  c.globalAlpha = 1;
}

const E = SPRITES.errante, AR = SPRITES.braco, A = SPRITES.asgmor;
const rest = Math.atan2(AR.hand[1], AR.hand[0]), armLen = Math.hypot(AR.hand[0], AR.hand[1]);

export function drawErrante(ctx, p, sx, sy, time, alphaMul = 1, outlineCol) {
  const a = p.action, t = p.t;
  const flash = p.flash > 0 && Math.floor(p.flash * 40) % 2 === 0;
  let alpha = 1;
  if (p.invuln > 0 && a !== 'hurt' && Math.floor(time * 30) % 2 === 0) alpha = 0.55;
  if (p.dead) alpha = Math.max(0, Math.min(1, (2.6 - p.deadT) / 0.8));
  const moving = p.onGround && Math.abs(p.vx) > 10 && !a;

  let anim = 'idle', f = null;                 // f: quadro fixo, quando não é só tempo
  let ang = 2.35, arm = 1.75, over = true, id = (p.prog && p.prog.equipped) || 'fio';
  if (moving) {
    const run = Math.abs(p.vx) > 105;
    anim = run ? 'run' : 'walk'; f = Math.floor(p.walkPhase * (run ? 1 : 0.95)) % 8;
    arm = 1.6 + Math.sin(p.walkPhase * 0.78) * (run ? 0.55 : 0.3); ang = run ? 2.75 : 2.4;
  } else if (!p.onGround && !a) { anim = p.vy < 0 ? 'jump' : 'fall'; arm = p.vy < 0 ? 1.1 : 0.5; ang = p.vy < 0 ? 2.4 : 2.0; } else if (p.landT > 0 && !a) { anim = 'land'; } else if (p.world && p.world.inCombat && !a) { anim = 'ready'; arm = 1.15; ang = -0.35; }

  let arc = null;
  const W = p.weapon ? p.weapon() : null, reach = W ? W.reach * S : 48, sp = W ? W.speed : 1;
  switch (a) {
    case 'light': {
      const lt = t * sp, k = Math.min(1, lt / PLAYER.light.active[1]);
      const sw = [[-2.2, 1.0], [1.2, -1.7], [-2.6, 1.3], [-1.6, 1.0], [-2.6, 1.3]][p.comboIndex || 0];
      if (W && W.thrust) { const th = lt < 0.08 ? 0 : 1; ang = 0.05; arm = th ? 0.1 : 2.2; anim = th ? 'strike' : 'wind'; f = 0; if (th && lt < 0.22) arc = 'thrust'; break; }
      anim = lt < PLAYER.light.active[0] * 0.8 ? 'wind' : 'strike'; f = lt < 0.2 ? 0 : 1;
      ang = sw[0] + (sw[1] - sw[0]) * k; arm = ang * 0.75 + 0.1;
      if (lt > PLAYER.light.active[0] - 0.03 && lt < PLAYER.light.active[1] + 0.09) arc = [sw[0], ang, '#f4efe4'];
      break;
    }
    case 'heavyCharge': anim = 'wind'; f = Math.floor(time * 8) % 2; ang = -2.5; arm = -2.3; break;
    case 'heavy': {
      const k = Math.min(1, t / 0.14); anim = 'strike'; f = t < 0.2 ? 0 : 1;
      ang = -2.5 + 3.7 * k; arm = ang * 0.8; if (t < 0.24) arc = [-2.5, ang, p.charged ? '#ffd27a' : '#f4efe4'];
      break;
    }
    case 'parry': anim = 'ready'; f = 0; ang = -1.15; arm = -0.35; break;
    case 'dodge': case 'crawl': anim = 'slide'; f = a === 'crawl' ? Math.floor(time * 6) % 3 : Math.min(2, Math.floor(t * 9)); over = false; break;
    case 'heal': anim = 'ready'; f = 0; arm = t < 0.5 ? -0.9 : -0.2; ang = 2.2; id = null; break;
    case 'throw': anim = t < 0.16 ? 'wind' : 'strike'; f = 0; arm = t < 0.16 ? -2.4 : 0.2; id = null; break;
    case 'ability': anim = 'run'; f = 2; arm = 0.15; ang = 0.1; break;
    case 'swap': anim = 'ready'; f = 0; arm = -1.2; ang = -1.5; break;
    case 'gather': case 'rest': anim = 'kneel'; arm = a === 'gather' ? 0.9 : 1.3; ang = 1.57; id = a === 'gather' ? null : id; break;
    case 'finisher': anim = t < 0.3 ? 'wind' : 'strike'; f = 0; ang = t < 0.3 ? -2.7 : 0.35; arm = ang * 0.85; break;
    case 'hurt': anim = 'hurt'; f = 0; arm = 2.2; ang = 2.8; break;
    default:
  }
  if (p.dead) { anim = 'dead'; f = Math.min(4, Math.floor(p.deadT * 7)); over = false; }
  const M = E.anims[anim];
  const n = f === null ? Math.floor(time * M.fps) % M.n : f % M.n;

  b.clearRect(0, 0, BW, BH);
  if (arc && arc !== 'thrust') slash(b, OX + M.sh[n][0], OY + M.sh[n][1] + 4, Math.max(34, reach + 14), arc[0], arc[1], arc[2], a === 'heavy' ? 8 : 5);
  frame(b, 'errante', E, M.i + n);
  if (over) {
    const shx = OX + M.sh[n][0], shy = OY + M.sh[n][1];
    const turn = arm - rest;
    const idx = ((Math.round(turn / (2 * Math.PI) * AR.n) % AR.n) + AR.n) % AR.n;
    const q = rest + idx * 2 * Math.PI / AR.n;
    const hx = shx + Math.cos(q) * armLen, hy = shy + Math.sin(q) * armLen;
    if (id) weapon(b, hx, hy, ang, id, time);
    b.drawImage(img.braco, (idx % AR.cols) * AR.fw, Math.floor(idx / AR.cols) * AR.fw, AR.fw, AR.fw, Math.round(shx) - AR.fw / 2, Math.round(shy) - AR.fw / 2, AR.fw, AR.fw);
    if (arc === 'thrust') { b.globalAlpha = 0.7; line(b, hx, hy, hx + reach + 10, hy, 2, '#f4efe4'); b.globalAlpha = 1; }
    if (a === 'heal') {
      const col = { cura: '#7fc48a', defesa: '#7fa8d8', dano: '#e0704a' }[p.drinking] || '#7fc48a';
      b.fillStyle = '#0b090c'; b.fillRect(Math.round(hx) - 3, Math.round(hy) - 9, 8, 11);
      b.fillStyle = col; b.fillRect(Math.round(hx) - 2, Math.round(hy) - 6, 6, 7);
      b.fillStyle = '#d8d0c2'; b.fillRect(Math.round(hx) - 1, Math.round(hy) - 9, 4, 3);
    }
    if (a === 'parry' && t < PLAYER.parry.window) { b.globalAlpha = 0.65; b.fillStyle = '#fff3c4'; b.fillRect(OX + 22, OY - 62, 3, 48); b.fillRect(OX + 25, OY - 56, 1, 36); b.globalAlpha = 1; }
    if (a === 'heavyCharge' && t >= PLAYER.heavy.maxCharge - 0.05 && Math.sin(time * 40) > 0) { b.fillStyle = '#ffd27a'; b.fillRect(Math.round(hx + Math.cos(ang) * 32) - 2, Math.round(hy + Math.sin(ang) * 32) - 2, 5, 5); }
  }
  put(ctx, sx, sy, p.facing, { flash, alpha: alpha * alphaMul, outline: outlineCol, rim: p.defBuff > 0 ? '#5a88c8' : p.dmgBuff > 0 ? '#c8503a' : null });

  if (p.perfectFlash > 0) {
    ctx.globalAlpha = Math.min(1, p.perfectFlash * 2.5);
    ctx.fillStyle = '#f6f2ea';
    ctx.fillRect(r2(sx) - 12, r2(sy) - 42, 24, 0.5); ctx.fillRect(r2(sx) - 7, r2(sy) - 44, 14, 0.5);
    ctx.globalAlpha = 1;
  }
}

const A_STATE = {
  intro: 'roar', phaseShift: 'roar', leapWind: 'crouch', rollWind: 'crouch', bellSway: 'sway', dragWind: 'dragwind', drag: 'drag',
  fanWind: 'fan', roll: 'roll', broken: 'broken', recoil: 'broken', dormant: 'broken',
};
export function drawAsgmor(ctx, m, sx, sy, time) {
  if (m.dead && m.deathT > 2.5) return;
  const st = m.state, tel = m.telegraph();
  const alpha = m.dead ? Math.max(0, 1 - m.deathT / 2.5) : m.isEcho ? 0.8 : 1;
  let anim = A_STATE[st] || 'idle';
  if ((st === 'leap' || st === 'fanHop') && !m.onGround) anim = m.vy < 0 ? 'leap' : 'fall';
  else if (st === 'leap') anim = 'land';
  if (m.dead) anim = 'broken';
  const M = A.anims[anim];
  b.clearRect(0, 0, BW, BH);
  frame(b, 'asgmor', A, M.i + (st === 'dormant' ? 0 : Math.floor(time * M.fps) % M.n));
  put(ctx, sx, sy, m.facing, { flash: m.flash > 0, alpha, rim: st === 'bellSway' && Math.sin(m.t * 30) > 0 ? '#d06a30' : m.isEcho ? '#8a7a66' : null });

  if (tel && Math.sin(time * 26) > -0.2) {
    const col = tel === 'parry' ? '#ffd23a' : '#ff4a3a';
    const x = r2(sx), y = r2(sy) - 82;
    ctx.fillStyle = '#0a090c'; ctx.fillRect(x - 4, y - 1, 8, 10);
    ctx.fillStyle = col; ctx.fillRect(x - 3, y, 6, 8);
    ctx.fillStyle = '#fff6ea';
    // forma diferente além da cor: losango = aparável, traço = só evitar
    if (tel === 'parry') { ctx.fillRect(x - 1, y + 1, 2, 6); ctx.fillRect(x - 2, y + 3, 4, 2); } else { ctx.fillRect(x - 0.5, y + 1, 1, 4); ctx.fillRect(x - 0.5, y + 6, 1, 1); }
  }
  if (st === 'leapWind' && m.leapTarget !== undefined) {
    const lx = r2(sx + (m.leapTarget - m.cx()));
    ctx.globalAlpha = 0.35 + 0.3 * Math.sin(time * 20);
    ctx.fillStyle = '#ff4a3a'; ctx.fillRect(lx - 22, r2(sy) - 1, 44, 1); ctx.fillRect(lx - 14, r2(sy) - 2, 28, 1);
    ctx.globalAlpha = 1;
  }
}
