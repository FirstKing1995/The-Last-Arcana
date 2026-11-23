import { Input } from './input.js';
import { sfx } from './audio.js';
import { moveBody, overlap, GRAVITY, TILE } from './physics.js';
import { PLAYER, SPELLS, ARCANA } from './data.js';
import { Projectile } from './fx.js';

export class Player {
  constructor(world, x, y) {
    this.world = world;
    this.w = 10; this.h = 22;
    this.maxHp = PLAYER.hp; this.maxVigor = PLAYER.vigor; this.maxFoco = PLAYER.foco;
    this.maxPotions = PLAYER.potions;
    this.arcana = [null, null]; // [primário, secundário]
    this.activeSlot = 0;
    this.cooldowns = {};
    this.relics = [];
    this.respawn(x, y);
  }

  respawn(x, y) {
    this.x = x - this.w / 2; this.y = y - this.h;
    this.vx = 0; this.vy = 0;
    this.hp = this.maxHp; this.vigor = this.maxVigor; this.foco = this.maxFoco;
    this.potions = this.maxPotions;
    this.facing = 1; this.action = null; this.t = 0;
    this.combo = 0; this.comboTimer = 0;
    this.healLeft = 0; this.healRate = 0;
    this.invuln = 0; this.flash = 0; this.dead = false; this.deadT = 0;
    this.vigorDelay = 0; this.coyote = 0; this.dropThrough = 0;
    this.running = false; this.walkPhase = 0;
    this.lastDodge = -99; this.perfectFlash = 0;
    this.cooldowns = {};
  }

  cx() { return this.x + this.w / 2; }
  cy() { return this.y + this.h / 2; }
  box() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  spend(cost) {
    if (this.vigor <= 0) return false;
    this.vigor = Math.max(0, this.vigor - cost);
    this.vigorDelay = 0.65;
    return true;
  }

  start(action) { this.action = action; this.t = 0; this.hitSet = new Set(); this.struck = false; }

  activeArcanum() { return this.arcana[this.activeSlot]; }

  isInvulnerable() {
    if (this.invuln > 0) return true;
    if (this.action === 'dodge') return this.t >= PLAYER.dodge.iframes[0] && this.t <= PLAYER.dodge.iframes[1];
    if (this.action === 'ability' || this.action === 'finisher' || this.action === 'rest') return true;
    return false;
  }

  // Retorna 'parried' | 'dodged' | 'hit' | 'none'
  takeHit(dmg, src, opts = {}) {
    const w = this.world;
    if (this.dead) return 'none';
    if (this.action === 'dodge' && this.isInvulnerable()) {
      if (!this.perfectThisDodge) {
        this.perfectThisDodge = true;
        this.perfectFlash = 0.3;
        sfx.perfect();
        w.fx.burst(this.cx(), this.cy(), 8, '#f6f2ea', 60, 0.4, 0, 1);
      }
      return 'dodged';
    }
    if (this.isInvulnerable()) return 'dodged';
    if (this.action === 'parry' && this.t <= PLAYER.parry.window && opts.parryable) {
      sfx.parry();
      this.foco = Math.min(this.maxFoco, this.foco + PLAYER.parry.foco);
      w.hitstop = 0.09;
      w.shake = Math.max(w.shake, 2);
      w.fx.spark(this.cx() + this.facing * 8, this.cy() - 2, this.facing, '#fff3c4', 14);
      w.flashScreen = 0.08;
      this.t = PLAYER.parry.dur - 0.12; // recuperação curta após aparo bem-sucedido
      return 'parried';
    }
    this.hp -= dmg;
    w.fx.number(this.cx(), this.y - 4, dmg, '#ff8a7a');
    w.fx.burst(this.cx(), this.cy(), 10, '#a72f2f', 70, 0.4);
    w.shake = Math.max(w.shake, 4);
    w.hitstop = Math.max(w.hitstop, 0.05);
    this.flash = 0.15;
    sfx.hurt();
    if (this.healLeft > 0 && dmg >= 150) { this.healLeft = 0; w.toast('Cura interrompida'); }
    if (this.hp <= 0) {
      this.hp = 0; this.dead = true; this.deadT = 0; this.action = 'dead'; this.t = 0;
      sfx.death();
      return 'hit';
    }
    const dir = opts.dir || (src && src.x !== undefined ? Math.sign(this.cx() - (src.cx ? src.cx() : src.x)) || -this.facing : -this.facing);
    this.vx = dir * 120 * (opts.knock || 1);
    this.vy = -90;
    this.start('hurt');
    this.invuln = 0.45;
    return 'hit';
  }

