import { Level } from './level.js';
import { TILE, overlap } from './physics.js';
import { Player } from './player.js';
import { MOB_CLASSES } from './enemies.js';
import { Asgmor } from './boss.js';
import { FX } from './fx.js';
import { sfx } from './audio.js';
import { ARCANA, RELICS, PLAYER, MOBS, WEAPONS, HERBS, BOSS } from './data.js';
import { saveProgress, grantWeapon, masteryLevel } from './state.js';
import { Input } from './input.js';

// Nome do comando conforme teclado ou toque
function k(key, touch) { return Input.touchMode ? touch : key; }

export const VW = 384, VH = 216;

const ELION_LINES = [
  ['Elion', 'Você acordou no meio da cinza... e ela não te queimou.'],
  ['Elion', 'Não tem rosto, nem nome. Só a runa vermelha no peito. Ela segura sua forma.'],
  ['Elion', 'Há muito tempo, Aurelian arrancou as almas luminosas do ciclo do mundo e as prendeu. Os 22 Arcanos se corromperam.'],
  ['Elion', 'O primeiro deles, O Louco, virou Asgmor. Ele dança no Campanário Caído, ao fim deste vale.'],
  ['Elion', 'Descanse nas piras. A cinza aprende o seu caminho e o devolve quando você cair.'],
  ['Elion', 'E leia os avisos: tudo que ataca aqui anuncia antes. Amarelo pode ser aparado. Vermelho, só evitado.'],
  ['Elion', 'Sob o campanário das ruínas há uma cripta. Dizem que os sinos de lá chamam quem não deveria vir.'],
];
const ELION_AFTER = [
  ['Elion', 'A cinza... está subindo. Você libertou O Louco.'],
  ['Elion', 'Sinto um fragmento de memória em você. Não é de Aurelian, nem de uma alma antiga. É algo novo.'],
  ['Elion', 'A maestria cresce com o uso: aparar, esquivar no instante certo e usar as habilidades em situações diferentes.'],
  ['Elion', 'O Bosque de Vidro espera adiante. Mas isso é outra história, por enquanto.'],
];
const MORREN_HELLO = [
  ['Morren', 'Ah, um cliente que não está pegando fogo! Morren, mercador de mil coisas. Quase mil.'],
  ['Morren', 'Vendo bombas, óleos e selos. Compro as ervas que você achar no vale. Arcanos? Esses ninguém vende.'],
];
const YSARA_HELLO = [
  ['Ysara', 'Minha forja queima com o calor que sobra dos Arcanos. Fria por fora, viva por dentro.'],
  ['Ysara', 'Traga moedas e eu afio o que você carrega. Passos pequenos: uma arma comum bem cuidada ainda corta.'],
];

export class World {
  constructor(prog) {
    this.prog = prog;
    this.level = new Level();
    this.fx = new FX();
    this.time = 0;
    this.mobs = []; this.interactables = []; this.summons = []; this.loot = []; this.fauna = []; this.breakables = [];
    this.toasts = []; this.dialog = null; this.banner = null; this.menu = null;
    this.shake = 0; this.hitstop = 0; this.flashScreen = 0;
    this.inCombat = false; this.bossFight = false; this.arenaLocked = false;
    this.ashUp = !!prog.flags.bossDefeated; this.echo = null;
    for (const s of this.level.spawns) {
      if (s.type === 'player') this.start = { x: s.x, y: s.y };
      else if (MOB_CLASSES[s.type]) this.mobs.push(new MOB_CLASSES[s.type](this, s.type, s.x, s.y, s));
      else if (s.type === 'boss') this.boss = new Asgmor(this, s.x, s.y);
      else if (s.type === 'pot' || s.type === 'crate') this.breakables.push({ ...s, broken: false });
      else if (s.type === 'fauna') this.fauna.push({ ...s, hx: s.x, state: 'idle', t: Math.random() * 3, fx: s.x, fy: s.y, vx: 0, vy: 0, facing: 1 });
      else this.interactables.push({ ...s, state: 0, t: 0 });
    }
    // Estado salvo aplicado ao mapa
    if (prog.flags.wallBroken) for (let y = 0; y < this.level.g.length; y++) if (this.level.get(119, y) === 'X') this.level.set(119, y, '.');
    if (prog.flags.shortcut) this.level.openShortcut();
    for (const m of this.mobs) if (m.type === 'sinoElite' && prog.flags.cryptSilenced) { m.dead = true; m.deathT = 99; m.unique = true; }
    if (prog.flags.bossDefeated) { this.boss.dead = true; this.boss.deathT = 99; }
    this.checkpoint = prog.checkpoint || { ...this.start, name: 'Cinzeiral' };
    this.player = new Player(this, this.checkpoint.x, this.checkpoint.y);
    this.applyHerbState();
    this.cam = { x: 0, y: 0 };
    this.snapCamera();
  }

