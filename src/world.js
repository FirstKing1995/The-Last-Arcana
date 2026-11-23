import { Level } from './level.js';
import { TILE, overlap } from './physics.js';
import { Player } from './player.js';
import { MOB_CLASSES } from './enemies.js';
import { Asgmor } from './boss.js';
import { FX } from './fx.js';
import { sfx } from './audio.js';
import { ARCANA, RELICS, PLAYER } from './data.js';

export const VW = 384, VH = 216;

const ELION_LINES = [
  ['Elion', 'Você acordou no meio da cinza... e ela não te queimou.'],
  ['Elion', 'Não tem rosto, nem nome. Só a runa vermelha no peito. Ela segura sua forma.'],
  ['Elion', 'Há muito tempo, Aurelian arrancou as almas luminosas do ciclo do mundo e as prendeu. Os 22 Arcanos se corromperam.'],
  ['Elion', 'O primeiro deles, O Louco, virou Asgmor. Ele dança no Campanário Caído, ao fim deste vale.'],
  ['Elion', 'Descanse nas piras. A cinza aprende o seu caminho e o devolve quando você cair.'],
  ['Elion', 'E leia os avisos: tudo que ataca aqui anuncia antes. Amarelo pode ser aparado. Vermelho, só evitado.'],
];

export class World {
  constructor() {
    this.level = new Level();
    this.fx = new FX();
    this.time = 0;
    this.mobs = []; this.interactables = []; this.summons = [];
    this.flags = { brasa: false, bossDefeated: false, metElion: false, chests: {} };
    this.toasts = []; this.dialog = null; this.banner = null;
    this.shake = 0; this.hitstop = 0; this.flashScreen = 0;
    this.inCombat = false; this.bossFight = false; this.arenaLocked = false;
    this.ashUp = false; this.endingShown = false;
    for (const s of this.level.spawns) {
      if (s.type === 'player') this.start = { x: s.x, y: s.y };
      else if (MOB_CLASSES[s.type]) this.mobs.push(new MOB_CLASSES[s.type](this, s.type, s.x, s.y));
      else if (s.type === 'boss') this.boss = new Asgmor(this, s.x, s.y);
      else this.interactables.push({ ...s });
    }
    this.checkpoint = { ...this.start, name: 'Cinzeiral' };
    this.player = new Player(this, this.start.x, this.start.y);
    this.cam = { x: 0, y: 0 };
    this.snapCamera();
    this.dialogQueue(ELION_LINES.slice(0, 0));
  }

  targets() {
    const list = this.mobs.filter((m) => !m.dead);
    for (const s of this.summons) if (!s.dead) list.push(s);
    if (this.boss && this.boss.alive()) list.push(this.boss);
    return list;
  }

  toast(text, dur = 2.2) {
    if (this.toasts.some((t) => t.text === text)) return;
    this.toasts.push({ text, t: 0, dur });
  }

  dialogQueue(lines, onDone) {
    if (!lines.length) return;
    this.dialog = { lines, i: 0, onDone, chars: 0 };
  }

  summon(type, x, y) {
    const gy = this.level.solidGroundBelow(x, y - 3 * TILE);
    const m = new MOB_CLASSES[type](this, type, x, gy, { summoned: true });
    m.aggro = true;
    this.summons.push(m);
    this.fx.burst(x, gy - 6, 14, '#625b58', 60, 0.6);
  }

  onMobKilled() {}

  resetMobs() {
    for (const m of this.mobs) m.reset();
    this.summons = [];
    this.fx.clearHazards();
  }

  breakTiles(box) {
    const l = Math.floor(box.x / TILE), r = Math.floor((box.x + box.w) / TILE);
    const t = Math.floor(box.y / TILE), b = Math.floor((box.y + box.h) / TILE);
    let broke = false;
    for (let ty = t; ty <= b; ty++) for (let tx = l; tx <= r; tx++) {
      if (this.level.get(tx, ty) === 'X') {
        // Parede frágil inteira (coluna) desmorona
        for (let yy = 0; yy < this.level.g.length; yy++) if (this.level.get(tx, yy) === 'X') { this.level.set(tx, yy, '.'); this.fx.burst(tx * TILE + 8, yy * TILE + 8, 14, '#625b58', 90, 0.8, 300, 3); }
        broke = true;
      }
    }
    if (broke) { sfx.breakWall(); this.shake = 5; this.toast('A parede rachada desmoronou'); }
  }

