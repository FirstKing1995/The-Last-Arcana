// O Errante: movimento, parkour, combate e animação.
// Ritmo pedido pelo Pedro: rápido e frenético; o comando sempre responde (buffer curto e cancelamentos).
import { Input } from './input.js';
import { sfx } from './audio.js';
import { moveBody, overlap, GRAVITY, TILE } from './physics.js';
import { PLAYER, POTIONS, POTION_IDS, ARCANA, WEAPONS, FISTS, ITEMS } from './data.js';
import { Projectile, AshPatch } from './fx.js';
import { masteryLevel, weaponDamageMul } from './state.js';
import { FRAMES } from './art.js';

// Golpes: animação, linha do tempo [segundo, quadro], janela de acerto, quando pode emendar e quanto avança.
const G = {
  A: { an: 'atkA', tl: [[0, 1], [0.03, 2], [0.06, 3], [0.09, 4], [0.125, 5], [0.17, 6], [0.22, 7]], hit: [0.085, 0.17], link: 0.2, end: 0.34, adv: 150 },
  B: { an: 'atkB', tl: [[0, 1], [0.03, 2], [0.06, 3], [0.09, 4], [0.125, 5], [0.18, 6], [0.23, 7]], hit: [0.085, 0.17], link: 0.2, end: 0.34, adv: 160 },
  C: { an: 'atkC', tl: [[0, 1], [0.04, 2], [0.08, 3], [0.13, 4], [0.18, 5], [0.25, 6], [0.31, 7], [0.37, 8]], hit: [0.07, 0.22], link: 0.28, end: 0.42, adv: 220 },
  T: { an: 'atkC', tl: [[0, 3], [0.05, 4], [0.11, 5], [0.17, 6], [0.23, 7]], hit: [0.045, 0.15], link: 0.19, end: 0.32, adv: 240 },
  P: { an: 'pesado', tl: [[0, 1], [0.05, 2], [0.1, 3], [0.135, 4], [0.18, 5], [0.25, 6], [0.32, 7], [0.4, 8]], hit: [0.1, 0.2], link: 0.27, end: 0.46, adv: 170 },
  J: { an: 'jab', tl: [[0, 1], [0.04, 2], [0.1, 3], [0.15, 4], [0.2, 5]], hit: [0.045, 0.11], link: 0.14, end: 0.26, adv: 120 },
  K: { an: 'cross', tl: [[0, 1], [0.04, 2], [0.1, 3], [0.15, 4], [0.2, 5]], hit: [0.045, 0.12], link: 0.15, end: 0.28, adv: 130 },
  H: { an: 'hook', tl: [[0, 2], [0.05, 3], [0.1, 4], [0.17, 5], [0.24, 6], [0.31, 7]], hit: [0.09, 0.19], link: 0.26, end: 0.4, adv: 200 },
  D: { an: 'dash', tl: [[0, 2], [0.04, 3], [0.09, 4], [0.15, 5], [0.21, 6], [0.28, 8], [0.34, 9]], hit: [0.02, 0.2], link: 0.26, end: 0.4, adv: 330 },
};
const COMBO = {
  fio: ['A', 'B', 'C'], lanca: ['T', 'T', 'C'], machado: ['P', 'A', 'P'], agulhas: ['A', 'B', 'A', 'B', 'C'], ruptura: ['A', 'B', 'C'], null: ['J', 'K', 'H'],
};
const at = (tl, t) => { let f = tl[0][1]; for (const [s, i] of tl) if (t >= s) f = i; return f; };

export class Player {
  constructor(world, x, y) {
    this.world = world;
    this.prog = world.prog;
    this.w = PLAYER.w; this.h = PLAYER.h;
    this.maxHp = PLAYER.hp; this.maxVigor = PLAYER.vigor; this.maxFoco = PLAYER.foco;
    this.activeSlot = 0;
    this.cooldowns = {};
    this.respawn(x, y);
  }

  get maxPotions() { return this.prog.maxPotions; }
  set maxPotions(v) { this.prog.maxPotions = v; }
  get arcana() { return this.prog.arcana; }
  get relics() { return this.prog.relicSlots.filter(Boolean); }
  weapon() { return (this.prog.equipped && WEAPONS[this.prog.equipped]) || FISTS; }
  combos() { return COMBO[this.prog.equipped] || COMBO.null; }

  respawn(x, y) {
    this.h = PLAYER.h;
    this.x = x - this.w / 2; this.y = y - this.h;
    this.vx = 0; this.vy = 0;
    this.hp = this.maxHp; this.vigor = this.maxVigor; this.foco = this.maxFoco;
    this.refill();
    this.defBuff = 0; this.dmgBuff = 0; this.drinkCd = 0; this.landT = 0;
    this.facing = 1; this.action = null; this.t = 0;
    this.combo = 0; this.comboTimer = 0;
    this.healLeft = 0; this.healRate = 0;
    this.invuln = 0; this.flash = 0; this.dead = false; this.deadT = 0;
    this.vigorDelay = 0; this.coyote = 0; this.dropThrough = 0;
    this.walkPhase = 0; this.sqx = 1; this.sqy = 1; this.rot = 0;
    this.lastDodge = -99; this.lastEcho = -99; this.perfectFlash = 0;
    this.empowered = 0; this.ashCharge = 0; this.oil = 0; this.itemCd = 0;
    this.cooldowns = {}; this.sw = null; this.ghosts = []; this.wallDir = 0; this.airJumpT = 0;
    this.an = { n: 'rise', f: 0 };
  }

  // Frascos preparados na pira: três tipos dividem os mesmos espaços
  refill() {
    const pr = this.prog.prep, max = this.maxPotions;
    let sum = POTION_IDS.reduce((s, k) => s + (pr[k] || 0), 0);
    if (sum < max) pr.cura += max - sum;
    while (sum > max) { const k = POTION_IDS.slice().reverse().find((q) => pr[q] > 0); pr[k]--; sum--; }
    this.flasks = { ...pr };
  }
  get potions() { return POTION_IDS.reduce((s, k) => s + this.flasks[k], 0); }

