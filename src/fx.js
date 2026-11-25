import { overlap, TILE } from './physics.js';
import { sfx } from './audio.js';
import { r2 } from './hd.js';
import { piece, has } from './art.js';
import { cfg } from './config.js';

// Partículas, números de dano, projéteis e perigos de cenário.
export class FX {
  constructor() { this.parts = []; this.nums = []; this.objs = []; this.vis = []; }

  // ---------- efeitos visuais (não dão dano) ----------
  dust(x, y, dir, n) {
    for (let i = 0; i < n; i++) {
      const d = dir || (Math.random() < 0.5 ? -1 : 1);
      this.vis.push({ k: 'puff', x: x + (Math.random() - 0.5) * 8, y: y - Math.random() * 2, vx: d * (10 + Math.random() * 50), vy: -6 - Math.random() * 22, r: 1.5 + Math.random() * 3, t: 0, d: 0.28 + Math.random() * 0.3 });
    }
  }
  smoke(x, y) { this.vis.push({ k: 'smoke', x, y, vx: 6 + Math.random() * 8, vy: -14 - Math.random() * 8, r: 2 + Math.random() * 2, t: 0, d: 2.6 + Math.random() * 1.6 }); }
  boom(x, y, r) {
    this.vis.push({ k: 'boom', x, y, r, t: 0, d: 0.36 });
    for (let i = 0; i < 14; i++) { const a = Math.random() * 6.28, s = 60 + Math.random() * 160; this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: 0.4 + Math.random() * 0.4, max: 0.7, color: Math.random() < 0.5 ? '#ffb060' : '#ff6a30', grav: 260, size: 1, streak: 1, glow: 1 }); }
    for (let i = 0; i < 7; i++) this.smoke(x + (Math.random() - 0.5) * r, y - Math.random() * r * 0.6);
  }
  // o corpo se desfaz em cinza que sobe
  ashes(x, y, w, h) { for (let i = 0; i < 34; i++) this.parts.push({ x: x + Math.random() * w, y: y + Math.random() * h, vx: (Math.random() - 0.5) * 24, vy: -10 - Math.random() * 46, life: 0.7 + Math.random() * 0.9, max: 1.5, color: Math.random() < 0.28 ? '#ff8a40' : Math.random() < 0.5 ? '#6a6662' : '#a8a29c', grav: -18, size: Math.random() < 0.4 ? 1 : 0.5, sway: 1 }); }
  ring(x, y, color, r) { this.vis.push({ k: 'ring', x, y, color, r, t: 0, d: 0.28 }); }
  shockRing(x, y) { this.vis.push({ k: 'shock', x, y, t: 0, d: 0.3 }); }
  charge(x, y, color) { const a = Math.random() * 6.28, r = 16 + Math.random() * 10; this.parts.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, vx: -Math.cos(a) * r * 4, vy: -Math.sin(a) * r * 4, life: 0.22, max: 0.22, color, grav: 0, size: 1, glow: 1 }); }
  // impacto de corte: risco de luz atravessando o alvo, estrela e fagulhas
  slashHit(x, y, dir, k, color) {
    const a = (Math.random() - 0.5) * 1.1 + (dir > 0 ? 0 : Math.PI);
    this.vis.push({ k: 'cut', x, y, a, len: 22 * k, color, t: 0, d: 0.16 + 0.05 * k });
    this.vis.push({ k: 'star', x, y, r: 7 * k, color, t: 0, d: 0.12 });
    for (let i = 0; i < 6 + 5 * k; i++) { const q = a + (Math.random() - 0.5) * 1.2, s = 90 + Math.random() * 190 * k; this.parts.push({ x, y, vx: Math.cos(q) * s, vy: Math.sin(q) * s - 30, life: 0.28 + Math.random() * 0.2, max: 0.4, color: Math.random() < 0.5 ? color : '#ffb070', grav: 420, size: 1, streak: 1, glow: 1 }); }
  }
  drawVis(ctx, cam) {
    for (const v of this.vis) {
      const q = v.t / v.d, x = v.x - cam.x, y = v.y - cam.y;
      if (v.k === 'puff') {
        ctx.globalAlpha = 0.55 * (1 - q); ctx.fillStyle = q < 0.4 ? '#c8ccd4' : '#8a8f9a';
        const r = v.r * (0.7 + q * 1.1); ctx.fillRect(r2(x - r), r2(y - r * 0.7), r2(r * 2), r2(r * 1.4)); ctx.fillRect(r2(x - r * 0.6), r2(y - r), r2(r * 1.2), r2(r * 2));
        continue;
      }
      if (v.k === 'smoke') { const r = v.r * (1 + q * 2.6); ctx.globalAlpha = 0.2 * Math.sin(Math.min(1, q * 1.2) * Math.PI); ctx.fillStyle = q < 0.3 ? '#5a5458' : '#8a868c'; ctx.beginPath(); ctx.arc(r2(x), r2(y), r, 0, 6.2832); ctx.fill(); continue; }
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - q;
      if (v.k === 'boom') {
        const e = 1 - (1 - q) * (1 - q);
        for (const [c, m, a] of [['#d0401a', 1, 0.5], ['#ff8a3a', 0.72, 0.7], ['#fff0c8', 0.42, 0.9]]) { ctx.globalAlpha = a * (1 - q); ctx.fillStyle = c; ctx.beginPath(); for (let i = 0; i <= 14; i++) { const an = i / 14 * 6.2832, rr = v.r * m * (0.5 + e * 0.6) * (0.82 + 0.3 * Math.sin(i * 5.3 + v.x)); ctx.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr * 0.8); } ctx.fill(); }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; continue;
      } ctx.strokeStyle = ctx.fillStyle = v.color || '#ffe6c0';
      if (v.k === 'ring') { ctx.lineWidth = 2.5 * (1 - q) + 0.5; ctx.beginPath(); ctx.arc(x, y, v.r * (0.25 + 0.75 * (1 - (1 - q) * (1 - q))), 0, 6.2832); ctx.stroke(); } else if (v.k === 'shock') { ctx.lineWidth = 3 * (1 - q) + 0.5; ctx.beginPath(); ctx.ellipse(x, y - 1, 12 + 56 * q, 3 + 7 * q, 0, 0, 6.2832); ctx.stroke(); } else if (v.k === 'cut') {
        const l = v.len * (0.5 + q), w = 3.2 * (1 - q); ctx.save(); ctx.translate(x, y); ctx.rotate(v.a);
        ctx.beginPath(); ctx.moveTo(-l, 0); ctx.lineTo(0, -w); ctx.lineTo(l, 0); ctx.lineTo(0, w); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-l * 0.7, 0); ctx.lineTo(0, -w * 0.45); ctx.lineTo(l * 0.7, 0); ctx.lineTo(0, w * 0.45); ctx.fill(); ctx.restore();
      } else if (v.k === 'star') { const r = v.r * (1 - q * 0.5); ctx.save(); ctx.translate(x, y); ctx.rotate(0.6); for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, -r * 0.2); ctx.lineTo(r, 0); ctx.lineTo(0, r * 0.2); ctx.fill(); } ctx.restore(); }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
  }

  burst(x, y, n, color, speed = 80, life = 0.5, grav = 200, size = 2) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.7);
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * 0.3, life: life * (0.6 + Math.random() * 0.6), max: life, color, grav, size });
    }
  }
  spark(x, y, dir, color = '#ffd27a', n = 8) {
    for (let i = 0; i < n; i++) {
      const a = (dir > 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 1.6;
      const s = 60 + Math.random() * 120;
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, life: 0.3, max: 0.3, color, grav: 300, size: 1 });
    }
  }
  number(x, y, val, color = '#f2e6d0') {
    this.nums.push({ x: x + (Math.random() - 0.5) * 12, y, text: String(Math.round(val)), life: 0.8, color, vx: (Math.random() - 0.5) * 30, vy: -70, pop: 0 });
  }
  add(o) { this.objs.push(o); return o; }

  update(dt, world) {
    for (const p of this.parts) {
      p.vy += p.grav * dt; p.x += (p.vx + (p.sway ? Math.sin(p.life * 5 + p.y * 0.1) * 12 : 0)) * dt; p.y += p.vy * dt; p.life -= dt;
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const n of this.nums) { n.vy = (n.vy === undefined ? -60 : n.vy) + 150 * dt; n.x += (n.vx || 0) * dt; n.y += n.vy * dt; n.life -= dt; n.pop = (n.pop || 0) + dt; }
    for (const v of this.vis) { v.t += dt; if (v.vx !== undefined) { v.x += v.vx * dt; v.y += v.vy * dt; v.vx *= 0.94; v.vy *= 0.94; } }
    this.vis = this.vis.filter((v) => v.t < v.d);
    if (this.parts.length > 420) this.parts.splice(0, this.parts.length - 420);
    this.nums = this.nums.filter((n) => n.life > 0);
    for (const o of this.objs) o.update(dt, world);
    this.objs = this.objs.filter((o) => !o.dead);
  }

  clearHazards() { this.objs = []; }

  draw(ctx, cam) {
    for (const o of this.objs) o.draw(ctx, cam);
    for (const p of this.parts) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max * 1.5));
      ctx.fillStyle = p.color;
      ctx.globalCompositeOperation = p.glow ? 'lighter' : 'source-over';
      if (p.streak) { ctx.save(); ctx.translate(r2(p.x - cam.x), r2(p.y - cam.y)); ctx.rotate(Math.atan2(p.vy, p.vx)); ctx.fillRect(-Math.min(9, Math.hypot(p.vx, p.vy) * 0.035), -0.5, Math.min(9, Math.hypot(p.vx, p.vy) * 0.035), 1); ctx.restore(); continue; }
      ctx.fillRect(r2(p.x - cam.x), r2(p.y - cam.y), p.size, p.size);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    this.drawVis(ctx, cam);
    if (cfg.numeros) {
      ctx.textAlign = 'center';
      for (const n of this.nums) {
        const big = +n.text >= 200, pop = 1 + Math.max(0, 0.14 - (n.pop || 0)) * 5, x = r2(n.x - cam.x), y = r2(n.y - cam.y);
        ctx.globalAlpha = Math.min(1, n.life * 2);
        ctx.save(); ctx.translate(x, y); ctx.scale(pop, pop);
        ctx.font = `${big ? 12 : 8}px Silkscreen, monospace`;
        ctx.fillStyle = '#0a070a'; for (const [a, b] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.fillText(n.text, a, b);
        ctx.fillStyle = big ? '#ffd98a' : n.color; ctx.fillText(n.text, 0, 0);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }
}

// Projétil genérico (inimigo ou jogador)
export class Projectile {
  constructor(o) {
    Object.assign(this, { r: 3, grav: 0, life: 3, color: '#e17a3d', glow: '#ffb070', hit: new Set() }, o);
  }
  box() { return { x: this.x - this.r, y: this.y - this.r, w: this.r * 2, h: this.r * 2 }; }
  update(dt, world) {
    this.vy += this.grav * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.life -= dt;
    if (Math.random() < 0.5) world.fx.parts.push({ x: this.x, y: this.y, vx: 0, vy: -10, life: 0.25, max: 0.25, color: this.glow, grav: 0, size: 1 });
    if (this.life <= 0) { this.dead = true; return; }
    const tx = Math.floor(this.x / TILE), ty = Math.floor(this.y / TILE);
    if (world.level.solid(tx, ty) || (this.grav > 0 && world.level.oneway(tx, ty) && this.vy > 0)) {
      this.dead = true;
      if (this.onLand) this.onLand(world, this.x, ty * TILE);
      else world.fx.burst(this.x, this.y, 6, this.glow, 50, 0.3);
      return;
    }
    if (this.owner === 'enemy') {
      if (overlap(this.box(), world.player.box())) {
        const r = world.player.takeHit(this.dmg, this, { parryable: false, dir: Math.sign(this.vx) || 1 });
        if (r !== 'dodged' && r !== 'none') { this.dead = true; world.fx.burst(this.x, this.y, 8, this.glow, 60, 0.3); }
      }
    } else {
      for (const e of world.targets()) {
        if (this.hit.has(e) || !e.alive()) continue;
        if (overlap(this.box(), e.hurtbox())) {
          this.hit.add(e);
          if (this.onHitEnemy) { this.dead = true; this.onHitEnemy(world, this.x, this.y); break; }
          e.takeDamage(this.dmg, this.posture || 10, Math.sign(this.vx), { kind: 'fire', world });
          if (this.burn) e.applyBurn && e.applyBurn(4);
          world.fx.burst(this.x, this.y, 10, '#ffb070', 70, 0.35);
          this.dead = true;
          break;
        }
      }
    }
  }
  draw(ctx, cam) {
    const x = r2(this.x - cam.x), y = r2(this.y - cam.y);
    if (this.icon && has(this.icon)) { piece(ctx, this.icon, x, y + 6, { scale: 0.8, rot: this.x * 0.06 }); return; }
    const v = Math.hypot(this.vx, this.vy) || 1, ux = this.vx / v, uy = this.vy / v;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 5; i >= 0; i--) { const k = 1 - i / 6, R = this.r * (0.5 + k * 0.8); ctx.globalAlpha = 0.22 + k * 0.3; ctx.fillStyle = i > 2 ? '#c03a18' : this.glow; ctx.beginPath(); ctx.arc(x - ux * i * 3, y - uy * i * 3 + Math.sin(this.life * 30 + i) * 0.5, R, 0, 6.2832); ctx.fill(); }
    ctx.globalAlpha = 1; ctx.fillStyle = '#fff2d0'; ctx.beginPath(); ctx.arc(x, y, this.r * 0.55, 0, 6.2832); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
}

// Onda de choque rente ao chão — deve ser pulada
export class Shockwave {
  constructor(x, y, dir, dmg, opts = {}) {
    Object.assign(this, { x, y, dir, dmg, speed: 170, dist: 210, h: 10, travelled: 0, color: '#e17a3d', done: false }, opts);
  }
  update(dt, world) {
    const d = this.speed * dt;
    this.x += d * this.dir; this.travelled += d;
    if (this.travelled > this.dist) { this.dead = true; return; }
    const tx = Math.floor(this.x / TILE);
    if (world.level.solid(tx, Math.floor((this.y - 4) / TILE)) || !world.level.solid(tx, Math.floor((this.y + 2) / TILE))) { this.dead = true; return; }
    if (Math.random() < 0.6) world.fx.parts.push({ x: this.x, y: this.y - 2, vx: (Math.random() - 0.5) * 30, vy: -40 - Math.random() * 40, life: 0.35, max: 0.35, color: Math.random() < 0.5 ? '#625b58' : this.color, grav: 120, size: 2 });
    if (!this.done && overlap({ x: this.x - 6, y: this.y - this.h, w: 12, h: this.h }, world.player.box())) {
      const r = world.player.takeHit(this.dmg, this, { parryable: false, dir: this.dir });
      if (r !== 'none') this.done = true;
    }
  }
  draw(ctx, cam) {
    const x = r2(this.x - cam.x), y = r2(this.y - cam.y);
    const a = 1 - this.travelled / this.dist;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const bx = x - this.dir * i * 4, hh = this.h * (1.5 - i * 0.2) * (0.8 + 0.25 * Math.sin(this.travelled * 0.35 + i * 2)), w = 5 - i * 0.5;
      for (const [c, m, al] of [['#b03a18', 1, 0.45], ['#ff8a40', 0.7, 0.6], ['#fff0c0', 0.36, 0.8]]) { ctx.globalAlpha = al * (0.4 + a * 0.6) * (1 - i / 7); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(bx - w * m, y); ctx.quadraticCurveTo(bx - w * m * 0.6, y - hh * m * 0.6, bx + this.dir * 3, y - hh * m); ctx.quadraticCurveTo(bx + w * m * 0.8, y - hh * m * 0.5, bx + w * m, y); ctx.fill(); }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
}

// Mancha de cinza com explosão retardada (cinza clara -> laranja -> explode)
export class AshPatch {
  constructor(x, y, fuse = 1.3, radius = 22, dmg = 170, owner = 'enemy') {
    Object.assign(this, { x, y, fuse, radius, dmg, owner, t: 0, warn: Math.min(0.45, fuse) });
  }
  update(dt, world) {
    this.t += dt;
    if (this.t >= this.fuse) {
      this.dead = true;
      sfx.explode();
      world.shake = Math.max(world.shake, 3);
      world.fx.boom(this.x, this.y - 10, this.radius * 0.95);
      if (this.owner === 'player') { world.damageArea(this.x, this.y, this.radius, this.dmg); return; }
      const p = world.player;
      const dx = Math.abs(p.cx() - this.x);
      const dy = Math.abs(p.y + p.h - this.y);
      if (dx < this.radius + p.w / 2 && dy < this.radius + 6) p.takeHit(this.dmg, this, { parryable: false, dir: Math.sign(p.cx() - this.x) || 1 });
    }
  }
  draw(ctx, cam) {
    const x = r2(this.x - cam.x), y = r2(this.y - cam.y);
    const arming = this.t > this.fuse - this.warn;
    const pulse = arming ? (Math.sin(this.t * 40) > 0 ? 1 : 0.6) : 1;
    const q = Math.min(1, this.t / this.fuse), R = this.radius;
    // o chão racha e acende: quanto mais claro, mais perto de estourar
    ctx.globalAlpha = 0.5; ctx.fillStyle = '#16120f'; ctx.beginPath(); ctx.ellipse(x, y, R, 3, 0, 0, 6.2832); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = (arming ? 0.55 : 0.2 + q * 0.2) * pulse; ctx.fillStyle = arming ? '#ff5a20' : '#8a3a18'; ctx.beginPath(); ctx.ellipse(x, y, R * (0.5 + q * 0.5), 2.5, 0, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = arming ? '#ffb060' : '#d06a38'; ctx.lineWidth = 0.5; ctx.globalAlpha = arming ? 0.9 : 0.45; ctx.beginPath(); ctx.ellipse(x, y, R, 3, 0, 0, 6.2832); ctx.stroke();
    ctx.fillStyle = arming ? '#ffe0a0' : '#ff8a40';
    for (let i = 0; i < 7; i++) { const px = x + ((i * 37 % 14) / 14 - 0.5) * R * 1.7, h = (arming ? 5 : 2) * (0.6 + 0.4 * Math.sin(this.t * 18 + i * 2)); ctx.globalAlpha = arming ? 0.8 : 0.4; ctx.fillRect(r2(px), r2(y - h), 1, r2(h)); }
    if (arming) { const g = ctx.createLinearGradient(0, y - 34, 0, y); g.addColorStop(0, 'rgba(255,110,40,0)'); g.addColorStop(1, `rgba(255,120,50,${0.35 * pulse})`); ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(x - R * 0.8, y - 34, R * 1.6, 34); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
}
