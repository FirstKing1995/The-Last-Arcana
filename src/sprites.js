// Pixel art dos personagens — segue a direção de arte do manual (Vol. III/IV):
// silhueta legível, contorno escuro separando do cenário, 3–5 materiais com base/sombra/brilho,
// saturação alta reservada para núcleo, perigo e itens interativos.
// Mobs, NPCs e fauna: desenhados por código e ampliados (Scale3x) com volume de luz. O Errante e o Asgmor ficam em art.js.
import { drawErrante } from './art.js';
import { S, r2, upscale, canvas } from './hd.js';

// ---------- infraestrutura ----------
const spriteCache = new Map();
function sprite(name, rows, pal) {
  let c = spriteCache.get(name);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = rows[0].length; c.height = rows.length;
  const x = c.getContext('2d');
  rows.forEach((r, y) => {
    for (let i = 0; i < r.length; i++) {
      const col = pal[r[i]];
      if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); }
    }
  });
  spriteCache.set(name, c);
  return c;
}

const BW = 112, BH = 84, OX = 56, OY = 72;
let buf, bctx;

// Desenha num buffer pequeno, amplia 3x (1,5x no mundo) com contorno e luz, e copia espelhado conforme facing
function outlined(ctx, sx, sy, facing, draw, opts = {}) {
  if (!buf) [buf, bctx] = canvas(BW, BH, true);
  bctx.clearRect(0, 0, BW, BH);
  draw(bctx, OX, OY);
  const n = opts.n || 3;
  const s = upscale(bctx, BW, BH, { n, light: true, flash: opts.flash });
  if (!s) return;
  ctx.save();
  ctx.translate(r2(sx), r2(sy));
  ctx.scale(facing < 0 ? -1 / S : 1 / S, 1 / S);
  ctx.globalAlpha = opts.alpha === undefined ? 1 : Math.max(0, opts.alpha);
  ctx.drawImage(s.c, s.x - OX * n, s.y - OY * n);
  ctx.restore();
}

function px(c, x, y, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), 1, 1); }
function rect(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); }

// Linha nítida (Bresenham) — usada para lâminas e membros
function line(c, x0, y0, x1, y1, col, w = 1) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  c.fillStyle = col;
  for (;;) {
    c.fillRect(x0, y0, w, w);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

function blade(c, hx, hy, ang, len, col = '#c9cdd2', edge = '#ffffff', guard = '#6d4b32') {
  const cx = Math.cos(ang), cy = Math.sin(ang);
  const tx = hx + cx * len, ty = hy + cy * len;
  line(c, hx + cx * 2, hy + cy * 2, tx, ty, col, 2);
  line(c, hx + cx * 3, hy + cy * 3, tx - cx, ty - cy, edge, 1);
  // guarda perpendicular e punho
  line(c, hx + cx * 2 - cy * 2, hy + cy * 2 + cx * 2, hx + cx * 2 + cy * 2, hy + cy * 2 - cx * 2, guard, 1);
  line(c, hx - cx * 2, hy - cy * 2, hx + cx, hy + cy, '#3b2f28', 1);
}

// Arco de golpe em pixels, mais forte no fim do movimento
function slashArc(c, cx, cy, r, a0, a1, col) {
  const steps = 18;
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    const a = a0 + (a1 - a0) * k;
    c.globalAlpha = 0.25 + 0.75 * k;
    px(c, cx + Math.cos(a) * r, cy + Math.sin(a) * r, col);
    px(c, cx + Math.cos(a) * (r - 1), cy + Math.sin(a) * (r - 1), col);
    if (k > 0.4) px(c, cx + Math.cos(a) * (r - 2), cy + Math.sin(a) * (r - 2), '#ffffff');
  }
  c.globalAlpha = 1;
}

// ---------- Mobs do Vale das Cinzas ----------
const CINZ = [
  '....aaaa....',
  '...abbbaa...',
  '..abbFaaaa..',
  '.abbaaFaaEa.',
  '.abaaaaFaaaa',
  '.aFaaaaaaFa.',
  'aaaFaaaaaFaa',
  'aaaaFFaaaaaa',
  '.aaaaaaFaaa.',
  '.aaaaaaaaaa.',
];
const CINZ_PAL = { a: '#28282b', b: '#3c3b41', F: '#d56a32', E: '#ffb050' };
const CINZ_PAL_W = { a: '#28282b', b: '#3c3b41', F: '#ffb050', E: '#fff0b0' };

