// Criaturas, NPCs e fauna: arte própria (arte/ia) com quadros-chave e movimento extra por código (peso, balanço, estica e achata).
import { drawErrante, creature, piece } from './art.js';
import { r2 } from './hd.js';

const cyc = (a, t, fps) => a[Math.floor(t * fps) % a.length];
// estado do mob -> quadro da folha
function pose(m, time) {
  const s = m.state, mv = Math.abs(m.vx) > 8, t = time + (m.spawnX % 7);
  if (m.dead) return 7;
  switch (m.type) {
    case 'cinzeiro':
      if (s === 'broken' || s === 'recoil') return 6;
      if (s === 'windup') return 4;
      if (s === 'strike') return 5;
      return mv ? cyc([1, 2, 3, 2], t, 11) : 0;
    case 'braseiro':
      if (s === 'broken' || s === 'recoil') return 7;
      if (s === 'guard') return 3;
      if (s === 'slashWind') return 4;
      if (s === 'lungeWind') return m.t < 0.25 ? 0 : 4;
      if (s === 'slash' || (s === 'recover' && m.t < 0.12 && m.t >= 0)) return 5;
      if (s === 'lunge') return 6;
      return mv ? cyc([1, 0], t, 5) : 0;
    case 'rasteja':
      if (s === 'broken' || s === 'recoil') return 6;
      if (s === 'windup') return 4;
      if (s === 'bite') return 5;
      return mv ? cyc([1, 2, 3, 2], t, 12) : 0;
    case 'gralha':
      if (s === 'broken' || s === 'grounded') return 6;
      if (s === 'shotWind') return 4;
      if (s === 'diveWind') return 0;
      if (s === 'dive') return 5;
      return cyc([0, 1, 2, 1], t, 10);
    default: // sino e sinoElite
      if (s === 'broken' || s === 'recoil') return 6;
      if (s === 'wind' || s === 'rainWind') return m.t < 0.3 ? 3 : 4;
      if (s === 'recover' && m.t < 0.28) return 5;
      return m.aggro ? cyc([3, 1, 0, 2], t, 4) : cyc([0, 1, 0, 2], t, 2);
  }
}

export function drawMob(ctx, m, sx, sy, time) {
  if (m.dead && m.deathT > 0.7) return;
  const key = m.type === 'sinoElite' ? 'sino' : m.type, st = m.state;
  const warn = st.endsWith('Wind') || st === 'windup' || st === 'wind';
  const i = pose(m, time), big = m.type === 'sinoElite' ? 1.24 : 1;
  let kx = big, ky = big, rot = 0, ox = 0, oy = 0;
  if (m.dead) { const k = m.deathT / 0.7; ky *= 1 - k * 0.25; } else if (warn) { const k = Math.min(1, m.t * 4); kx *= 1 + 0.05 * k; ky *= 1 - 0.06 * k; ox = Math.sin(time * 70) * 0.6 * k; } else if (st === 'strike' || st === 'lunge' || st === 'bite' || st === 'slash') { kx *= 1.1; ky *= 0.95; } else if (m.type !== 'gralha' && Math.abs(m.vx) < 8 && key !== 'sino') { const b = Math.sin(time * 3 + m.spawnX); ky *= 1 + 0.02 * b; kx *= 1 - 0.012 * b; }
  if (m.hitT > 0) { const k = m.hitT / 0.16; rot = -m.hitDir * 0.14 * k; ox += m.hitDir * 3 * k; kx *= 1 - 0.08 * k; ky *= 1 + 0.05 * k; }
  if (key === 'gralha' && !m.dead) { rot = Math.max(-0.3, Math.min(0.3, m.vy * 0.002)) * m.facing; if (st === 'hover' || st === 'idle') oy = Math.sin(time * 5 + m.spawnX) * 2; }
  if (key === 'sino' && !m.dead) rot += (st === 'wind' ? Math.sin(time * 30) * 0.05 : Math.sin(time * 2 + m.spawnX) * 0.02);
  creature(ctx, `m_${key}_${i}`, sx + ox, sy + oy, m.facing, { flash: m.flash > 0, alpha: m.dead ? 1 - m.deathT / 0.7 : 1, sx: kx, sy: ky, rot, rim: warn && Math.sin(time * 34) > 0 ? '#ffb040' : null });
  // aviso com forma, além da cor: losango amarelo = dá para aparar; triângulo vermelho = só evitar
  if (warn && Math.sin(time * 24) > -0.4) {
    const x = r2(sx), y = r2(sy - m.h - 14 - (key === 'gralha' ? 10 : 0)), red = key === 'sino' || st === 'shotWind';
    ctx.fillStyle = '#0a090c'; ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x + 5, y); ctx.lineTo(x, y + 5); ctx.lineTo(x - 5, y); ctx.fill();
    ctx.fillStyle = red ? '#ff4a3a' : '#ffd23a'; ctx.beginPath();
    if (red) { ctx.moveTo(x, y - 3.5); ctx.lineTo(x + 3.5, y + 2.5); ctx.lineTo(x - 3.5, y + 2.5); } else { ctx.moveTo(x, y - 3.5); ctx.lineTo(x + 3.5, y); ctx.lineTo(x, y + 3.5); ctx.lineTo(x - 3.5, y); }
    ctx.fill();
  }
  // vida só aparece depois do primeiro golpe
  if (!m.dead && m.hp < m.def.hp && !m.isElite) {
    const w = 20, x = r2(sx - w / 2), y = r2(sy - m.h - (key === 'gralha' ? 18 : 8));
    ctx.fillStyle = '#0a090c'; ctx.fillRect(x - 0.5, y - 0.5, w + 1, 3); ctx.fillStyle = '#5a2226'; ctx.fillRect(x, y, w, 2); ctx.fillStyle = '#e0504a'; ctx.fillRect(x, y, w * Math.max(0, m.hp / m.def.hp), 2);
    ctx.fillStyle = '#ffd27a'; ctx.fillRect(x, y + 2, w * Math.min(1, m.posture / m.def.posture), 0.5);
  }
  if (m.isBroken()) brokenMark(ctx, sx, sy - m.h - 16, time);
}

