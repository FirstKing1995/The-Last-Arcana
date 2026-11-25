// Dados extraídos do Manual de Conteúdo (Volumes II–V) — região 1.
// Custos de Vigor e Foco seguem a tabela "Economia de combate" do Volume V.
export const PLAYER = {
  hp: 1000, vigor: 100, foco: 100, potions: 5, maxPotionsCap: 7,
  run: 168, jump: 358,
  w: 12, h: 30, hLow: 15,   // altura normal e altura no deslize (o cabelo e os espinhos não entram na colisão)
  light: { cost: 8, dur: 0.34, active: [0.09, 0.17] },
  heavy: { cost: 20, costCharged: 28, minCharge: 0.32, maxCharge: 0.85 },
  dodge: { cost: 18, dur: 0.38, iframes: [0.02, 0.28], speed: 285 },
  parry: { cost: 14, window: 0.2, dur: 0.4, foco: 8 },
  finisher: { dmg: 620, bossDmg: 900, cost: 15 },
  drink: { anim: 0.8, cd: 1.5 },
  heal: { pct: 0.35, time: 2.5 },
};

// Poções (Parte 1 §1, 24/11): só três tipos, dividindo os mesmos frascos. A magia elemental foi removida.
export const POTIONS = {
  cura: { name: 'Poção de Cura', short: 'CURA', desc: '35% da vida máxima ao longo de 2,5 s.', color: '#7fc48a', dark: '#4f8f5e' },
  defesa: { name: 'Poção de Defesa', short: 'DEFESA', desc: '-15% de dano recebido por 45 s.', color: '#7fa8d8', dark: '#3f6a9a', dur: 45, mul: 0.85 },
  dano: { name: 'Poção de Dano', short: 'DANO', desc: '+15% de dano causado por 45 s.', color: '#e0704a', dark: '#9a4028', dur: 45, mul: 1.15 },
};
export const POTION_IDS = ['cura', 'defesa', 'dano'];
// Relíquia temática: chance por vitória, garantida na 6ª vitória sem obtê-la
export const RELIC_DROP = { cinza: { chance: 0.18, pity: 6 } };

// Armas regionais do Vale das Cinzas (catálogo de 42 armas, Vol. II §5).
// combo: dano de cada golpe leve; reach: alcance em px; speed: multiplicador de velocidade.
// Antes da primeira arma o Errante luta com os punhos.
export const FISTS = { name: 'Punhos', combo: [48, 48, 78], posture: [10, 10, 22], heavy: [120, 180], reach: 20, speed: 1.1, cost: -3 };
export const WEAPONS = {
  fio: {
    name: 'Fio do Peregrino', cat: 'Espada', rarity: 'Comum', chance: 0.04, where: 'Vale das Cinzas; baús iniciais',
    desc: 'Corte rápido simples.', combo: [95, 95, 135], posture: [18, 18, 32], heavy: [230, 340], reach: 34, speed: 1.05, cost: 0,
  },
  lanca: {
    name: 'Lança de Cinza Longa', cat: 'Lança', rarity: 'Comum', chance: 0.04, where: 'Vale das Cinzas',
    desc: 'Estocada simples de alcance.', combo: [85, 85, 120], posture: [15, 15, 28], heavy: [215, 320], reach: 50, speed: 1, cost: 0, thrust: true,
  },
  machado: {
    name: 'Machado de Lenhador Cinzento', cat: 'Machado', rarity: 'Comum', chance: 0.04, where: 'Vale das Cinzas',
    desc: 'Golpe amplo e lento.', combo: [135, 135, 185], posture: [26, 26, 44], heavy: [310, 450], reach: 38, speed: 0.86, cost: 3, wide: true,
  },
  agulhas: {
    name: 'Agulhas do Errante', cat: 'Adagas', rarity: 'Comum', chance: 0.04, where: 'Vale das Cinzas',
    desc: 'Sequência rápida.', combo: [58, 58, 58, 58, 82], posture: [9, 9, 9, 9, 18], heavy: [170, 250], reach: 26, speed: 1.4, cost: -2,
  },
  ruptura: {
    name: 'Ruptura', cat: 'Arma-signatura', rarity: 'Rara', chance: 0.35, where: 'Asgmor, O Louco (35% na 1ª vitória; +10 p.p. por falha, até 75%)',
    desc: 'Após esquiva perfeita, o próximo golpe deixa cinza que explode depois de 0,8 s.', combo: [110, 110, 150], posture: [20, 20, 36], heavy: [250, 370], reach: 40, speed: 1.02, cost: 1, ash: true,
  },
};
export const UPGRADE = { max: 5, dmgPerLevel: 0.06, coins: [150, 300, 500, 800, 1200], fragments: [0, 0, 1, 2, 3] };