  nearbyInteractable() {
    const p = this.player;
    let best = null, bd = 1e9;
    for (const it of this.interactables) {
      if (it.type === 'chest' && this.flags.chests[it.id]) continue;
      const d = Math.abs(it.x - p.cx());
      if (d < 22 && Math.abs(it.y - (p.y + p.h)) < 20 && d < bd) { best = it; bd = d; }
    }
    return best;
  }

  finisherTarget() {
    const p = this.player;
    for (const e of this.targets()) {
      if (e.isBroken() && Math.abs(e.cx() - p.cx()) < e.w / 2 + 26 && Math.abs(e.cy() - p.cy()) < 30) return e;
    }
    return null;
  }

  interact() {
    const p = this.player;
    const fin = this.finisherTarget();
    if (fin) { p.startFinisher(fin); return; }
    const it = this.nearbyInteractable();
    if (!it) return;
    if (it.type === 'shrine') this.rest(it);
    else if (it.type === 'elion') {
      const lines = this.flags.bossDefeated ? ELION_AFTER : this.flags.metElion ? ELION_LINES.slice(3) : ELION_LINES;
      this.flags.metElion = true;
      this.dialogQueue(lines);
    } else if (it.type === 'chest') this.openChest(it);
    else if (it.type === 'stone') {
      this.dialogQueue([
        ['Inscrição', '"Aqui o Louco tocava o primeiro sino do mundo. Cada passo dele era um caminho que ainda não existia."'],
        ['Inscrição', '"Quando o sino balançar às costas dele, afaste-se: a cinza responde."'],
      ]);
    }
  }

  rest(shrine) {
    const p = this.player;
    p.hp = p.maxHp; p.potions = p.maxPotions; p.vigor = p.maxVigor; p.foco = p.maxFoco; p.healLeft = 0;
    p.start('rest');
    this.checkpoint = { x: shrine.x, y: shrine.y, name: shrine.name };
    this.resetMobs();
    sfx.rest();
    this.fx.burst(shrine.x, shrine.y - 10, 24, '#ffb070', 50, 1, -40, 2);
    this.toast(`Descansou: ${shrine.name}`);
    if (!this.flags.brasa) {
      this.flags.brasa = true;
      this.dialogQueue([
        ['Pira', 'As brasas da pira se agarram aos seus dedos. Uma inscrição queima no ar:'],
        ['Grimório', 'Feitiço aprendido: BRASA LANÇADA (Fogo). Projétil rápido de curto alcance que aplica queimadura. Custa 18 de Foco. Tecla [R].'],
        ['Grimório', 'Foco recupera fora de combate, a cada golpe corpo a corpo e ao aparar com perfeição.'],
      ]);
    }
  }

  openChest(it) {
    this.flags.chests[it.id] = true;
    sfx.chest();
    this.fx.burst(it.x, it.y - 8, 20, '#ffd27a', 60, 0.8, 60, 2);
    if (it.reward === 'flask') {
      const p = this.player;
      p.maxPotions = Math.min(PLAYER.maxPotionsCap, p.maxPotions + 1); p.potions = p.maxPotions;
      this.dialogQueue([['Baú secreto', `Você encontrou um Frasco Vazio. Frascos de poção: ${p.maxPotions}.`]]);
    }
  }