const BRAS = [
  '......pppp......',
  '.....pPPPPp.....',
  '.....pPeePp.....',
  '.....pPPPPp.....',
  '...gggppppggg...',
  '..gGGGggggGGGg..',
  '..gGgggEEgggGg..',
  '..gGggEYYEggGg..',
  '..gGggEYYEggGg..',
  '..gGgggEEgggGg..',
  '..ggGggggggGgg..',
  '...ggGGGGGGgg...',
  '...gggggggggg...',
  '....ggg..ggg....',
];
const BRAS_PAL = { p: '#45444a', P: '#5d5c63', e: '#e17a3d', g: '#55545a', G: '#6e6d74', E: '#c85a2d', Y: '#ffb060' };
const BRAS_PAL_W = { ...BRAS_PAL, Y: '#fff0b0', E: '#ff8a3d', e: '#ffd27a' };

const RAST = [
  '......bbbbbbb.......',
  '...bbbBBBBBBBbbb....',
  '.bbBBBBBBBBBBBBbbbb.',
  'bbbbbbbbbbbbbbbbbbEb',
  '.bbbbbbbbbbbbbbbbbbb',
];
const RAST_PAL = { b: '#333238', B: '#47464e', E: '#e6a34a' };
const RAST_PAL_W = { ...RAST_PAL, E: '#fff0b0' };

const GRAL = [
  '..........kk....',
  '.........kKkk...',
  '..ttkkkkkkkkEkB.',
  '.tttkKKkkkkkkBBB',
  '..ttkkkkkkkk....',
  '....kkkkkk......',
];
const GRAL_PAL = { k: '#292a30', K: '#3d3e47', t: '#202127', E: '#e6a34a', B: '#a65d38' };
const GRAL_PAL_W = { ...GRAL_PAL, E: '#fff0b0' };
const WING_UP = ['.....wwww...', '...wwWWww...', '..wwWWw.....', '.www........'];
const WING_DN = ['....wwwwww..', '.....wWWww..', '.......wWw..', '........ww..'];
const WING_PAL = { w: '#202127', W: '#34353d' };

function bellShape(c, cx, top, w, h, base, shade, light) {
  for (let y = 0; y < h; y++) {
    const k = y / h;
    const half = Math.round((w / 2) * (0.45 + 0.55 * Math.pow(k, 0.7)));
    for (let x = -half; x < half; x++) {
      const t = (x + half) / (2 * half);
      c.fillStyle = t < 0.28 ? shade : t > 0.72 && t < 0.86 ? light : base;
      c.fillRect(cx + x, top + y, 1, 1);
    }
  }
}