  update(dt) {
    const w = this.world;
    this.t += dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.perfectFlash > 0) this.perfectFlash -= dt;
    if (this.dropThrough > 0) this.dropThrough = Math.max(0, this.dropThrough - dt);
    if (this.comboTimer > 0) this.comboTimer -= dt; else this.combo = 0;
    for (const k in this.cooldowns) this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);

    if (this.dead) {
      this.deadT += dt;
      this.vx *= 0.9;
      this.vy += GRAVITY * dt;
      moveBody(this, w.level, dt);
      return;
    }

    // Recursos
    if (this.vigorDelay > 0) this.vigorDelay -= dt;
    else if (this.action !== 'dodge') this.vigor = Math.min(this.maxVigor, this.vigor + (this.action === 'parry' ? 20 : 48) * dt);
    if (!w.inCombat) this.foco = Math.min(this.maxFoco, this.foco + 2 * dt);
    if (this.healLeft > 0) {
      const a = Math.min(this.healLeft, this.healRate * dt);
      this.hp = Math.min(this.maxHp, this.hp + a); this.healLeft -= a;
      if (Math.random() < 0.3) w.fx.parts.push({ x: this.x + Math.random() * this.w, y: this.y + this.h, vx: 0, vy: -30, life: 0.6, max: 0.6, color: '#9fe0a8', grav: 0, size: 1 });
    }

    const mx = (Input.down('right') ? 1 : 0) - (Input.down('left') ? 1 : 0);
    if (this.onGround) this.coyote = 0.1; else this.coyote -= dt;

    if (!this.action) this.freeControl(dt, mx);
    else this.updateAction(dt, mx);

    if (!(this.action === 'ability')) this.vy = Math.min(this.vy + GRAVITY * dt, 560);
    const vyBefore = this.vy;
    moveBody(this, w.level, dt);
    if (this.justLanded && vyBefore > 300) { sfx.land(); w.fx.burst(this.cx(), this.y + this.h, 5, '#625b58', 30, 0.3, 50); }
    if (this.onGround && Math.abs(this.vx) > 10) this.walkPhase += dt * Math.abs(this.vx) * 0.12;

    // Queda em área fora do mapa
    if (this.y > w.level.g.length * TILE + 40) { this.hp = 0; this.takeHit(1, null, {}); }
  }

  freeControl(dt, mx) {
    const w = this.world;
    // Correr: manter Shift pressionado depois da esquiva
    this.running = Input.down('dodge') && mx !== 0 && this.t > 0.05;
    const speed = this.running ? PLAYER.run : PLAYER.walk;
    const target = mx * speed;
    const accel = this.onGround ? 900 : 600;
    if (this.vx < target) this.vx = Math.min(target, this.vx + accel * dt);
    else if (this.vx > target) this.vx = Math.max(target, this.vx - accel * dt);
    if (mx) this.facing = mx;

    if (Input.pressed('jump') && Input.down('down') && this.onGround && this.onOneWay()) {
      Input.consume('jump'); this.dropThrough = 0.25; this.y += 2; return;
    }
    if (Input.pressed('jump') && this.coyote > 0) {
      Input.consume('jump'); this.vy = -PLAYER.jump; this.coyote = 0; this.onGround = false; sfx.jump();
    }
    if (!Input.down('jump') && this.vy < -140) this.vy = -140;

    if (Input.pressed('dodge') && this.vigor > 0) { Input.consume('dodge'); return this.doDodge(mx); }
    if (Input.pressed('parry') && this.vigor > 0) {
      Input.consume('parry'); this.spend(PLAYER.parry.cost); this.start('parry'); return;
    }
    if (Input.pressed('light') && this.vigor > 0) { Input.consume('light'); return this.doLight(); }
    if (Input.pressed('heavy') && this.vigor > 0 && this.onGround) { Input.consume('heavy'); this.start('heavyCharge'); sfx.charge(); return; }
    if (Input.pressed('potion')) {
      Input.consume('potion');
      if (this.potions > 0) { this.start('heal'); this.healUsed = false; } else w.toast('Sem frascos — descanse numa pira');
      return;
    }
    if (Input.pressed('spell')) {
      Input.consume('spell');
      if (!w.flags.brasa) w.toast('Nenhum feitiço aprendido ainda');
      else if (this.foco < SPELLS.brasa.cost) w.toast('Foco insuficiente');
      else { this.foco -= SPELLS.brasa.cost; this.start('cast'); }
      return;
    }
    if (Input.pressed('ability')) {
      Input.consume('ability');
      const a = this.activeArcanum();
      if (!a) w.toast('Nenhum Arcano neste espaço');
      else if (this.cooldowns[a] > 0) w.toast(`${ARCANA[a].ability.name}: recarga ${this.cooldowns[a].toFixed(1)} s`);
      else { this.cooldowns[a] = ARCANA[a].ability.cd; this.start('ability'); sfx.dodge(); sfx.fire(); }
      return;
    }
    if (Input.pressed('swap')) {
      Input.consume('swap');
      this.activeSlot = 1 - this.activeSlot; this.start('swap'); sfx.ui();
      return;
    }
    if (Input.pressed('interact')) { Input.consume('interact'); w.interact(); }
  }

  onOneWay() {
    const ty = Math.floor((this.y + this.h + 1) / TILE);
    const l = Math.floor(this.x / TILE), r = Math.floor((this.x + this.w - 0.01) / TILE);
    for (let tx = l; tx <= r; tx++) if (this.world.level.solid(tx, ty)) return false;
    return true;
  }

  doDodge(mx) {
    const now = this.world.time;
    let cost = PLAYER.dodge.cost;
    if (this.relics.includes('cinza') && this.world.inCombat && now - this.lastDodge > 4) cost = Math.round(cost * 0.5);
    this.lastDodge = now;
    this.spend(cost);
    if (mx) this.facing = mx;
    this.start('dodge');
    this.perfectThisDodge = false;
    this.vx = this.facing * PLAYER.dodge.speed;
    sfx.dodge();
  }

  doLight() {
    this.spend(PLAYER.light.cost);
    this.combo = this.combo % 3;
    this.start('light');
    this.comboIndex = this.combo;
    this.combo++;
    this.comboTimer = 0.6;
    if (this.onGround) this.vx = this.facing * 45;
    sfx.swing();
  }

  attackBox(kind) {
    const f = this.facing;
    if (kind === 'heavy') {
      const y = this.y - 8, h = this.h - 6 + 8 - 2; // não alcança alvos rentes ao chão
      return { x: f > 0 ? this.x + this.w - 2 : this.x - 26, y, w: 28, h };
    }
    if (kind === 'ability') return { x: this.x - 4, y: this.y, w: this.w + 8, h: this.h };
    return { x: f > 0 ? this.x + this.w - 2 : this.x - 22, y: this.y + 1, w: 24, h: this.h };
  }

  strike(kind, dmg, posture) {
    const w = this.world;
    const box = this.attackBox(kind);
    let hitAny = false;
    for (const e of w.targets()) {
      if (!e.alive() || this.hitSet.has(e)) continue;
      if (overlap(box, e.hurtbox())) {
        this.hitSet.add(e);
        const r = e.takeDamage(dmg, posture, this.facing, { kind, world: w });
        hitAny = true;
        if (r !== 'guarded') this.foco = Math.min(this.maxFoco, this.foco + 1);
      }
    }
    if (kind === 'heavy') w.breakTiles(box);
    if (hitAny) { w.hitstop = Math.max(w.hitstop, kind === 'heavy' ? 0.07 : 0.035); }
    return hitAny;
  }

  updateAction(dt, mx) {
    const w = this.world;
    const P = PLAYER;
    switch (this.action) {
      case 'light': {
        this.vx *= this.onGround ? 0.85 : 0.98;
        if (this.t >= P.light.active[0] && this.t <= P.light.active[1]) this.strike('light', P.light.dmg[this.comboIndex], P.light.posture[this.comboIndex]);
        if (this.t > 0.2 && Input.pressed('light') && this.vigor > 0 && this.comboIndex < 2) {
          Input.consume('light'); if (mx) this.facing = mx; this.doLight(); return;
        }
        if (this.t > 0.22 && Input.pressed('dodge') && this.vigor > 0) { Input.consume('dodge'); this.action = null; this.doDodge(mx); return; }
        if (this.t >= P.light.dur) this.action = null;
        break;
      }
      case 'heavyCharge': {
        this.vx *= 0.8;
        if (mx) this.facing = mx;
        const released = !Input.down('heavy');
        if ((released && this.t >= P.heavy.minCharge) || this.t >= P.heavy.maxCharge) {
          this.charged = this.t >= P.heavy.maxCharge - 0.01;
          this.spend(P.heavy.cost);
          this.start('heavy');
          this.vx = this.facing * 70;
          sfx.heavy();
        }
        if (Input.pressed('dodge') && this.vigor > 0) { Input.consume('dodge'); this.action = null; this.doDodge(mx); }
        break;
      }
      case 'heavy': {
        this.vx *= 0.85;
        if (this.t >= 0.06 && this.t <= 0.16) {
          const hit = this.strike('heavy', this.charged ? P.heavy.dmgCharged : P.heavy.dmg, this.charged ? P.heavy.postureCharged : P.heavy.posture);
          if (hit && !this.struck) { this.struck = true; w.shake = Math.max(w.shake, 3); }
        }
        if (this.t >= 0.5) this.action = null;
        break;
      }
      case 'dodge': {
        const k = 1 - this.t / P.dodge.dur;
        this.vx = this.facing * P.dodge.speed * (0.35 + 0.65 * k);
        if (Math.random() < 0.5) w.fx.parts.push({ x: this.cx(), y: this.y + this.h - 2, vx: -this.facing * 20, vy: -10, life: 0.3, max: 0.3, color: '#625b58', grav: 0, size: 2 });
        if (this.t >= P.dodge.dur) { this.action = null; this.t = 0.06; }
        break;
      }
      case 'parry': {
        this.vx *= 0.7;
        if (this.t >= P.parry.dur) this.action = null;
        break;
      }
      case 'hurt': {
        this.vx *= 0.9;
        if (this.t >= 0.32 && this.onGround) this.action = null;
        if (this.t >= 0.6) this.action = null;
        break;
      }
      case 'heal': {
        this.vx = mx * 30;
        if (!this.healUsed && this.t >= 0.4) {
          this.healUsed = true; this.potions--;
          this.healLeft = this.maxHp * P.heal.pct; this.healRate = this.healLeft / P.heal.time;
          sfx.heal();
        }
        if (this.t >= P.heal.anim) this.action = null;
        break;
      }
      case 'cast': {
        this.vx *= 0.8;
        if (!this.struck && this.t >= 0.14) {
          this.struck = true;
          const S = SPELLS.brasa;
          w.fx.add(new Projectile({ owner: 'player', x: this.cx() + this.facing * 8, y: this.y + 9, vx: this.facing * S.speed, vy: 0, r: 3, dmg: S.dmg, posture: 15, life: S.range, burn: true, color: '#ffb070', glow: '#e17a3d' }));
          sfx.fire();
        }
        if (this.t >= 0.42) this.action = null;
        break;
      }
      case 'ability': {
        // Salto de Cinzas — atravessa inimigos leves
        this.vx = this.facing * 380; this.vy = 0;
        this.strike('ability', ARCANA.louco.ability.dmg, 25);
        w.fx.parts.push({ x: this.cx(), y: this.y + 4 + Math.random() * 16, vx: 0, vy: -15, life: 0.5, max: 0.5, color: Math.random() < 0.5 ? '#d9b58a' : '#625b58', grav: 0, size: 2 });
        if (this.t >= 0.24) { this.action = null; this.vx = this.facing * 90; }
        break;
      }
      case 'swap': {
        this.vx *= 0.85;
        if (this.t >= 0.22) this.action = null;
        break;
      }
      case 'finisher': {
        this.vx = 0;
        if (!this.struck && this.t >= 0.32 && this.finTarget) {
          this.struck = true;
          const e = this.finTarget;
          e.takeDamage(e.isBoss ? PLAYER.finisher.bossDmg : PLAYER.finisher.dmg, 0, this.facing, { kind: 'finisher', world: w });
          e.endBreak && e.endBreak();
          w.hitstop = 0.15; w.shake = 6; w.flashScreen = 0.1;
          w.fx.burst(e.cx(), e.cy(), 26, '#a72f2f', 120, 0.6);
          sfx.explode();
        }
        if (this.t >= 0.7) { this.action = null; this.finTarget = null; }
        break;
      }
      case 'rest': {
        this.vx = 0;
        if (this.t >= 1.2) this.action = null;
        break;
      }
      default: this.action = null;
    }
  }

  startFinisher(e) {
    this.start('finisher');
    this.finTarget = e;
    this.facing = Math.sign(e.cx() - this.cx()) || this.facing;
    this.x = e.cx() - this.facing * (e.w / 2 + 10) - this.w / 2;
  }
}
