import { overlap, TILE } from './physics.js';
import { sfx } from './audio.js';

// Partículas, números de dano, projéteis e perigos de cenário.
export class FX {
  constructor() { this.parts = []; this.nums = []; this.objs = []; }

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
    this.nums.push({ x, y, text: String(Math.round(val)), life: 0.8, color });
  }
  add(o) { this.objs.push(o); return o; }

  update(dt, world) {
    for (const p of this.parts) {
      p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const n of this.nums) { n.y -= 22 * dt; n.life -= dt; }
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
      ctx.fillRect(Math.round(p.x - cam.x), Math.round(p.y - cam.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;
    ctx.font = '8px Silkscreen, monospace';
    ctx.textAlign = 'center';
    for (const n of this.nums) {
      ctx.globalAlpha = Math.min(1, n.life * 2);
      ctx.fillStyle = '#000';
      ctx.fillText(n.text, Math.round(n.x - cam.x) + 1, Math.round(n.y - cam.y) + 1);
      ctx.fillStyle = n.color;
      ctx.fillText(n.text, Math.round(n.x - cam.x), Math.round(n.y - cam.y));
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
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y);
    ctx.fillStyle = this.glow;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(x - this.r - 1, y - this.r - 1, this.r * 2 + 2, this.r * 2 + 2);
    ctx.globalAlpha = 1;
    ctx.fillStyle = this.color;
    ctx.fillRect(x - this.r, y - this.r, this.r * 2, this.r * 2);
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
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y);
    const a = 1 - this.travelled / this.dist;
    ctx.globalAlpha = 0.5 + a * 0.5;
    ctx.fillStyle = this.color;
    ctx.fillRect(x - 4, y - this.h, 8, this.h);
    ctx.fillStyle = '#ffd9a0';
    ctx.fillRect(x - 2, y - this.h + 2, 4, this.h - 2);
    ctx.globalAlpha = 1;
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
      world.fx.burst(this.x, this.y - 6, 22, '#e17a3d', 120, 0.5, 150, 2);
      world.fx.burst(this.x, this.y - 6, 12, '#625b58', 70, 0.8, 40, 3);
      if (this.owner === 'player') { world.damageArea(this.x, this.y, this.radius, this.dmg); return; }
      const p = world.player;
      const dx = Math.abs(p.cx() - this.x);
      const dy = Math.abs(p.y + p.h - this.y);
      if (dx < this.radius + p.w / 2 && dy < this.radius + 6) p.takeHit(this.dmg, this, { parryable: false, dir: Math.sign(p.cx() - this.x) || 1 });
    }
  }
  draw(ctx, cam) {
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y);
    const arming = this.t > this.fuse - this.warn;
    const pulse = arming ? (Math.sin(this.t * 40) > 0 ? 1 : 0.6) : 1;
    // círculo no chão
    ctx.globalAlpha = 0.25 + (arming ? 0.35 : 0.1);
    ctx.fillStyle = arming ? '#e17a3d' : '#9a918a';
    ctx.fillRect(x - this.radius, y - 2, this.radius * 2, 2);
    ctx.globalAlpha = 1;
    ctx.fillStyle = arming ? (pulse > 0.8 ? '#ffb070' : '#e17a3d') : '#a59d95';
    ctx.fillRect(x - 6, y - 3, 12, 3);
    ctx.fillRect(x - 4, y - 5, 8, 2);
    ctx.fillStyle = arming ? '#fff0c8' : '#c9c1b8';
    ctx.fillRect(x - 1, y - 5, 2, 1);
  }
}
