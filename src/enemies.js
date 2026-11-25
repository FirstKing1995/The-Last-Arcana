import { moveBody, overlap, GRAVITY, TILE } from './physics.js';
import { MOBS } from './data.js';
import { sfx } from './audio.js';
import { Projectile, Shockwave, AshPatch } from './fx.js';

// Base comum: vida, postura, quebra, queimadura, agressividade e território.
export class Mob {
  constructor(world, type, x, y, opts = {}) {
    this.world = world; this.type = type; this.def = MOBS[type];
    this.w = this.def.w; this.h = this.def.h;
    this.spawnX = x; this.spawnY = y;
    this.summoned = !!opts.summoned;
    this.patrol = opts.patrol || null; // [xA, xB] em px
    this.reset();
  }
  reset() {
    this.x = this.spawnX - this.w / 2; this.y = this.spawnY - this.h;
    this.vx = 0; this.vy = 0;
    this.hp = this.def.hp; this.posture = 0; this.postureCd = 0;
    this.state = 'idle'; this.t = 0; this.dead = false; this.deathT = 0;
    this.facing = -1; this.aggro = false; this.flash = 0; this.burn = 0; this.burnTick = 0;
    this.hitT = 0; this.hitDir = 1; this.hits = 0; this.lastHit = -9; this.reflexCd = 0; this.delay = 0; this.hitDone = false; this.guarding = false; this.patrolI = 0; this.patrolWait = 0; this.alerted = false;
  }
  alive() { return !this.dead; }
  cx() { return this.x + this.w / 2; }
  cy() { return this.y + this.h / 2; }
  box() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  hurtbox() { return this.box(); }
  set(s) { this.state = s; this.t = 0; this.hitDone = false; }
  isBroken() { return this.state === 'broken'; }
  endBreak() { if (this.state === 'broken') this.set('recover'); this.posture = 0; }
  // Em preparação ou no golpe o inimigo não é empurrado: bater sem olhar sai caro
  armored() { return ['windup', 'strike', 'slashWind', 'slash', 'lungeWind', 'lunge', 'bite', 'wind'].includes(this.state); }
  // Reação ao ataque do Errante: cada tipo tem a sua (recuo, guarda, flanco). Devolve true se reagiu.
  reflex(dt, chance) {
    if (this.reflexCd > 0) { this.reflexCd -= dt; return false; }
    const p = this.world.player;
    if (p.action !== 'light' || p.t > 0.09 || this.dist > 62 || Math.abs(p.cy() - this.cy()) > 40) return false;
    this.reflexCd = 0.9 + Math.random() * 0.9;
    if (Math.random() > chance) return false;
    this.evade();
    return true;
  }
  evade() {}
  // Revide: depois de apanhar em sequência, responde na hora (com aviso curto, mas sempre visível)
  revide() {}
  applyBurn(sec) { this.burn = Math.max(this.burn, sec); }

  takeDamage(dmg, posture, dir, info = {}) {
    if (this.dead) return 'none';
    const w = this.world;
    let result = 'hit';
    if (this.guarding && dir === -this.facing && info.kind !== 'heavy' && info.kind !== 'finisher') {
      dmg *= 0.2; posture *= 0.6; result = 'guarded';
      sfx.guard(); w.fx.spark(this.cx() - dir * 4, this.cy(), -dir, '#c8c8d0', 8);
    } else if (this.guarding && info.kind === 'heavy') {
      this.guarding = false; posture *= 1.5; this.set('recover'); this.t = -0.3;
    }
    dmg = Math.round(dmg);
    this.hp -= dmg;
    this.posture += posture;
    this.postureCd = 2;
    this.flash = 0.09; this.hitT = 0.16; this.hitDir = dir || 1;
    this.aggro = true;
    this.hits = w.time - this.lastHit < 1.1 ? this.hits + 1 : 1; this.lastHit = w.time;
    if (result !== 'guarded') { if (info.kind === 'heavy' || info.kind === 'finisher') sfx.hitHeavy(); else sfx.hit(); if (Math.random() < 0.5) sfx.mobHurt(); w.fx.burst(this.cx(), this.cy(), 6, this.bloodColor || '#e17a3d', 60, 0.35); }
    w.fx.number(this.cx(), this.y - 3, dmg, result === 'guarded' ? '#9aa0aa' : info.crit ? '#ffd23a' : '#f2e6d0');
    if (this.hp <= 0) { this.die(); return 'kill'; }
    if (this.posture >= this.def.posture && this.state !== 'broken') {
      this.set('broken'); this.vx = dir * 60; sfx.guard();
      w.fx.burst(this.cx(), this.y, 10, '#fff3c4', 60, 0.4, 0, 1);
    } else if (!this.armored() && this.flinches && this.flinches(info)) {
      this.vx = dir * 70;
    }
    if (this.hits >= (this.patience || 2) && this.state !== 'broken' && !this.armored() && info.kind !== 'finisher') { this.hits = 0; this.revide(); }
    return result;
  }

