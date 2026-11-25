// Cenário, iluminação e HUD — Vale das Cinzas.
// Paleta-base (Atlas, Vol. III): carvão #25252A, cinza #625B58, brasa #B66A3B, tecido queimado #D9B58A, runa #A72F2F.
import { TILE } from './physics.js';
import { VW, VH } from './world.js';
import { drawMob, drawNPC, drawMorren, drawYsara, drawFauna, drawEcho, brokenMark } from './sprites.js';
import { drawErrante, drawAsgmor, piece, has, size, img } from './art.js';
import { backdrop, ashFall, drawTiles, hash, shaft, fog } from './scene.js';
import { r2, cached, blit, canvas, S } from './hd.js';
import { ARCANA, ITEMS, HERBS, POTIONS, POTION_IDS } from './data.js';
import { Input } from './input.js';

export const FONT = 'Silkscreen, "Courier New", monospace';

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

// ---------- adereços ----------
// Quantos quadros cada adereço animado tem e de quanto em quanto tempo muda
const ANIM = { bellpost: [8, 2 * Math.PI / 1.6 / 8], torch: [2, Math.PI / 14], forge: [2, Math.PI / 10], bigbell: [8, 2 * Math.PI / 0.8 / 8], chain: [6, 0.5], gearbell: [6, 0.5] };
const BOX = { bigbell: [240, 230, 120, 224] };
const PIECE = { column: (p) => (p.broken ? 'colunaq' : 'coluna'), fallenbell: () => 'sinocaido', bellpost: () => 'poste', torch: () => 'tocha', coffin: () => 'caixao', deadtree: () => 'arvore', bigbell: () => 'sinao' };
const HANG = { gaiola: 1, estandarte: 1, sinao: 1, lanterna: 1 };
function drawProp(ctx, pr, cam, time) {
  const x = pr.x - cam.x, y = pr.y - cam.y;
  if (x < -130 || x > VW + 130 || y < -60 || y > VH + 220) return;
  const nm = PIECE[pr.type] ? PIECE[pr.type](pr) : pr.type;
  if (has(nm)) {
    const o = { flip: pr.flip || (pr.v === 1 && nm !== 'casa2'), scale: pr.scale || 1 };
    if (pr.type === 'column' && pr.tall) { piece(ctx, 'coluna', x, y, { ...o, sy: 1.9, sx: 1.15 }); return; }
    if (pr.type === 'bigbell') { const sw = Math.sin(time * 0.8) * 0.05; ctx.fillStyle = '#17181d'; ctx.fillRect(r2(x) - 1, y - 260, 2, 150); piece(ctx, 'sinao', x, y - 62, { scale: 1.5, rot: sw }); return; }
    if (HANG[nm]) { const h = size(nm)[1]; ctx.save(); ctx.translate(r2(x), r2(y - h)); ctx.rotate(Math.sin(time * 0.9 + pr.x) * (nm === 'estandarte' ? 0.015 : 0.035)); piece(ctx, nm, 0, h, o); ctx.restore(); return; }
    if (nm === 'tocha') { piece(ctx, nm, x, y + 8, { sy: 1 + Math.sin(time * 17 + pr.x) * 0.03 }); flame(ctx, x, y - 12, time + pr.x, 0.7); return; }
    if (nm === 'arvore') { piece(ctx, nm, x, y + 2, { ...o, rot: Math.sin(time * 0.7 + pr.x) * 0.008 }); return; }
    piece(ctx, nm, x, y + (nm.startsWith('casa') || nm === 'forjaria' ? 2 : 1), o);
    return;
  }
  const [n, step] = ANIM[pr.type] || [1, 1];
  const i = Math.floor(time / step + pr.x) % n;
  const [w, h, ox, oy] = BOX[pr.type] || [130, 150, 64, 140];
  blit(ctx, cached(`prop:${pr.type}:${pr.v || 0}${pr.broken ? 'b' : ''}${pr.tall ? 't' : ''}:${i}`, w, h, (c) => rawProp(c, { ...pr, x: 0 }, ox, oy, i * step + 0.01)), x, y, ox, oy);
}
// Chama viva em camadas
export function flame(ctx, x, y, t, k = 1) {
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const w = (6 - i * 1.7) * k, h = (14 - i * 3.5) * k * (0.85 + 0.15 * Math.sin(t * (13 + i * 4) + i)), sx = Math.sin(t * 9 + i * 2) * 1.2 * k;
    ctx.fillStyle = ['rgba(200,70,30,0.55)', 'rgba(255,150,60,0.7)', 'rgba(255,235,180,0.9)'][i];
    ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.quadraticCurveTo(x - w * 0.6, y - h * 0.5, x + sx, y - h); ctx.quadraticCurveTo(x + w * 0.6, y - h * 0.5, x + w / 2, y); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
}
function rawProp(ctx, pr, sx, sy, time) {
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
      const h = pr.tall ? 124 : pr.broken ? 36 : 62;
      R(-8, -h - 1, 16, h + 1, '#0e0d10');
      R(-7, -h, 14, h, '#2b292e');
      R(-7, -h, 3, h, '#37343b'); R(-1, -h, 1, h, '#232126'); R(3, -h, 1, h, '#232126'); R(5, -h, 2, h, '#1d1c20');
      R(-9, -4, 18, 4, '#3a373f'); R(-9, -4, 18, 1, '#4a4650');
      if (pr.broken) { R(-7, -h - 3, 4, 3, '#2b292e'); R(-3, -h - 1, 3, 1, '#2b292e'); R(-12, -3, 5, 3, '#2b292e'); }
      else { R(-9, -h - 5, 18, 5, '#3a373f'); R(-9, -h - 5, 18, 1, '#4a4650'); }
      R(-7, -h, 14, 2, '#625b58');
      break;
    }
    case 'deadtree': {
      const d = pr.v ? -1 : 1;
      for (let k = 0; k < 58; k++) R(Math.round(Math.sin(k / 14 + (pr.v || 0)) * 3) * d - 2, -k, Math.max(1, 5 - Math.floor(k / 14)), 1, k % 5 ? '#1f1b1e' : '#2c262a');
      [[22, 16, 1], [32, 20, -1], [42, 13, 1], [50, 10, -1]].forEach(([y, len, s]) => { for (let k = 0; k < len; k++) { R(s * d * k, -y - Math.round(k * 0.55), 2, 1, '#1f1b1e'); if (k % 4 === 1) R(s * d * k, -y - Math.round(k * 0.55) - 1, 2, 1, '#8d97a4'); } });
      R(-7, -2, 14, 2, '#8d97a4');
      break;
    }
    case 'wellframe': {
      // armação do poço de serviço: roldana e corrente
      R(-42, -46, 4, 46, '#2a1f1a'); R(38, -46, 4, 46, '#2a1f1a'); R(-41, -46, 1, 46, '#4a372b'); R(39, -46, 1, 46, '#4a372b');
      R(-46, -50, 92, 5, '#34261f'); R(-46, -50, 92, 1, '#8d97a4');
      R(-4, -46, 8, 7, '#4b4d56'); R(-2, -44, 4, 3, '#777a85');
      for (let k = 0; k < 40; k += 4) { R(-1, -39 + k, 2, 3, '#5a5c66'); R(0, -37 + k, 1, 1, '#2a2b30'); }
      R(-38, -4, 6, 4, '#34353e'); R(32, -4, 6, 4, '#34353e');
      break;
    }
    case 'crack': {
      // corrente de ar e cinza saindo do vão: pista do segredo
      R(-8, -2, 14, 2, '#6a6c76'); R(-12, -1, 8, 1, '#8d97a4');
      break;
    }
    case 'coffin': {
      R(-13, -10, 26, 10, '#0e0d10'); R(-12, -9, 24, 9, '#34353e'); R(-12, -9, 24, 2, '#4d505b'); R(-10, -12, 20, 3, '#2b2c34'); R(-10, -12, 20, 1, '#5a5d69'); R(-1, -8, 2, 6, '#22232a'); R(-3, -6, 6, 1, '#22232a');
      break;
    }
    case 'chain': {
      const w = Math.round(Math.sin(time * 2) * 1);
      for (let k = 0; k < 8; k++) { R(Math.round(w * k / 4) - 1, 0, 1, 1, '#2a2b30'); }
      for (let k = -0; k < 6; k += 1) { R(-2, k * 4, 3, 3, '#4b4d56'); R(-1, k * 4 + 1, 1, 1, '#17181d'); }
      break;
    }
    case 'gearbell': {
      // engrenagem e sino do mecanismo
      R(-3, -120, 6, 60, '#2a2b30'); R(-2, -120, 1, 60, '#4b4d56');
      for (let a = 0; a < 12; a++) { const q = a / 12 * 6.283 + time * 0.5; R(Math.round(Math.cos(q) * 20) - 3, -66 + Math.round(Math.sin(q) * 20) - 3, 6, 6, '#5a4632'); }
      for (let y = -16; y <= 16; y++) { const hw = Math.round(Math.sqrt(256 - y * y)); R(-hw, -66 + y, hw * 2, 1, y < -10 ? '#80664c' : '#4a3a2c'); }
      for (let y = -6; y <= 6; y++) { const hw = Math.round(Math.sqrt(36 - y * y)); R(-hw, -66 + y, hw * 2, 1, '#1a1b21'); }
      for (let y = 0; y < 26; y++) { const hw = Math.round(6 + 10 * Math.pow(y / 26, 0.7)); R(-hw, -46 + y, hw * 2, 1, '#6d5236'); R(-hw, -46 + y, Math.round(hw * 0.5), 1, '#4a3826'); R(Math.round(hw * 0.5), -46 + y, 2, 1, '#9a7a52'); }
      R(-18, -20, 36, 3, '#4a3826'); R(-2, -17, 4, 4, '#2a211b');
      break;
    }
    case 'ashcircle': {
      for (let x = -46; x < 46; x += 2) if (hash(x) > 0.12) R(x, -1, 2, 1, hash(x + 5) > 0.5 ? '#c3ccd6' : '#8d97a4');
      for (let x = -30; x < 30; x += 4) R(x, -2, 2, 1, '#c86c43');
      R(-2, -4, 4, 3, '#8d97a4');
      break;
    }
    case 'forge': {
      // forja portátil de Ysara, alimentada por fragmentos de luz
      R(-12, -12, 24, 12, '#0e0d10'); R(-11, -11, 22, 11, '#3a373f'); R(-11, -11, 22, 2, '#4a4650');
      R(-8, -9, 16, 5, '#1a1416');
      const f = Math.sin(time * 10);
      R(-6, -9, 12, 3, f > 0 ? '#e17a3d' : '#d06030'); R(-3, -10, 6, 2, '#ffd27a');
      R(8, -22, 4, 11, '#2b2a2f'); R(8, -22, 4, 1, '#4a4650');
      R(14, -6, 8, 4, '#55545a'); R(16, -2, 4, 2, '#2b2a2f'); R(13, -7, 10, 1, '#6e6d74');
      break;
    }
    case 'torch': {
      R(-1, -2, 3, 8, '#3a2a1e'); R(-2, -2, 5, 1, '#5a4030');
      const f = Math.sin(time * 14 + pr.x) > 0 ? 1 : 0;
      R(-1, -6 - f, 3, 4, '#e17a3d'); R(0, -8 - f, 1, 3, '#ffd27a');
      break;
    }
    case 'cryptgate': {
      // arco de pedra que marca a descida para a cripta
      R(-26, -40, 6, 40, '#0e0d10'); R(20, -40, 6, 40, '#0e0d10');
      R(-25, -39, 4, 39, '#2b292e'); R(21, -39, 4, 39, '#2b292e');
      for (let k = 0; k < 48; k++) R(-24 + k, -40 - Math.round(Math.sin(k / 47 * Math.PI) * 8), 1, 4, '#2b292e');
      R(-2, -46, 4, 4, '#6d4b32'); R(-1, -42, 2, 1, '#e17a3d');
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
  const x = it.x - cam.x, y = it.y - cam.y;
  if (x < -40 || x > VW + 40 || y < -20 || y > VH + 130 || it.type === 'sign') return;
  if (it.type === 'elion') return drawNPC(ctx, x, y, time);
  if (it.type === 'morren') return drawMorren(ctx, x, y, time);
  if (it.type === 'ysara') { if (!rawProp.y || time - rawProp.y > 0.04) { rawProp.y = time; const t = time % 2.4; if (t < 1.5 && t % 0.5 > 0.3 && t % 0.5 < 0.36) for (let i = 0; i < 6; i++) world.fx.parts.push({ x: it.x + 17, y: it.y - 15, vx: -20 + Math.random() * 70, vy: -50 - Math.random() * 60, life: 0.45, max: 0.45, color: i % 2 ? '#ffc060' : '#ff8a3a', grav: 300, size: 1, glow: 1 }); } return drawYsara(ctx, x, y, time); }
  if (it.type === 'chest') { const op = !!world.flags.chests[it.id]; return piece(ctx, op ? 'bauaberto' : 'bau', x, y + 1, { scale: 0.86, sy: op ? 1 : 1 + Math.max(0, Math.sin(time * 2 + it.x)) * 0.015 }); }
  if (it.type === 'lever') return piece(ctx, 'alavanca', x, y + 1, { flip: world.leverOn(it.id), scale: 0.9 });
  if (it.type === 'stone') return piece(ctx, 'pedra', x, y + 1, { scale: 0.9 });
  if (it.type === 'herb') {
    if (it.state !== 0) return;
    return piece(ctx, 'i_' + it.herb, x, y + 1 + Math.sin(time * 2 + it.x) * 0.4, { scale: 0.85 });
  }
  if (it.type === 'shrine') {
    if (Math.random() < 0.35) world.fx.parts.push({ x: it.x + (Math.random() - 0.5) * 14, y: it.y - 20, vx: (Math.random() - 0.5) * 10, vy: -26 - Math.random() * 20, life: 1.2, max: 1.2, color: Math.random() < 0.5 ? '#ffb070' : '#ff8040', grav: -6, size: 1, glow: 1 });
    piece(ctx, 'pira', x, y + 1);
    for (let i = -1; i <= 1; i++) flame(ctx, x + i * 6, y - 17, time + i * 1.3 + it.x, 1.15 - Math.abs(i) * 0.35);
    return;
  }
  if (it.type === 'portal') return rawInteractable(ctx, it, world, r2(x), r2(y), time);
  if (it.type === 'shrine' && Math.random() < 0.25) world.fx.parts.push({ x: it.x + (Math.random() - 0.5) * 8, y: it.y - 22, vx: (Math.random() - 0.5) * 8, vy: -26, life: 1, max: 1, color: Math.random() < 0.5 ? '#ffb070' : '#e17a3d', grav: 0, size: 1 });
  const on = it.type === 'lever' ? world.leverOn(it.id) : it.type === 'chest' ? !!world.flags.chests[it.id] : it.type === 'vent' ? it.phase : it.state;
  const n = { shrine: 10, herb: 8, falsebell: 8, stone: 6 }[it.type] || 1, i = Math.floor(time * (it.type === 'shrine' ? 12 : 5) + it.x) % n;
  const s = cached(`it:${it.type}:${it.herb || ''}:${on}:${i}`, 60, 150, (c) => rawInteractable(c, { ...it, x: 0 }, world, 30, 44, i * 0.2, on));
  blit(ctx, s, x, y, 30, 44);
}
function rawInteractable(ctx, it, world, sx, sy, time, on) {
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
  } else if (it.type === 'elion') {
    drawNPC(ctx, sx, sy, time);
  } else if (it.type === 'morren') {
    drawMorren(ctx, sx, sy, time);
  } else if (it.type === 'ysara') {
    drawYsara(ctx, sx, sy, time, true);
  } else if (it.type === 'herb') {
    if (it.state !== 0) { R(-1, -1, 3, 1, '#3a3236'); return; }
    const h = HERBS[it.herb];
    const sway = Math.round(Math.sin(time * 2 + it.x) * 1);
    if (it.herb === 'liquen') { R(-4, -2, 8, 2, '#5a3428'); R(-3, -3, 2, 1, h.color); R(1, -3, 3, 1, h.color); R(-1, -4, 1, 1, '#ffb070'); }
    else if (it.herb === 'salvia') { for (let k = -2; k <= 2; k += 2) { R(k + sway * (k === 0 ? 1 : 0), -7 + Math.abs(k), 1, 7 - Math.abs(k), '#5f6a52'); R(k - 1, -6 + Math.abs(k), 1, 2, h.color); } }
    else { R(0, -8, 1, 8, '#5f6a52'); R(-2 + sway, -11, 5, 3, h.color); R(-1 + sway, -12, 3, 1, '#ffffff'); R(0 + sway, -10, 1, 1, '#e17a3d'); }
    // brilho curto de planta coletável
    if (Math.sin(time * 4) > 0.85) { ctx.fillStyle = '#fff3c4'; ctx.fillRect(sx + 2, sy - 10, 1, 1); }
  } else if (it.type === 'falsebell') {
    if (it.state === 2) { R(-5, 92, 10, 3, '#4a3424'); return; }
    const sw = it.state === 1 ? Math.round(Math.sin(time * 18) * 2) : Math.round(Math.sin(time * 1.4 + it.x) * 1);
    R(0, 0, 1, 8, '#4a4650');
    R(-5 + sw, 8, 11, 2, '#0e0d10'); R(-6 + sw, 10, 13, 9, '#0e0d10');
    R(-4 + sw, 9, 9, 2, '#6d4b32'); R(-5 + sw, 11, 11, 7, '#8b633f'); R(-5 + sw, 11, 3, 7, '#6d4b32');
    R(-5 + sw, 18, 11, 1, it.state === 1 ? '#ffd27a' : '#3a2a1e'); // sem badalo: pista visual de sino falso
  } else if (it.type === 'vent') {
    R(-6, -20, 6, 20, '#0e0d10'); R(-5, -19, 4, 18, '#2b292e');
    for (let k = 0; k < 4; k++) R(-4, -17 + k * 4, 3, 2, it.phase === 'gust' ? '#9a918a' : it.phase === 'warn' ? '#625b58' : '#1d1c20');
  } else if (it.type === 'lever') {
    R(-5, -4, 10, 4, '#0e0d10'); R(-4, -3, 8, 3, '#3a373f');
    const ang = on ? 0.6 : -0.6;
    for (let k = 0; k < 10; k++) R(Math.round(Math.sin(ang) * k), -3 - Math.round(Math.cos(ang) * k), 1, 1, '#6d6c73');
    R(Math.round(Math.sin(ang) * 10) - 1, -15, 3, 3, on ? '#7fc48a' : '#c0303a');
  } else if (it.type === 'portal') {
    if (!world.flags.bossDefeated || world.arenaLocked) return;
    for (let k = 0; k < 14; k++) {
      const a = time * 2 + k * 0.45;
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(a * 2);
      R(Math.round(Math.cos(a) * 7), -16 + Math.round(Math.sin(a) * 14), 2, 2, k % 2 ? '#d9b58a' : '#9a918a');
    }
    ctx.globalAlpha = 1;
  } else if (it.type === 'chest') {
    const open = on;
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

let lmC = null, lmX = null;
const LK = 4; // o mapa de luz tem 1/4 do tamanho e é ampliado com suavidade
function lights(ctx, world, cam, time) {
  const list = [];
  const L = (x, y, r, col, a, soft) => { const sx = x - cam.x, sy = y - cam.y; if (sx > -r * 2.6 && sx < VW + r * 2.6 && sy > -r * 2.6 && sy < VH + r * 2.6) list.push([sx, sy, r, col, a, soft]); };
  for (const it of world.interactables) {
    if (it.type === 'shrine') L(it.x, it.y - 18, 64, '#e0783a', 0.75 + Math.sin(time * 9) * 0.06);
    if (it.type === 'elion') L(it.x + 7, it.y - 24, 14, '#5aa6a0', 0.5);
    if (it.type === 'chest' && !world.flags.chests[it.id]) L(it.x, it.y - 6, 18, '#b0893a', 0.35);
    if (it.type === 'stone') L(it.x, it.y - 18, 22, '#e07a3a', 0.4);
    if (it.type === 'morren') L(it.x - 11, it.y - 8, 16, '#b0893a', 0.5);
    if (it.type === 'portal' && world.flags.bossDefeated && !world.arenaLocked) L(it.x, it.y - 16, 30, '#a08a6a', 0.5);
    if (it.type === 'herb' && it.state === 0) L(it.x, it.y - 5, 8, '#7a7a5a', 0.3);
  }
  for (const pr of world.level.props) {
    if (pr.type === 'torch') L(pr.x, pr.y - 16, 52, '#f08a44', 0.7 + Math.sin(time * 9 + pr.x) * 0.06);
    if (pr.type === 'janela') { L(pr.x, pr.y - 40, 46, '#ffd68c', 0.6); L(pr.x + 60, pr.y + 20, 56, '#c8a468', 0.35); }
    if (pr.type.startsWith('casa')) { L(pr.x + (pr.flip ? -14 : 14), pr.y - 22, 30, '#f09a50', 0.6); if (pr.type === 'casa2') L(pr.x - 14, pr.y - 60, 26, '#f09a50', 0.5); }
    if (pr.type === 'forjaria') L(pr.x + 24, pr.y - 16, 46, '#ff8a40', 0.75 + Math.sin(time * 11) * 0.08);
    if (pr.type === 'fallenbell') L(pr.x, pr.y - 14, 16, '#e07a3a', 0.3);
    if (pr.type === 'estandarte') L(pr.x, pr.y - 34, 14, '#ff4a5a', 0.35);
    if (pr.type === 'forge') L(pr.x, pr.y - 8, 34, '#c0602a', 0.55);
    if (pr.type === 'house') L(pr.x + 14, pr.y - 21, 22, '#b65a2b', 0.45);
    if (pr.type === 'ashcircle') L(pr.x, pr.y - 2, 34, '#8a6a52', 0.3 + Math.sin(time * 2) * 0.08);
    if (pr.type === 'bellpost') L(pr.x + 13, pr.y - 30, 10, '#b65a2b', 0.25);
  }
  const p = world.player;
  L(p.cx() + (p.facing > 0 ? 4 : -4), p.y + p.h - 23, 6, '#c8383a', 0.3 + Math.sin(time * 4) * 0.1);
  L(p.cx(), p.cy(), 62, '#6a6676', world.inCave ? 0.5 : 0.12, 1);
  // na cripta o Errante carrega um pouco de luz própria
  for (const l of world.loot) L(l.x, l.y - 6, 18, '#b0893a', 0.6);
  for (const m of [...world.mobs, ...world.summons]) {
    if (m.dead) continue;
    const warn = m.state.endsWith('Wind') || m.state === 'windup' || m.state === 'wind';
    L(m.cx(), m.cy(), m.type === 'sinoElite' ? 54 : 34, '#a89484', world.inCave ? 0.5 : 0.22, 1);
    const col = m.type === 'sino' ? '#c0562a' : '#b0602a';
    L(m.cx(), m.cy(), m.type === 'sino' ? 34 : 14, col, warn ? 0.55 : 0.2);
  }
  const b = world.boss;
  if (b && !b.dead && b.state !== 'dormant') {
    if (b.state !== 'roll') L(b.cx() - b.facing * 24, b.y + 4, 22, '#c86c43', 0.45 + Math.sin(time * 7) * 0.08);
    const tel = b.telegraph();
    if (tel) L(b.cx(), b.y + 10, 30, tel === 'parry' ? '#b09a2a' : '#b0302a', 0.5);
    if (b.state === 'bellSway') L(b.cx() - b.facing * 22, b.y + 4, 40, '#d06a30', 0.8);
  }
  for (const o of world.fx.objs) {
    if (o.constructor.name === 'Projectile') L(o.x, o.y, o.owner === 'player' ? 22 : 12, o.owner === 'player' ? '#d06a30' : '#7a4a30', 0.6);
    else if (o.constructor.name === 'AshPatch') { const arming = o.t > o.fuse - o.warn; L(o.x, o.y - 3, arming ? 26 : 10, arming ? '#d0502a' : '#5a534f', arming ? 0.6 : 0.2); }
    else if (o.constructor.name === 'Shockwave') L(o.x, o.y - 5, 22, '#ff9050', 0.7);
  }
  for (const v of world.fx.vis) if (v.k === 'star') L(v.x, v.y, 40, v.color === '#fff6e0' ? '#ffe0b0' : v.color, 0.8 * (1 - v.t / v.d));
  // 1) multiplica: escuro fora das luzes
  if (!lmC) { [lmC, lmX] = canvas(VW / LK, VH / LK); }
  const k = world.ambK === undefined ? (world.inCave ? 1 : 0) : world.ambK;
  world.ambK = k + ((world.inCave ? 1 : 0) - k) * 0.06;
  const mix = (a, b) => Math.round(a + (b - a) * world.ambK);
  lmX.globalCompositeOperation = 'source-over'; lmX.fillStyle = `rgb(${mix(200, 98)},${mix(192, 106)},${mix(206, 132)})`; lmX.fillRect(0, 0, lmC.width, lmC.height);
  lmX.globalCompositeOperation = 'lighter'; lmX.imageSmoothingEnabled = true;
  for (const [x, y, r, col, a] of list) { const R = r * 2.1 / LK; lmX.globalAlpha = Math.min(1, a * 0.95); lmX.drawImage(glow(col, 32), x / LK - R, y / LK - R, R * 2, R * 2); }
  lmX.globalAlpha = 1;
  ctx.globalCompositeOperation = 'multiply'; ctx.imageSmoothingEnabled = true;
  ctx.drawImage(lmC, 0, 0, VW, VH);
  // 2) soma: o brilho perto da fonte
  ctx.globalCompositeOperation = 'lighter';
  for (const [x, y, r, col, a, soft] of list) { if (soft) continue; ctx.globalAlpha = Math.min(1, a * 0.34); ctx.drawImage(glow(col, 32), x - r, y - r, r * 2, r * 2); }
  ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = false; ctx.globalCompositeOperation = 'source-over';
}

// Arco de corte: cada golpe tem o seu desenho. a0→a1 em graus (0 = frente, 90 = baixo), k = achatamento, r = raio extra
const SW = {
  A: { a0: 165, a1: -85, k: 1, r: 3, d: 0.1 }, B: { a0: -165, a1: 40, k: 0.42, r: 7, d: 0.1 }, C: { a0: -140, a1: 60, k: 1, r: 8, d: 0.12 },
  P: { a0: -155, a1: 70, k: 1, r: 8, d: 0.12 }, D: { a0: -170, a1: 20, k: 0.34, r: 18, d: 0.13 }, T: { line: 1, r: 14, d: 0.1 },
  J: { line: 1, r: 4, d: 0.08, fist: 1 }, K: { line: 1, r: 6, d: 0.08, fist: 1 }, H: { a0: 80, a1: -60, k: 0.8, r: 6, d: 0.1, fist: 1 },
};
const SWCOL = { ruptura: ['255,110,50', '255,220,160'], machado: ['190,200,225', '255,255,255'], agulhas: ['170,220,255', '255,255,255'], lanca: ['225,215,200', '255,255,255'], fio: ['225,215,205', '255,255,255'] };
function drawTrail(ctx, p, cam, time) {
  const w = p.sw;
  if (!w) return;
  const g = SW[w.key], e = time - w.t, life = g.d + 0.13;
  if (e < 0 || e > life) return;
  const f = w.facing, R = w.reach + g.r, cx = p.cx() - cam.x + f * 2, cy = p.y + p.h - 22 - cam.y;
  const k = Math.min(1, e / g.d), ease = 1 - (1 - k) * (1 - k), fade = e < g.d ? 1 : 1 - (e - g.d) / 0.13;
  const [c0, c1] = g.fist ? ['200,190,180', '255,250,240'] : SWCOL[w.weapon] || SWCOL.fio;
  ctx.globalCompositeOperation = 'lighter';
  if (g.line) {
    const l = R * ease, h = (g.fist ? 5 : 4) * fade;
    for (const [c, a, m] of [[c0, 0.45, 1.7], [c1, 0.9, 0.7]]) {
      ctx.fillStyle = `rgba(${c},${a * fade})`; ctx.beginPath(); ctx.moveTo(cx + f * 4, cy); ctx.lineTo(cx + f * l * 0.7, cy - h * m); ctx.lineTo(cx + f * (l + 4), cy); ctx.lineTo(cx + f * l * 0.7, cy + h * m); ctx.fill();
    }
  } else {
    const A0 = g.a0 * Math.PI / 180, A1 = g.a1 * Math.PI / 180, head = A0 + (A1 - A0) * ease, tail = A0 + (A1 - A0) * Math.max(0, ease - 0.75 + (e > g.d ? (e - g.d) * 4 : 0));
    const n = 22, P = (a, r) => [cx + Math.cos(a) * r * f, cy + Math.sin(a) * r * g.k];
    for (const [c, al, thick] of [[c0, 0.5, 0.55], [c1, 0.85, 0.2]]) {
      for (let i = 0; i < n; i++) {
        const q0 = i / n, q1 = (i + 1) / n, a0 = tail + (head - tail) * q0, a1 = tail + (head - tail) * q1;
        const t0 = thick * Math.sin(q0 * 2.6), t1 = thick * Math.sin(q1 * 2.6);
        const b0 = P(a0, R), b1 = P(a1, R), b2 = P(a1, R * (1 - t1)), b3 = P(a0, R * (1 - t0));
        ctx.fillStyle = `rgba(${c},${al * q1 * q1 * fade})`;
        ctx.beginPath(); ctx.moveTo(b0[0], b0[1]); ctx.lineTo(b1[0], b1[1]); ctx.lineTo(b2[0], b2[1]); ctx.lineTo(b3[0], b3[1]); ctx.fill();
      }
    }
    // ponta acesa
    const h = P(head, R * 0.97); ctx.fillStyle = `rgba(255,255,255,${0.9 * fade})`; ctx.fillRect(r2(h[0]) - 1, r2(h[1]) - 1, 2, 2);
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

function drawBreakable(ctx, b, cam) {
  const x = b.x - cam.x, y = b.y - cam.y;
  if (x < -20 || x > VW + 20 || y < -10 || y > VH + 20) return;
  if (!b.broken) return piece(ctx, b.type === 'pot' ? 'pote' : 'caixa', x, y + 1);
  blit(ctx, cached(`br:${b.type}:${b.broken}`, 24, 24, (c) => rawBreakable(c, b, 12, 20)), x, y, 12, 20);
}
function rawBreakable(ctx, b, sx, sy) {
  const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(sx + x, sy + y, w, h); };
  if (b.broken) { R(-6, -2, 4, 2, '#3a2a22'); R(1, -1, 5, 1, '#4a3424'); return; }
  if (b.type === 'pot') {
    R(-5, -12, 10, 12, '#0e0d10'); R(-4, -11, 8, 11, '#6d4b32'); R(-4, -11, 2, 11, '#4a3424'); R(-2, -13, 4, 2, '#5a3d28'); R(-3, -6, 6, 1, '#8b633f');
  } else {
    R(-6, -12, 12, 12, '#0e0d10'); R(-5, -11, 10, 10, '#4a3424'); R(-5, -11, 10, 1, '#6d4b32'); R(-5, -6, 10, 1, '#2a1e16'); R(-1, -11, 1, 10, '#2a1e16');
  }
}

function drawLoot(ctx, l, cam, time) {
  const sx = r2(l.x - cam.x), sy = r2(l.y - cam.y - 6 - Math.sin(time * 3) * 2);
  piece(ctx, 'i_' + l.id, sx, sy + 8);
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
  const pid = world.prog.potion, PT = POTIONS[pid], have = p.flasks[pid];
  slot(ctx, 10, by, String(have), false, (c, x, y) => {
    c.globalAlpha = have > 0 ? 1 : 0.3; piece(c, 'i_' + pid, x + 9, y + 17); c.globalAlpha = 1;
  }, Math.max(0, p.drinkCd / 1.5), keys ? 'Q' : null);
  // os outros tipos, em miniatura (R troca)
  POTION_IDS.forEach((id, i) => {
    const x = 11 + i * 6, y = by - 7;
    ctx.fillStyle = '#0a090c'; ctx.fillRect(x - 0.5, y - 0.5, 5, 4);
    ctx.fillStyle = p.flasks[id] > 0 ? POTIONS[id].color : '#3a3a3c'; ctx.fillRect(x, y, 4, 3);
    if (id === pid) { ctx.fillStyle = '#f0e8d8'; ctx.fillRect(x, y + 3.5, 4, 0.5); }
  });
  for (let i = 0; i < 2; i++) {
    const a = p.arcana[i];
    const cd = a ? (p.cooldowns[a] || 0) / ARCANA[a].abilities[0].cd : 0;
    slot(ctx, 36 + i * 24, by, null, p.activeSlot === i, (c, x, y) => {
      if (!a) { c.fillStyle = '#2a262b'; c.fillRect(x + 6, y + 8, 6, 2); return; }
      // carta de tarô em miniatura
      c.fillStyle = '#d4b66f'; c.fillRect(x + 4, y + 2, 10, 14);
      c.fillStyle = '#29272a'; c.fillRect(x + 5, y + 3, 8, 12);
      c.fillStyle = ARCANA[a].color; c.fillRect(x + 8, y + 5, 2, 2); c.fillRect(x + 7, y + 8, 4, 1); c.fillRect(x + 8, y + 9, 2, 4);
      c.fillStyle = '#d4b66f'; c.fillRect(x + 8, y + 13, 2, 1);
    }, cd, keys ? (i === 0 ? 'F' : 'Tab') : null);
  }
  // item rápido (bomba, óleo, selo)
  const q = world.prog.quick, qn = world.prog.items[q] || 0;
  slot(ctx, 90, by, String(qn), false, (c, x, y) => {
    c.globalAlpha = qn > 0 ? 1 : 0.3; piece(c, 'i_' + q, x + 9, y + 17); c.globalAlpha = 1;
    if (p.itemCd > 0 && q === 'bomba') { c.globalAlpha = 0.6; c.fillStyle = '#000'; c.fillRect(x, y, 18, Math.round(18 * p.itemCd / 12)); c.globalAlpha = 1; }
  }, 0, keys ? 'C' : null);
  // arma na mão (T troca)
  slot(ctx, 116, by, null, true, (c, x, y) => {
    const w = world.prog.equipped;
    if (w) piece(c, 'i_' + w, x + 9, y + 17);
    else { c.fillStyle = '#6a635e'; c.fillRect(x + 5, y + 7, 8, 6); c.fillRect(x + 4, y + 9, 2, 4); c.fillStyle = '#8a827b'; for (let i = 0; i < 4; i++) c.fillRect(x + 5 + i * 2, y + 6, 1.5, 3); }
  }, 0, keys ? 'T' : null);
  // moedas
  ctx.fillStyle = '#0a090c'; ctx.fillRect(24 + 88 + 6, 15, 3, 3);
  ctx.fillStyle = '#d4b66f'; ctx.fillRect(24 + 88 + 7, 16, 3, 3);
  text(ctx, String(world.prog.coins), 24 + 88 + 13, 22, '#e8c96a', 'left', 8);
  let by2 = 36;
  const note = (s, col) => { text(ctx, s, 24, by2, col, 'left', 8); by2 += 10; };
  if (p.oil > 0) note(`óleo ${Math.ceil(p.oil)}s`, '#ffb070');
  if (p.empowered > 0) note('risco calculado', '#f6f1e8');
  if (p.defBuff > 0) note(`defesa ${Math.ceil(p.defBuff)}s`, POTIONS.defesa.color);
  if (p.dmgBuff > 0) note(`dano ${Math.ceil(p.dmgBuff)}s`, POTIONS.dano.color);
  if (world.roomName && !world.banner && !world.dialog) {
    const q = world.roomName.t, al = Math.max(0, Math.min(1, q * 2, (3.2 - q) * 2));
    ctx.globalAlpha = al; text(ctx, world.roomName.text, VW / 2, touch ? 58 : 34, '#c3ccd6', 'center', 8);
    ctx.fillStyle = '#80664c'; ctx.fillRect(VW / 2 - 30, (touch ? 58 : 34) + 4, 60, 0.5); ctx.globalAlpha = 1;
  }

  // barra do chefe
  const b = world.boss;
  if (world.arenaLocked && b && !b.dead && b.state !== 'dormant') {
    const frac = b.hp / b.def.hp;
    ghost.boss = ghost.boss > frac ? Math.max(frac, ghost.boss - dt * 0.25) : frac;
    const w = touch ? 180 : 220, x = Math.round((VW - w) / 2) + (touch ? -40 : 62), y = touch ? 26 : VH - 20;
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
    else if (it) {
      label = 'E  ' + { shrine: 'DESCANSAR', elion: 'CONVERSAR', chest: 'ABRIR', stone: 'LER', sign: 'EXAMINAR', morren: 'COMÉRCIO', ysara: 'FORJA', herb: 'COLHER', lever: 'PUXAR ALAVANCA', bigbell: 'TOCAR O SINO (REVANCHE)', portal: 'VOLTAR A CINZEIRAL' }[it.type];
      lx = it.x; ly = it.y - (it.type === 'herb' ? 22 : 42);
    }
    if (label) {
      const x = Math.round(lx - world.cam.x), y = Math.round(ly - world.cam.y);
      ctx.font = `8px ${FONT}`;
      const w = Math.ceil(ctx.measureText(label).width) + 8;
      ctx.globalAlpha = 0.8; ctx.fillStyle = '#0a090c'; ctx.fillRect(x - w / 2, y - 8, w, 11); ctx.globalAlpha = 1;
      ctx.fillStyle = '#d4b66f'; ctx.fillRect(x - w / 2, y + 3, w, 1);
      text(ctx, label, x, y, '#f0e0b8', 'center', 8, null);
    }
  }

  let ty = 0;
  world.toasts.forEach((t) => {
    ctx.globalAlpha = Math.max(0, Math.min(1, (t.dur - t.t) * 3, t.t * 6));
    const lines = wrap(ctx, t.text, touch ? 250 : 330, 8);
    const y0 = (touch ? 72 : 48) + ty;
    ctx.globalAlpha *= 0.55; ctx.fillStyle = '#0a090c'; ctx.fillRect(VW / 2 - 172, y0 - 8, 344, lines.length * 10 + 1); ctx.globalAlpha /= 0.55;
    lines.forEach((ln, k) => text(ctx, ln, VW / 2, y0 + k * 10, '#e8e0d0', 'center', 8));
    ty += lines.length * 10 + 3;
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
    const full = wrap(ctx, msg, VW - 58, 8), h = Math.max(34, 18 + Math.min(5, full.length) * 9 + 6);
    const x = 20, w = VW - 40, y = touch ? 34 : VH - h - 8;
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
  cam.x = r2(cam.x); cam.y = r2(cam.y);
  const underground = world.inCave;
  backdrop(ctx, cam, time, world);
  if (!underground) ashFall(ctx, cam, time, world, 0);
  drawTiles(ctx, world, cam, time);
  for (const pr of world.level.props) drawProp(ctx, pr, cam, time);
  for (const it of world.interactables) drawInteractable(ctx, it, world, cam, time);
  for (const b of world.breakables) drawBreakable(ctx, b, cam);
  for (const f of world.fauna) { const fx = f.fx - cam.x; if (fx > -20 && fx < VW + 20) drawFauna(ctx, f, fx, f.fy - cam.y, time); }
  for (const l of world.loot) drawLoot(ctx, l, cam, time);
  if (world.echo) drawEcho(ctx, world.echo, world.echo.x - cam.x, world.echo.y - cam.y, time);
  for (const m of [...world.mobs, ...world.summons]) {
    const sx = m.cx() - cam.x, sy = m.y + m.h - cam.y;
    if (sx < -60 || sx > VW + 60 || sy < -40 || sy > VH + 80) continue;
    drawMob(ctx, m, sx, sy, time);
  }
  const b = world.boss;
  if (b && Math.abs(b.cx() - cam.x - VW / 2) < VW) { drawAsgmor(ctx, b, b.cx() - cam.x, b.y + b.h - cam.y, time); if (b.isBroken()) brokenMark(ctx, b.cx() - cam.x, b.y - cam.y - 34, time); }
  const p = world.player;
  for (const g of p.ghosts) drawErrante(ctx, { facing: g.facing, an: { n: g.n, f: g.f }, flash: 0, invuln: 0, dead: false, perfectFlash: 0, ghost: p.action === 'ability' ? '#d9b58a' : '#7f8fb8' }, g.x - cam.x, g.y - cam.y, time, g.t * 1.6);
  drawErrante(ctx, p, p.cx() - cam.x, p.y + p.h - cam.y, time);
  lights(ctx, world, cam, time);
  // feixes das janelas passam na frente de tudo, com poeira
  for (const pr of world.level.props) if (pr.type === 'janela') { const x = pr.x - cam.x, y = pr.y - cam.y; if (x > -160 && x < VW + 40 && y > -160 && y < VH + 80) shaft(ctx, x, y - 6, time, 24, 130); }
  drawTrail(ctx, p, cam, world.time);
  world.fx.draw(ctx, cam);
  if (!underground) { ashFall(ctx, cam, time, world, 1); fog(ctx, cam, time, VH - 78, 1.15, 0.5, 16); } else fog(ctx, cam, time, VH - 84, 1.1, 0.35, 6);
  foreground(ctx, cam, time, world);
  if (world.flashScreen > 0) { ctx.globalAlpha = world.flashScreen * 3; ctx.fillStyle = '#fff3c4'; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1; }
  drawHUD(ctx, world, time, dt);
}

// Silhuetas escuras bem perto da câmera dão profundidade
function foreground(ctx, cam, time, world) {
  if (world.arenaLocked) return;
  ctx.globalAlpha = 0.82;
  const p = 1.35, step = 300, i0 = Math.floor((cam.x * p - 80) / step);
  for (let i = i0; i <= i0 + 3; i++) {
    const h = hash(i * 7.3 + (world.inCave ? 50 : 0)); if (h < 0.35) continue;
    const x = i * step + h * 160 - cam.x * p;
    if (x < -120 || x > VW + 120) continue;
    ctx.fillStyle = '#050609';
    if (world.inCave) {
      const sw = Math.sin(time * 0.8 + i) * 2;
      for (let y = 0; y < 34 + h * 34; y += 4) { ctx.fillRect(r2(x + sw * y / 60), y, 2, 3); ctx.fillRect(r2(x + sw * y / 60) - 0.5, y + 1, 3, 1); }
    } else {
      const dir = h > 0.65 ? 1 : -1;
      for (let k = 0; k < 60; k++) { ctx.fillRect(r2(x + dir * k * 0.9), r2(-2 + Math.sin(k / 9 + i) * 3 + k * 0.28), 2, Math.max(1, 5 - k / 14)); if (k % 11 === 4) ctx.fillRect(r2(x + dir * k * 0.9), r2(k * 0.28), 1, 8 + (k % 5)); }
    }
  }
  ctx.globalAlpha = 1;
}

export function renderAsh(ctx, time) { const cam = { x: time * 6, y: 640 }; ashFall(ctx, cam, time, { ashUp: false }, 0); ashFall(ctx, cam, time, { ashUp: false }, 1); }
export { light, drawVignette };
