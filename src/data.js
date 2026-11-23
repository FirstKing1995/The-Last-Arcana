// Dados extraídos do Manual de Conteúdo (Volume II) — região 1.
export const PLAYER = {
  hp: 1000, vigor: 100, foco: 100, potions: 5, maxPotionsCap: 7,
  walk: 85, run: 140, jump: 335,
  light: { dmg: [95, 95, 135], posture: [18, 18, 32], cost: 12, dur: 0.34, active: [0.09, 0.17] },
  heavy: { dmg: 230, dmgCharged: 340, posture: 55, postureCharged: 90, cost: 26, minCharge: 0.32, maxCharge: 0.85 },
  dodge: { cost: 24, dur: 0.36, iframes: [0.03, 0.27], speed: 235 },
  parry: { cost: 10, window: 0.2, dur: 0.45, foco: 8 },
  finisher: { dmg: 620, bossDmg: 900 },
  heal: { pct: 0.35, time: 2.5, anim: 0.95 },
};

export const SPELLS = {
  brasa: { name: 'Brasa Lançada', cost: 18, dmg: 160, speed: 270, range: 0.62 },
};

export const ARCANA = {
  louco: {
    name: 'O Louco', title: 'Passo Sem Destino', color: '#d9b58a',
    ability: { name: 'Salto de Cinzas', desc: 'Avanço curto que atravessa inimigos leves.', cd: 6, dmg: 180 },
  },
};

export const RELICS = {
  cinza: { name: 'Cinza do Primeiro Passo', desc: 'A primeira esquiva em combate custa menos vigor.' },
};

// PV e funções conforme a tabela "Os 115 mobs" — 01. Vale das Cinzas
export const MOBS = {
  cinzeiro: { name: 'Cinzeiro Trôpego', role: 'Bucha de canhão', hp: 170, posture: 60, dmg: 110, w: 10, h: 12, speed: 55 },
  braseiro: { name: 'Braseiro Oco', role: 'Intermediário', hp: 430, posture: 130, dmg: 165, w: 14, h: 22, speed: 45 },
  rasteja: { name: 'Rasteja-Fumaça', role: 'Rastejador', hp: 250, posture: 60, dmg: 130, w: 18, h: 7, speed: 95 },
  gralha: { name: 'Gralha de Fuligem', role: 'Voador', hp: 300, posture: 70, dmg: 120, w: 14, h: 10, speed: 70 },
  sino: { name: 'Sino-Fendido', role: 'Especialista', hp: 820, posture: 220, dmg: 200, w: 22, h: 28, speed: 0 },
};

export const BOSS = { name: 'Asgmor, O Louco', hp: 8500, posture: 720 };