export const ARCANA = {
  louco: {
    name: 'O Louco', title: 'Passo Sem Destino', color: '#d9b58a',
    abilities: [
      { name: 'Salto de Cinzas', desc: 'Avanço curto que atravessa inimigos leves.', cd: 6, dmg: 180, foco: 20, mastery: 1 },
      { name: 'Risco Calculado', desc: 'Esquiva perfeita fortalece o próximo golpe (+30% por 2 s).', mastery: 2, passive: true },
      { name: 'Caminho Improvável', desc: 'Esquiva deixa um eco que distrai inimigos por 1,5 s (intervalo de 4 s).', mastery: 3, passive: true },
    ],
  },
};
// Maestria (Vol. II §7): pontos acumulados por grau
export const MASTERY = [0, 100, 300, 650, 1100, 1700];
export const MASTERY_DESC = ['Arcano adquirido; habilidades bloqueadas.', 'Habilidade 1.', 'Habilidade 2 e pequeno ganho de eficiência.', 'Habilidade 3, assinatura do Arcano.', '5% de redução de recarga.', 'Efeito visual especial e 3% de eficiência.'];

export const RELICS = {
  cinza: { name: 'Cinza do Primeiro Passo', desc: 'A primeira esquiva em combate custa menos vigor.' },
};
export const RELIC_SLOTS = 2; // 2 no início; 3 após a região 8; 4 após a região 16

// Itens do Morren (Vol. V §3: bomba 220 de dano, até 3; óleo 45 s, +8%, até 2; selo de retorno)
export const ITEMS = {
  bomba: { name: 'Bomba de Fogo', desc: 'Dano 220 em área. Recarga de inventário 12 s. Máximo 3.', price: 120, max: 3 },
  oleo: { name: 'Óleo de Brasa', desc: '45 s: +8% de dano de fogo nos ataques físicos. Máximo 2.', price: 90, max: 2 },
  selo: { name: 'Selo de Retorno', desc: 'Volta à última pira. Não funciona na arena do chefe.', price: 60, max: 3 },
};
// Flora do Vale das Cinzas (Vol. IV §6) — vendida ao Morren
export const HERBS = {
  liquen: { name: 'Líquen de Brasa', price: 12, color: '#d56a32', rare: false },
  salvia: { name: 'Sálvia Cinzenta', price: 15, color: '#9aa58a', rare: false },
  flor: { name: 'Flor de Cinza', price: 40, color: '#e8dcc8', rare: true },
};
export const MATERIALS = {
  fragmento: { name: 'Fragmento de Memória', desc: 'Duplicatas de armas viram fragmentos. Usado por Ysara.' },
  cinzaviva: { name: 'Cinza Viva do Louco', desc: 'Material temático de Asgmor.' },
};

// Números do manual (tabela "Os 115 mobs") em `base`. O dono do jogo pediu luta bem mais dura em 25/11:
// FORCA multiplica vida, postura e dano por cima do manual. Para voltar ao manual, basta pôr tudo em 1.
export const FORCA = { hp: 1.75, posture: 1.45, dmg: 1.6, boss: 1.45 };
const mob = (name, role, hp, posture, dmg, o) => ({ name, role, base: { hp, posture, dmg }, hp: Math.round(hp * FORCA.hp), posture: Math.round(posture * FORCA.posture), dmg: Math.round(dmg * FORCA.dmg), ...o });
export const MOBS = {
  cinzeiro: mob('Cinzeiro Trôpego', 'Bucha de canhão', 170, 60, 110, { w: 16, h: 23, speed: 92, coins: 8, drop: 'agulhas' }),
  braseiro: mob('Braseiro Oco', 'Intermediário', 430, 130, 165, { w: 20, h: 40, speed: 74, coins: 22, drop: 'machado' }),
  rasteja: mob('Rasteja-Fumaça', 'Rastejador', 250, 60, 130, { w: 30, h: 11, speed: 135, coins: 10, drop: 'agulhas' }),
  gralha: mob('Gralha de Fuligem', 'Voador', 300, 70, 120, { w: 24, h: 18, speed: 120, coins: 12, drop: 'lanca' }),
  sino: mob('Sino-Fendido', 'Especialista', 820, 220, 200, { w: 34, h: 44, speed: 0, coins: 45, drop: 'lanca' }),
  sinoElite: mob('Sino-Fendido Ancestral', 'Mini-chefe de dungeon', 2800, 420, 230, { w: 44, h: 54, speed: 0, coins: 220 }),
};
// Endurecido: variante marcada no mapa (maior, com aura vermelha)
export const ELITE = { hp: 2.0, dmg: 1.3, posture: 1.6, coins: 3 };

export const BOSS = { name: 'Asgmor, O Louco', hp: 8500, posture: 720, coins: 600, coinsRematch: 250 };