export function drawMob(ctx, m, sx, sy, time) {
  if (m.dead && m.deathT > 0.6) return;
  const st = m.state;
  const warn = st.endsWith('Wind') || st === 'windup' || st === 'wind';
  const flash = m.flash > 0;
  const alpha = m.dead ? 1 - m.deathT / 0.6 : 1;
  const jit = warn && Math.sin(time * 60) > 0 ? 1 : 0;

  outlined(ctx, sx, sy, m.facing, (c, ox, oy) => {
    switch (m.type) {
      case 'cinzeiro': {
        const bob = Math.sin(time * 9 + m.spawnX) > 0 ? 1 : 0;
        const step = Math.abs(m.vx) > 5 ? (Math.floor(time * 10) % 2) : 0;
        rect(c, ox - 4 + step, oy - 3, 3, 3, '#1d1d20'); rect(c, ox + 1 - step, oy - 3, 3, 3, '#1d1d20');
        c.drawImage(sprite(warn ? 'cinzW' : 'cinz', CINZ, warn ? CINZ_PAL_W : CINZ_PAL), ox - 6 + jit, oy - 13 + bob);
        if (st === 'strike') { rect(c, ox + 6, oy - 9, 4, 3, '#d56a32'); px(c, ox + 9, oy - 8, '#ffd27a'); }
        break;
      }
      case 'braseiro': {
        const walk = Math.abs(m.vx) > 5;
        const f = walk ? Math.floor(time * 8) % 4 : 0;
        const lo = [0, 1, 0, -1][f];
        line(c, ox - 3, oy - 9, ox - 3 - lo, oy - 1, '#2e2d33', 3);
        line(c, ox + 2, oy - 9, ox + 2 + lo, oy - 1, '#3a393f', 3);
        c.drawImage(sprite(warn ? 'brasW' : 'bras', BRAS, warn ? BRAS_PAL_W : BRAS_PAL), ox - 8 + jit, oy - 23);
        if (st === 'guard') {
          rect(c, ox + 7, oy - 22, 4, 18, '#6d6c73'); rect(c, ox + 8, oy - 21, 1, 16, '#9a99a0'); rect(c, ox + 7, oy - 14, 4, 1, '#45444a');
        } else {
          const ang = st === 'slashWind' ? -2.3 : st === 'slash' ? 0.9 : st === 'lungeWind' ? 2.8 : st === 'lunge' ? 0.1 : 1.2;
          const shx = ox + 5, shy = oy - 17;
          const hx = shx + Math.cos(ang) * 5, hy = shy + Math.sin(ang) * 5;
          line(c, shx, shy, hx, hy, '#55545a', 3);
          blade(c, hx, hy, ang, 10, '#7a5a44', '#c85a2d', '#3a2a22');
          if (warn) slashArc(c, shx, shy, 13, ang - 0.6, ang, '#ffd23a');
        }
        break;
      }
      case 'rasteja': {
        const f = Math.floor(time * 18 + m.spawnX) % 2;
        for (let i = 0; i < 4; i++) {
          const lx = ox - 8 + i * 5 + ((i + f) % 2 ? 1 : -1);
          line(c, lx, oy - 3, lx - 1, oy - 1, '#25242a', 1); px(c, lx - 2, oy - 1, '#25242a');
        }
        c.drawImage(sprite(warn ? 'rastW' : 'rast', RAST, warn ? RAST_PAL_W : RAST_PAL), ox - 10 + jit, oy - 7);
        // fumaça no dorso
        c.globalAlpha = 0.5;
        for (let i = 0; i < 3; i++) px(c, ox - 6 + i * 3, oy - 8 - ((Math.floor(time * 6) + i) % 3), '#625b58');
        c.globalAlpha = 1;
        break;
      }
      case 'gralha': {
        const ground = st === 'grounded';
        const up = ground ? false : Math.floor(time * 10 + m.spawnX) % 2 === 0;
        c.drawImage(sprite(warn ? 'gralW' : 'gral', GRAL, warn ? GRAL_PAL_W : GRAL_PAL), ox - 8, oy - 8);
        if (ground) { rect(c, ox - 5, oy - 5, 7, 2, '#202127'); line(c, ox - 1, oy - 2, ox - 1, oy, '#a65d38'); line(c, ox + 2, oy - 2, ox + 2, oy, '#a65d38'); }
        else c.drawImage(sprite(up ? 'wingU' : 'wingD', up ? WING_UP : WING_DN, WING_PAL), ox - 7, up ? oy - 11 : oy - 5);
        break;
      }
      case 'sinoElite':
      case 'sino': {
        const big = m.type === 'sinoElite';
        const sw = (st === 'wind' || st === 'rainWind') ? Math.round(Math.sin(time * 40) * 2) : 0;
        if (big) {
          rect(c, ox - 1, oy - 40, 2, 6, '#3b2f28');
          bellShape(c, ox + sw, oy - 34, 32, 28, '#5a4a3a', '#3a2e24', '#7a6a52');
          rect(c, ox - 16 + sw, oy - 6, 32, 2, '#4a3a2e');
          const ck = st === 'wind' || st === 'rainWind' ? '#ffe08a' : '#e17a3d';
          line(c, ox + 3 + sw, oy - 32, ox - 2 + sw, oy - 20, ck); line(c, ox - 2 + sw, oy - 20, ox + 5 + sw, oy - 9, ck);
          line(c, ox - 9 + sw, oy - 26, ox - 6 + sw, oy - 14, ck); line(c, ox + 9 + sw, oy - 22, ox + 11 + sw, oy - 12, ck);
          rect(c, ox - 3 + sw, oy - 4, 6, 4, '#2a211b'); px(c, ox + sw, oy - 2, '#ffb070');
          for (let i = 0; i < 3; i++) px(c, ox - 12 + i * 12 + sw, oy - 30 + (i % 2) * 3, '#d4b66f');
          break;
        }
        rect(c, ox - 1, oy - 33, 2, 4, '#3b2f28');
        rect(c, ox - 3, oy - 30, 6, 2, '#4a3424');
        bellShape(c, ox + sw, oy - 28, 26, 22, '#6d4b32', '#4a3424', '#8b633f');
        rect(c, ox - 13 + sw, oy - 6, 26, 2, '#5a3d28');
        rect(c, ox - 12 + sw, oy - 4, 24, 1, '#3a2a1e');
        const crack = st === 'wind' ? '#ffe08a' : '#e17a3d';
        line(c, ox + 2 + sw, oy - 26, ox - 1 + sw, oy - 18, crack); line(c, ox - 1 + sw, oy - 18, ox + 3 + sw, oy - 10, crack);
        line(c, ox - 6 + sw, oy - 20, ox - 4 + sw, oy - 14, crack);
        rect(c, ox - 2 + sw, oy - 4, 4, 4, '#2a211b'); px(c, ox + sw, oy - 2, '#e17a3d');
        break;
      }
    }
  }, { flash, alpha });

  if (m.isBroken()) brokenMark(ctx, sx, sy - m.h - 14, time);
}