export function brokenMark(ctx, x, y, time) {
  const k = 1 + Math.sin(time * 12) * 0.2; x = r2(x); y = r2(y);
  ctx.save(); ctx.translate(x, y); ctx.rotate(time * 3); ctx.scale(k, k);
  ctx.fillStyle = '#0a090c'; ctx.fillRect(-4, -4, 8, 8); ctx.fillStyle = '#ffe08a'; ctx.fillRect(-3, -3, 6, 6); ctx.fillStyle = '#fff6ea'; ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
}

// ---------- NPCs ----------
function npc(ctx, n, sx, sy, time, fps, flip, seq) {
  const i = seq ? seq[Math.floor(time * fps) % seq.length] : 0, b = Math.sin(time * 2.2 + sx * 0.01);
  piece(ctx, `m_${n}_${i}`, sx, sy, { flip, sy: 1 + 0.012 * b, sx: 1 - 0.008 * b });
}
export function drawNPC(ctx, sx, sy, time) { npc(ctx, 'elion', sx, sy, time, 2, true, [0, 1, 2, 3]); }
export function drawMorren(ctx, sx, sy, time) { npc(ctx, 'morren', sx, sy, time, 2, true, [0, 1, 2, 3]); }
export function drawYsara(ctx, sx, sy, time) { npc(ctx, 'ysara', sx, sy, time, 4, false, [0, 1, 1, 2, 3, 3]); }

// ---------- fauna neutra: rato-de-brasa, lagarto de fuligem, gralha cinzenta ----------
export function drawFauna(ctx, f, sx, sy, time) {
  if (f.state === 'gone') return;
  if (f.kind === 'gralhinha') {
    const fly = f.state === 'flee', i = fly ? [0, 1, 2, 1][Math.floor(time * 13) % 4] : 6;
    return creature(ctx, `m_gralha_${i}`, sx, sy, f.facing, { sx: 0.36, sy: 0.36 });
  }
  const k = f.facing, x = r2(sx), y = r2(sy), st = f.state === 'flee' ? Math.floor(time * 20) % 2 : 0;
  const R = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(k > 0 ? x + a : x - a - w, y + b, w, h); };
  if (f.kind === 'rato') { R(-4, -3.5, 7, 3.5, '#1b171a'); R(-3.5, -3, 6, 2.5, '#4a4046'); R(2, -4.5, 2.5, 2.5, '#4a4046'); R(3.5, -4, 0.5, 0.5, '#ff9a52'); R(-8, -2, 4, 0.5, '#8a5a40'); R(-2 + st, -0.5, 1, 0.5, '#111'); R(1 - st, -0.5, 1, 0.5, '#111'); } else { R(-5, -2.5, 10, 2, '#141318'); R(-4, -2, 8, 1.5, '#3a3841'); R(4, -3, 3, 1.5, '#3a3841'); R(6, -2.5, 0.5, 0.5, '#ff9a52'); R(-10, -1, 5, 0.5, '#3a3841'); R(-3 + st, -0.5, 1, 0.5, '#111'); R(2 - st, -0.5, 1, 0.5, '#111'); }
}

export function drawEcho(ctx, e, sx, sy, time) {
  const ghost = { facing: e.facing, an: { n: 'guarda', f: Math.floor(time * 7) % 8 }, flash: 0, invuln: 0, dead: false, perfectFlash: 0, ghost: '#d9b58a' };
  drawErrante(ctx, ghost, sx, sy, time, Math.min(0.55, e.t) * (0.8 + Math.sin(time * 20) * 0.2));
}