  die() {
    this.dead = true; this.deathT = 0; this.state = 'dead'; sfx.mobDie();
    this.world.hitstop = Math.max(this.world.hitstop, 0.07);
    this.world.fx.ring(this.cx(), this.cy(), '#ffb070', 26);
    this.world.fx.burst(this.cx(), this.cy(), 26, '#8a827b', 120, 0.9, 120, 2);
    this.world.fx.burst(this.cx(), this.cy(), 10, this.bloodColor || '#e17a3d', 90, 0.5);
    this.world.onMobKilled(this);
  }

  // Ataque corpo a corpo: aplica dano uma vez por golpe
  melee(box, dmg, opts) {
    if (this.hitDone) return;
    const p = this.world.player;
    if (overlap(box, p.box())) {
      const r = p.takeHit(dmg, this, { dir: this.facing, ...opts });
      if (r === 'none') return;
      this.hitDone = true;
      if (r === 'parried') this.onParried();
    }
  }
  onParried() {
    this.posture += this.def.posture * 0.55; this.postureCd = 2;
    if (this.posture >= this.def.posture) { this.set('broken'); this.vx = -this.facing * 60; }
    else { this.set('recoil'); this.vx = -this.facing * 80; }
  }

  front(range, h = this.h, yOff = 0) {
    return { x: this.facing > 0 ? this.x + this.w : this.x - range, y: this.y + yOff, w: range, h };
  }

  common(dt) {
    const w = this.world, p = w.player;
    this.t += dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.hitT > 0) this.hitT -= dt;
    if (this.postureCd > 0) this.postureCd -= dt; else this.posture = Math.max(0, this.posture - this.def.posture * 0.25 * dt);
    if (this.burn > 0) {
      this.burn -= dt; this.burnTick -= dt;
      if (this.burnTick <= 0) { this.burnTick = 0.5; this.hp -= 10; w.fx.number(this.cx(), this.y - 3, 10, '#ffb070'); if (this.hp <= 0) { this.die(); return false; } }
      if (Math.random() < 0.3) w.fx.parts.push({ x: this.x + Math.random() * this.w, y: this.y + Math.random() * this.h, vx: 0, vy: -25, life: 0.4, max: 0.4, color: '#ffb070', grav: 0, size: 1 });
    }
    // Alvo: o Errante, ou o eco de Caminho Improvável quando estiver por perto
    const tgt = w.targetFor(this);
    const dx = tgt.x - this.cx(), dy = p.cy() - this.cy();
    this.dx = dx; this.dist = Math.abs(dx);
    const pdx = p.cx() - this.cx();
    if (!this.aggro && !p.dead && Math.abs(pdx) < (this.aggroRange || 150) && Math.abs(dy) < 70) {
      this.aggro = true;
      // Alerta: chama aliados próximos uma única vez
      if (!this.alerted) { this.alerted = true; w.alertNear(this); }
      this.onAggro && this.onAggro();
    }
    // Território: caçadores voltam depois de uma curta perseguição
    if (this.aggro && (Math.abs(this.cx() - this.spawnX) > 260 || Math.abs(dy) > 150 || p.dead)) this.aggro = false;
    if (this.state === 'broken') {
      this.vx *= 0.9;
      if (this.t > 2.2) { this.set('recover'); this.posture = 0; }
      return false;
    }
    if (this.state === 'recoil') { this.vx *= 0.88; if (this.t > 0.65) this.set('idle'); return false; }
    return true;
  }

  physics(dt) {
    this.vy = Math.min(this.vy + GRAVITY * dt, 560);
    moveBody(this, this.world.level, dt);
  }

  // Evita cair de bordas quando não está sendo empurrado
  edgeAhead(dir) {
    const lvl = this.world.level;
    const fx = dir > 0 ? this.x + this.w + 2 : this.x - 2;
    const ty = Math.floor((this.y + this.h + 2) / TILE);
    const tx = Math.floor(fx / TILE);
    return !(lvl.solid(tx, ty) || lvl.oneway(tx, ty)) || lvl.solid(tx, Math.floor((this.y + this.h - 4) / TILE));
  }

  walkToward(dir, speed) {
    if (this.edgeAhead(dir)) { this.vx = 0; return; }
    this.vx = dir * speed;
  }

  returnHome(dt) {
    if (this.patrol) return this.doPatrol(dt);
    const d = this.spawnX - this.cx();
    if (Math.abs(d) > 6) { this.facing = Math.sign(d); this.walkToward(this.facing, this.def.speed * 0.7); }
    else this.vx = 0;
    if (!this.aggro) this.hp = Math.min(this.def.hp, this.hp + this.def.hp * 0.2 * dt);
  }

  // Patrulha: rota entre dois marcos, com pausa em cada um
  doPatrol(dt) {
    if (this.patrolWait > 0) { this.patrolWait -= dt; this.vx = 0; return; }
    const tx = this.patrol[this.patrolI];
    const d = tx - this.cx();
    if (Math.abs(d) < 4) { this.patrolI = 1 - this.patrolI; this.patrolWait = 1.2 + Math.random(); this.vx = 0; return; }
    this.facing = Math.sign(d);
    this.walkToward(this.facing, this.def.speed * 0.55);
    if (this.vx === 0) { this.patrolI = 1 - this.patrolI; this.patrolWait = 0.8; }
  }

  update(dt) {
    if (this.dead) { this.deathT += dt; return; }
    if (this.common(dt * 1.18)) this.think(dt * 1.18);
    this.physics(dt);
  }
}

