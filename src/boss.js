import { Mob } from './enemies.js';
import { moveBody, TILE } from './physics.js';
import { BOSS } from './data.js';
import { sfx } from './audio.js';
import { Projectile, AshPatch, Shockwave } from './fx.js';

// Asgmor — O Louco. Saltos curtos e diagonais, sino arrastado, chuva de cinza em leque,
// explosões retardadas. Fase final: encadeia dois saltos e rola deixando rastro de cinza.
export class Asgmor extends Mob {
  constructor(world, x, y) {
    super(world, 'cinzeiro', x, y);
    this.def = { name: BOSS.name, hp: BOSS.hp, posture: BOSS.posture, speed: 90 };
    this.w = 24; this.h = 46;
    this.isBoss = true;
    this.bloodColor = '#e17a3d';
    this.reset();
  }
  reset() {
    this.w = 24; this.h = 46;
    super.reset();
    this.state = 'dormant'; this.phase = 1; this.history = []; this.leapsLeft = 0;
    this.bellSwing = 0; this.lastLand = null; this.trailT = 0; this.facing = -1;
  }
  alive() { return !this.dead && this.state !== 'dormant'; }
  flinches() { return false; }
  edgeAhead() { return false; }
  speedMul() { return this.phase === 2 ? 1.2 : 1; }

  activate() { if (this.state === 'dormant') { this.set('intro'); sfx.crackedBell(); } }

  die() {
    this.dead = true; this.deathT = 0; this.state = 'dead';
    this.world.fx.clearHazards();
    sfx.roar();
    this.world.onBossDefeated();
  }

  takeDamage(dmg, posture, dir, info) {
    if (this.state === 'dormant' || this.state === 'intro' || this.state === 'phaseShift') return 'none';
    const r = super.takeDamage(dmg, posture, dir, info);
    if (!this.dead && this.phase === 1 && this.hp <= this.def.hp / 2) {
      this.phase = 2; this.set('phaseShift'); this.vx = 0; sfx.roar();
      this.world.banner = { text: 'O Louco ri entre as cinzas', sub: 'Asgmor acelera', t: 0, dur: 2.2, small: true };
    }
    return r;
  }

  onParried() {
    this.posture += 140; this.postureCd = 2.5;
    if (this.posture >= this.def.posture) this.set('broken');
    else { this.set('recoil'); this.vx = -this.facing * 60; }
  }

  update(dt) {
    if (this.dead) { this.deathT += dt; return; }
    if (this.state === 'dormant') { this.physics(dt); return; }
    if (this.common(dt * this.speedMul())) this.think(dt * this.speedMul());
    if (this.state === 'broken' && this.t > 3.0) { this.set('recover'); this.posture = 0; }
    this.physics(dt);
  }

  physics(dt) {
    this.vy = Math.min(this.vy + 1100 * dt, 600);
    moveBody(this, this.world.level, dt);
    const a = this.world.level.arena;
    if (this.x < a.x0 + 4) { this.x = a.x0 + 4; this.vx = 0; }
    if (this.x + this.w > a.x1 - 4) { this.x = a.x1 - 4 - this.w; this.vx = 0; }
  }

  pick() {
    const d = this.dist;
    const opts = [];
    if (d < 72) opts.push(['drag', 4], ['leap', 2], ['fan', 2]);
    else if (d < 150) opts.push(['drag', 3], ['leap', 4], ['fan', 3]);
    else opts.push(['leap', 5], ['fan', 3], ['drag', 1]);
    if (this.phase === 2) opts.push(['roll', 3]);
    const last2 = this.history.slice(-2);
    const filtered = opts.filter(([n]) => !(last2.length === 2 && last2[0] === n && last2[1] === n));
    let sum = filtered.reduce((s, o) => s + o[1], 0), r = Math.random() * sum;
    for (const [n, wgt] of filtered) { if ((r -= wgt) <= 0) { this.history.push(n); return n; } }
    return 'leap';
  }