  get flags() { return this.prog.flags; }

  save() { this.prog.checkpoint = this.checkpoint; saveProgress(this.prog); }

  targets() {
    const list = this.mobs.filter((m) => !m.dead);
    for (const s of this.summons) if (!s.dead) list.push(s);
    if (this.boss && this.boss.alive()) list.push(this.boss);
    return list;
  }

  // O eco de Caminho Improvável atrai inimigos próximos
  targetFor(mob) {
    if (this.echo && Math.abs(this.echo.x - mob.cx()) < 180) return { x: this.echo.x };
    return { x: this.player.cx() };
  }
  spawnEcho(x, y, facing) {
    this.echo = { x, y, t: 1.5, facing };
    this.fx.burst(x, y - 10, 10, '#d9b58a', 40, 0.6, 0, 1);
  }
  alertNear(mob) {
    for (const m of this.mobs) if (m !== mob && !m.dead && !m.aggro && Math.abs(m.cx() - mob.cx()) < 90 && Math.abs(m.cy() - mob.cy()) < 50) m.aggro = true;
  }

  // Dicas de contexto: aparecem uma única vez
  tip(id, text, dur = 5) {
    const tips = this.flags.tips || (this.flags.tips = {});
    if (tips[id]) return;
    tips[id] = true;
    this.toast(text, dur);
  }

  updateTips() {
    const p = this.player;
    if (p.dead) return;
    if (this.inCombat) this.tip('aviso', `Aviso amarelo: apare (${k('L', 'APARAR')}). Vermelho: esquive (${k('Shift', 'ESQUIVA')}).`, 6);
    if (p.vigor < 20) this.tip('vigor', 'Vigor baixo: pare de atacar um instante para recuperar.');
    if (p.hp < p.maxHp * 0.5) this.tip('cura', `Beba um frasco (${k('Q', 'CURA')}). A cura leva 2,5 s e dano forte a interrompe.`);
    if (this.finisherTarget()) this.tip('final', `Postura quebrada! Chegue perto e aperte ${k('E', 'E')} para finalizar.`);
    const tx = p.cx() / TILE, ty = (p.y + p.h) / TILE;
    if (tx > 126 && tx < 134 && ty < 17) this.tip('cripta', `Uma descida sob o campanário (${k('S + Espaço', '↓ + PULAR')} desce pela tábua).`);
    if (tx > 101 && tx < 130 && ty > 26) this.tip('sinos', 'Sinos sem badalo são falsos: tocam se você passar por baixo. Quebre-os ou passe esquivando.', 6);
    if (tx > 71 && tx < 100 && ty > 26) this.tip('vento', 'Cinza soprada em ciclos: avance na calmaria e abrigue-se atrás dos pilares.', 6);
    if (this.flags.bossDefeated && this.prog.arcana[0] === 'louco') this.tip('arcano', `O Louco: ${k('F', 'ARC')} usa Salto de Cinzas. Veja a maestria no inventário (${k('I', 'INV')}).`, 6);
    // Marco de aproximação: o sino do campanário ecoa ao longe
    if (!this.flags.bossDefeated && tx > 148 && tx < 167 && ty < 17) {
      this.bellT = (this.bellT || 0) - 1 / 60;
      if (this.bellT <= 0) { this.bellT = 5; sfx.bell(98, 0.05); }
    }
  }