export function brokenMark(ctx, x, y, time) {
  const col = Math.sin(time * 10) > 0 ? '#fff3c4' : '#ffd27a';
  ctx.fillStyle = '#0a090c';
  ctx.fillRect(Math.round(x) - 2, Math.round(y) - 1, 5, 10);
  ctx.fillStyle = col;
  ctx.fillRect(Math.round(x) - 1, Math.round(y), 3, 5);
  ctx.fillRect(Math.round(x) - 1, Math.round(y) + 6, 3, 2);
}

// ---------- Elion, o Guardião das Lembranças ----------
const ELION = [
  '....HHHH.....',
  '...HhhhhH....',
  '..HhhffffH...',
  '..HhfFFeF....',
  '..HhfFFFF....',
  '...HhffF.....',
  '..rrRRRRrr...',
  '.rrRRRRRRrr..',
  '.rRRRgRRRRr..',
  '.rRRRgRRRRr..',
  '.rRRRRRRRRr..',
  '.rrRRRRRRRr..',
  '.rrRRRRRRRr..',
  '.rrRRRRRRRrr.',
  '.rrRRRRRRRRr.',
  'rrrRRRRRRRRr.',
  'rrrRRRRRRRRrr',
  'rr.rrRRrrRRrr',
];
const ELION_PAL = { H: '#5c6470', h: '#8d929e', f: '#b3a796', F: '#c4b8a8', e: '#2a2a30', r: '#2e3646', R: '#3c4658', g: '#b6e0d8' };

export function drawNPC(ctx, sx, sy, time) {
  outlined(ctx, sx, sy, -1, (c, ox, oy) => {
    c.drawImage(sprite('elion', ELION, ELION_PAL), ox - 6, oy - 18 - 1);
    line(c, ox + 7, oy - 22, ox + 7, oy - 1, '#6d4b32');
    const g = Math.sin(time * 2) > 0;
    rect(c, ox + 6, oy - 25, 3, 3, g ? '#d6f4ee' : '#b6e0d8');
  });
}

// ---------- Morren, o Mercador de Mil Coisas (loja dobrável nas costas) ----------
const MORREN = [
  '..bbbbbbb.......',
  '.bBBBBBBBb......',
  '.bBkBBkBBb......',
  '.bBBBBBBBbhhh...',
  '.bBkBBkBBhHHHh..',
  '.bBBBBBBBhffff..',
  '.bbbbbbbbhfFeF..',
  '.bmmmmmmbhffff..',
  '.bBBBBBBbcccc...',
  '.bBkBBkBBcCCCcc.',
  '.bBBBBBBBcCCCc..',
  '.bbbbbbbbcCCCc..',
  '........ccCCCc..',
  '........cCCCCc..',
  '........cc..cc..',
];
const MORREN_PAL = { b: '#3a2a1e', B: '#6d4b32', k: '#b0893a', m: '#8a8f96', h: '#5a4a3a', H: '#7a6248', f: '#c4a88a', F: '#d8bea0', e: '#2a2a30', c: '#3f4a3a', C: '#556450' };

