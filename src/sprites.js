// Pixel art procedural — personagens desenhados com retângulos (paletas do Atlas, Vol. III).
import { PLAYER } from './data.js';

function painter(ctx, ox, oy, facing, flash) {
  return (lx, ly, w, h, c) => {
    ctx.fillStyle = flash ? '#ffffff' : c;
    const x = facing > 0 ? ox + lx : ox - lx - w;
    ctx.fillRect(Math.round(x), Math.round(oy + ly), w, h);
  };
}

function blade(ctx, hx, hy, ang, len, facing, color = '#c9c6c0', width = 2) {
  ctx.save();
  ctx.translate(Math.round(hx), Math.round(hy));
  ctx.scale(facing, 1);
  ctx.rotate(ang);
  ctx.fillStyle = '#3b2f28';
  ctx.fillRect(-1, -1, 3, 3);
  ctx.fillStyle = color;
  ctx.fillRect(2, -Math.floor(width / 2), len, width);
  ctx.fillStyle = '#f4f1ea';
  ctx.fillRect(2, -Math.floor(width / 2), len, 1);
  ctx.restore();
}

function arc(ctx, cx, cy, r, a0, a1, facing, color, alpha) {
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(facing, 1);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, r, a0, a1); ctx.stroke();
  ctx.restore();
}

// O Errante: pele muito clara, máscara, runa vermelha no peito, manto branco sujo e rasgado.
export function drawErrante(ctx, p, sx, sy, time) {
  const f = p.facing;
  const flash = p.flash > 0 && Math.floor(p.flash * 40) % 2 === 0;
  if (p.invuln > 0 && p.action !== 'hurt' && Math.floor(time * 30) % 2 === 0) ctx.globalAlpha = 0.6;
  const a = p.action, t = p.t;
  let crouch = 0, lean = 0;
  if (a === 'dodge') { crouch = 6; lean = 2; ctx.globalAlpha = 0.85; }
  if (a === 'heavyCharge') crouch = 2;
  if (a === 'heal' || a === 'rest') crouch = 3;
  if (p.dead) { crouch = Math.min(14, p.deadT * 20); ctx.globalAlpha = Math.max(0, 1 - p.deadT / 2.4); }
  const P = painter(ctx, sx, sy, f, flash);
  const moving = p.onGround && Math.abs(p.vx) > 10 && !a;
  const ph = Math.sin(p.walkPhase);
  const l1 = moving ? Math.round(ph * 2) : 0;
  const air = !p.onGround;

  // Pernas
  P(-3 + l1, -6, 2, 6 - (air ? 1 : 0), '#2b2630');
  P(1 - l1, -6, 2, 6, '#2b2630');
  const y0 = crouch;
  // Manto (costas)
  const sway = Math.round(Math.sin(time * 3) * 1) + (moving ? -1 : 0);
  P(-7 + sway, -16 + y0, 3, 10, '#b8b1a2');
  P(-8 + sway, -8 + y0, 2, 3, '#a39c8e');
  // Corpo / manto
  P(-5 + lean, -17 + y0, 10, 11, '#d9d4c8');
  P(-5 + lean, -17 + y0, 2, 11, '#b3ab9b');
  P(-4 + lean, -6 + y0, 2, 1, '#d9d4c8');
  P(0 + lean, -6 + y0, 3, 1, '#c9c2b4');
  P(3 + lean, -7 + y0, 2, 1, '#b3ab9b');
  // Runa no peito (pulsa)
  const glow = 0.6 + Math.sin(time * 4) * 0.4;
  P(0 + lean, -14 + y0, 2, 3, glow > 0.5 ? '#d0343e' : '#a72f2f');
  P(-1 + lean, -13 + y0, 4, 1, '#a72f2f');
  // Cabeça e máscara
  P(-3 + lean, -23 + y0, 7, 6, '#ece8e1');
  P(-1 + lean, -22 + y0, 5, 4, '#f7f3ec');
  P(2 + lean, -21 + y0, 2, 1, '#151316');
  P(0 + lean, -23 + y0, 1, 2, '#9d968a');
  P(-4 + lean, -23 + y0, 2, 5, '#c9c2b4'); // capuz

  // Arma
  const hx = sx + f * (3 + lean), hy = sy - 11 + y0;
  let ang = 1.2, len = 13;
  if (a === 'light') {
    const k = Math.min(1, t / PLAYER.light.active[1]);
    const dirs = [[-1.9, 0.9], [0.9, -1.6], [-2.2, 1.1]];
    const [s0, s1] = dirs[p.comboIndex || 0];
    ang = s0 + (s1 - s0) * k;
    if (t > PLAYER.light.active[0] && t < PLAYER.light.active[1] + 0.06) arc(ctx, hx, hy, 15, Math.min(s0, s1), Math.max(s0, s1), f, '#f4f1ea', 0.5);
  } else if (a === 'heavyCharge') {
    ang = -2.4; if (t >= PLAYER.heavy.maxCharge - 0.25) ctx.globalAlpha = 1;
    const full = t >= PLAYER.heavy.maxCharge - 0.05;
    blade(ctx, hx, hy, ang, 15, f, full ? '#ffd27a' : '#d8cfc0', 3);
    ang = null;
  } else if (a === 'heavy') {
    const k = Math.min(1, t / 0.14);
    ang = -2.4 + 3.6 * k;
    if (t < 0.2) arc(ctx, hx, hy, 18, -2.4, 1.2, f, p.charged ? '#ffd27a' : '#f4f1ea', 0.6);
    blade(ctx, hx, hy, ang, 15, f, '#d8cfc0', 3);
    ang = null;
  } else if (a === 'parry') {
    ang = -0.9; len = 11;
    if (t < PLAYER.parry.window) { ctx.fillStyle = '#fff3c4'; ctx.globalAlpha = 0.5; ctx.fillRect(sx + f * 8 - 2, sy - 22, 4, 16); ctx.globalAlpha = 1; }
  } else if (a === 'cast') { ang = -0.1; len = 10; }
  else if (a === 'dodge') { ang = 2.4; len = 11; }
  else if (a === 'heal') { ang = 1.4; len = 11; P(3, -15 + y0, 3, 4, '#9fe0a8'); }
  else if (a === 'finisher') { ang = t < 0.3 ? -2.6 : 1.4; len = 16; }
  else if (a === 'ability') { ang = 0.3; len = 13; }
  if (ang !== null) blade(ctx, hx, hy, ang, len, f);
  ctx.globalAlpha = 1;
  if (p.perfectFlash > 0) { ctx.globalAlpha = p.perfectFlash * 2; ctx.fillStyle = '#f6f2ea'; ctx.fillRect(sx - 8, sy - 26, 16, 1); ctx.globalAlpha = 1; }
}