  // Rolar e deslizar: a colisão fica baixa e só volta ao normal onde couber
  setH(h) { this.y += this.h - h; this.h = h; }
  canStand() {
    const top = this.y + this.h - PLAYER.h, l = Math.floor(this.x / TILE), r = Math.floor((this.x + this.w - 0.01) / TILE);
    for (let ty = Math.floor(top / TILE); ty <= Math.floor((this.y + this.h - 1) / TILE); ty++) for (let tx = l; tx <= r; tx++) if (this.world.level.solid(tx, ty)) return false;
    return true;
  }
  isLow() { return this.action === 'dodge' || this.action === 'slide' || this.action === 'crawl'; }

  cx() { return this.x + this.w / 2; }
  cy() { return this.y + this.h / 2; }
  feet() { return this.y + this.h; }
  box() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  spend(cost) {
    if (this.vigor <= 0) return false;
    this.vigor = Math.max(0, this.vigor - cost);
    this.vigorDelay = 0.4;
    return true;
  }

  start(action) { this.action = action; this.t = 0; this.hitSet = new Set(); this.struck = false; }
  squash(x, y) { this.sqx = x; this.sqy = y; }

  activeArcanum() { return this.arcana[this.activeSlot]; }
  mastery(a) { return masteryLevel(this.prog.mastery[a] || 0); }