// ---------- Ysara, a Ferreira das Brasas Frias ----------
const YSARA = [
  '....rrrr....',
  '...rrrrrr...',
  '...rssssr...',
  '...rsSeSr...',
  '....ssss....',
  '..llaaaall..',
  '.lLlaaaalLl.',
  '.sQlaaaalQs.',
  '.s.laaaal.s.',
  '...lllllll..',
  '...ll...ll..',
  '...dd...dd..',
];
const YSARA_PAL = { r: '#7a2e24', s: '#b88a6a', S: '#d0a27e', e: '#2a2026', l: '#3a2f2a', L: '#5a4a40', a: '#5a3d28', Q: '#c0603a', d: '#1d1922' };

export function drawMorren(ctx, sx, sy, time) {
  outlined(ctx, sx, sy, -1, (c, ox, oy) => {
    const bob = Math.sin(time * 2) > 0.7 ? 1 : 0;
    c.drawImage(sprite('morren', MORREN, MORREN_PAL), ox - 9, oy - 15 + bob);
    // lanterna pendurada na mochila
    line(c, ox - 9, oy - 13 + bob, ox - 11, oy - 9 + bob, '#3a2a1e');
    rect(c, ox - 12, oy - 9 + bob, 3, 3, Math.sin(time * 6) > 0 ? '#ffd27a' : '#e1a23d');
  });
}
export function drawYsara(ctx, sx, sy, time, working) {
  outlined(ctx, sx, sy, 1, (c, ox, oy) => {
    c.drawImage(sprite('ysara', YSARA, YSARA_PAL), ox - 6, oy - 12 - 1);
    // martelo
    const up = working && Math.floor(time * 3) % 2 === 0;
    const ang = up ? -1.9 : 0.5;
    const hx = ox + 4 + Math.cos(ang) * 6, hy = oy - 7 + Math.sin(ang) * 6;
    line(c, ox + 4, oy - 7, hx, hy, '#6d4b32');
    rect(c, hx - 1, hy - 2, 4, 3, '#55545a');
  });
}

// ---------- fauna neutra: rato-de-brasa, lagarto de fuligem, gralha cinzenta ----------
export function drawFauna(ctx, f, sx, sy, time) {
  if (f.state === 'gone') return;
  outlined(ctx, sx, sy, f.facing, (c, ox, oy) => {
    if (f.kind === 'rato') {
      const step = f.state === 'flee' ? Math.floor(time * 20) % 2 : 0;
      rect(c, ox - 3, oy - 3, 6, 3, '#3a3236'); rect(c, ox + 2, oy - 4, 2, 2, '#3a3236');
      px(c, ox + 3, oy - 4, '#e17a3d'); rect(c, ox - 6, oy - 2, 3, 1, '#6d4b32');
      px(c, ox - 2 + step, oy - 1, '#1d1922'); px(c, ox + 1 - step, oy - 1, '#1d1922');
    } else if (f.kind === 'lagarto') {
      rect(c, ox - 4, oy - 2, 8, 2, '#2c2a30'); rect(c, ox + 3, oy - 3, 3, 2, '#2c2a30');
      rect(c, ox - 8, oy - 1, 4, 1, '#2c2a30'); px(c, ox + 5, oy - 3, '#d56a32');
      px(c, ox - 2, oy, '#1d1922'); px(c, ox + 2, oy, '#1d1922');
    } else {
      const flying = f.state === 'flee';
      const flap = flying && Math.floor(time * 14) % 2 === 0;
      rect(c, ox - 3, oy - 4, 6, 3, '#4a4650'); rect(c, ox + 2, oy - 5, 2, 2, '#4a4650'); px(c, ox + 4, oy - 4, '#a65d38');
      if (flying) rect(c, ox - 2, flap ? oy - 7 : oy - 2, 4, 2, '#36333b');
      else { px(c, ox - 1, oy - 1, '#a65d38'); px(c, ox + 1, oy - 1, '#a65d38'); }
    }
  }, { n: 2 });
}

export function drawEcho(ctx, e, sx, sy, time) {
  const ghost = { facing: e.facing, action: null, t: 0, flash: 0, invuln: 0, dead: false, onGround: true, vx: 0, vy: 0, walkPhase: 0, perfectFlash: 0, landT: 0 };
  drawErrante(ctx, ghost, sx, sy, time, Math.min(0.55, e.t) * (0.8 + Math.sin(time * 20) * 0.2), '#d9b58a');
}