function warnGlow(ctx, x, y, w, h, color, time) {
  ctx.globalAlpha = 0.35 + 0.35 * (Math.sin(time * 30) > 0 ? 1 : 0);
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
  ctx.globalAlpha = 1;
}

export function drawMob(ctx, m, sx, sy, time) {
  if (m.dead) {
    if (m.deathT > 0.6) return;
    ctx.globalAlpha = 1 - m.deathT / 0.6;
  }
  const f = m.facing;
  const flash = m.flash > 0;
  const P = painter(ctx, sx, sy, f, flash);
  const st = m.state;
  const winding = st.endsWith('Wind') || st === 'windup' || st === 'wind';
  const jitter = winding ? (Math.sin(time * 60) > 0 ? 1 : 0) : 0;
  switch (m.type) {
    case 'cinzeiro': {
      const bob = Math.round(Math.sin(time * 9 + m.spawnX) * 1);
      P(-5 + jitter, -12 + bob, 10, 10, '#28282b');
      P(-4, -2, 3, 2, '#28282b'); P(1, -2, 3, 2, '#28282b');
      P(-2, -10 + bob, 1, 5, '#d56a32'); P(1, -8 + bob, 1, 4, '#d56a32'); P(-4, -6 + bob, 2, 1, '#d56a32');
      P(2, -10 + bob, 2, 2, winding ? '#ffd27a' : '#e6a34a');
      if (st === 'strike') P(5, -9, 4, 3, '#d56a32');
      break;
    }
    case 'braseiro': {
      const g = m.state === 'guard';
      P(-4, -6, 3, 6, '#3a393f'); P(1, -6, 3, 6, '#3a393f');
      P(-7 + jitter, -20, 14, 15, '#55545a');
      P(-7 + jitter, -20, 3, 15, '#45444a');
      P(-1 + jitter, -16, 5, 5, '#c85a2d');
      P(0 + jitter, -15, 3, 3, winding ? '#ffd27a' : '#e17a3d');
      P(-4, -25, 8, 6, '#45444a'); P(1, -23, 3, 1, '#e17a3d');
      if (g) { P(6, -22, 3, 18, '#6d6c73'); P(7, -21, 1, 16, '#8a8990'); }
      else {
        const armA = st === 'slash' ? -6 : st === 'slashWind' ? -14 : st === 'lunge' ? -12 : -10;
        P(6, armA, 4, 4, '#55545a');
        P(9, armA - (st === 'slashWind' ? 6 : 0), 3, st === 'slashWind' ? 10 : 4, '#c85a2d');
      }
      if (st === 'slashWind' || st === 'lungeWind') warnGlow(ctx, sx + f * 10 - 2, sy - 26, 4, 4, '#ffd23a', time);
      break;
    }
    case 'rasteja': {
      const leg = Math.round(Math.sin(time * 20 + m.spawnX) * 1);
      P(-9 + jitter, -6, 18, 4, '#333238');
      P(-7, -7, 12, 1, '#3d3c43');
      P(-8 + leg, -2, 2, 2, '#25242a'); P(-3 - leg, -2, 2, 2, '#25242a'); P(2 + leg, -2, 2, 2, '#25242a'); P(6 - leg, -2, 2, 2, '#25242a');
      P(7, -6, 3, 2, winding ? '#ffd27a' : '#e6a34a');
      for (let i = 0; i < 3; i++) P(-9 - i * 2, -8 - i, 2, 2, 'rgba(98,91,88,0.6)');
      break;
    }
    case 'gralha': {
      const flap = st === 'grounded' ? 0 : Math.round(Math.sin(time * 14 + m.spawnX) * 3);
      const ground = st === 'grounded';
      P(-5, -8, 10, 6, '#292a30');
      P(4, -9, 4, 4, '#292a30');
      P(8, -8, 3, 2, '#a65d38');
      P(6, -8, 1, 1, winding ? '#ffd27a' : '#e6a34a');
      if (ground) { P(-6, -6, 4, 3, '#202127'); P(-2, -2, 1, 2, '#a65d38'); P(1, -2, 1, 2, '#a65d38'); }
      else { P(-3, -12 - flap, 6, 4 + flap, '#202127'); P(-6, -6, 3, 2, '#202127'); }
      if (winding) warnGlow(ctx, sx - 3, sy - 14, 6, 3, st === 'shotWind' ? '#e17a3d' : '#ffd23a', time);
      break;
    }
    case 'sino': {
      const sw = st === 'wind' ? Math.round(Math.sin(time * 40) * 2) : 0;
      P(-2, -28, 4, 3, '#3b2f28');
      P(-9 + sw, -25, 18, 3, '#6d4b32');
      P(-11 + sw, -22, 22, 18, '#6d4b32');
      P(-12 + sw, -5, 24, 3, '#5a3d28');
      P(-11 + sw, -22, 4, 18, '#5a3d28');
      const crack = st === 'wind' ? '#ffd27a' : '#e17a3d';
      P(1 + sw, -21, 1, 6, crack); P(2 + sw, -15, 1, 5, crack); P(3 + sw, -10, 1, 4, crack); P(-5 + sw, -18, 1, 4, crack);
      P(-2 + sw, -6, 4, 4, '#2a211b');
      if (st === 'wind') warnGlow(ctx, sx - 14, sy - 30, 28, 2, '#ff5a3a', time);
      break;
    }
  }
  if (m.isBroken()) {
    ctx.fillStyle = Math.sin(time * 10) > 0 ? '#fff3c4' : '#ffd27a';
    ctx.fillRect(Math.round(sx - 1), Math.round(sy - m.h - 8), 2, 5);
    ctx.fillRect(Math.round(sx - 1), Math.round(sy - m.h - 2), 2, 1);
  }
  ctx.globalAlpha = 1;
}

