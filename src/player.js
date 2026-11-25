import { Input } from './input.js';
import { sfx } from './audio.js';
import { moveBody, overlap, GRAVITY, TILE } from './physics.js';
import { PLAYER, POTIONS, POTION_IDS, ARCANA, WEAPONS, ITEMS } from './data.js';
import { Projectile, AshPatch } from './fx.js';
import { masteryLevel, weaponDamageMul } from './state.js';

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
  weapon() { return WEAPONS[this.prog.equipped] || WEAPONS.fio; }

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
    this.running = false; this.walkPhase = 0;
    this.lastDodge = -99; this.lastEcho = -99; this.perfectFlash = 0;
    this.empowered = 0; this.ashCharge = 0; this.oil = 0; this.itemCd = 0;
    this.cooldowns = {};
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

  // Deslize: a colisão fica baixa e só volta ao normal onde couber
  setH(h) { this.y += this.h - h; this.h = h; }
  canStand() {
    const top = this.y + this.h - PLAYER.h, l = Math.floor(this.x / TILE), r = Math.floor((this.x + this.w - 0.01) / TILE);
    for (let ty = Math.floor(top / TILE); ty <= Math.floor((this.y + this.h - 1) / TILE); ty++) for (let tx = l; tx <= r; tx++) if (this.world.level.solid(tx, ty)) return false;
    return true;
  }

  cx() { return this.x + this.w / 2; }
  cy() { return this.y + this.h / 2; }
  box() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  spend(cost) {
    if (this.vigor <= 0) return false;
    this.vigor = Math.max(0, this.vigor - cost);
    this.vigorDelay = 0.6;
    return true;
  }

  start(action) { this.action = action; this.t = 0; this.hitSet = new Set(); this.struck = false; }

  activeArcanum() { return this.arcana[this.activeSlot]; }
  mastery(a) { return masteryLevel(this.prog.mastery[a] || 0); }

  isInvulnerable() {
    if (this.invuln > 0) return true;
    if (this.action === 'dodge') return this.t >= PLAYER.dodge.iframes[0] && this.t <= PLAYER.dodge.iframes[1];
    if (this.action === 'ability' || this.action === 'rest') return true;
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
        w.fx.burst(this.cx(), this.cy(), 8, '#f6f2ea', 60, 0.4, 0, 1);
        this.onPerfectDodge();
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
      this.t = PLAYER.parry.dur - 0.12;
      w.addMastery(3, 'parry');
      return 'parried';
    }
    if (this.defBuff > 0) dmg = Math.round(dmg * POTIONS.defesa.mul);
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
    if (this.empowered > 0) this.empowered -= dt;
    if (this.ashCharge > 0) this.ashCharge -= dt;
    if (this.oil > 0) this.oil -= dt;
    if (this.defBuff > 0) this.defBuff -= dt;
    if (this.dmgBuff > 0) this.dmgBuff -= dt;
    if (this.drinkCd > 0) this.drinkCd -= dt;
    if (this.landT > 0) this.landT -= dt;
    if (this.itemCd > 0) this.itemCd -= dt;
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

    if (this.vigorDelay > 0) this.vigorDelay -= dt;
    else if (this.action !== 'dodge') this.vigor = Math.min(this.maxVigor, this.vigor + (this.action === 'parry' ? 20 : 48) * dt);
    if (!w.inCombat) this.foco = Math.min(this.maxFoco, this.foco + 2 * dt);
    if (this.healLeft > 0) {
      const a = Math.min(this.healLeft, this.healRate * dt);
      this.hp = Math.min(this.maxHp, this.hp + a); this.healLeft -= a;
      if (Math.random() < 0.3) w.fx.parts.push({ x: this.x + Math.random() * this.w, y: this.y + this.h, vx: 0, vy: -30, life: 0.6, max: 0.6, color: '#9fe0a8', grav: 0, size: 1 });
    }
    if (this.oil > 0 && Math.random() < 0.25) w.fx.parts.push({ x: this.cx() + this.facing * 12, y: this.y + 10 + Math.random() * 10, vx: 0, vy: -20, life: 0.3, max: 0.3, color: '#ffb070', grav: 0, size: 1 });

    const mx = (Input.down('right') ? 1 : 0) - (Input.down('left') ? 1 : 0);
    if (this.onGround) this.coyote = 0.1; else this.coyote -= dt;

    const low = this.action === 'dodge' || this.action === 'crawl';
    if (!low && this.h !== PLAYER.h) { if (this.canStand()) this.setH(PLAYER.h); else if (!this.dead) this.start('crawl'); }
    if (!this.action) this.freeControl(dt, mx);
    else this.updateAction(dt, mx);

    if (this.action !== 'ability') this.vy = Math.min(this.vy + GRAVITY * dt, 560);
    const vyBefore = this.vy;
    moveBody(this, w.level, dt);
    if (this.justLanded && vyBefore > 200) this.landT = 0.1;
    if (this.justLanded && vyBefore > 300) { sfx.land(); w.fx.burst(this.cx(), this.y + this.h, 5, '#625b58', 30, 0.3, 50); }
    if (this.onGround && Math.abs(this.vx) > 10) {
      const before = Math.floor(this.walkPhase / Math.PI);
      this.walkPhase += dt * Math.abs(this.vx) * 0.12;
      if (!this.action && Math.floor(this.walkPhase / Math.PI) !== before) sfx.step();
    }

    if (this.y > w.level.g.length * TILE + 40) { this.hp = 0; this.takeHit(1, null, {}); }
  }

  freeControl(dt, mx) {
    const w = this.world;
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
    if (Input.pressed('jump') && this.coyote > 0 && this.h === PLAYER.h) {
      Input.consume('jump'); this.vy = -PLAYER.jump; this.coyote = 0; this.onGround = false; sfx.jump();
    }
    if (!Input.down('jump') && this.vy < -140) this.vy = -140;

    if (Input.pressed('dodge') && this.vigor > 0) { Input.consume('dodge'); return this.doDodge(mx); }
    if (Input.pressed('parry') && this.vigor > 0) {
      Input.consume('parry'); this.spend(PLAYER.parry.cost); this.start('parry'); return;
    }
    if (Input.pressed('light') && this.vigor > 0) { Input.consume('light'); return this.doLight(); }
    if (Input.pressed('heavy') && this.vigor > 0 && this.onGround) { Input.consume('heavy'); this.start('heavyCharge'); sfx.charge(); return; }
    if (Input.pressed('potion')) { Input.consume('potion'); return this.tryDrink(); }
    if (Input.pressed('nextpotion')) { Input.consume('nextpotion'); return this.nextPotion(); }
    if (Input.pressed('ability')) { Input.consume('ability'); return this.tryAbility(); }
    if (Input.pressed('swap')) {
      Input.consume('swap');
      this.activeSlot = 1 - this.activeSlot; this.start('swap'); sfx.ui();
      return;
    }
    if (Input.pressed('item')) { Input.consume('item'); return this.useItem(); }
    if (Input.pressed('cycle')) { Input.consume('cycle'); return this.cycleItem(); }
    if (Input.pressed('interact')) { Input.consume('interact'); w.interact(); }
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
    for (let tx = l; tx <= r; tx++) if (this.world.level.solid(tx, ty)) return false;
    return true;
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
    this.perfectThisDodge = false;
    this.vx = this.facing * PLAYER.dodge.speed;
    sfx.dodge();
    // Caminho Improvável: a esquiva deixa um eco que distrai inimigos
    if (this.arcana.includes('louco') && this.mastery('louco') >= 3 && now - this.lastEcho >= 4) {
      this.lastEcho = now;
      w.spawnEcho(this.cx(), this.y + this.h, this.facing);
    }
  }

  doLight() {
    const W = this.weapon();
    this.spend(Math.max(4, PLAYER.light.cost + W.cost));
    this.combo = this.combo % W.combo.length;
    this.start('light');
    this.comboIndex = this.combo;
    this.combo++;
    this.comboTimer = 0.6;
    if (this.onGround) this.vx = this.facing * (W.thrust ? 60 : 45);
    sfx.swing();
  }

  attackBox(kind) {
    const f = this.facing, W = this.weapon();
    if (kind === 'heavy') {
      const reach = W.reach + 4;
      return { x: f > 0 ? this.x + this.w - 2 : this.x - reach + 2, y: this.y - 8, w: reach, h: this.h - 4 };
    }
    if (kind === 'ability') return { x: this.x - 4, y: this.y, w: this.w + 8, h: this.h };
    if (W.thrust) return { x: f > 0 ? this.x + this.w - 2 : this.x - W.reach + 2, y: this.y + 7, w: W.reach, h: this.h - 12 };
    const back = W.wide ? 6 : 0;
    return { x: f > 0 ? this.x + this.w - 2 - back : this.x - W.reach + 2, y: this.y + 1, w: W.reach + back, h: this.h };
  }

  damageMul() {
    let m = weaponDamageMul(this.prog, this.prog.equipped);
    if (this.oil > 0) m *= 1.08;
    if (this.dmgBuff > 0) m *= POTIONS.dano.mul;
    if (this.empowered > 0) m *= 1.3;
    return m;
  }

  strike(kind, dmg, posture) {
    const w = this.world;
    const box = this.attackBox(kind);
    let hitAny = false;
    const mul = kind === 'ability' ? 1 : this.damageMul();
    for (const e of w.targets()) {
      if (!e.alive() || this.hitSet.has(e)) continue;
      if (overlap(box, e.hurtbox())) {
        this.hitSet.add(e);
        const r = e.takeDamage(Math.round(dmg * mul), posture, this.facing, { kind, world: w, oil: this.oil > 0 });
        hitAny = true;
        if (r !== 'guarded') this.foco = Math.min(this.maxFoco, this.foco + 1);
        if (kind === 'ability') w.addMastery(3, 'ability');
        if (this.ashCharge > 0 && kind !== 'ability') {
          this.ashCharge = 0;
          w.fx.add(new AshPatch(e.cx(), e.y + e.h, 0.8, 26, 160, 'player'));
        }
      }
    }
    if (hitAny && this.empowered > 0 && kind !== 'ability') this.empowered = 0;
    if (kind === 'heavy' || kind === 'light') w.breakTiles(box, kind);
    if (hitAny) { w.hitstop = Math.max(w.hitstop, kind === 'heavy' ? 0.07 : 0.035); }
    return hitAny;
  }

  updateAction(dt, mx) {
    const w = this.world;
    const P = PLAYER, W = this.weapon();
    switch (this.action) {
      case 'light': {
        const sp = W.speed;
        const lt = this.t * sp;
        this.vx *= this.onGround ? 0.85 : 0.98;
        if (lt >= P.light.active[0] && lt <= P.light.active[1]) this.strike('light', W.combo[this.comboIndex], W.posture[this.comboIndex]);
        if (lt > 0.2 && Input.pressed('light') && this.vigor > 0 && this.comboIndex < W.combo.length - 1) {
          Input.consume('light'); if (mx) this.facing = mx; this.doLight(); return;
        }
        if (lt > 0.22 && Input.pressed('dodge') && this.vigor > 0) { Input.consume('dodge'); this.action = null; this.doDodge(mx); return; }
        if (lt >= P.light.dur) this.action = null;
        break;
      }
      case 'heavyCharge': {
        this.vx *= 0.8;
        if (mx) this.facing = mx;
        const released = !Input.down('heavy');
        const maxC = P.heavy.maxCharge / W.speed;
        if ((released && this.t >= P.heavy.minCharge / W.speed) || this.t >= maxC) {
          this.charged = this.t >= maxC - 0.01;
          this.spend(this.charged ? P.heavy.costCharged : P.heavy.cost);
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
          const hit = this.strike('heavy', this.charged ? W.heavy[1] : W.heavy[0], (this.charged ? 1.6 : 1) * W.posture[W.posture.length - 1] * 1.7);
          if (hit && !this.struck) { this.struck = true; w.shake = Math.max(w.shake, 3); }
        }
        if (this.t >= 0.5 / Math.max(0.8, W.speed)) this.action = null;
        break;
      }
      case 'dodge': {
        const k = 1 - this.t / P.dodge.dur;
        this.vx = this.facing * P.dodge.speed * (0.35 + 0.65 * k);
        if (Math.random() < 0.5) w.fx.parts.push({ x: this.cx(), y: this.y + this.h - 2, vx: -this.facing * 20, vy: -10, life: 0.3, max: 0.3, color: '#625b58', grav: 0, size: 2 });
        if (this.t >= P.dodge.dur) { this.action = null; this.t = 0.06; }
        break;
      }
      case 'crawl': {
        // sob uma passagem baixa: segue rente ao chão até caber de pé
        const dir = mx || this.facing; this.facing = dir;
        this.vx = dir * 70;
        if (this.canStand()) { this.action = null; this.setH(PLAYER.h); }
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
        if (!this.healUsed && this.t >= 0.05) {
          // o frasco é consumido ao iniciar a animação (Vol. V)
          this.healUsed = true; this.flasks[this.drinking]--;
        }
        if (!this.healStarted && this.t >= 0.4) {
          this.healStarted = true;
          this.drinkCd = P.drink.cd;
          if (this.drinking === 'cura') { this.healLeft = this.maxHp * P.heal.pct; this.healRate = this.healLeft / P.heal.time; }
          else if (this.drinking === 'defesa') this.defBuff = POTIONS.defesa.dur;
          else this.dmgBuff = POTIONS.dano.dur;
          w.fx.burst(this.cx(), this.cy(), 12, POTIONS[this.drinking].color, 40, 0.7, -30, 1);
          sfx.heal();
        }
        if (this.t >= P.drink.anim) { this.action = null; this.healStarted = false; }
        break;
      }
      case 'throw': {
        this.vx *= 0.8;
        if (!this.struck && this.t >= 0.16) {
          this.struck = true;
          w.fx.add(new Projectile({
            owner: 'player', x: this.cx() + this.facing * 6, y: this.y + 4, vx: this.facing * 150, vy: -170, grav: 600, r: 3, dmg: 0, life: 2,
            color: '#3a2f2a', glow: '#e17a3d',
            onLand: (world, x, y) => world.explode(x, y, 34, 220, 'player'),
            onHitEnemy: (world, x, y) => world.explode(x, y, 34, 220, 'player'),
          }));
          sfx.swing();
        }
        if (this.t >= 0.4) this.action = null;
        break;
      }
      case 'ability': {
        this.vx = this.facing * 380; this.vy = 0;
        this.strike('ability', ARCANA.louco.abilities[0].dmg, 25);
        w.fx.parts.push({ x: this.cx(), y: this.y + 4 + Math.random() * 16, vx: 0, vy: -15, life: 0.5, max: 0.5, color: Math.random() < 0.5 ? '#d9b58a' : '#625b58', grav: 0, size: 2 });
        if (this.t >= 0.24) { this.action = null; this.vx = this.facing * 90; }
        break;
      }
      case 'swap': {
        this.vx *= 0.85;
        if (this.t >= 0.22) this.action = null;
        break;
      }
      case 'gather': {
        this.vx = 0;
        if (this.t >= 0.6) { this.action = null; if (this.gatherTarget) w.collectHerb(this.gatherTarget); this.gatherTarget = null; }
        break;
      }
      case 'finisher': {
        this.vx = 0;
        if (!this.struck && this.t >= 0.32 && this.finTarget) {
          this.struck = true;
          const e = this.finTarget;
          e.takeDamage(Math.round((e.isBoss ? PLAYER.finisher.bossDmg : PLAYER.finisher.dmg) * this.damageMul()), 0, this.facing, { kind: 'finisher', world: w });
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