  isInvulnerable() {
    if (this.invuln > 0) return true;
    if (this.action === 'dodge') return this.t >= PLAYER.dodge.iframes[0] && this.t <= PLAYER.dodge.iframes[1];
    if (this.action === 'ability' || this.action === 'rest' || this.action === 'climb') return true;
    if (this.action === 'finisher') return this.t >= 0.25 && this.t <= 0.45; // só no golpe final
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
        w.slow = Math.max(w.slow || 0, 0.18);
        w.fx.burst(this.cx(), this.cy(), 8, '#f6f2ea', 60, 0.4, 0, 1);
        this.onPerfectDodge();
      }
      return 'dodged';
    }
    if (this.isInvulnerable()) return 'dodged';
    if (this.action === 'parry' && this.t <= PLAYER.parry.window && opts.parryable) {
      sfx.parry();
      this.foco = Math.min(this.maxFoco, this.foco + PLAYER.parry.foco);
      w.hitstop = 0.11; w.slow = 0.25;
      w.shake = Math.max(w.shake, 3);
      w.fx.ring(this.cx() + this.facing * 12, this.cy() - 4, '#fff3c4', 34);
      w.fx.spark(this.cx() + this.facing * 8, this.cy() - 2, this.facing, '#fff3c4', 22);
      w.flashScreen = 0.1;
      this.t = PLAYER.parry.dur - 0.08;
      w.addMastery(3, 'parry');
      return 'parried';
    }
    if (this.defBuff > 0) dmg = Math.round(dmg * POTIONS.defesa.mul);
    this.hp -= dmg;
    w.fx.number(this.cx(), this.y - 4, dmg, '#ff8a7a');
    w.fx.burst(this.cx(), this.cy(), 16, '#c03038', 110, 0.45);
    w.shake = Math.max(w.shake, 5);
    w.hitstop = Math.max(w.hitstop, 0.07);
    w.hurtFlash = 0.35;
    this.flash = 0.15;
    sfx.hurt();
    if (this.healLeft > 0 && dmg >= 150) { this.healLeft = 0; w.toast('Cura interrompida'); }
    if (this.hp <= 0) {
      this.hp = 0; this.dead = true; this.deadT = 0; this.action = 'dead'; this.t = 0;
      w.slow = 0.8;
      sfx.death();
      return 'hit';
    }
    const dir = opts.dir || (src && src.x !== undefined ? Math.sign(this.cx() - (src.cx ? src.cx() : src.x)) || -this.facing : -this.facing);
    this.vx = dir * 150 * (opts.knock || 1);
    this.vy = -110;
    this.facing = -dir;
    this.start('hurt');
    this.invuln = 0.5;
    return 'hit';
  }

  onPerfectDodge() {
    const w = this.world;
    w.addMastery(2, 'perfect');
    if (this.arcana.includes('louco') && this.mastery('louco') >= 2) { this.empowered = 2; w.toast('Risco Calculado'); }
    if (this.prog.equipped === 'ruptura') this.ashCharge = 3;
  }

  update(dt) {
    const w = this.world;
    this.t += dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.perfectFlash > 0) this.perfectFlash -= dt;
    for (const k of ['empowered', 'ashCharge', 'oil', 'defBuff', 'dmgBuff', 'drinkCd', 'landT', 'itemCd', 'airJumpT']) if (this[k] > 0) this[k] -= dt;
    if (this.dropThrough > 0) this.dropThrough = Math.max(0, this.dropThrough - dt);
    if (this.comboTimer > 0) this.comboTimer -= dt; else this.combo = 0;
    for (const k in this.cooldowns) this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);
    const e = 1 - Math.pow(0.00002, dt); this.sqx += (1 - this.sqx) * e; this.sqy += (1 - this.sqy) * e;
    for (const g of this.ghosts) g.t -= dt;
    this.ghosts = this.ghosts.filter((g) => g.t > 0);

    if (this.dead) {
      this.deadT += dt;
      this.vx *= 0.9;
      this.vy += GRAVITY * dt;
      moveBody(this, w.level, dt);
      this.animate(dt);
      return;
    }

    if (this.vigorDelay > 0) this.vigorDelay -= dt;
    else if (this.action !== 'dodge') this.vigor = Math.min(this.maxVigor, this.vigor + (this.action === 'parry' ? 25 : 70) * dt);
    if (!w.inCombat) this.foco = Math.min(this.maxFoco, this.foco + 2 * dt);
    if (this.healLeft > 0) {
      const a = Math.min(this.healLeft, this.healRate * dt);
      this.hp = Math.min(this.maxHp, this.hp + a); this.healLeft -= a;
      if (Math.random() < 0.4) w.fx.parts.push({ x: this.x - 4 + Math.random() * (this.w + 8), y: this.feet(), vx: 0, vy: -40, life: 0.7, max: 0.7, color: '#9fe0a8', grav: 0, size: 1, glow: 1 });
    }
    if (this.oil > 0 && Math.random() < 0.3) w.fx.parts.push({ x: this.cx() + this.facing * 12, y: this.y + 10 + Math.random() * 10, vx: 0, vy: -20, life: 0.3, max: 0.3, color: '#ffb070', grav: 0, size: 1, glow: 1 });

    const mx = (Input.down('right') ? 1 : 0) - (Input.down('left') ? 1 : 0);
    if (this.onGround) { this.coyote = 0.11; this.wallDir = 0; this.lastWall = null; } else this.coyote -= dt;

    if (!this.isLow() && this.h !== PLAYER.h) { if (this.canStand()) this.setH(PLAYER.h); else if (!this.dead) this.start('crawl'); }
    if (!this.action) this.freeControl(dt, mx);
    else this.updateAction(dt, mx);

    const wasAir = !this.onGround;
    if (this.action === 'climb') { this.animate(dt); return; }
    if (this.action !== 'ability') {
      // gravidade com ápice leve e queda firme
      let g = GRAVITY;
      if (!this.onGround) { if (Math.abs(this.vy) < 60 && Input.down('jump')) g *= 0.55; else if (this.vy > 0) g *= 1.25; }
      if (this.action === 'plunge') g *= 1.6;
      this.vy = Math.min(this.vy + g * dt, this.action === 'plunge' ? 760 : 600);
    }
    const vyBefore = this.vy, vxBefore = this.vx;
    this.stepUp(dt);
    moveBody(this, w.level, dt);
    if (this.hitWall && !this.onGround) this.tryLedge(Math.sign(vxBefore));
    if (this.justLanded && wasAir) this.onLand(vyBefore, mx);
    if (this.onGround && Math.abs(this.vx) > 10) {
      const before = Math.floor(this.walkPhase);
      this.walkPhase += dt * Math.abs(this.vx) * 0.085;
      if (!this.action && Math.floor(this.walkPhase) !== before && Math.floor(this.walkPhase) % 5 === 0) { sfx.step(); w.fx.dust(this.cx() - this.facing * 4, this.feet(), -this.facing, 2); }
    }
    // rastros de velocidade
    if ((this.action === 'dodge' || this.action === 'ability' || (this.action === 'light' && this.cur === 'D')) && w.time - (this.lastGhost || 0) > 0.035) { this.lastGhost = w.time; this.ghosts.push({ x: this.cx(), y: this.feet(), n: this.an.n, f: this.an.f, facing: this.facing, t: 0.22 }); }

    if (this.y > w.level.g.length * TILE + 40) { this.hp = 0; this.takeHit(1, null, {}); }
    this.animate(dt);
  }

  onLand(vy, mx) {
    const w = this.world;
    if (this.action === 'plunge') return this.plungeLand();
    if (vy < 160) return;
    this.landT = 0.14;
    const k = Math.min(1, vy / 600);
    this.squash(1 + 0.22 * k, 1 - 0.22 * k);
    w.fx.dust(this.cx(), this.feet(), 0, 3 + Math.round(k * 6));
    if (vy > 320) sfx.land();
    // queda alta correndo vira rolamento e mantém o embalo
    if (vy > 520 && mx && !this.action) { this.facing = mx; this.start('dodge'); this.setH(PLAYER.hLow); this.perfectThisDodge = false; this.freeRoll = true; w.shake = Math.max(w.shake, 2); }
  }

  // Degraus de um tile: sobe correndo, sem travar
  stepUp(dt) {
    if (!this.onGround || Math.abs(this.vx) < 60 || this.isLow()) return;
    const dir = Math.sign(this.vx), lv = this.world.level;
    const nx = dir > 0 ? this.x + this.w + this.vx * dt : this.x + this.vx * dt;
    const tx = Math.floor(nx / TILE), ty = Math.floor((this.feet() - 2) / TILE);
    if (!lv.solid(tx, ty) || lv.solid(tx, ty - 1) || lv.solid(tx, ty - 2) || lv.solid(tx, ty - 3)) return;
    const top = ty * TILE, hx = Math.floor(this.cx() / TILE);
    if (lv.solid(hx, ty - 2) || lv.solid(hx, ty - 3)) return;
    this.y = top - this.h - 0.5; this.vy = -40; this.squash(0.92, 1.1);
    this.world.fx.dust(this.cx() + dir * 6, top, -dir, 3);
  }

  // Agarra a beirada que está ao alcance das mãos e sobe
  tryLedge(dir) {
    if (!dir || this.action === 'hurt' || this.vy < -120 || this.h !== PLAYER.h) return;
    if (this.action && this.action !== 'light') return;
    if (!((dir > 0 && Input.down('right')) || (dir < 0 && Input.down('left')))) return;
    const lv = this.world.level, tx = Math.floor((dir > 0 ? this.x + this.w + 2 : this.x - 2) / TILE);
    const hand = this.y - 4;
    const ty = Math.floor((hand + 6) / TILE);
    for (const yy of [ty, ty + 1]) {
      if (!lv.solid(tx, yy) || lv.solid(tx, yy - 1) || lv.solid(tx, yy - 2)) continue;
      const top = yy * TILE;
      if (top < hand - 6 || top > this.y + 16) continue;
      const hx = Math.floor(this.cx() / TILE);
      if (lv.solid(hx, yy - 1) || lv.solid(hx, yy - 2)) continue;
      this.start('climb'); this.facing = dir; this.vx = this.vy = 0;
      this.climb = { x0: this.x, y0: this.y, x1: dir > 0 ? tx * TILE + 2 : (tx + 1) * TILE - this.w - 2, y1: top - this.h };
      sfx.step();
      return;
    }
  }

  freeControl(dt, mx) {
    const w = this.world;
    const target = mx * PLAYER.run;
    const turning = mx && Math.sign(this.vx) === -mx;
    const acc = this.onGround ? (mx ? (turning ? 2600 : 1500) : 1900) : (mx ? (turning ? 1700 : 1050) : 420);
    if (this.vx < target) this.vx = Math.min(target, this.vx + acc * dt);
    else if (this.vx > target) this.vx = Math.max(target, this.vx - acc * dt);
    if (mx && mx !== this.facing) { this.facing = mx; if (this.onGround && Math.abs(this.vx) > 60) w.fx.dust(this.cx(), this.feet(), mx, 3); }

    if (this.tryJump(mx)) return;
    if (!Input.down('jump') && this.vy < -150 && this.airJumpT <= 0) this.vy = -150;

    // deslize na parede: segura a queda e permite saltar dela
    this.wallDir = 0;
    if (!this.onGround && mx && this.vy > 0) {
      const tx = Math.floor((mx > 0 ? this.x + this.w + 1 : this.x - 1) / TILE);
      if (w.level.solid(tx, Math.floor((this.y + 6) / TILE)) && w.level.solid(tx, Math.floor((this.feet() - 6) / TILE))) {
        this.wallDir = mx; this.vy = Math.min(this.vy, 70);
        if (Math.random() < 0.4) w.fx.dust(this.cx() + mx * 6, this.feet() - 4, -mx, 1);
      }
    }

    if (Input.pressed('dodge') && this.vigor > 0) { Input.consume('dodge'); return this.doDodge(mx); }
    if (Input.down('down') && this.onGround && !this.onOneWay() && Math.abs(this.vx) > 70) return this.doSlide();
    if (Input.pressed('parry') && this.vigor > 0) { Input.consume('parry'); this.spend(PLAYER.parry.cost); this.start('parry'); return; }
    if (Input.pressed('light') && this.vigor > 0) { Input.consume('light'); return this.doLight(mx); }
    if (Input.pressed('heavy') && this.vigor > 0) {
      Input.consume('heavy');
      if (!this.onGround) return this.doPlunge();
      this.start('heavyCharge'); sfx.charge(); return;
    }
    this.common();
  }

  // Ações que também valem no meio de outras
  common() {
    const w = this.world;
    if (Input.pressed('potion')) { Input.consume('potion'); return this.tryDrink(); }
    if (Input.pressed('nextpotion')) { Input.consume('nextpotion'); return this.nextPotion(); }
    if (Input.pressed('nextweapon')) { Input.consume('nextweapon'); return this.nextWeapon(1); }
    if (Input.pressed('ability')) { Input.consume('ability'); return this.tryAbility(); }
    if (Input.pressed('swap')) { Input.consume('swap'); this.activeSlot = 1 - this.activeSlot; sfx.ui(); return; }
    if (Input.pressed('item')) { Input.consume('item'); return this.useItem(); }
    if (Input.pressed('cycle')) { Input.consume('cycle'); return this.cycleItem(); }
    if (Input.pressed('interact')) { Input.consume('interact'); w.interact(); }
  }

  tryJump(mx) {
    const w = this.world;
    if (!Input.pressed('jump')) return false;
    if (Input.down('down') && this.onGround && this.onOneWay()) { Input.consume('jump'); this.dropThrough = 0.25; this.y += 2; return true; }
    if (this.coyote > 0 && (this.h === PLAYER.h || this.canStand())) {
      Input.consume('jump');
      if (this.h !== PLAYER.h) this.setH(PLAYER.h);
      this.action = null;
      this.vy = -PLAYER.jump; this.coyote = 0; this.onGround = false; this.squash(0.82, 1.2); sfx.jump();
      w.fx.dust(this.cx(), this.feet(), 0, 4);
      return true;
    }
    // cada parede só serve uma vez até tocar o chão: dá para ziguezaguear, não para escalar uma parede só
    const wx = Math.round((this.wallDir > 0 ? this.x + this.w : this.x) / TILE);
    if (this.wallDir && !this.onGround && this.lastWall !== wx) {
      this.lastWall = wx;
      Input.consume('jump');
      const d = this.wallDir; this.wallDir = 0; this.facing = -d;
      // empurra para longe: serve para trocar de parede, não para escalar uma só
      this.vx = -d * 190; this.vy = -PLAYER.jump * 0.86; this.airJumpT = 0.16; this.squash(0.85, 1.18);
      w.fx.dust(this.cx() + d * 6, this.feet() - 6, -d, 6); sfx.jump();
      return true;
    }
    return false;
  }

  tryAbility() {
    const w = this.world;
    const a = this.activeArcanum();
    if (!a) return w.toast('Nenhum Arcano neste espaço');
    const ab = ARCANA[a].abilities[0];
    if (this.mastery(a) < ab.mastery) return w.toast(`${ab.name}: requer Maestria I`);
    if (this.cooldowns[a] > 0) return w.toast(`${ab.name}: recarga ${this.cooldowns[a].toFixed(1)} s`);
    if (this.foco < ab.foco) return w.toast('Foco insuficiente');
    this.foco -= ab.foco;
    this.cooldowns[a] = ab.cd * (this.mastery(a) >= 4 ? 0.95 : 1);
    this.start('ability'); sfx.dodge(); sfx.fire();
    w.fx.ring(this.cx(), this.cy(), '#d9b58a', 30);
  }

  tryDrink() {
    const w = this.world, id = this.prog.potion;
    if (this.drinkCd > 0) return;
    if (this.flasks[id] <= 0) return w.toast(this.potions > 0 ? `Sem ${POTIONS[id].name}: troque o tipo` : 'Sem frascos: descanse numa pira');
    this.start('heal'); this.drinking = id; this.healUsed = false; this.healStarted = false;
  }
  nextPotion() {
    const i = POTION_IDS.indexOf(this.prog.potion);
    this.prog.potion = POTION_IDS[(i + 1) % POTION_IDS.length];
    sfx.ui();
    this.world.toast(`${POTIONS[this.prog.potion].name} (${this.flasks[this.prog.potion]})`, 1.4);
  }
  nextWeapon(d) {
    const ids = Object.keys(WEAPONS).filter((k) => this.prog.weapons[k] !== undefined);
    if (!ids.length) return this.world.toast('Você ainda luta com os punhos', 1.6);
    const i = ids.indexOf(this.prog.equipped);
    this.equip(ids[(i + d + ids.length) % ids.length]);
  }
  equip(id) {
    this.prog.equipped = id; this.combo = 0;
    sfx.chest();
    this.world.toast(WEAPONS[id].name, 1.4);
    this.world.fx.ring(this.cx() + this.facing * 8, this.cy(), '#e8dcc8', 18);
  }

  cycleItem() {
    const ids = Object.keys(ITEMS);
    const i = ids.indexOf(this.prog.quick);
    this.prog.quick = ids[(i + 1) % ids.length];
    sfx.ui();
    this.world.toast(`Item rápido: ${ITEMS[this.prog.quick].name} (${this.prog.items[this.prog.quick] || 0})`);
  }

  useItem() {
    const w = this.world, id = this.prog.quick;
    const n = this.prog.items[id] || 0;
    if (n <= 0) return w.toast(`Sem ${ITEMS[id].name}`);
    if (id === 'bomba') {
      if (this.itemCd > 0) return w.toast(`Bomba: recarga ${this.itemCd.toFixed(0)} s`);
      this.prog.items.bomba--; this.itemCd = 12;
      this.start('throw');
    } else if (id === 'oleo') {
      this.prog.items.oleo--; this.oil = 45; sfx.fire(); w.toast('Óleo de Brasa: +8% de fogo por 45 s');
    } else if (id === 'selo') {
      if (w.arenaLocked) return w.toast('O selo não funciona na arena');
      this.prog.items.selo--; w.returnToCheckpoint();
    }
  }

  onOneWay() {
    const ty = Math.floor((this.y + this.h + 1) / TILE);
    const l = Math.floor(this.x / TILE), r = Math.floor((this.x + this.w - 0.01) / TILE);
    let any = false;
    for (let tx = l; tx <= r; tx++) { if (this.world.level.solid(tx, ty)) return false; if (this.world.level.oneway(tx, ty)) any = true; }
    return any;
  }

  doDodge(mx) {
    const w = this.world;
    const now = w.time;
    let cost = PLAYER.dodge.cost;
    if (this.relics.includes('cinza') && w.inCombat && now - this.lastDodge > 4) cost = Math.round(cost * 0.5);
    this.lastDodge = now;
    this.spend(cost);
    if (mx) this.facing = mx;
    this.start('dodge');
    this.setH(PLAYER.hLow);
    this.perfectThisDodge = false; this.freeRoll = false;
    this.vx = this.facing * PLAYER.dodge.speed;
    if (!this.onGround) this.vy = Math.min(this.vy, 0);
    this.squash(1.15, 0.88);
    sfx.dodge();
    w.fx.dust(this.cx(), this.feet(), -this.facing, 6);
    // Caminho Improvável: a esquiva deixa um eco que distrai inimigos
    if (this.arcana.includes('louco') && this.mastery('louco') >= 3 && now - this.lastEcho >= 4) {
      this.lastEcho = now;
      w.spawnEcho(this.cx(), this.y + this.h, this.facing);
    }
  }
  doSlide() {
    this.start('slide'); this.setH(PLAYER.hLow);
    this.slideV = Math.max(Math.abs(this.vx), PLAYER.run) * 1.35;
    sfx.dodge(); this.world.fx.dust(this.cx(), this.feet(), -this.facing, 8);
  }
  doPlunge() { this.spend(PLAYER.heavy.cost); this.start('plunge'); this.vy = -120; this.vx *= 0.3; sfx.charge(); }
  plungeLand() {
    const w = this.world, W = this.weapon();
    this.start('plungeEnd'); this.vx = 0; this.squash(1.3, 0.72);
    w.shake = Math.max(w.shake, 6); w.hitstop = 0.06; sfx.heavy(); sfx.explode();
    w.fx.shockRing(this.cx(), this.feet()); w.fx.dust(this.cx(), this.feet(), 0, 18);
    this.hitBox({ x: this.cx() - 38, y: this.feet() - 26, w: 76, h: 28 }, 'heavy', Math.round(W.heavy[0] * 0.8), 40);
  }

  // Vira para o inimigo mais próximo à frente: o golpe não passa em branco por um passo
  aim(mx) {
    if (mx) { this.facing = mx; return; }
    let best = null, bd = 64;
    for (const e of this.world.targets()) { const d = Math.abs(e.cx() - this.cx()); if (d < bd && Math.abs(e.cy() - this.cy()) < 40) { bd = d; best = e; } }
    if (best && Math.sign(best.cx() - this.cx()) === -this.facing && bd < 26) this.facing = -this.facing;
  }
  doLight(mx = 0, kind) {
    const W = this.weapon(), C = this.combos();
    this.aim(mx);
    this.spend(Math.max(3, PLAYER.light.cost + W.cost));
    this.combo = this.combo % C.length;
    const key = kind || C[this.combo];
    this.start('light');
    this.cur = key; this.comboIndex = Math.min(this.combo, W.combo.length - 1);
    this.combo++;
    this.comboTimer = 0.55;
    const g = G[key];
    this.swoosh(key, Math.max(0, g.hit[0] - 0.02) / W.speed, W.reach);
    if (this.onGround) { if (this.reachable()) this.vx = this.facing * g.adv; } else { this.vx *= 0.8; this.vy = Math.min(this.vy, 30); }
    if (key === 'C' || key === 'H' || key === 'P') sfx.heavy(); else sfx.swing();
    this.squash(1.06, 0.96);
  }
  swoosh(key, delay, reach) { this.sw = { key, t: this.world.time + delay, facing: this.facing, reach, weapon: this.prog.equipped }; }
  reachable() {
    // não escorrega para fora da beirada atacando
    const lv = this.world.level, fx = this.facing > 0 ? this.x + this.w + 10 : this.x - 10;
    const ty = Math.floor((this.feet() + 3) / TILE), tx = Math.floor(fx / TILE);
    return lv.solid(tx, ty) || lv.oneway(tx, ty);
  }

  attackBox(kind) {
    const f = this.facing, W = this.weapon();
    if (kind === 'ability') return { x: this.x - 4, y: this.y, w: this.w + 8, h: this.h };
    const big = kind === 'heavy' || this.cur === 'C' || this.cur === 'P' || this.cur === 'H';
    const reach = W.reach + (kind === 'heavy' ? 8 : big ? 5 : 0);
    const back = W.wide || big ? 8 : 4;
    const top = W.thrust && !big ? this.y + 5 : this.y - (big ? 12 : 4), hh = W.thrust && !big ? this.h - 8 : this.h + (big ? 10 : 4);
    return { x: f > 0 ? this.x + this.w - 2 - back : this.x - reach + 2, y: top, w: reach + back, h: hh };
  }

  damageMul() {
    let m = weaponDamageMul(this.prog, this.prog.equipped);
    if (this.oil > 0) m *= 1.08;
    if (this.dmgBuff > 0) m *= POTIONS.dano.mul;
    if (this.empowered > 0) m *= 1.3;
    return m;
  }

  strike(kind, dmg, posture) { return this.hitBox(this.attackBox(kind), kind, dmg, posture); }
  hitBox(box, kind, dmg, posture) {
    const w = this.world;
    let hitAny = false;
    const mul = kind === 'ability' ? 1 : this.damageMul();
    for (const e of w.targets()) {
      if (!e.alive() || this.hitSet.has(e)) continue;
      if (overlap(box, e.hurtbox())) {
        this.hitSet.add(e);
        // golpe por trás ou em cima de quem está errando: crítico curto
        const crit = e.facing === this.facing && !e.isBoss && kind !== 'ability';
        const r = e.takeDamage(Math.round(dmg * mul * (crit ? 1.25 : 1)), posture, this.facing, { kind, world: w, oil: this.oil > 0, crit });
        hitAny = true;
        const ix = Math.max(box.x, Math.min(box.x + box.w, e.cx())), iy = Math.max(e.y + 4, Math.min(e.y + e.h - 4, this.cy() - 4));
        if (r !== 'guarded') {
          w.fx.slashHit(ix, iy, this.facing, kind === 'heavy' || this.cur === 'C' || this.cur === 'P' ? 1.6 : 1, this.prog.equipped === 'ruptura' ? '#ff9a5a' : '#fff6e0');
          this.foco = Math.min(this.maxFoco, this.foco + 1);
          if (!e.isBoss && !e.isElite && e.def.speed > 0 && e.state !== 'broken' && (kind === 'heavy' || !(e.armored && e.armored()))) { e.vx = this.facing * (kind === 'heavy' ? 170 : 85); if (kind === 'heavy') e.vy = -120; }
        }
        if (kind === 'ability') w.addMastery(3, 'ability');
        if (this.ashCharge > 0 && kind !== 'ability') {
          this.ashCharge = 0;
          w.fx.add(new AshPatch(e.cx(), e.y + e.h, 0.8, 26, 160, 'player'));
        }
      }
    }
    if (hitAny && this.empowered > 0 && kind !== 'ability') this.empowered = 0;
    if (kind === 'heavy' || kind === 'light') w.breakTiles(box, kind);
    if (hitAny) {
      const heavy = kind === 'heavy' || this.cur === 'C' || this.cur === 'P' || this.cur === 'H';
      w.hitstop = Math.max(w.hitstop, heavy ? 0.085 : 0.045);
      w.shake = Math.max(w.shake, heavy ? 3.5 : 1.6);
      if (!this.onGround && this.action === 'light') this.vy = Math.min(this.vy, -70); // fica no ar batendo
    }
    return hitAny;
  }

  // Cancelamentos comuns: esquiva, salto e aparo interrompem golpes depois do acerto
  cancels(mx, from) {
    if (this.t < from) return false;
    if (Input.pressed('dodge') && this.vigor > 0) { Input.consume('dodge'); this.action = null; this.doDodge(mx); return true; }
    if (Input.pressed('jump', 0.18) && this.coyote > 0) { this.action = null; if (this.tryJump(mx)) return true; }
    if (Input.pressed('parry') && this.vigor > 0) { Input.consume('parry'); this.spend(PLAYER.parry.cost); this.start('parry'); return true; }
    return false;
  }

  updateAction(dt, mx) {
    const w = this.world;
    const P = PLAYER, W = this.weapon();
    switch (this.action) {
      case 'light': {
        const g = G[this.cur], lt = this.t * W.speed;
        this.vx *= this.onGround ? Math.pow(0.0015, dt) : Math.pow(0.3, dt);
        if (lt >= g.hit[0] && lt <= g.hit[1]) this.strike('light', Math.round(W.combo[this.comboIndex] * (this.cur === 'D' ? 1.15 : 1)), W.posture[this.comboIndex]);
        if (this.cancels(mx, g.hit[1] / W.speed)) return;
        if (lt > g.link && Input.pressed('light', 0.22) && this.vigor > 0) { Input.consume('light'); this.doLight(mx); return; }
        if (lt > g.link && Input.pressed('heavy', 0.2) && this.vigor > 0 && this.onGround) { Input.consume('heavy'); this.start('heavyCharge'); this.t = 0.12; sfx.charge(); return; }
        if (lt > g.link && mx && this.onGround) { this.action = null; break; }
        if (lt >= g.end) this.action = null;
        break;
      }
      case 'heavyCharge': {
        this.vx *= Math.pow(0.001, dt);
        if (mx) this.facing = mx;
        const released = !Input.down('heavy');
        const maxC = P.heavy.maxCharge / W.speed;
        if (this.t > 0.2 && Math.random() < 0.5) w.fx.charge(this.cx() - this.facing * 8, this.y - 2, this.t >= maxC - 0.1 ? '#ffd27a' : '#c8b8a0');
        if ((released && this.t >= P.heavy.minCharge * 0.75 / W.speed) || this.t >= maxC) {
          this.charged = this.t >= maxC - 0.01;
          this.spend(this.charged ? P.heavy.costCharged : P.heavy.cost);
          this.start('heavy'); this.cur = 'P';
          this.aim(mx);
          this.swoosh('P', 0.02, W.reach + (this.charged ? 14 : 6));
          this.vx = this.reachable() ? this.facing * (this.charged ? 260 : 190) : 0;
          sfx.heavy();
        }
        if (Input.pressed('dodge') && this.vigor > 0) { Input.consume('dodge'); this.action = null; this.doDodge(mx); }
        break;
      }
      case 'heavy': {
        this.vx *= Math.pow(0.002, dt);
        if (this.t >= 0.03 && this.t <= 0.14) {
          const hit = this.strike('heavy', this.charged ? W.heavy[1] : W.heavy[0], (this.charged ? 1.6 : 1) * W.posture[W.posture.length - 1] * 1.7);
          if (hit && !this.struck) { this.struck = true; w.shake = Math.max(w.shake, 5); }
        }
        if (this.cancels(mx, 0.26)) return;
        if (this.t >= 0.46 / Math.max(0.8, W.speed)) this.action = null;
        break;
      }
      case 'plunge':
        this.vx *= Math.pow(0.05, dt);
        if (this.t > 0.12) this.hitBox({ x: this.x - 6, y: this.y + 8, w: this.w + 12, h: this.h }, 'light', W.combo[0], W.posture[0]);
        if (Math.random() < 0.7) w.fx.parts.push({ x: this.cx() + (Math.random() - 0.5) * 8, y: this.y, vx: 0, vy: -60, life: 0.25, max: 0.25, color: '#e8dcc8', grav: 0, size: 1 });
        break;
      case 'plungeEnd':
        this.vx = 0;
        if (this.cancels(mx, 0.2)) return;
        if (this.t > 0.34) this.action = null;
        break;
      case 'dodge': {
        const k = 1 - this.t / P.dodge.dur;
        this.vx = this.facing * P.dodge.speed * (0.5 + 0.5 * k);
        if (Math.random() < 0.6 && this.onGround) w.fx.dust(this.cx(), this.feet(), -this.facing, 1);
        // golpe no fim do rolamento vira investida
        if (this.t > P.dodge.dur * 0.55 && Input.pressed('light') && this.vigor > 0 && this.canStand()) { Input.consume('light'); this.setH(P.h); this.doLight(mx, this.prog.equipped ? 'D' : 'H'); this.vx = this.facing * G.D.adv; return; }
        if (this.t > P.dodge.dur * 0.5 && this.canStand() && Input.pressed('jump') && this.coyote > 0) { if (this.tryJump(mx)) return; }
        if (this.t >= P.dodge.dur) {
          if (Input.down('down') && this.onGround && mx) { this.doSlide(); return; }
          this.action = null; this.t = 0.06;
        }
        break;
      }
      case 'slide': {
        this.slideV = Math.max(0, this.slideV - 190 * dt);
        this.vx = this.facing * this.slideV;
        if (Math.random() < 0.8 && this.onGround) w.fx.dust(this.cx() - this.facing * 6, this.feet(), -this.facing, 1);
        const free = this.canStand();
        if (free && Input.pressed('jump')) { if (this.tryJump(mx)) { this.vx = this.facing * Math.max(this.slideV, P.run) * 1.05; return; } }
        if (free && Input.pressed('light') && this.vigor > 0) { Input.consume('light'); this.setH(P.h); this.doLight(mx, this.prog.equipped ? 'D' : 'H'); this.vx = this.facing * 260; return; }
        if (Input.pressed('dodge') && this.vigor > 0) { Input.consume('dodge'); this.doDodge(mx); return; }
        if (!free) { this.slideV = Math.max(this.slideV, 110); if (this.hitWall) this.facing = -this.facing; break; }
        if (!this.onGround && this.coyote < -0.05) { this.action = null; break; }
        if ((!Input.down('down') && this.t > 0.18) || this.slideV < 70 || (mx && mx !== this.facing)) { this.action = null; this.slideOut = 0.14; }
        break;
      }
      case 'crawl': {
        const dir = mx || this.facing; this.facing = dir;
        this.vx = dir * 90;
        if (this.canStand()) { this.action = null; this.setH(PLAYER.h); }
        break;
      }
      case 'climb': {
        const c = this.climb, k = Math.min(1, this.t / 0.3);
        // primeiro sobe, depois entra
        const ky = Math.min(1, k * 1.5), kx = Math.max(0, (k - 0.45) / 0.55);
        this.y = c.y0 + (c.y1 - c.y0) * (1 - (1 - ky) * (1 - ky)); this.x = c.x0 + (c.x1 - c.x0) * kx;
        if (k >= 1) { this.x = c.x1; this.y = c.y1; this.action = null; this.onGround = true; this.vy = 0; this.vx = this.facing * 60; this.coyote = 0.1; w.fx.dust(this.cx(), this.feet(), -this.facing, 3); }
        break;
      }
      case 'parry': {
        this.vx *= Math.pow(0.0005, dt);
        if (this.t >= P.parry.dur) this.action = null;
        else if (this.t > P.parry.window) { if (Input.pressed('light') && this.vigor > 0) { Input.consume('light'); this.doLight(mx); } else if (Input.pressed('dodge') && this.vigor > 0) { Input.consume('dodge'); this.doDodge(mx); } }
        break;
      }
      case 'hurt': {
        this.vx *= Math.pow(0.02, dt);
        if (this.t > 0.16 && Input.pressed('dodge') && this.vigor > 0) { Input.consume('dodge'); this.doDodge(mx); return; }
        if (this.t >= 0.26 && this.onGround) this.action = null;
        if (this.t >= 0.5) this.action = null;
        break;
      }
      case 'heal': {
        this.vx = mx * 45;
        if (mx) this.facing = mx;
        if (!this.healUsed && this.t >= 0.05) {
          // o frasco é consumido ao iniciar a animação (Vol. V)
          this.healUsed = true; this.flasks[this.drinking]--;
        }
        if (!this.healStarted && this.t >= 0.4) {
          this.healStarted = true;
          this.drinkCd = P.drink.cd;
          if (this.drinking === 'cura') { this.healLeft = this.maxHp * P.heal.pct; this.healRate = this.healLeft / P.heal.time; } else if (this.drinking === 'defesa') this.defBuff = POTIONS.defesa.dur;
          else this.dmgBuff = POTIONS.dano.dur;
          w.fx.ring(this.cx(), this.cy(), POTIONS[this.drinking].color, 30);
          w.fx.burst(this.cx(), this.cy(), 18, POTIONS[this.drinking].color, 60, 0.7, -30, 1);
          sfx.heal();
        }
        if (this.t > 0.55 && this.cancels(mx, 0.55)) { this.healStarted = false; return; }
        if (this.t >= P.drink.anim) { this.action = null; this.healStarted = false; }
        break;
      }
      case 'throw': {
        this.vx *= Math.pow(0.01, dt);
        if (!this.struck && this.t >= 0.16) {
          this.struck = true;
          w.fx.add(new Projectile({
            owner: 'player', x: this.cx() + this.facing * 8, y: this.y + 2, vx: this.facing * 190, vy: -170, grav: 600, r: 3, dmg: 0, life: 2, icon: 'i_bomba',
            color: '#3a2f2a', glow: '#e17a3d',
            onLand: (world, x, y) => world.explode(x, y, 34, 220, 'player'),
            onHitEnemy: (world, x, y) => world.explode(x, y, 34, 220, 'player'),
          }));
          sfx.swing();
        }
        if (this.t >= 0.36) this.action = null;
        break;
      }
      case 'ability': {
        this.vx = this.facing * 420; this.vy = 0;
        this.strike('ability', ARCANA.louco.abilities[0].dmg, 25);
        for (let i = 0; i < 2; i++) w.fx.parts.push({ x: this.cx(), y: this.y + 4 + Math.random() * 22, vx: -this.facing * 40, vy: -15, life: 0.5, max: 0.5, color: Math.random() < 0.5 ? '#d9b58a' : '#8a827b', grav: 0, size: 2, glow: 1 });
        if (this.t >= 0.24) { this.action = null; this.vx = this.facing * 150; }
        break;
      }
      case 'gather': {
        this.vx = 0;
        if (this.t >= 0.5) { this.action = null; if (this.gatherTarget) w.collectHerb(this.gatherTarget); this.gatherTarget = null; }
        break;
      }
      case 'finisher': {
        this.vx = 0;
        if (!this.struck && this.t >= 0.32 && this.finTarget) {
          this.struck = true;
          const e = this.finTarget;
          e.takeDamage(Math.round((e.isBoss ? PLAYER.finisher.bossDmg : PLAYER.finisher.dmg) * this.damageMul()), 0, this.facing, { kind: 'finisher', world: w });
          e.endBreak && e.endBreak();
          w.hitstop = 0.18; w.slow = 0.3; w.shake = 8; w.flashScreen = 0.12;
          w.fx.slashHit(e.cx(), e.cy(), this.facing, 2.6, '#ff5a4a');
          w.fx.burst(e.cx(), e.cy(), 40, '#c03038', 170, 0.7);
          sfx.explode();
        }
        if (this.t >= 0.62) { this.action = null; this.finTarget = null; }
        break;
      }
      case 'rest': {
        this.vx = 0;
        if (this.t >= 1.1) this.action = null;
        break;
      }
      default: this.action = null;
    }
  }

  // ---------- animação ----------
  animate(dt) {
    const w = this.world, a = this.action, t = this.t, A = this.an, sp = this.weapon().speed;
    let n = 'idle', f = null, fps = 8, o = {};
    const spd = Math.abs(this.vx);
    if (this.slideOut > 0) this.slideOut -= dt;
    if (this.dead) { n = 'death'; f = Math.min(FRAMES('death') - 1, this.deadT * 16); o.hide = 1; } else if (!a) {
      if (!this.onGround) {
        if (this.wallDir) { n = 'climb'; f = 2; } else if (this.vy < -60) { n = 'jump'; f = this.vy < -200 ? 2 : 4; } else { n = this.vy > 260 ? 'cai' : 'air'; fps = 12; }
      } else if (this.landT > 0 && spd < 60) { n = 'land'; f = (0.14 - this.landT) * 28; } else if (this.slideOut > 0) { n = 'slide1'; f = 2 + (0.14 - this.slideOut) * 18; } else if (spd > 100) { n = 'run'; f = this.walkPhase; } else if (spd > 14) { n = 'jog'; f = this.walkPhase * 1.1; } else { n = 'idle'; fps = w.inCombat ? 11 : 7; }
    } else switch (a) {
      case 'light': { const g = G[this.cur]; n = g.an; f = at(g.tl, t * sp); break; }
      case 'heavyCharge': n = 'pesado'; f = t < 0.08 ? 1 : 2; break;
      case 'heavy': n = 'pesado'; f = at(HEAVY_TL, t); break;
      case 'plunge': n = 'air'; fps = 10; break;
      case 'plungeEnd': n = 'land'; f = 1 + t * 10; break;
      case 'dodge': n = 'roll'; f = this.freeRoll ? 3 + t / PLAYER.dodge.dur * 6 : 1 + t / PLAYER.dodge.dur * 7.5; break;
      case 'slide': n = t < 0.12 ? 'slide0' : 'slide'; f = t < 0.12 ? t / 0.12 * 4 : null; fps = 8; break;
      case 'crawl': n = 'slide'; fps = 8; break;
      case 'climb': n = 'climb'; f = Math.min(FRAMES('climb') - 1, t / 0.3 * FRAMES('climb')); break;
      case 'parry': n = 'block'; f = Math.min(3, t * 26); break;
      case 'hurt': n = 'hurt'; f = Math.min(FRAMES('hurt') - 1, t * 20); break;
      case 'heal': n = 'drink'; f = t / PLAYER.drink.anim * FRAMES('drink'); o.hide = 1; o.item = t > 0.1 && t < 0.75; break;
      case 'throw': n = 'throw'; f = 1 + t / 0.36 * 8; o.hide = 1; break;
      case 'ability': n = 'dash'; f = 3 + t * 6; break;
      case 'gather': case 'rest': n = 'kneel'; f = Math.min(4, t * 10); o.hide = 1; break;
      case 'finisher': n = t < 0.3 ? 'pesado' : 'atkC'; f = t < 0.3 ? Math.min(2, t * 14) : Math.min(7, 2 + (t - 0.3) * 16); break;
      default: n = 'idle';
    }
    if (n !== A.n) { A.n = n; A.f = 0; }
    A.f = f === null ? A.f + dt * fps : f;
    if (f === null) { const N = FRAMES(n); if (A.f >= N) A.f -= N; }
    A.f = Math.max(0, Math.min(A.f, 999));
    A.hide = o.hide; A.item = o.item;
    // inclina um pouco na direção do movimento
    const lean = !a && this.onGround ? Math.max(-0.06, Math.min(0.06, (this.vx - (this.lastVx || 0)) * 0.004)) : 0;
    this.rot = (this.rot || 0) + (lean - (this.rot || 0)) * Math.min(1, dt * 14);
    this.lastVx = this.vx;
  }

  startFinisher(e) {
    this.spend(PLAYER.finisher.cost);
    this.start('finisher');
    this.finTarget = e;
    this.facing = Math.sign(e.cx() - this.cx()) || this.facing;
    const nx = e.cx() - this.facing * (e.w / 2 + 14) - this.w / 2;
    const lvl = this.world.level;
    const tx = Math.floor((nx + (this.facing > 0 ? 0 : this.w)) / TILE);
    if (!lvl.solid(tx, Math.floor((this.y + 4) / TILE)) && !lvl.solid(tx, Math.floor((this.y + this.h - 2) / TILE))) this.x = nx;
  }

  startGather(it) {
    this.start('gather');
    this.gatherTarget = it;
  }
}
const HEAVY_TL = [[0, 3], [0.04, 4], [0.09, 5], [0.17, 6], [0.25, 7], [0.33, 8]];