  startLeap(targetX, height = 330, toPlatform = false) {
    this.toPlatform = toPlatform;
    const a = this.world.level.arena;
    targetX = Math.max(a.x0 + 20, Math.min(a.x1 - 20, targetX));
    this.leapTarget = targetX;
    this.set('leapWind');
    this.leapHeight = height;
  }

  think(dt) {
    const w = this.world, p = w.player, s = this.state;
    if (p.dead) { this.vx *= 0.8; return; }
    switch (s) {
      case 'intro':
        this.vx = 0;
        if (this.t > 1.6) { this.set('idle'); w.bossFight = true; }
        break;
      case 'idle':
      case 'recover': {
        this.vx *= 0.8;
        this.facing = Math.sign(this.dx) || this.facing;
        const wait = s === 'recover' ? 0.9 : 0.35;
        if (this.t > wait) {
          const n = this.pick();
          if (n === 'leap') {
            this.leapsLeft = this.phase === 2 ? 2 : 1;
            const onPlat = Math.random() < 0.3 && this.phase === 1;
            this.startLeap(onPlat ? this.nearestPlatformX() : p.cx(), onPlat ? 380 : 330, onPlat);
          } else if (n === 'drag') { this.bellSwing = this.phase === 2 ? 2 : 1; this.set('dragWind'); }
          else if (n === 'fan') this.set('fanHop');
          else if (n === 'roll') this.set('rollWind');
        }
        break;
      }
      case 'leapWind':
        this.vx = 0;
        if (this.t > 0.55) {
          // Calcula salto balístico até o alvo
          const vy = -this.leapHeight;
          const g = 1100;
          const gy = w.level.groundBelow(this.leapTarget, this.toPlatform ? (w.level.arena.floor - 5) * TILE : this.y + this.h - 2);
          const dy = gy - (this.y + this.h);
          const disc = vy * vy + 2 * g * dy;
          const tFlight = (-vy + Math.sqrt(Math.max(0, disc))) / g;
          this.vy = vy;
          this.vx = (this.leapTarget - this.cx()) / Math.max(0.35, tFlight);
          this.facing = Math.sign(this.vx) || this.facing;
          this.set('leap'); sfx.jump();
        }
        break;
      case 'leap':
        if (this.onGround && this.t > 0.1) {
          this.vx = 0;
          sfx.land(); w.shake = Math.max(w.shake, 4);
          w.fx.burst(this.cx(), this.y + this.h, 14, '#625b58', 80, 0.5, 80, 2);
          // Impacto pequeno ao pousar
          if (Math.abs(p.cx() - this.cx()) < 32 && Math.abs(p.y + p.h - (this.y + this.h)) < 12) p.takeHit(150, this, { parryable: false, dir: Math.sign(p.cx() - this.cx()) || 1 });
          this.set('bellSway');
        }
        break;
      case 'bellSway':
        // O sino nas costas balança 0,7 s antes da explosão de cinza
        this.vx = 0;
        if (this.t > 0.7) {
          const gy = this.y + this.h;
          w.fx.add(new AshPatch(this.cx(), gy, 0.01, 40, 190));
          if (this.leapsLeft > 1) { this.leapsLeft--; this.startLeap(p.cx(), 300); }
          else this.set('recover');
        }
        break;
      case 'dragWind':
        this.vx = 0;
        this.facing = Math.sign(this.dx) || this.facing;
        if (Math.random() < 0.4) w.fx.spark(this.cx() - this.facing * 20, this.y + this.h - 2, -this.facing, '#ffd27a', 1);
        if (this.t > 0.6) { this.set('drag'); sfx.swing(); }
        break;
      case 'drag': {
        // Investida arrastando o sino — aparável (aviso amarelo)
        this.vx = this.facing * 200;
        if (Math.random() < 0.7) w.fx.spark(this.cx() - this.facing * 18, this.y + this.h - 1, -this.facing, '#ffd27a', 1);
        this.melee({ x: this.facing > 0 ? this.x + this.w - 2 : this.x - 28, y: this.y + 14, w: 30, h: this.h - 14 }, 185, { parryable: true, knock: 1.3 });
        if (this.t > 0.42 || this.hitWall) {
          if (this.bellSwing > 1) { this.bellSwing--; this.set('dragWind'); this.t = 0.25; }
          else { this.set('recover'); this.t = -0.3; }
        }
        break;
      }
      case 'fanHop':
        if (this.t < 0.02) { this.vy = -260; this.vx = -Math.sign(this.dx || 1) * 140; sfx.jump(); }
        if (this.t > 0.15 && this.onGround) { this.vx = 0; this.set('fanWind'); }
        if (this.t > 1.2) this.set('fanWind');
        break;
      case 'fanWind':
        this.vx = 0;
        this.facing = Math.sign(this.dx) || this.facing;
        if (Math.random() < 0.6) w.fx.parts.push({ x: this.cx() + (Math.random() - 0.5) * 20, y: this.y + Math.random() * 10, vx: 0, vy: -30, life: 0.4, max: 0.4, color: '#c9c1b8', grav: 0, size: 2 });
        if (this.t > 0.6) {
          const n = this.phase === 2 ? 7 : 5;
          const gy = this.y + this.h;
          for (let i = 0; i < n; i++) {
            const tx = p.cx() + (i - (n - 1) / 2) * 38 + (Math.random() - 0.5) * 10;
            const flight = 0.75;
            const vx = (tx - this.cx()) / flight;
            const vy = ((gy - (this.y + 6)) - 0.5 * 600 * flight * flight) / flight; // chega ao chão em ~flight
            w.fx.add(new Projectile({
              owner: 'enemy', x: this.cx(), y: this.y + 6, vx, vy: vy - 30 + Math.random() * 20, grav: 600, r: 3, dmg: 90, life: 3,
              color: '#c9c1b8', glow: '#9a918a',
              onLand: (world, x, y) => world.fx.add(new AshPatch(x, y, 1.2, 22, 165)),
            }));
          }
          sfx.swing();
          this.set('recover');
        }
        break;
      case 'rollWind':
        this.vx = 0;
        this.facing = Math.sign(this.dx) || this.facing;
        if (this.t > 0.7) { this.set('roll'); this.trailT = 0; }
        break;
      case 'roll': {
        // Rola pelo chão; o rastro detona após 1,2 s. Não aparável — esquive através.
        this.vx = this.facing * 230;
        this.trailT -= dt;
        if (this.trailT <= 0) { this.trailT = 0.12; w.fx.add(new AshPatch(this.cx(), this.y + this.h, 1.2, 14, 150)); }
        this.melee({ x: this.x, y: this.y + 18, w: this.w, h: this.h - 18 }, 170, { parryable: false });
        if (this.t > 1.0 || this.hitWall) { this.set('recover'); this.t = -0.2; }
        break;
      }
      case 'phaseShift':
        this.vx = 0;
        if (this.t > 0.6 && !this.shifted) {
          this.shifted = true;
          const gy = this.y + this.h;
          w.fx.add(new Shockwave(this.cx() - 10, gy, -1, 160, { speed: 190, dist: 260 }));
          w.fx.add(new Shockwave(this.cx() + 10, gy, 1, 160, { speed: 190, dist: 260 }));
          sfx.crackedBell(); w.shake = 6;
        }
        if (this.t > 1.5) { this.shifted = false; this.set('idle'); }
        break;
      default:
        this.set('idle');
    }
  }

  nearestPlatformX() {
    const xs = this.world.level.arena.plats.map((t) => t * TILE + TILE / 2);
    xs.sort((a, b) => Math.abs(a - this.cx()) - Math.abs(b - this.cx()));
    return xs[Math.random() < 0.5 ? 0 : 1];
  }

  // Estado de alerta usado pelos desenhos (amarelo = aparável, vermelho = não aparável)
  telegraph() {
    if (this.state === 'dragWind') return 'parry';
    if (this.state === 'rollWind' || this.state === 'leapWind' || this.state === 'bellSway') return 'danger';
    return null;
  }
}