// Bucha de canhão — avança em linha reta, ataca uma vez e recua.
export class Cinzeiro extends Mob {
  constructor(...a) { super(...a); this.bloodColor = '#d56a32'; this.aggroRange = 140; }
  flinches() { return true; }
  evade() { if (!this.edgeAhead(-this.facing)) { this.vx = -this.facing * 190; this.vy = -130; this.set('hop'); } }
  revide() { this.facing = Math.sign(this.dx) || this.facing; this.set('windup'); this.delay = 0.3; }
  think(dt) {
    const s = this.state, D = this.def;
    if (!this.aggro) return this.returnHome(dt);
    if (s === 'hop') { if (this.t > 0.3) { this.set('windup'); this.delay = 0.26; } return; }
    if (s === 'idle' || s === 'recover' || s === 'retreat') if (this.reflex(dt, 0.4)) return;
    if (s === 'idle' || s === 'recover') {
      if (s === 'recover' && this.t < 0.4) { this.vx *= 0.85; return; }
      this.facing = Math.sign(this.dx) || this.facing;
      if (this.dist < 72) { this.set('windup'); this.vx = 0; this.delay = 0.32 + Math.random() * 0.22; }
      else this.walkToward(this.facing, D.speed);
    } else if (s === 'windup') {
      this.vx = 0;
      if (this.t > this.delay) { this.facing = Math.sign(this.dx) || this.facing; this.set('strike'); this.vx = this.facing * 340; this.vy = -80; sfx.swing(); }
    } else if (s === 'strike') {
      this.vx *= 0.955;
      this.melee(this.front(16), D.dmg, { parryable: true });
      if (this.t > 0.24) this.set('retreat');
    } else if (s === 'retreat') {
      this.vx = -this.facing * 75;
      if (this.edgeAhead(-this.facing)) this.vx = 0;
      if (this.t > 0.45) this.set('idle');
    }
  }
}