  onBossDefeated() {
    const p = this.player;
    this.flags.bossDefeated = true;
    this.bossFight = false;
    this.arenaLocked = false;
    this.level.setGate(false);
    p.arcana[0] = 'louco';
    p.activeSlot = 0;
    if (!p.relics.includes('cinza')) p.relics.push('cinza');
    p.hp = p.maxHp;
    this.ashUp = true;
    sfx.victory();
    this.banner = { text: 'ARCANO LIBERTO', sub: 'O Louco — Passo Sem Destino', t: 0, dur: 4.5 };
    this.afterBanner = () => this.dialogQueue([
      ['Arcano Maior', `O LOUCO está equipado como Arcano Primário. Habilidade: ${ARCANA.louco.ability.name} — ${ARCANA.louco.ability.desc} Tecla [F]. Recarga ${ARCANA.louco.ability.cd} s.`],
      ['Relíquia', `${RELICS.cinza.name}: ${RELICS.cinza.desc}`],
      ['Memória', 'A cinza não desaparece. Ela começa a cair para cima. O mundo voltou a se mover.'],
      ['Memória', 'Por um instante você lembra de um clarão branco... e de um espaço vazio onde algo deveria estar. Você.'],
      ['Elion', '(Uma voz distante) Volte a Cinzeiral, Errante. Ainda faltam vinte e um.'],
    ], () => { this.endingShown = true; this.toast('Fim da demonstração — explore o vale com O Louco', 6); });
  }

  onPlayerDeath() {
    const p = this.player;
    this.resetMobs();
    if (!this.flags.bossDefeated) {
      this.boss.reset();
      this.level.setGate(false);
      this.arenaLocked = false;
      this.bossFight = false;
    }
    p.respawn(this.checkpoint.x, this.checkpoint.y);
    this.snapCamera();
  }

  update(dt) {
    this.time += dt;
    if (this.flashScreen > 0) this.flashScreen -= dt;
    for (const t of this.toasts) t.t += dt;
    this.toasts = this.toasts.filter((t) => t.t < t.dur);
    if (this.banner) {
      this.banner.t += dt;
      if (this.banner.t > this.banner.dur) { this.banner = null; if (this.afterBanner) { const f = this.afterBanner; this.afterBanner = null; f(); } }
    }
    if (this.hitstop > 0) { this.hitstop -= dt; this.updateCamera(dt); return; }

    const p = this.player;
    p.update(dt);
    for (const m of this.mobs) m.update(dt);
    for (const m of this.summons) m.update(dt);
    this.boss.update(dt);
    this.fx.update(dt, this);

    // Gatilho da arena: a luta começa ao pisar no círculo de cinza
    const a = this.level.arena;
    if (!this.flags.bossDefeated && !this.arenaLocked && p.x > a.trigger && !p.dead) {
      this.arenaLocked = true;
      this.level.setGate(true);
      this.boss.activate();
      this.banner = { text: 'ASGMOR', sub: 'O Louco corrompido', t: 0, dur: 2.6 };
    }

    this.inCombat = this.bossFight || this.targets().some((m) => m.aggro && Math.abs(m.cx() - p.cx()) < 300);
    if (this.ashUp && Math.random() < 0.4) {
      this.fx.parts.push({ x: this.cam.x + Math.random() * VW, y: this.cam.y + VH + 4, vx: (Math.random() - 0.5) * 10, vy: -20 - Math.random() * 20, life: 6, max: 6, color: Math.random() < 0.3 ? '#d9b58a' : '#9a918a', grav: 0, size: 1 });
    }
    if (p.dead && p.deadT > 2.6 && !this.deathPending) this.deathPending = true;
    this.updateCamera(dt);
  }

  snapCamera() { this.updateCamera(1, true); }

  updateCamera(dt, snap = false) {
    const p = this.player;
    let tx = p.cx() - VW / 2 + p.facing * 30;
    let ty = p.y - VH * 0.64;
    const maxX = this.level.g[0].length * TILE - VW, maxY = this.level.g.length * TILE - VH;
    if (this.arenaLocked) {
      const a = this.level.arena;
      tx = Math.max(a.x0 - 8, Math.min(a.x1 - VW + 8, tx));
    }
    tx = Math.max(0, Math.min(maxX, tx)); ty = Math.max(0, Math.min(maxY, ty));
    const k = snap ? 1 : 1 - Math.pow(0.002, dt);
    this.cam.x += (tx - this.cam.x) * k;
    this.cam.y += (ty - this.cam.y) * k;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 20);
  }
}

const ELION_AFTER = [
  ['Elion', 'A cinza... está subindo. Você libertou O Louco.'],
  ['Elion', 'Sinto um fragmento de memória em você. Não é de Aurelian, nem de uma alma antiga. É algo novo.'],
  ['Elion', 'O Bosque de Vidro espera adiante. Mas isso é outra história — por enquanto.'],
];
