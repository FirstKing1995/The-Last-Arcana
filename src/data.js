// Dados extraídos do Manual de Conteúdo (Volumes II–V) — região 1.
// Custos de Vigor e Foco seguem a tabela "Economia de combate" do Volume V.
export const PLAYER = {
  hp: 1000, vigor: 100, foco: 100, potions: 5, maxPotionsCap: 7,
  walk: 85, run: 140, jump: 335,
  light: { cost: 8, dur: 0.34, active: [0.09, 0.17] },
  heavy: { cost: 20, costCharged: 28, minCharge: 0.32, maxCharge: 0.85 },
  dodge: { cost: 18, dur: 0.36, iframes: [0.03, 0.27], speed: 235 },
  parry: { cost: 14, window: 0.2, dur: 0.45, foco: 8 },
  finisher: { dmg: 620, bossDmg: 900, cost: 15 },
  heal: { pct: 0.35, time: 2.5, anim: 0.95 },
};

export const SPELLS = {
  brasa: { name: 'Brasa Lançada', cost: 18, dmg: 160, speed: 270, range: 0.62 },
};

// Armas regionais do Vale das Cinzas (catálogo de 42 armas, Vol. II §5).
// combo: dano de cada golpe leve; reach: alcance em px; speed: multiplicador de velocidade.
export const WEAPONS = {
  fio: {
    name: 'Fio do Peregrino', cat: 'Espada', rarity: 'Comum', chance: 0.04, where: 'Vale das Cinzas; baús iniciais',
    desc: 'Corte rápido simples.', combo: [95, 95, 135], posture: [18, 18, 32], heavy: [230, 340], reach: 24, speed: 1, cost: 0,
  },
  lanca: {
    name: 'Lança de Cinza Longa', cat: 'Lança', rarity: 'Comum', chance: 0.04, where: 'Vale das Cinzas',
    desc: 'Estocada simples de alcance.', combo: [85, 85, 120], posture: [15, 15, 28], heavy: [215, 320], reach: 36, speed: 0.95, cost: 0, thrust: true,
  },
  machado: {
    name: 'Machado de Lenhador Cinzento', cat: 'Machado', rarity: 'Comum', chance: 0.04, where: 'Vale das Cinzas',
    desc: 'Golpe amplo e lento.', combo: [135, 135, 185], posture: [26, 26, 44], heavy: [310, 450], reach: 28, speed: 0.78, cost: 3, wide: true,
  },
  agulhas: {
    name: 'Agulhas do Errante', cat: 'Adagas', rarity: 'Comum', chance: 0.04, where: 'Vale das Cinzas',
    desc: 'Sequência rápida.', combo: [58, 58, 58, 58, 82], posture: [9, 9, 9, 9, 18], heavy: [170, 250], reach: 18, speed: 1.35, cost: -2,
  },
  ruptura: {
    name: 'Ruptura', cat: 'Arma-signatura', rarity: 'Rara', chance: 0.35, where: 'Asgmor, O Louco (35% na 1ª vitória; +10 p.p. por falha, até 75%)',
    desc: 'Após esquiva perfeita, o próximo golpe deixa cinza que explode depois de 0,8 s.', combo: [110, 110, 150], posture: [20, 20, 36], heavy: [250, 370], reach: 26, speed: 1, cost: 1, ash: true,
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

// PV e funções conforme a tabela "Os 115 mobs" — 01. Vale das Cinzas
export const MOBS = {
  cinzeiro: { name: 'Cinzeiro Trôpego', role: 'Bucha de canhão', hp: 170, posture: 60, dmg: 110, w: 10, h: 12, speed: 55, coins: 8, drop: 'agulhas' },
  braseiro: { name: 'Braseiro Oco', role: 'Intermediário', hp: 430, posture: 130, dmg: 165, w: 14, h: 22, speed: 45, coins: 22, drop: 'machado' },
  rasteja: { name: 'Rasteja-Fumaça', role: 'Rastejador', hp: 250, posture: 60, dmg: 130, w: 18, h: 7, speed: 95, coins: 10, drop: 'agulhas' },
  gralha: { name: 'Gralha de Fuligem', role: 'Voador', hp: 300, posture: 70, dmg: 120, w: 14, h: 10, speed: 70, coins: 12, drop: 'lanca' },
  sino: { name: 'Sino-Fendido', role: 'Especialista', hp: 820, posture: 220, dmg: 200, w: 22, h: 28, speed: 0, coins: 45, drop: 'lanca' },
  sinoElite: { name: 'Sino-Fendido Ancestral', role: 'Mini-chefe de dungeon', hp: 2800, posture: 420, dmg: 230, w: 26, h: 32, speed: 0, coins: 220 },
};

export const BOSS = { name: 'Asgmor, O Louco', hp: 8500, posture: 720, coins: 600, coinsRematch: 250 };