// Intermediário — golpe curto, investida e guarda breve.
export class Braseiro extends Mob {
  constructor(...a) { super(...a); this.bloodColor = '#c85a2d'; this.aggroRange = 150; }
  flinches(info) { return info.kind === 'heavy'; }
  evade() { this.vx = 0; this.set('guard'); this.delay = 0.45; }
  revide() { this.facing = Math.sign(this.dx) || this.facing; this.set(Math.random() < 0.5 ? 'slashWind' : 'guard'); this.delay = this.state === 'guard' ? 0.5 : 0.28; }
  think(dt) {
    const s = this.state, D = this.def;
    this.guarding = s === 'guard';
    if (!this.aggro) return this.returnHome(dt);
    if (s === 'idle' && this.reflex(dt, 0.55)) return;
    if (s === 'idle' || s === 'recover') {
      if (s === 'recover' && this.t < 0.55) { this.vx *= 0.85; return; }
      this.facing = Math.sign(this.dx) || this.facing;
      const r = Math.random();
      if (this.dist < 62) {
        this.vx = 0; this.delay = 0.34 + Math.random() * 0.24;
        if (r < 0.62) this.set('slashWind'); else if (r < 0.78) { this.set('guard'); this.delay = 0.7; } else this.set('lungeWind');
      } else if (this.dist < 150 && r < 0.03) { this.vx = 0; this.set('lungeWind'); }
      else this.walkToward(this.facing, D.speed);
    } else if (s === 'slashWind') {
      this.vx = 0;
      if (this.t > this.delay) { this.facing = Math.sign(this.dx) || this.facing; this.set('slash'); this.vx = this.facing * 190; sfx.swing(); }
    } else if (s === 'slash') {
      this.vx *= 0.9;
      this.melee(this.front(36, this.h - 4, 2), D.dmg, { parryable: true });
      // às vezes emenda um segundo corte, com atraso: esquivar cedo demais custa
      if (this.t > 0.18) { if (!this.second && this.dist < 70 && Math.random() < 0.45) { this.second = true; this.set('slashWind'); this.delay = 0.3; } else { this.second = false; this.set('recover'); } }
    } else if (s === 'lungeWind') {
      this.vx = 0;
      if (this.t > 0.55) { this.facing = Math.sign(this.dx) || this.facing; this.set('lunge'); sfx.heavy(); }
    } else if (s === 'lunge') {
      this.vx = this.facing * 290;
      this.melee(this.front(30, this.h - 4, 2), D.dmg + 20, { parryable: true, knock: 1.4 });
      if (this.t > 0.3 || this.hitWall) { this.set('recover'); this.t = -0.3; }
    } else if (s === 'guard') {
      this.vx = 0;
      this.facing = Math.sign(this.dx) || this.facing;
      if (this.t > (this.delay || 0.8)) { this.set('slashWind'); this.delay = 0.26; }
    }
  }
}

// Rastejador — rente ao chão; golpes pesados (altos) passam por cima.
export class Rasteja extends Mob {
  constructor(...a) { super(...a); this.bloodColor = '#e6a34a'; this.aggroRange = 150; }
  flinches() { return true; }
  // passa por baixo e ataca pelas costas
  evade() { this.vx = this.facing * 320; this.set('flank'); }
  revide() { this.vx = -this.facing * 200; this.vy = -120; this.set('back'); }
  think(dt) {
    const s = this.state, D = this.def;
    if (!this.aggro) return this.returnHome(dt);
    if (s === 'flank') { this.vx = this.facing * 320; if (this.t > 0.26 || this.hitWall) { this.facing = -this.facing; this.set('windup'); this.delay = 0.22; this.vx = 0; } return; }
    if (s === 'back') { if (this.t > 0.28) { this.set('windup'); this.delay = 0.24; } return; }
    if (s === 'idle' && this.reflex(dt, 0.5)) return;
    if (s === 'idle' || s === 'recover') {
      if (s === 'recover' && this.t < 0.45) { this.vx *= 0.8; return; }
      this.facing = Math.sign(this.dx) || this.facing;
      if (this.dist < 84) { this.set('windup'); this.vx = 0; this.delay = 0.28 + Math.random() * 0.16; }
      else this.walkToward(this.facing, D.speed);
    } else if (s === 'windup') {
      this.vx = 0;
      if (this.t > this.delay) { this.facing = Math.sign(this.dx) || this.facing; this.set('bite'); this.vx = this.facing * 360; this.vy = -120; sfx.swing(); }
    } else if (s === 'bite') {
      this.vx *= 0.965;
      this.melee(this.front(12, 11, -1), D.dmg, { parryable: true });
      if (this.t > 0.28) this.set('recover');
    }
  }
}