// Asgmor — tecidos cor de osso sujo, sombra carvão, máscara marfim rachada, sino de bronze oxidado.
export function drawAsgmor(ctx, b, sx, sy, time) {
  if (b.dead && b.deathT > 2.5) return;
  if (b.dead) ctx.globalAlpha = Math.max(0, 1 - b.deathT / 2.5);
  const f = b.facing;
  const P = painter(ctx, sx, sy, f, b.flash > 0);
  const st = b.state;
  const tel = b.telegraph();
  let crouch = 0;
  if (st === 'leapWind' || st === 'rollWind') crouch = 5;
  if (st === 'broken') crouch = 6;
  if (st === 'roll') {
    // bola de tecido e cinza rolando
    const r = Math.floor(time * 20) % 4;
    P(-9, -18, 18, 18, '#29272a');
    P(-7, -16, 14, 14, '#c9b99e');
    P(-3 + (r - 2) * 2, -12, 6, 4, '#8b633f');
    P(-1, -10 + (r % 2), 3, 2, '#d8d0bd');
    ctx.globalAlpha = 1;
    return;
  }
  const y = crouch;
  const lp = Math.round(Math.sin(time * 8) * 1.5);
  // Pernas finas
  P(-4, -9 + y, 2, 9 - y, '#29272a'); P(2, -9 + y, 2, 9 - y, '#29272a');
  P(-5 + lp, -1, 3, 1, '#29272a'); P(2 - lp, -1, 3, 1, '#29272a');
  // Tecidos queimados
  P(-6, -24 + y, 12, 16, '#c9b99e');
  P(-6, -24 + y, 3, 16, '#a89a80');
  P(-7, -10 + y, 3, 3, '#c9b99e'); P(3, -9 + y, 3, 2, '#a89a80'); P(-1, -8 + y, 2, 2, '#c9b99e');
  P(-3, -20 + y, 6, 1, '#29272a'); P(-2, -16 + y, 5, 1, '#29272a');
  // Sino nas costas (balança no bellSway)
  const sway = st === 'bellSway' ? Math.round(Math.sin(b.t * 28) * 3) : Math.round(Math.sin(time * 2) * 1);
  P(-12 + sway, -27 + y, 7, 2, '#6d4b32');
  P(-13 + sway, -25 + y, 9, 9, '#8b633f');
  P(-12 + sway, -17 + y, 7, 2, st === 'bellSway' ? '#ffb070' : '#e17a3d');
  // Braços longos
  const arm = st === 'fanWind' ? -34 : st === 'dragWind' || st === 'drag' ? -12 : -20;
  P(5, arm + y, 2, st === 'fanWind' ? 12 : 10, '#c9b99e');
  P(6, arm + y + (st === 'fanWind' ? 0 : 9), 2, 2, '#d8d0bd');
  // Cabeça e máscara partida
  P(-4, -31 + y, 8, 7, '#29272a');
  P(-2, -30 + y, 6, 6, '#d8d0bd');
  P(1, -28 + y, 2, 1, '#151316'); P(-1, -28 + y, 1, 1, '#151316');
  P(0, -31 + y, 1, 4, '#29272a'); P(2, -26 + y, 2, 1, '#9d968a');
  P(-5, -33 + y, 3, 3, '#a89a80'); P(3, -34 + y, 2, 3, '#a89a80'); // pontas do capuz de bobo
  // Arma: sino arrastado na corrente
  if (st === 'dragWind' || st === 'drag') {
    P(8, -6, 9, 6, '#8b633f'); P(8, -7, 9, 1, '#6d4b32'); P(10, -1, 5, 1, '#e17a3d');
    P(6, -10, 2, 4, '#625b58');
  }
  ctx.globalAlpha = 1;
  // Avisos: amarelo = aparável, vermelho = não aparável
  if (tel) {
    const col = tel === 'parry' ? '#ffd23a' : '#ff4a3a';
    const blink = Math.sin(time * 26) > 0;
    if (blink) {
      ctx.fillStyle = col;
      ctx.fillRect(Math.round(sx - 1), Math.round(sy - 42 + y), 3, 3);
      ctx.globalAlpha = 0.35;
      ctx.fillRect(Math.round(sx - 9), Math.round(sy - 34 + y), 18, 34 - y);
      ctx.globalAlpha = 1;
    }
  }
  if (st === 'leapWind' && b.leapTarget !== undefined) {
    // Sombra no ponto de aterrissagem
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#ff4a3a';
    ctx.fillRect(Math.round(sx + (b.leapTarget - b.cx()) - 14), Math.round(sy - 1), 28, 2);
    ctx.globalAlpha = 1;
  }
  if (b.isBroken()) {
    ctx.fillStyle = Math.sin(time * 10) > 0 ? '#fff3c4' : '#ffd27a';
    ctx.fillRect(Math.round(sx - 1), Math.round(sy - 46), 2, 6);
    ctx.fillRect(Math.round(sx - 1), Math.round(sy - 38), 2, 2);
  }
}

export function drawNPC(ctx, sx, sy, time) {
  // Elion — Guardião das Lembranças
  const P = painter(ctx, sx, sy, -1, false);
  P(-5, -18, 10, 18, '#3c4658');
  P(-5, -18, 2, 18, '#2e3646');
  P(-3, -24, 6, 6, '#c4b8a8');
  P(-2, -22, 1, 1, '#2a2a30'); P(1, -22, 1, 1, '#2a2a30');
  P(-4, -26, 8, 3, '#8d929e');
  P(4, -14, 2, 14, '#6d4b32');
  const g = 0.5 + Math.sin(time * 2) * 0.5;
  ctx.globalAlpha = 0.4 + g * 0.4;
  P(4, -17, 3, 3, '#b6e0d8');
  ctx.globalAlpha = 1;
}
