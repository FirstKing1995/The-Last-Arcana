// Progresso do jogador (inventário, maestria, flags) e salvamento local.
import { MASTERY, WEAPONS, UPGRADE, ITEMS } from './data.js';

const KEY = 'the-last-arcana.save.v2';
const OLD = 'the-last-arcana.save.v1'; // mapa antigo: aproveita o progresso, menos a posição

export function newProgress() {
  return {
    coins: 0,
    weapons: {},                // arma -> nível de aprimoramento (+0..+5); começa de mãos vazias
    equipped: null,
    relicsOwned: [],
    relicSlots: [null, null],
    items: { bomba: 1, oleo: 0, selo: 1 },
    quick: 'bomba',
    herbs: {},
    materials: {},
    arcana: [null, null],
    mastery: {},
    rupturaChance: 0.35,
    maxPotions: 5,
    prep: { cura: 3, defesa: 1, dano: 1 }, // como os frascos são preparados na pira
    potion: 'cura',
    relicTries: 0,
    rooms: {},                  // salas já visitadas (mapa)
    flags: { levers: {}, chave: false, bossDefeated: false, metElion: false, chests: {}, cryptSilenced: false, shortcut: false, metMorren: false, metYsara: false, bossWins: 0 },
    herbRests: {},              // plantas raras: descansos desde a coleta
    checkpoint: null,
    playTime: 0,
  };
}

export function hasSave() {
  try { return !!(localStorage.getItem(KEY) || localStorage.getItem(OLD)); } catch (_) { return false; }
}
export function loadProgress() {
  try {
    let raw = localStorage.getItem(KEY), old = false;
    if (!raw) { raw = localStorage.getItem(OLD); old = true; }
    if (!raw) return null;
    const data = JSON.parse(raw);
    const base = newProgress();
    if (old) { data.checkpoint = null; data.prep = { ...base.prep, cura: Math.max(3, (data.maxPotions || 5) - 2) }; }
    return { ...base, ...data, flags: { ...base.flags, ...(data.flags || {}) }, items: { ...base.items, ...(data.items || {}) } };
  } catch (_) { return null; }
}
export function saveProgress(prog) {
  try { localStorage.setItem(KEY, JSON.stringify(prog)); return true; } catch (_) { return false; }
}
export function clearSave() { try { localStorage.removeItem(KEY); localStorage.removeItem(OLD); } catch (_) {} }

export function masteryLevel(pts) {
  let lv = 0;
  for (let i = 0; i < MASTERY.length; i++) if (pts >= MASTERY[i]) lv = i;
  return lv;
}

export function weaponDamageMul(prog, id) {
  return 1 + (prog.weapons[id] || 0) * UPGRADE.dmgPerLevel;
}

// Recebe arma: duplicata vira Fragmento de Memória (Vol. II §1)
export function grantWeapon(prog, id) {
  if (prog.weapons[id] !== undefined) {
    prog.materials.fragmento = (prog.materials.fragmento || 0) + 1;
    return 'duplicate';
  }
  prog.weapons[id] = 0;
  prog.equipped = id; // a arma nova vai direto para a mão; T (ou a roda do mouse) troca
  return 'new';
}

export function addItem(prog, id, n = 1) {
  const max = ITEMS[id].max;
  const before = prog.items[id] || 0;
  prog.items[id] = Math.min(max, before + n);
  return prog.items[id] - before;
}

export function weaponName(prog, id) {
  const lv = prog.weapons[id] || 0;
  return WEAPONS[id].name + (lv ? ` +${lv}` : '');
}