  toast(text, dur = 2.2) {
    if (this.toasts.some((t) => t.text === text)) return;
    this.toasts.push({ text, t: 0, dur });
    if (this.toasts.length > 3) this.toasts.shift();
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

  addCoins(n, x, y) {
    this.prog.coins += n;
    if (x !== undefined) {
      this.fx.number(x, y, '+' + n, '#e8c96a');
      this.fx.burst(x, y, Math.min(12, 3 + Math.floor(n / 10)), '#d4b66f', 50, 0.5, 120, 1);
    }
  }

  addMastery(n, tag) {
    const p = this.player;
    const a = p.activeArcanum();
    if (!a) return;
    // Repetir a mesma ação em sequência reduz o ganho temporariamente
    this.lastMasteryTag = this.lastMasteryTag || {};
    const last = this.lastMasteryTag[tag] || -99;
    const gain = this.time - last < 2 ? n * 0.5 : n;
    this.lastMasteryTag[tag] = this.time;
    const before = masteryLevel(this.prog.mastery[a] || 0);
    this.prog.mastery[a] = (this.prog.mastery[a] || 0) + gain;
    const after = masteryLevel(this.prog.mastery[a]);
    if (after > before) {
      sfx.victory();
      const ab = ARCANA[a].abilities[after - 1];
      this.banner = { text: `MAESTRIA ${['', 'I', 'II', 'III', 'IV', 'V'][after]}`, sub: ab ? `${ARCANA[a].name}: ${ab.name}` : ARCANA[a].name, t: 0, dur: 3 };
      this.save();
    }
  }

  onMobKilled(m) {
    const d = MOBS[m.type];
    if (!d) return;
    this.addCoins(d.coins || 0, m.cx(), m.y - 6);
    this.addMastery(4, 'kill');
    if (m.type === 'sinoElite') {
      this.flags.cryptSilenced = true; m.unique = true;
      sfx.victory();
      this.banner = { text: 'O SINO SILENCIOU', sub: 'A cripta perdeu a voz: menos reforços no vale', t: 0, dur: 3.2, small: true };
      this.save();
    }
    // chance de arma regional por fonte elegível (4%)
    if (d.drop && !m.summoned && Math.random() < WEAPONS[d.drop].chance) {
      this.loot.push({ kind: 'weapon', id: d.drop, x: m.cx(), y: m.y + m.h, t: 0 });
    }
  }

  resetMobs() {
    for (const m of this.mobs) { if (!m.unique) m.reset(); }
    this.summons = [];
    this.fx.clearHazards();
    for (const b of this.breakables) b.broken = false;
    for (const it of this.interactables) if (it.type === 'falsebell') { it.state = 0; }
    for (const f of this.fauna) { f.state = 'idle'; f.fx = f.hx; f.fy = f.y; f.t = Math.random() * 3; }
  }

  // Quebra parede frágil (golpe pesado) e objetos leves (qualquer golpe)
  breakTiles(box, kind) {
    for (const b of this.breakables) {
      if (b.broken) continue;
      if (overlap(box, { x: b.x - 6, y: b.y - 12, w: 12, h: 12 })) {
        b.broken = true;
        sfx.breakWall();
        this.fx.burst(b.x, b.y - 6, 14, b.type === 'pot' ? '#6d4b32' : '#5a4030', 80, 0.6, 300, 2);
        const r = Math.random();
        if (r < 0.7) this.addCoins(2 + Math.floor(Math.random() * 6), b.x, b.y - 10);
        else if (r < 0.85) { this.prog.herbs.liquen = (this.prog.herbs.liquen || 0) + 1; this.toast('+1 Líquen de Brasa'); }
      }
    }
    for (const it of this.interactables) {
      if (it.type === 'falsebell' && it.state !== 2 && overlap(box, { x: it.x - 6, y: it.y + 6, w: 12, h: 18 })) {
        it.state = 2; sfx.guard(); this.fx.burst(it.x, it.y + 14, 12, '#8b633f', 70, 0.6, 300, 2);
        this.toast('Sino falso silenciado');
      }
    }
    if (kind !== 'heavy') return;
    const l = Math.floor(box.x / TILE), r = Math.floor((box.x + box.w) / TILE);
    const t = Math.floor(box.y / TILE), bt = Math.floor((box.y + box.h) / TILE);
    let broke = false;
    for (let ty = t; ty <= bt; ty++) for (let tx = l; tx <= r; tx++) {
      if (this.level.get(tx, ty) === 'X') {
        for (let yy = 0; yy < this.level.g.length; yy++) if (this.level.get(tx, yy) === 'X') { this.level.set(tx, yy, '.'); this.fx.burst(tx * TILE + 8, yy * TILE + 8, 14, '#625b58', 90, 0.8, 300, 3); }
        broke = true;
      }
    }
    if (broke) { sfx.breakWall(); this.shake = 5; this.toast('A parede rachada desmoronou'); this.flags.wallBroken = true; this.save(); }
  }

  explode(x, y, radius, dmg, owner) {
    sfx.explode();
    this.shake = Math.max(this.shake, 4);
    this.fx.burst(x, y - 6, 26, '#e17a3d', 130, 0.5, 150, 2);
    this.fx.burst(x, y - 6, 10, '#3a2f2a', 70, 0.8, 40, 3);
    if (owner === 'player') this.damageArea(x, y, radius, dmg);
  }
  damageArea(x, y, radius, dmg) {
    for (const e of this.targets()) {
      if (Math.abs(e.cx() - x) < radius + e.w / 2 && Math.abs(e.cy() - (y - 8)) < radius + e.h / 2) {
        e.takeDamage(dmg, 30, Math.sign(e.cx() - x) || 1, { kind: 'fire', world: this });
        e.applyBurn && e.applyBurn(3);
      }
    }
    this.breakTiles({ x: x - radius, y: y - radius, w: radius * 2, h: radius * 2 }, 'light');
  }

  nearbyInteractable() {
    const p = this.player;
    let best = null, bd = 1e9;
    for (const it of this.interactables) {
      if (it.type === 'chest' && this.flags.chests[it.id]) continue;
      if (it.type === 'herb' && it.state !== 0) continue;
      if (it.type === 'falsebell' || it.type === 'vent') continue;
      if (it.type === 'lever' && this.flags.shortcut) continue;
      if ((it.type === 'bigbell' || it.type === 'portal') && (!this.flags.bossDefeated || this.arenaLocked)) continue;
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
    switch (it.type) {
      case 'shrine': return this.rest(it);
      case 'elion': {
        const lines = this.flags.bossDefeated ? ELION_AFTER : this.flags.metElion ? ELION_LINES.slice(3) : ELION_LINES;
        this.flags.metElion = true;
        return this.dialogQueue(lines);
      }
      case 'morren':
        if (!this.flags.metMorren) { this.flags.metMorren = true; return this.dialogQueue(MORREN_HELLO, () => this.openMenu('morren')); }
        return this.openMenu('morren');
      case 'ysara':
        if (!this.flags.metYsara) { this.flags.metYsara = true; return this.dialogQueue(YSARA_HELLO, () => this.openMenu('ysara')); }
        return this.openMenu('ysara');
      case 'chest': return this.openChest(it);
      case 'herb': p.startGather(it); return;
      case 'lever': return this.pullLever(it);
      case 'stone':
        return this.dialogQueue([
          ['Inscrição', '"Aqui o Louco tocava o primeiro sino do mundo. Cada passo dele era um caminho que ainda não existia."'],
          ['Inscrição', '"Quando o sino balançar às costas dele, afaste-se: a cinza responde."'],
        ]);
      case 'bigbell': return this.startRematch();
      case 'portal': return this.returnToCheckpoint(true);
    }
  }

  openMenu(kind) { this.menu = kind; }

  rest(shrine) {
    const p = this.player;
    p.hp = p.maxHp; p.potions = p.maxPotions; p.vigor = p.maxVigor; p.foco = p.maxFoco; p.healLeft = 0;
    p.start('rest');
    this.checkpoint = { x: shrine.x, y: shrine.y, name: shrine.name };
    this.prog.rests = (this.prog.rests || 0) + 1;
    this.resetMobs();
    this.restHerbs();
    sfx.rest();
    this.fx.burst(shrine.x, shrine.y - 10, 24, '#ffb070', 50, 1, -40, 2);
    this.toast(`Descansou: ${shrine.name} · progresso salvo`);
    if (!this.flags.brasa) {
      this.flags.brasa = true;
      this.dialogQueue([
        ['Pira', 'As brasas da pira se agarram aos seus dedos. Uma inscrição queima no ar:'],
        ['Grimório', 'Feitiço aprendido: BRASA LANÇADA (Fogo). Projétil rápido de curto alcance que aplica queimadura. Custa 18 de Foco.'],
        ['Grimório', 'Foco recupera fora de combate, a cada golpe corpo a corpo e ao aparar com perfeição.'],
      ]);
    }
    this.save();
  }

  // Ervas comuns voltam após um descanso; a Flor de Cinza (rara) após dois
  restHerbs() {
    for (const it of this.interactables) {
      if (it.type !== 'herb' || it.state === 0) continue;
      const left = (this.prog.herbRests[it.id] || 1) - 1;
      if (left <= 0) { it.state = 0; delete this.prog.herbRests[it.id]; } else this.prog.herbRests[it.id] = left;
    }
  }
  applyHerbState() {
    for (const it of this.interactables) if (it.type === 'herb' && this.prog.herbRests[it.id]) it.state = 1;
  }
  collectHerb(it) {
    if (it.state !== 0) return;
    it.state = 1;
    const h = HERBS[it.herb];
    this.prog.herbs[it.herb] = (this.prog.herbs[it.herb] || 0) + 1;
    this.prog.herbRests[it.id] = h.rare ? 2 : 1;
    sfx.heal();
    this.fx.burst(it.x, it.y - 6, 10, h.color, 40, 0.6, -20, 1);
    this.toast(`+1 ${h.name}`);
  }

  openChest(it) {
    if (it.needs && !this.flags[it.needs]) { this.toast('Selado pela vibração do sino ancestral'); return; }
    this.flags.chests[it.id] = true;
    sfx.chest();
    this.fx.burst(it.x, it.y - 8, 20, '#ffd27a', 60, 0.8, 60, 2);
    const p = this.player;
    const lines = [];
    if (it.reward === 'flask') {
      p.maxPotions = Math.min(PLAYER.maxPotionsCap, p.maxPotions + 1); p.potions = p.maxPotions;
      lines.push(['Baú secreto', `Você encontrou um Frasco Vazio. Frascos de poção: ${p.maxPotions}.`]);
    }
    if (it.reward === 'weapon') {
      const r = grantWeapon(this.prog, it.weapon);
      lines.push(['Baú', r === 'new' ? `Arma obtida: ${WEAPONS[it.weapon].name} (${WEAPONS[it.weapon].cat}). ${WEAPONS[it.weapon].desc} Equipe pelo inventário [I].` : `${WEAPONS[it.weapon].name} repetida: virou 1 Fragmento de Memória.`]);
    }
    const coins = it.reward === 'coins' ? it.amount : it.coins;
    if (coins) { this.addCoins(coins, it.x, it.y - 14); lines.push(['Baú', `${coins} moedas.`]); }
    if (lines.length) this.dialogQueue(lines);
    this.save();
  }

  pullLever(it) {
    this.flags.shortcut = true;
    this.level.openShortcut();
    sfx.breakWall(); sfx.chest();
    this.shake = 4;
    this.toast('Atalho aberto: o alçapão de Cinzeiral', 4);
    this.save();
  }

  returnToCheckpoint(fromPortal) {
    const p = this.player;
    sfx.rest();
    this.fx.burst(p.cx(), p.cy(), 24, '#d9b58a', 70, 0.8, -30, 2);
    const cp = fromPortal ? this.interactables.find((i) => i.id === 'cinzeiral') : this.checkpoint;
    p.x = cp.x - p.w / 2 - 20; p.y = cp.y - p.h; p.vx = p.vy = 0;
    this.snapCamera();
    this.toast(fromPortal ? 'A cinza te leva de volta a Cinzeiral' : `Selo de Retorno: ${cp.name}`);
  }

  // ---------- chefe ----------
  bossReward() {
    const p = this.player, pr = this.prog;
    const first = !this.flags.bossDefeated;
    const lines = [];
    this.flags.bossDefeated = true;
    this.flags.bossWins = (this.flags.bossWins || 0) + 1;
    if (first) {
      pr.arcana[0] = 'louco';
      p.activeSlot = 0;
      if (!pr.relicsOwned.includes('cinza')) pr.relicsOwned.push('cinza');
      if (!pr.relicSlots.includes('cinza')) pr.relicSlots[pr.relicSlots.indexOf(null) >= 0 ? pr.relicSlots.indexOf(null) : 0] = 'cinza';
      pr.materials.cinzaviva = (pr.materials.cinzaviva || 0) + 1;
      // A primeira centelha: o Arcano chega com Maestria I
      pr.mastery.louco = Math.max(pr.mastery.louco || 0, 100);
      this.addCoins(BOSS.coins);
      lines.push(['Arcano Maior', `O LOUCO está equipado como Arcano Primário (Maestria I). Habilidade: ${ARCANA.louco.abilities[0].name}: ${ARCANA.louco.abilities[0].desc} Custa 20 de Foco.`]);
      lines.push(['Relíquia', `${RELICS.cinza.name}: ${RELICS.cinza.desc}`]);
      lines.push(['Material', `Cinza Viva do Louco, e ${BOSS.coins} moedas.`]);
    } else {
      this.addCoins(BOSS.coinsRematch);
      lines.push(['Eco de Asgmor', `O eco se desfaz. ${BOSS.coinsRematch} moedas.`]);
    }
    // Arma-signatura: 35% na 1ª vitória, 15% nas seguintes, +10 p.p. por falha até 75%
    if (pr.weapons.ruptura === undefined) {
      const base = first ? 0.35 : 0.15;
      const chance = Math.min(0.75, base + 0.1 * (pr.rupturaFails || 0));
      if (Math.random() < chance) {
        grantWeapon(pr, 'ruptura');
        lines.push(['Arma-signatura', `RUPTURA! ${WEAPONS.ruptura.desc}`]);
      } else {
        pr.rupturaFails = (pr.rupturaFails || 0) + 1;
        lines.push(['Arma-signatura', `A Ruptura não se formou desta vez (chance atual ${Math.round(Math.min(0.75, 0.15 + 0.1 * pr.rupturaFails) * 100)}%). Toque o grande sino para enfrentar o eco de Asgmor de novo.`]);
      }
    }
    return { first, lines };
  }

  onBossDefeated() {
    const p = this.player;
    const { first, lines } = this.bossReward();
    this.bossFight = false;
    this.arenaLocked = false;
    this.level.setGate(false);
    p.hp = p.maxHp;
    this.ashUp = true;
    sfx.victory();
    this.checkpoint = { ...this.interactables.find((i) => i.id === 'campanario') };
    this.save();
    if (first) {
      this.banner = { text: 'ARCANO LIBERTO', sub: 'O Louco: Passo Sem Destino', t: 0, dur: 4.5 };
      this.afterBanner = () => this.dialogQueue([
        ...lines,
        ['Memória', 'A cinza não desaparece. Ela começa a cair para cima. O mundo voltou a se mover.'],
        ['Memória', 'Por um instante você lembra de um clarão branco... e de um espaço vazio onde algo deveria estar. Você.'],
        ['Elion', '(Uma voz distante) Volte a Cinzeiral, Errante. O portal de cinza no fim da arena te leva. Ainda faltam vinte e um.'],
      ], () => { this.toast('Fim da Região 1. Explore, aprimore armas e enfrente o eco de Asgmor', 6); });
    } else {
      this.banner = { text: 'ECO DESFEITO', sub: 'Asgmor volta ao silêncio', t: 0, dur: 3, small: true };
      this.afterBanner = () => this.dialogQueue(lines);
    }
  }

  startRematch() {
    sfx.crackedBell();
    this.boss.reset();
    this.boss.isEcho = true;
    this.toast('O grande sino ecoa... o eco de Asgmor desperta', 3);
  }

  onPlayerDeath() {
    const p = this.player;
    this.resetMobs();
    // a porta reabre após a morte; o chefe volta ao início (ou ao silêncio, se já foi vencido)
    this.boss.reset();
    if (this.flags.bossDefeated) { this.boss.dead = true; this.boss.deathT = 99; this.boss.isEcho = false; }
    this.level.setGate(false);
    this.arenaLocked = false;
    this.bossFight = false;
    p.respawn(this.checkpoint.x, this.checkpoint.y);
    this.snapCamera();
  }

  // ---------- armadilhas e mecanismos da cripta ----------
  updateCrypt(dt) {
    const p = this.player;
    for (const it of this.interactables) {
      if (it.type === 'falsebell' && it.state === 0) {
        // passar sob um sino falso o faz tocar e chama uma patrulha
        if (Math.abs(p.cx() - it.x) < 10 && p.y < it.y + 60 && p.y > it.y && p.action !== 'dodge') {
          it.state = 1;
          sfx.bell(330, 0.12);
          this.shake = 2;
          this.toast('O sino falso tocou! Algo se aproxima');
          this.summon('cinzeiro', it.x - 110, it.y + 6 * TILE);
        }
      }
      if (it.type === 'vent') {
        it.t += dt;
        const cyc = it.t % 4;
        it.phase = cyc < 1.1 ? 'warn' : cyc < 2.4 ? 'gust' : 'calm';
        const inRoom = p.cx() > 71 * TILE && p.cx() < 100 * TILE && p.y > 25 * TILE && p.y < 32 * TILE;
        const near = p.y > 20 * TILE && Math.abs(p.cx() - it.x) < 520;
        if (!near) continue;
        if (it.phase === 'warn' && Math.random() < 0.5) this.fx.parts.push({ x: it.x + Math.random() * 10, y: 26 * TILE + Math.random() * 90, vx: 60 + Math.random() * 40, vy: 0, life: 0.6, max: 0.6, color: '#7a726c', grav: 0, size: 1 });
        if (it.phase === 'gust') {
          for (let i = 0; i < 3; i++) this.fx.parts.push({ x: it.x + Math.random() * 20, y: 26 * TILE + Math.random() * 96, vx: 260 + Math.random() * 120, vy: (Math.random() - 0.5) * 20, life: 1.4, max: 1.4, color: Math.random() < 0.3 ? '#b66a3b' : '#9a918a', grav: 0, size: 2 });
          if (inRoom && !this.sheltered(it.x, p)) {
            p.x += 125 * dt;
            if (Math.random() < 0.03) this.toast('A cinza soprada te empurra. Abrigue-se atrás dos pilares');
          }
        }
      }
    }
  }
  sheltered(ventX, p) {
    const row = Math.floor((p.y + p.h - 4) / TILE);
    for (let tx = Math.floor(ventX / TILE) + 1; tx < Math.floor(p.cx() / TILE); tx++) if (this.level.solid(tx, row)) return true;
    return false;
  }

  updateFauna(dt) {
    const p = this.player;
    for (const f of this.fauna) {
      f.t += dt;
      const d = f.fx - p.cx();
      if (f.state === 'idle' && Math.abs(d) < 55 && Math.abs(f.fy - (p.y + p.h)) < 40) {
        f.state = 'flee'; f.facing = Math.sign(d) || 1;
        if (f.kind === 'gralhinha') { f.vx = f.facing * 70; f.vy = -90; sfx.caw(); }
        else f.vx = f.facing * (f.kind === 'rato' ? 110 : 80);
      }
      if (f.state === 'flee') {
        f.fx += f.vx * dt; f.fy += f.vy * dt;
        if (f.kind === 'gralhinha') f.vy -= 30 * dt;
        if (Math.abs(f.fx - f.hx) > 260) f.state = 'gone';
      } else if (f.state === 'idle' && f.kind !== 'gralhinha') {
        // pequenos passeios
        const w = Math.sin(f.t * 0.7 + f.hx) * 14;
        f.facing = Math.cos(f.t * 0.7 + f.hx) > 0 ? 1 : -1;
        f.fx = f.hx + w;
      }
    }
  }

  updateLoot(dt) {
    const p = this.player;
    for (const l of this.loot) {
      l.t += dt;
      if (!l.taken && Math.abs(l.x - p.cx()) < 12 && Math.abs(l.y - (p.y + p.h)) < 18) {
        l.taken = true;
        const r = grantWeapon(this.prog, l.id);
        sfx.chest();
        this.toast(r === 'new' ? `Arma obtida: ${WEAPONS[l.id].name}!` : `${WEAPONS[l.id].name} repetida: +1 Fragmento de Memória`, 4);
        this.save();
      }
    }
    this.loot = this.loot.filter((l) => !l.taken);
  }

  update(dt) {
    this.time += dt;
    this.prog.playTime = (this.prog.playTime || 0) + dt;
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
    // só atualiza inimigos perto da câmera (otimização)
    const cx = p.cx();
    for (const m of this.mobs) if (m.aggro || Math.abs(m.spawnX - cx) < 520 || Math.abs(m.cx() - cx) < 520) m.update(dt);
    for (const m of this.summons) m.update(dt);
    this.summons = this.summons.filter((m) => !(m.dead && m.deathT > 1));
    this.boss.update(dt);
    this.fx.update(dt, this);
    this.updateCrypt(dt);
    this.updateFauna(dt);
    this.updateLoot(dt);
    if (this.echo) { this.echo.t -= dt; if (this.echo.t <= 0) this.echo = null; }
    this.updateTips();

    const a = this.level.arena;
    const bossReady = !this.boss.dead && (!this.flags.bossDefeated || this.boss.isEcho);
    if (bossReady && !this.arenaLocked && p.x > a.trigger && p.y < 17 * TILE && !p.dead) {
      this.arenaLocked = true;
      this.level.setGate(true);
      this.boss.activate();
      this.banner = { text: this.boss.isEcho ? 'ECO DE ASGMOR' : 'ASGMOR', sub: 'O Louco corrompido', t: 0, dur: 2.6 };
    }

    this.inCombat = this.bossFight || this.targets().some((m) => m.aggro && Math.abs(m.cx() - p.cx()) < 300);
    if (this.ashUp && Math.random() < 0.3 && p.y < 22 * TILE) {
      this.fx.parts.push({ x: this.cam.x + Math.random() * VW, y: this.cam.y + VH + 4, vx: (Math.random() - 0.5) * 10, vy: -20 - Math.random() * 20, life: 6, max: 6, color: Math.random() < 0.3 ? '#d9b58a' : '#9a918a', grav: 0, size: 1 });
    }
    if (p.dead && p.deadT > 2.6 && !this.deathPending) this.deathPending = true;
    this.updateCamera(dt);
  }

  snapCamera() { this.updateCamera(1, true); }

  updateCamera(dt, snap = false) {
    const p = this.player;
    let tx = p.cx() - VW / 2 + p.facing * 24;
    let ty = p.y - VH * 0.62;
    const maxX = this.level.g[0].length * TILE - VW, maxY = this.level.g.length * TILE - VH;
    if (this.arenaLocked) {
      const a = this.level.arena;
      tx = Math.max(a.x0 - 8, Math.min(a.x1 - VW + 8, tx));
    }
    // na cripta a câmera não mostra o mundo acima do teto
    const inCrypt = this.level.isCave(Math.floor(p.cx() / TILE), Math.floor((p.y + 4) / TILE)) && p.y > 25 * TILE;
    if (inCrypt) ty = Math.max(ty, 22 * TILE - 8);
    tx = Math.max(0, Math.min(maxX, tx)); ty = Math.max(0, Math.min(maxY, ty));
    const k = snap ? 1 : 1 - Math.pow(0.002, dt);
    this.cam.x += (tx - this.cam.x) * k;
    this.cam.y += (ty - this.cam.y) * k;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 20);
  }
}