// Voador — mantém distância, anuncia o disparo e desce em ciclos para ser punido.
export class Gralha extends Mob {
  constructor(...a) {
    super(...a); this.bloodColor = '#a65d38'; this.aggroRange = 170;
  }
  reset() {
    super.reset();
    this.groundY = this.spawnY;
    this.y = this.groundY - 78; this.homeY = this.y; this.state = 'hover'; this.cycle = 0;
  }
  flinches() { return this.state === 'grounded'; }
  physics(dt) {
    if (this.dead) return;
    const lv = this.world.level, nx = this.x + this.vx * dt, ny = this.y + this.vy * dt;
    const hit = (x, y) => lv.solid(Math.floor(x / TILE), Math.floor(y / TILE)) || lv.solid(Math.floor((x + this.w) / TILE), Math.floor(y / TILE)) || lv.solid(Math.floor(x / TILE), Math.floor((y + this.h - 1) / TILE)) || lv.solid(Math.floor((x + this.w) / TILE), Math.floor((y + this.h - 1) / TILE));
    if (!hit(nx, this.y)) this.x = nx; else this.vx = 0;
    if (!hit(this.x, ny)) this.y = ny; else this.vy = 0;
  }
  update(dt) {
    if (this.dead) { this.deathT += dt; this.y += 60 * dt; return; }
    if (this.common(dt)) this.think(dt);
    else if (this.state === 'broken') { this.vy = Math.min(this.vy + 400 * dt, 200); if (this.y + this.h >= this.groundY) { this.y = this.groundY - this.h; this.vy = 0; } }
    this.physics(dt);
  }
  think(dt) {
    const p = this.world.player, s = this.state;
    this.groundY = this.world.level.solidGroundBelow(this.cx(), this.y + this.h);
    let roof = Math.floor(this.y / TILE); while (roof > 0 && roof > this.y / TILE - 8 && !this.world.level.solid(Math.floor(this.cx() / TILE), roof)) roof--;
    const hoverY = Math.max((roof + 1) * TILE + 6, this.groundY - 78) + Math.sin(this.world.time * 2.2 + this.spawnX) * 6;
    if (!this.aggro) {
      this.vx = (this.spawnX - this.cx()) * 1.2; this.vy = (hoverY - this.y) * 2;
      return;
    }
    this.facing = Math.sign(this.dx) || this.facing;
    if (s === 'hover' || s === 'idle' || s === 'recover') {
      const tx = p.cx() - this.facing * 84;
      this.vx = Math.max(-this.def.speed, Math.min(this.def.speed, (tx - this.cx()) * 1.5));
      this.vy = (hoverY - this.y) * 2.5;
      if (this.t > 1.6) {
        this.cycle++;
        this.set(this.cycle % 3 === 0 ? 'diveWind' : 'shotWind');
        sfx.caw();
      }
    } else if (s === 'shotWind') {
      this.vx *= 0.9; this.vy *= 0.9;
      if (this.t > 0.6) {
        const ang = Math.atan2(p.cy() - this.cy(), p.cx() - this.cx());
        this.world.fx.add(new Projectile({ owner: 'enemy', x: this.cx(), y: this.cy(), vx: Math.cos(ang) * 140, vy: Math.sin(ang) * 140, r: 3, dmg: this.def.dmg, color: '#3a3a40', glow: '#a65d38', life: 2.5 }));
        this.set('hover'); this.t = 0.3;
      }
    } else if (s === 'diveWind') {
      this.vx *= 0.85; this.vy = -20;
      if (this.t > 0.55) { this.set('dive'); this.diveDir = Math.sign(this.dx) || 1; }
    } else if (s === 'dive') {
      this.vx = this.diveDir * 150; this.vy = 230;
      this.melee(this.box(), this.def.dmg - 20, { parryable: true });
      if (this.y + this.h >= this.groundY - 1) { this.y = this.groundY - this.h; this.set('grounded'); this.vx = 0; this.vy = 0; }
      if (this.t > 1.2) this.set('rise');
    } else if (s === 'grounded') {
      this.vx = 0; this.vy = 0;
      if (this.t > 1.3) this.set('rise');
    } else if (s === 'rise') {
      this.vy = -90; this.vx = -this.facing * 30;
      if (this.y < hoverY) this.set('hover');
    }
  }
}

