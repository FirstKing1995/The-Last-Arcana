// Pixel art dos personagens — segue a direção de arte do manual (Vol. III/IV):
// silhueta legível, contorno escuro separando do cenário, 3–5 materiais com base/sombra/brilho,
// saturação alta reservada para núcleo, perigo e itens interativos.
import { PLAYER } from './data.js';

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
let buf, bctx, sil, sctx;
function ensure() {
  if (buf) return;
  buf = document.createElement('canvas'); buf.width = BW; buf.height = BH; bctx = buf.getContext('2d');
  sil = document.createElement('canvas'); sil.width = BW; sil.height = BH; sctx = sil.getContext('2d');
}

// Desenha um personagem num buffer, aplica contorno escuro e copia para a tela (espelhado conforme facing)
function outlined(ctx, sx, sy, facing, draw, opts = {}) {
  ensure();
  bctx.clearRect(0, 0, BW, BH);
  draw(bctx, OX, OY);
  sctx.globalCompositeOperation = 'source-over';
  sctx.clearRect(0, 0, BW, BH);
  sctx.drawImage(buf, 0, 0);
  sctx.globalCompositeOperation = 'source-in';
  sctx.fillStyle = opts.outline || '#0a090c';
  sctx.fillRect(0, 0, BW, BH);
  sctx.globalCompositeOperation = 'source-over';
  ctx.save();
  ctx.translate(Math.round(sx), Math.round(sy));
  if (facing < 0) ctx.scale(-1, 1);
  ctx.globalAlpha = opts.alpha === undefined ? 1 : opts.alpha;
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.drawImage(sil, -OX + dx, -OY + dy);
  if (opts.flash) {
    sctx.globalCompositeOperation = 'source-in';
    sctx.fillStyle = '#fff6ea'; sctx.fillRect(0, 0, BW, BH);
    sctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(sil, -OX, -OY);
  } else ctx.drawImage(buf, -OX, -OY);
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

// ---------- O Errante ----------
const ERR_PAL = {
  h: '#d6cfc0', H: '#9d9484', m: '#d4ccbe', M: '#f6f1e8', k: '#a59c8e', e: '#1a1418',
  c: '#d6cfc0', l: '#efe9dd', s: '#a89f8e', d: '#7d7568', R: '#e0404a', r: '#a72f2f',
};
const ERR_BODY = [
  '......hhhhh.....',
  '.....hhhhhhh....',
  '....HhhmmmmMh...',
  '....HhmMMMMMm...',
  '....HhmMkMMeM...',
  '....HhmMkMMMM...',
  '....HHhmMMMMm...',
  '.....HHhmmmm....',
  '....sslllccc....',
  '...sscccccccl...',
  '...ssccRRcccc...',
  '...ssccrRcccc...',
  '..sscccccccc....',
  '..ssccccccccs...',
  '.ssdcccccccs....',
  '.sdssccccccs....',
  'sdsssccccccs....',
  'sd.sssccccss....',
  'd..sdssccsds....',
  '...d.sd.s.d.....',
];
const ERR_BODY_B = ERR_BODY.map((r, i) => (i >= 15 ? r.slice(1) + '.' : r)); // manto balançando

const RUN = [[3, 0, -3, 1], [2, 1, -2, 0], [0, 2, 0, 0], [-3, 1, 3, 0], [-2, 0, 2, 1], [0, 0, 0, 2]];

function legs(c, ox, oy, pose, tuck = 0) {
  const [f, fl, b, bl] = pose;
  // perna de trás (mais escura) e da frente
  line(c, ox - 1, oy - 7 + tuck, ox + b - 1, oy - 1 - bl, '#1d1922', 2);
  rect(c, ox + b - 2, oy - 1 - bl, 3, 1, '#151218');
  line(c, ox + 1, oy - 7 + tuck, ox + f + 1, oy - 1 - fl, '#2e2834', 2);
  px(c, ox + 1, oy - 6 + tuck, '#3d3644');
  rect(c, ox + f, oy - 1 - fl, 3, 1, '#1d1922');
}

export function drawErrante(ctx, p, sx, sy, time, alphaMul = 1, outlineCol) {
  const a = p.action, t = p.t;
  const flash = p.flash > 0 && Math.floor(p.flash * 40) % 2 === 0;
  let alpha = 1;
  if (p.invuln > 0 && a !== 'hurt' && Math.floor(time * 30) % 2 === 0) alpha = 0.55;
  if (p.dead) alpha = Math.max(0, 1 - p.deadT / 2.4);
  const moving = p.onGround && Math.abs(p.vx) > 10 && !a;
  const frame = moving ? Math.floor(p.walkPhase * 1.6) % 6 : 0;

  outlined(ctx, sx, sy, p.facing, (c, ox, oy) => {
    let bob = 0, tuck = 0, pose = [1, 0, -1, 0];
    if (moving) { pose = RUN[frame]; bob = frame === 1 || frame === 4 ? -1 : 0; }
    else if (!p.onGround) { pose = p.vy < 0 ? [2, 2, -2, 1] : [1, 0, -2, 2]; }
    else if (!a) bob = Math.sin(time * 2.5) > 0.6 ? 1 : 0;
    if (a === 'dodge') { tuck = 4; pose = [2, 1, -2, 1]; bob = 5; }
    if (a === 'heavyCharge' || a === 'heal' || a === 'rest' || a === 'cast') { bob = a === 'rest' ? 4 : 1; pose = [3, 0, -3, 0]; }
    if (a === 'light' || a === 'heavy') pose = [3, 0, -3, 0];
    if (p.dead) { bob = Math.min(12, Math.round(p.deadT * 14)); tuck = Math.min(5, bob); }

    legs(c, ox, oy, pose, tuck);
    const body = Math.floor(time * 3) % 2 === 0 || moving ? ERR_BODY_B : ERR_BODY;
    const spr = sprite(body === ERR_BODY ? 'err' : 'errB', body, ERR_PAL);
    c.drawImage(spr, ox - 8, oy - 26 + bob);
    // runa pulsante
    if (Math.sin(time * 4) > 0.3) { px(c, ox - 1, oy - 16 + bob, '#ff8a7a'); }

    // braço + arma
    const shx = ox + 2, shy = oy - 17 + bob;
    let ang = 1.15, len = 13, armA = 1.4;
    if (a === 'light') {
      const k = Math.min(1, t / PLAYER.light.active[1]);
      const sw = [[-1.9, 0.9], [0.9, -1.6], [-2.3, 1.2]][p.comboIndex || 0];
      ang = sw[0] + (sw[1] - sw[0]) * k; armA = ang * 0.7;
      if (t > PLAYER.light.active[0] - 0.03 && t < PLAYER.light.active[1] + 0.07) slashArc(c, shx, shy + 2, 15, sw[0], ang, '#f4efe4');
    } else if (a === 'heavyCharge') {
      ang = -2.5; armA = -2.2; len = 15;
      if (t >= PLAYER.heavy.maxCharge - 0.05 && Math.sin(time * 40) > 0) { px(c, shx + Math.cos(ang) * 16, shy + Math.sin(ang) * 16, '#ffd27a'); }
    } else if (a === 'heavy') {
      const k = Math.min(1, t / 0.14);
      ang = -2.5 + 3.7 * k; armA = ang * 0.8; len = 15;
      if (t < 0.22) slashArc(c, shx, shy + 2, 18, -2.5, ang, p.charged ? '#ffd27a' : '#f4efe4');
    } else if (a === 'parry') {
      ang = -1.0; armA = -0.6; len = 12;
      if (t < PLAYER.parry.window) { c.globalAlpha = 0.6; rect(c, ox + 9, oy - 26, 2, 18, '#fff3c4'); c.globalAlpha = 1; }
    } else if (a === 'cast') {
      ang = 2.2; armA = 0; len = 11;
      rect(c, shx + 5, shy - 1, 3, 3, '#ffb070'); px(c, shx + 6, shy, '#fff0c8');
    } else if (a === 'dodge') { ang = 2.6; armA = 2.0; len = 11; }
    else if (a === 'heal') { ang = 1.9; armA = -0.4; len = 11; rect(c, shx + 2, shy - 4, 3, 5, '#7fc48a'); px(c, shx + 3, shy - 5, '#d8d0c2'); }
    else if (a === 'finisher') { ang = t < 0.3 ? -2.6 : 1.3; armA = ang * 0.8; len = 17; }
    else if (a === 'ability') { ang = 0.25; armA = 0.2; len = 13; }
    else if (a === 'rest') { ang = 1.57; armA = 1.3; len = 12; }
    const hx = shx + Math.cos(armA) * 4, hy = shy + Math.sin(armA) * 4;
    line(c, shx, shy, hx, hy, '#c9c0b2', 2);
    blade(c, hx, hy, ang, len);
    px(c, hx, hy, '#ece6dc');
  }, { flash, alpha: alpha * alphaMul, outline: outlineCol });

  if (p.perfectFlash > 0) {
    ctx.globalAlpha = p.perfectFlash * 2.5;
    ctx.fillStyle = '#f6f2ea';
    ctx.fillRect(Math.round(sx) - 10, Math.round(sy) - 30, 20, 1);
    ctx.fillRect(Math.round(sx) - 6, Math.round(sy) - 32, 12, 1);
    ctx.globalAlpha = 1;
  }
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

  if (m.isBroken()) brokenMark(ctx, sx, sy - m.h - 10, time);
}

function brokenMark(ctx, x, y, time) {
  const col = Math.sin(time * 10) > 0 ? '#fff3c4' : '#ffd27a';
  ctx.fillStyle = '#0a090c';
  ctx.fillRect(Math.round(x) - 2, Math.round(y) - 1, 5, 10);
  ctx.fillStyle = col;
  ctx.fillRect(Math.round(x) - 1, Math.round(y), 3, 5);
  ctx.fillRect(Math.round(x) - 1, Math.round(y) + 6, 3, 2);
}

// ---------- Asgmor, O Louco ----------
const ASG = [
  '..H..............H..',
  '..HH............HH..',
  '...HH..........HH...',
  '....HHhhhhhhhhHH....',
  '.....hhmmmmmmmh.....',
  '.....hmMMMMkMMm.....',
  '.....hmMeMMkMeM.....',
  '.....hmMMMMMkMM.....',
  '.....hmMMMMMMMm.....',
  '......hmmMMMmm......',
  '.....ccctttttccc....',
  '....ccCtttttttCcc...',
  '....cCCtssssstCCc...',
  '....cCttsttststCc...',
  '....cCtttsttttCCc...',
  '....ccCtttttttCcc...',
  '.....cCtttttttCc....',
  '.....cCttsstttCc....',
  '.....cttttttttcc....',
  '....cttttsttttttc...',
  '....ctttttttsttcc...',
  '...cttsttttttttttc..',
  '...cct.tt.tt.tt.cc..',
  '....c..t...t..t.....',
];
const ASG_PAL = { H: '#a89a80', h: '#c9b99e', M: '#d8d0bd', m: '#b8ae98', k: '#7d756a', e: '#151316', c: '#29272a', C: '#3a373b', t: '#c9b99e', s: '#a2937a' };
const BELL = ['...nnn...', '..bBBBb..', '.bBBBBLb.', '.bBBBBLb.', '.bBBBBBb.', 'bbBBBBBbb', 'ooooooooo'];
const BELL_PAL = { n: '#3a2a1e', b: '#6d4b32', B: '#8b633f', L: '#a97c52', o: '#e17a3d' };
const BELL_HOT = { ...BELL_PAL, o: '#ffd27a', B: '#a97c52' };

export function drawAsgmor(ctx, b, sx, sy, time) {
  if (b.dead && b.deathT > 2.5) return;
  const st = b.state;
  const tel = b.telegraph();
  const alpha = b.dead ? Math.max(0, 1 - b.deathT / 2.5) : 1;

  outlined(ctx, sx, sy, b.facing, (c, ox, oy) => {
    if (st === 'roll') {
      const r = Math.floor(time * 18) % 4;
      const rows = [[-8, -18, 16, 18, '#29272a'], [-7, -17, 14, 16, '#c9b99e']];
      rows.forEach(([x, y, w, h, col]) => rect(c, ox + x, oy + y, w, h, col));
      rect(c, ox - 3 + (r - 2) * 2, oy - 12, 7, 5, '#8b633f');
      rect(c, ox - 2, oy - 8 + (r % 2), 4, 3, '#d8d0bd');
      line(c, ox - 7, oy - 4, ox + 6, oy - 14, '#a2937a');
      return;
    }
    let crouch = 0;
    if (st === 'leapWind' || st === 'rollWind') crouch = 4;
    if (st === 'broken') crouch = 6;
    const air = !b.onGround;
    // pernas finas e longas
    const step = Math.abs(b.vx) > 5 && !air ? Math.floor(time * 10) % 2 : 0;
    line(c, ox - 2, oy - 11 + crouch, ox - 4 - step * 2 + (air ? 2 : 0), oy - 1 - (air ? 3 : 0), '#1d1b1e', 2);
    line(c, ox + 2, oy - 11 + crouch, ox + 4 + step * 2 - (air ? 1 : 0), oy - 1 - (air ? 1 : 0), '#29272a', 2);
    rect(c, ox - 6 - step * 2, oy - 1, 4, 1, '#1d1b1e'); rect(c, ox + 3 + step * 2, oy - 1, 4, 1, '#29272a');
    // sino nas costas (balança no bellSway)
    const sway = st === 'bellSway' ? Math.round(Math.sin(b.t * 28) * 3) : Math.round(Math.sin(time * 2));
    if (!(st === 'dragWind' || st === 'drag')) {
      line(c, ox - 4, oy - 30 + crouch, ox - 9 + sway, oy - 26 + crouch, '#625b58');
      c.drawImage(sprite(st === 'bellSway' ? 'bellH' : 'bell', BELL, st === 'bellSway' ? BELL_HOT : BELL_PAL), ox - 14 + sway, oy - 27 + crouch);
    }
    c.drawImage(sprite('asg', ASG, ASG_PAL), ox - 10, oy - 35 + crouch);
    // braços longos
    const shx = ox + 4, shy = oy - 23 + crouch;
    let ang = 1.3;
    if (st === 'fanWind') ang = -1.9 - Math.sin(b.t * 20) * 0.3;
    else if (st === 'dragWind' || st === 'drag') ang = 0.9;
    else if (st === 'leapWind') ang = 2.4;
    else if (st === 'intro' || st === 'phaseShift') ang = -1.2 + Math.sin(time * 8) * 0.4;
    const hx = shx + Math.cos(ang) * 10, hy = shy + Math.sin(ang) * 10;
    line(c, shx, shy, hx, hy, '#c9b99e', 2);
    line(c, shx + 1, shy, hx + 1, hy, '#a2937a', 1);
    rect(c, hx - 1, hy - 1, 3, 3, '#d8d0bd');
    line(c, ox - 4, shy + 1, ox - 8, shy + 9, '#a2937a', 2);
    if (st === 'dragWind' || st === 'drag') {
      // sino arrastado pela corrente
      line(c, hx, hy, ox + 13, oy - 6, '#625b58');
      c.drawImage(sprite('bell', BELL, BELL_PAL), ox + 10, oy - 7);
    }
    if (st === 'fanWind') {
      c.globalAlpha = 0.8;
      for (let i = 0; i < 5; i++) px(c, hx + Math.cos(time * 9 + i * 1.3) * 4, hy + Math.sin(time * 9 + i * 1.3) * 4, '#c9c1b8');
      c.globalAlpha = 1;
    }
  }, { flash: b.flash > 0, alpha });

  if (tel && Math.sin(time * 26) > -0.2) {
    const col = tel === 'parry' ? '#ffd23a' : '#ff4a3a';
    const x = Math.round(sx), y = Math.round(sy) - 46;
    ctx.fillStyle = '#0a090c'; ctx.fillRect(x - 3, y - 1, 7, 7);
    ctx.fillStyle = col; ctx.fillRect(x - 2, y, 5, 5);
    ctx.fillStyle = '#fff6ea'; ctx.fillRect(x, y + 1, 1, 2); ctx.fillRect(x, y + 4, 1, 1);
  }
  if (st === 'leapWind' && b.leapTarget !== undefined) {
    const lx = Math.round(sx + (b.leapTarget - b.cx()));
    ctx.globalAlpha = 0.35 + 0.3 * Math.sin(time * 20);
    ctx.fillStyle = '#ff4a3a';
    ctx.fillRect(lx - 16, Math.round(sy) - 1, 32, 1);
    ctx.fillRect(lx - 10, Math.round(sy) - 2, 20, 1);
    ctx.globalAlpha = 1;
  }
  if (b.isBroken()) brokenMark(ctx, sx, sy - 50, time);
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
  });
}

export function drawEcho(ctx, e, sx, sy, time) {
  const ghost = { facing: e.facing, action: null, t: 0, flash: 0, invuln: 0, dead: false, onGround: true, vx: 0, vy: 0, walkPhase: 0, perfectFlash: 0 };
  drawErrante(ctx, ghost, sx, sy, time, Math.min(0.55, e.t) * (0.8 + Math.sin(time * 20) * 0.2), '#d9b58a');
}