// Especialista — sino rachado; badaladas geram ondas no chão e chamam um reforço.
export class Sino extends Mob {
  constructor(...a) { super(...a); this.bloodColor = '#e17a3d'; this.aggroRange = 170; this.patience = 3; }
  reset() { super.reset(); this.summonedOnce = false; this.state = 'idle'; }
  flinches() { return false; }
  edgeAhead() { return true; }
  // apanhou três vezes seguidas: badalada mais cedo, e quem está colado leva o tranco
  revide() { if (this.state === 'recover' || this.state === 'idle') { this.set('wind'); this.t = this.type === 'sino' ? 0.4 : 0.45; this.quick = true; } }
  think() {
    const s = this.state;
    this.vx = 0;
    if (!this.aggro) return;
    this.facing = Math.sign(this.dx) || this.facing;
    if (s === 'idle' || s === 'recover') {
      if (this.t > (s === 'recover' ? 1.6 : 1.0)) this.set('wind');
    } else if (s === 'wind') {
      if (this.t > 0.9) {
        sfx.crackedBell();
        const gy = this.y + this.h;
        this.world.fx.add(new Shockwave(this.cx() - 12, gy, -1, this.def.dmg, { speed: 150, dist: 200 }));
        this.world.fx.add(new Shockwave(this.cx() + 12, gy, 1, this.def.dmg, { speed: 150, dist: 200 }));
        this.world.shake = Math.max(this.world.shake, 3);
        if (this.dist < 34) this.world.player.takeHit(this.def.dmg * 0.6, this, { parryable: false, dir: Math.sign(this.dx) || 1, knock: 1.6 });
        if (!this.summonedOnce && !(this.type === 'sino' && this.world.prog.flags.cryptSilenced)) { this.summonedOnce = true; this.world.summon('cinzeiro', this.cx() - Math.sign(this.dx || 1) * 150, gy); }
        this.set('recover');
      }
    }
  }
}

// Mini-chefe da Cripta do Campanário: badaladas duplas e uma chuva de fuligem.
export class SinoElite extends Sino {
  constructor(...a) { super(...a); this.aggroRange = 200; this.isElite = true; }
  think() {
    const s = this.state;
    this.vx = 0;
    if (!this.aggro) return;
    this.facing = Math.sign(this.dx) || this.facing;
    const w = this.world;
    if (s === 'idle' || s === 'recover') {
      if (this.t > (s === 'recover' ? 1.3 : 0.8)) { this.cycle = (this.cycle || 0) + 1; this.set(this.cycle % 3 === 0 ? 'rainWind' : 'wind'); }
    } else if (s === 'wind') {
      if (this.t > 0.85) {
        sfx.crackedBell();
        const gy = this.y + this.h;
        this.waves = (this.waves || 0) + 1;
        w.fx.add(new Shockwave(this.cx() - 14, gy, -1, this.def.dmg, { speed: 160, dist: 230 }));
        w.fx.add(new Shockwave(this.cx() + 14, gy, 1, this.def.dmg, { speed: 160, dist: 230 }));
        w.shake = Math.max(w.shake, 3);
        if (!this.summonedOnce) { this.summonedOnce = true; w.summon('cinzeiro', this.cx() - Math.sign(this.dx || 1) * 120, gy); }
        if (this.waves % 2 === 1) { this.set('wind'); this.t = 0.35; } else this.set('recover');
      }
    } else if (s === 'rainWind') {
      if (this.t > 1.0) {
        sfx.crackedBell();
        const p = w.player;
        for (let i = 0; i < 4; i++) {
          const x = p.cx() + (i - 1.5) * 36;
          const gy = w.level.solidGroundBelow(x, p.y);
          w.fx.add(new AshPatch(x, gy, 1.1, 18, 150));
        }
        this.set('recover');
      }
    }
  }
}

export const MOB_CLASSES = { cinzeiro: Cinzeiro, braseiro: Braseiro, rasteja: Rasteja, gralha: Gralha, sino: Sino, sinoElite: SinoElite };
