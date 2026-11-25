import { TILE } from './physics.js';

// Região 1 — Vale das Cinzas (AREA_01). 18 salas em quatro setores + arena, conforme o dossiê da área.
// As salas novas são PROPOSTA de protótipo; a Cripta do Campanário (4 salas, opcional) foi preservada como estava.
export const W = 394;
export const H = 104;
const G = 50;              // piso da superfície
const CX = 30, CY = 32;    // deslocamento da cripta em relação ao mapa antigo
const TOP = 22;            // piso do alto do campanário

// id, nome, setor e retângulo em tiles (x0, y0, x1, y1): usados no mapa, nos nomes e na descoberta
export const ROOMS = [
  ['A01', 'Despertar', 'A', 2, 36, 36, 49], ['A02', 'Cinzeiral', 'A', 37, 36, 80, 49],
  ['A03', 'Pátio dos Sinos Tombados', 'A', 81, 36, 118, 51], ['A04', 'Galeria Carbonizada', 'A', 119, 42, 155, 49],
  ['B05', 'Ruínas do Campanário', 'B', 156, 43, 199, 49], ['B06', 'Telhados de Chapa', 'B', 156, 20, 189, 42],
  ['B07', 'Poço de Serviço', 'B', 183, 50, 187, 77], ['B08', 'Caverna de Cinza', 'B', 150, 72, 182, 77],
  ['B09', 'Passagem Baixa do Campanário', 'B', 112, 67, 149, 77],
  ['C10', 'Cripta de Serviço', 'C', 84, 68, 111, 83], ['C11', 'Fundações', 'C', 84, 84, 130, 93],
  ['C12', 'Mecanismo dos Sinos', 'C', 131, 82, 166, 93], ['C13', 'Cisterna de Fuligem', 'C', 167, 84, 206, 97],
  ['C14', 'Galeria das Correntes', 'C', 207, 50, 232, 93],
  ['D15', 'Pátio do Sino-Fendido', 'D', 200, 36, 236, 49], ['D16', 'Subida Externa Quebrada', 'D', 237, 18, 262, 49],
  ['D17', 'Escadaria do Campanário', 'D', 263, 8, 290, 21], ['D18', 'Antecâmara', 'D', 291, 14, 305, 21],
  ['ARENA', 'Campanário Caído', 'ARENA', 306, 6, 389, 21],
  ['S1', 'Sala sob a Passagem', 'SEGREDO', 119, 74, 127, 77], ['S2', 'Nicho dos Telhados', 'SEGREDO', 160, 28, 165, 31],
  ['X1', 'Cripta: Sinos Falsos', 'CRIPTA', 131, 50, 162, 63], ['X2', 'Cripta: Cinza Soprada', 'CRIPTA', 101, 58, 130, 63],
  ['X3', 'Cripta: Passagem do Atalho', 'CRIPTA', 71, 51, 100, 63], ['X4', 'Cripta: Sino-Fendido', 'CRIPTA', 40, 55, 70, 63],
].map(([id, name, sector, x0, y0, x1, y1]) => ({ id, name, sector, x0, y0, x1, y1 }));

export class Level {
  constructor() {
    this.g = Array.from({ length: H }, () => Array(W).fill('.'));
    this.spawns = []; this.props = []; this.caves = []; this.ver = 0; this.mats = []; this.backs = []; this.posts = []; this.walls = [];
    this.build();
  }

  fill(x0, x1, y0, y1, c) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (y >= 0 && y < H && x >= 0 && x < W) this.g[y][x] = c;
    this.ver++;
  }
  // aparência (não muda a colisão): material da pedra, parede de fundo e pilares de apoio
  mat(x0, x1, y0, y1, m) { this.mats.push([x0, x1, y0, y1, m]); }
  back(x0, x1, y0, y1, m = 'tijolo') { this.backs.push([x0, x1, y0, y1, m]); }
  post(x0, x1, y) { this.posts.push([x0, y, x1]); }
  wall(x0, x1, y0, y1, m) { this.walls.push([x0, x1, y0, y1, m]); }
  look(list, tx, ty) { for (let i = list.length - 1; i >= 0; i--) { const r = list[i]; if (tx >= r[0] && tx <= r[1] && ty >= r[2] && ty <= r[3]) return r[4]; } return null; }
  matAt(tx, ty) { return this.look(this.mats, tx, ty) || 'rocha'; }
  backAt(tx, ty) { return this.look(this.backs, tx, ty); }
  wallTex(tx, ty) { return this.look(this.walls, tx, ty) || 'parede'; }
  ground(x0, x1, top) { this.fill(x0, x1, top, G - 1, '#'); }
  carve(x0, x1, y0, y1) { this.fill(x0, x1, y0, y1, '.'); this.caves.push([x0, y0, x1, y1]); }
  plat(x0, x1, y) { this.fill(x0, x1, y, y, '='); }
  shaftPlats(x0, x1, yTop, yBot) {
    const mid = Math.floor((x0 + x1) / 2);
    let k = 0;
    for (let y = yTop; y <= yBot; y += 3, k++) this.plat(k % 2 ? mid : x0, k % 2 ? x1 : mid, y);
  }
  spawn(type, x, y, extra = {}) { this.spawns.push({ type, x: x * TILE + TILE / 2, y: y * TILE, ...extra }); }
  prop(type, x, y, extra = {}) { this.props.push({ type, x: x * TILE + TILE / 2, y: y * TILE, ...extra }); }
  patrol(a, b) { return [a * TILE + TILE / 2, b * TILE + TILE / 2]; }

  build() {
    this.fill(0, W - 1, G, H - 1, '#');
    this.fill(0, 1, 0, H - 1, '#');
    this.fill(W - 4, W - 1, 0, H - 1, '#');

    // ================= SETOR A: perímetro e orientação =================
    // A01 Despertar: plano aberto, sem combate; o campanário aparece ao fundo
    this.spawn('player', 6, G);
    this.ground(20, 28, 49); this.ground(23, 26, 48);
    this.prop('column', 12, G, { broken: 1 }); this.prop('fallenbell', 31, G); this.prop('deadtree', 17, G); this.prop('deadtree', 34, G, { v: 1 });
    this.spawn('herb', 15, G, { id: 'liq1', herb: 'liquen' });
    this.spawn('chest', 25, 48, { id: 'primeira', reward: 'weapon', weapon: 'fio' });
    this.prop('ossos', 11, G); this.prop('estatua', 29, G);
    this.spawn('fauna', 25, 48, { kind: 'lagarto' });

    // A02 Cinzeiral: povoado seguro
    this.prop('casa1', 44, G); this.prop('casa2', 56, G); this.prop('forjaria', 65, G); this.prop('casa1', 74, G, { flip: 1 });
    this.prop('bellpost', 39, G); this.prop('bellpost', 78, G); this.prop('fallenbell', 53, G);
    this.spawn('shrine', 48, G, { id: 'cinzeiral', name: 'Pira de Cinzeiral' });
    this.spawn('elion', 52, G); this.spawn('morren', 60, G); this.spawn('ysara', 63, G);
    this.spawn('chest', 40, G, { id: 'inicial', reward: 'weapon', weapon: 'lanca' });
    this.spawn('herb', 55, G, { id: 'flor1', herb: 'flor' });
    this.spawn('pot', 45, G, { id: 'v1' }); this.spawn('pot', 71, G, { id: 'v2' }); this.spawn('crate', 50, G, { id: 'v3' });
    this.spawn('fauna', 46, G, { kind: 'rato' }); this.spawn('fauna', 58, G, { kind: 'gralhinha' }); this.spawn('fauna', 70, G, { kind: 'gralhinha' });

    // A03 Pátio dos Sinos Tombados: dois Cinzeiros separados
    this.ground(94, 102, 48); this.fill(107, 112, G, G + 1, '.');
    this.spawn('cinzeiro', 89, G, { patrol: this.patrol(86, 92) });
    this.spawn('cinzeiro', 110, G + 2, { patrol: this.patrol(108, 111) });
    this.spawn('cinzeiro', 98, 48); this.spawn('gralha', 103, G); this.spawn('cinzeiro', 116, G);
    this.prop('fallenbell', 84, G); this.prop('fallenbell', 99, 48); this.prop('bellpost', 115, G); this.prop('column', 105, G, { broken: 1 }); this.prop('deadtree', 91, G);
    this.spawn('herb', 97, 48, { id: 'flor2', herb: 'flor' }); this.spawn('pot', 101, 48, { id: 'v4' });

    // A04 Galeria Carbonizada: duelo com um Braseiro entre colunas
    this.fill(122, 152, 38, 41, '#'); this.caves.push([122, 42, 152, 49]);
    for (const x of [126, 134, 142, 149]) this.prop('column', x, G, { tall: 1 });
    this.prop('torch', 130, 46);
    this.prop('janela', 132, 47); this.prop('janela', 140, 47); this.prop('estandarte', 136, 46); this.prop('ossos', 128, G);
    this.spawn('braseiro', 138, G, { patrol: this.patrol(134, 142) });
    this.spawn('cinzeiro', 130, G); this.spawn('rasteja', 148, G);
    this.spawn('crate', 124, G, { id: 'v5' }); this.spawn('pot', 151, G, { id: 'v9' });
    this.spawn('herb', 145, G, { id: 'sal1', herb: 'salvia' });

    // ================= SETOR B: exploração e descida =================
    // B05 Ruínas: bifurcação (telhados acima, poço abaixo, torre fechada à frente)
    this.prop('column', 157, G, { broken: 1 }); this.prop('bellpost', 173, G); this.prop('deadtree', 179, G, { v: 1 });
    this.spawn('cinzeiro', 170, G, { patrol: this.patrol(166, 176) });
    this.spawn('braseiro', 178, G, { patrol: this.patrol(174, 181) }); this.spawn('gralha', 168, G);
    this.fill(190, 199, 10, G - 1, '#');                  // muralha do campanário: não se escala
    this.carve(190, 199, 46, 49); this.fill(191, 191, 46, 49, 'H'); // portão do atalho permanente
    this.spawn('sign', 188, G, { id: 'portao' });
    // B06 Telhados de Chapa: Gralha e Cinzeiro em alturas separadas; rota opcional com mirante e segredo
    this.plat(164, 167, 47); this.plat(169, 172, 44);
    this.fill(174, 181, 41, 42, '#'); this.plat(183, 186, 38); this.plat(178, 180, 35);
    this.fill(159, 174, 32, 33, '#');
    this.fill(159, 166, 27, 27, '#'); this.fill(159, 159, 28, 31, '#'); this.fill(166, 166, 28, 31, 'X');
    this.spawn('chest', 162, 32, { id: 'secreto', reward: 'flask' });
    this.plat(177, 180, 29); this.fill(183, 188, 27, 28, '#');
    this.spawn('stone', 187, 27, { id: 'mirante' });
    this.spawn('chest', 184, 27, { id: 'mirante', reward: 'coins', amount: 120 });
    this.spawn('cinzeiro', 178, 41, { patrol: this.patrol(175, 180) });
    this.spawn('gralha', 171, 32);
    this.spawn('braseiro', 168, 32, { elite: 1 }); this.spawn('gralha', 174, 32);
    // B07 Poço de Serviço: a entrada real, sob as tábuas
    this.carve(183, 187, G, 77); this.plat(183, 187, G); this.plat(184, 186, 52); this.shaftPlats(183, 187, 54, 76);
    this.prop('wellframe', 185, G);
    // B08 Caverna de Cinza: corredor baixo com Rasteja-Fumaça
    this.carve(150, 187, 72, 77); this.shaftPlats(183, 187, 72, 76); this.fill(158, 167, 72, 74, '#');
    this.spawn('rasteja', 172, 78); this.spawn('rasteja', 154, 78);
    this.spawn('cinzeiro', 176, 78); this.spawn('rasteja', 163, 78, { elite: 1 });
    this.prop('torch', 178, 74); this.prop('torch', 152, 74); this.prop('gaiola', 170, 75); this.prop('ossos', 156, 78);
    this.spawn('herb', 163, 78, { id: 'liq2', herb: 'liquen' });
    // B09 Passagem Baixa: o caminho sobe pela plataforma; o segredo fica sob ela (deslize)
    this.carve(112, 149, 67, 77); this.fill(118, 128, 70, 77, '#');
    this.carve(119, 124, 74, 77); this.carve(125, 128, 77, 77);
    this.plat(133, 136, 75); this.plat(129, 131, 72); this.plat(113, 115, 75); this.plat(116, 117, 72);
    this.spawn('chest', 121, 78, { id: 'passagem', reward: 'weapon', weapon: 'agulhas', coins: 60 });
    this.prop('crack', 129, 78);
    this.spawn('cinzeiro', 141, 78, { patrol: this.patrol(138, 146) });
    this.spawn('cinzeiro', 123, 70); this.prop('torch', 147, 73); this.prop('torch', 115, 70);
    this.spawn('braseiro', 145, 78, { patrol: this.patrol(138, 147) }); this.spawn('cinzeiro', 115, 78); this.prop('janela', 143, 74); this.prop('estatua', 146, 78);

    // ================= SETOR C: complexo interno =================
    // C10 Cripta de Serviço
    this.carve(84, 111, 68, 77); this.fill(111, 111, 68, 72, '#');
    this.spawn('braseiro', 100, 78, { patrol: this.patrol(96, 105) }); this.spawn('cinzeiro', 93, 78);
    this.spawn('braseiro', 106, 78); this.spawn('cinzeiro', 98, 78);
    this.spawn('pot', 108, 78, { id: 'v10' }); this.spawn('crate', 104, 78, { id: 'v11' });
    for (const x of [90, 106]) this.prop('torch', x, 73);
    for (const x of [94, 98, 102]) this.prop('coffin', x, 78);
    this.prop('janela', 97, 75); this.prop('estandarte', 103, 74); this.prop('gaiola', 109, 75);
    this.carve(84, 88, 78, 83); this.plat(84, 88, 78);
    // C11 Fundações
    this.carve(84, 130, 84, 93); this.shaftPlats(84, 88, 79, 92);
    this.fill(98, 99, 89, 93, '#'); this.fill(112, 113, 88, 93, '#');
    this.plat(94, 96, 91); this.plat(102, 105, 90); this.plat(107, 110, 90); this.plat(115, 118, 91);
    this.spawn('rasteja', 92, 94); this.spawn('gralha', 106, 94); this.spawn('cinzeiro', 122, 94, { patrol: this.patrol(118, 127) });
    this.spawn('braseiro', 126, 94, { elite: 1 }); this.spawn('rasteja', 110, 94); this.spawn('gralha', 120, 94);
    this.spawn('herb', 104, 94, { id: 'sal2', herb: 'salvia' }); this.prop('torch', 101, 86); this.prop('torch', 121, 87); this.prop('ossos', 126, 94); this.prop('gaiola', 106, 88); this.prop('estatua', 92, 94);
    // C12 Mecanismo dos Sinos: duas alavancas de sino abrem a comporta (sem item, sem Arcano)
    this.carve(131, 166, 82, 93); this.fill(130, 130, 84, 89, '#');
    this.spawn('shrine', 134, 94, { id: 'fundacoes', name: 'Pira das Fundações' });
    this.plat(139, 142, 91); this.plat(144, 147, 88); this.plat(150, 153, 87); this.plat(156, 159, 84);
    this.spawn('lever', 146, 88, { id: 'mec1' }); this.spawn('lever', 158, 84, { id: 'mec2' });
    this.prop('engrenagem', 151, 92, { scale: 1.2 }); this.prop('janela', 140, 90); this.prop('janela', 161, 90); this.spawn('braseiro', 161, 94, { patrol: this.patrol(155, 163) });
    this.spawn('cinzeiro', 152, 94); this.spawn('gralha', 148, 94); this.spawn('cinzeiro', 158, 94);
    this.fill(167, 167, 82, 89, '#'); this.fill(167, 167, 90, 93, 'M');
    this.spawn('sign', 165, 94, { id: 'comporta' });
    // C13 Cisterna de Fuligem: por cima, rota segura; no fundo, risco e recompensa
    this.carve(168, 206, 84, 97); this.fill(168, 173, 94, 97, '#'); this.fill(200, 206, 94, 97, '#');
    this.plat(176, 179, 93); this.plat(183, 186, 92); this.plat(190, 193, 92); this.plat(196, 198, 93); this.plat(174, 175, 96); this.plat(198, 199, 96);
    this.spawn('rasteja', 181, 98); this.spawn('cinzeiro', 189, 98); this.spawn('gralha', 188, 98);
    this.spawn('rasteja', 186, 98, { elite: 1 }); this.spawn('cinzeiro', 192, 98); this.spawn('gralha', 180, 98); this.spawn('braseiro', 203, 94);
    this.spawn('chest', 194, 98, { id: 'fosso', reward: 'coins', amount: 160 });
    this.spawn('herb', 178, 98, { id: 'liq3', herb: 'liquen' }); this.prop('torch', 171, 89); this.prop('torch', 203, 89); this.prop('janela', 187, 90); this.prop('ossos', 184, 98);
    // C14 Galeria das Correntes: subida de volta à luz
    this.carve(207, 232, 82, 93); this.spawn('braseiro', 216, 94, { patrol: this.patrol(212, 221) });
    this.spawn('braseiro', 223, 94, { elite: 1 }); this.spawn('cinzeiro', 211, 94); this.spawn('gralha', 218, 94);
    this.carve(226, 231, G, 81); this.plat(226, 231, G); this.shaftPlats(226, 231, 53, 92);
    for (const x of [210, 219]) this.prop('gaiola', x, 87 + (x % 2));
    this.prop('sinao', 214, 90); this.prop('estandarte', 224, 88);
    this.prop('torch', 212, 88); this.prop('torch', 222, 88);

    // ================= SETOR D: acesso profundo =================
    // D15 Pátio do Sino-Fendido (especialista) e o portão do atalho
    this.spawn('lever', 202, G, { id: 'portao' });
    this.spawn('sino', 214, G); this.spawn('cinzeiro', 208, G); this.spawn('gralha', 221, G);
    this.spawn('rasteja', 222, G); this.spawn('braseiro', 229, G);
    this.prop('fallenbell', 206, G); this.prop('column', 224, G, { broken: 1 }); this.prop('estatua', 231, G); this.prop('ossos', 211, G); this.prop('bellpost', 234, G);
    this.spawn('herb', 218, G, { id: 'flor3', herb: 'flor' });
    // D16 Subida Externa Quebrada
    this.fill(263, W - 1, TOP, H - 1, '#');
    this.plat(240, 244, 47); this.fill(248, 253, 44, 45, '#'); this.plat(256, 259, 41); this.plat(250, 253, 38);
    this.fill(241, 246, 35, 36, '#'); this.plat(248, 251, 32); this.plat(254, 257, 29); this.fill(259, 262, 26, 27, '#'); this.plat(257, 260, 23);
    this.spawn('gralha', 251, 38); this.spawn('gralha', 249, 32); this.spawn('cinzeiro', 244, 35);
    this.spawn('cinzeiro', 250, 44); this.spawn('gralha', 252, 44, { elite: 1 });
    // D17 Escadaria: sem inimigos, com o marco de retorno
    this.prop('column', 268, TOP); this.prop('column', 278, TOP, { broken: 1 }); this.prop('bellpost', 273, TOP);
    this.spawn('shrine', 284, TOP, { id: 'campanario', name: 'Pira do Campanário' });
    // D18 Antecâmara
    this.fill(291, 305, 12, 13, '#'); this.caves.push([292, 14, 304, 21]); this.fill(291, 291, 12, 16, '#');
    this.fill(304, 304, 18, 21, 'K'); this.spawn('sign', 302, TOP, { id: 'chefe' }); this.prop('janela', 297, 20); this.prop('estatua', 293, TOP); this.prop('estandarte', 294, 19);
    this.spawn('stone', 297, TOP, { id: 'antessala' }); this.prop('torch', 301, 18);

    // ================= ARENA: Campanário Caído (3,5 telas) =================
    this.arena = { x0: 306 * TILE, x1: (W - 4) * TILE, gateX: 305, gateY: 18, trigger: 317 * TILE, floor: TOP, plats: [320, 347, 375] };
    this.fill(305, 305, 0, 17, '#');
    this.plat(318, 322, 19); this.plat(345, 349, 18); this.plat(373, 377, 19);
    this.prop('column', 312, TOP, { broken: 1 }); this.prop('column', 382, TOP, { broken: 1 });
    this.prop('bigbell', 347, TOP); this.prop('ashcircle', 318, TOP);
    this.spawn('boss', 354, TOP);
    this.spawn('bigbell', 347, TOP, { id: 'revanche' });
    this.spawn('portal', 386, TOP, { id: 'portal' });

    this.buildCrypt();
    this.dress();
  }

  // Acabamento visual: materiais, fachadas sob os telhados, apoios e adereços encaixados
  dress() {
    const X = (x) => x + CX, Y = (y) => y + CY, T = 'tijolo';
    // materiais
    this.mat(20, 28, 48, 49, T); this.mat(94, 102, 48, 49, T);
    this.mat(122, 152, 38, 41, T); this.mat(122, 152, 38, 38, 'telha');
    this.mat(190, 199, 10, 45, T); this.mat(174, 181, 41, 42, 'telha'); this.mat(159, 174, 32, 33, 'telha'); this.mat(159, 166, 27, 27, 'telha'); this.mat(159, 159, 28, 31, T); this.mat(166, 166, 28, 31, T); this.mat(183, 188, 27, 28, 'telha');
    this.mat(248, 253, 44, 45, T); this.mat(241, 246, 35, 36, T); this.mat(259, 262, 26, 27, T); this.mat(263, 264, TOP, 49, T);
    this.mat(291, 305, 0, 17, T); this.mat(118, 128, 70, 77, T); this.mat(111, 111, 68, 72, T); this.mat(98, 99, 89, 93, T); this.mat(112, 113, 88, 93, T); this.mat(130, 130, 84, 89, T); this.mat(167, 167, 82, 89, T); this.mat(168, 173, 94, 97, T); this.mat(200, 206, 94, 97, T);
    for (const x of [79, 87, 95]) this.mat(X(x), X(x), Y(29), Y(31), T);
    for (const x of [100, 70, 40]) this.mat(X(x), X(x), Y(23), Y(28), T);
    // paredes de dentro
    this.wall(122, 152, 42, 49, T); this.wall(292, 304, 14, 21, T); this.wall(183, 187, 50, 71, T); this.wall(150, 187, 72, 77, 'rocha'); this.wall(168, 206, 84, 97, 'rocha'); this.wall(226, 231, 50, 81, T);
    // casas sob os telhados e torre quebrada da subida
    this.back(175, 180, 43, 49); this.back(160, 173, 34, 49); this.back(160, 165, 28, 31); this.back(249, 252, 46, 49); this.back(242, 245, 37, 49); this.back(259, 262, 28, 49);
    this.post(183, 188, 28);
    for (const [x, y] of [[163, 46], [168, 46], [172, 40], [164, 40], [178, 47], [243, 46], [244, 41], [251, 49], [260, 34], [261, 41], [260, 47]]) this.prop('jan2', x, y);
    // ---- adereços de fora ----
    const P = (t, ...xs) => { for (const q of xs) { const [x, y, e] = Array.isArray(q) ? q : [q, G]; this.prop(t, x, y === undefined ? G : y, e || {}); } };
    P('murinho', 4, [33, G, { flip: 1 }], [92, G], 117, 168, [235, G, { flip: 1 }]);
    P('lapide', 9, [35, G, { flip: 1 }], 87, [93, G, { flip: 1 }], 165, 209, [270, TOP]);
    P('cruz', 18, 88, 166, 216, [276, TOP]);
    P('lanca', [21, 49], [96, 48], 220, [275, TOP], [330, TOP], [359, TOP, { flip: 1 }]);
    P('cerca', 37, [82, G], 158, 228, [266, TOP]);
    P('placa', 38, 181); P('lampiao', 51, [69, G, { flip: 1 }], 119, [281, TOP], [288, TOP, { flip: 1 }]);
    P('carroca', 80, 104, 203); P('lenha', 68, 172); P('barrilq', 71, 106, 179, [201, 94]); P('varal', 60, 177);
    P('entulho', 113, 246, [309, TOP], [365, TOP], [380, TOP, { flip: 1 }]); P('gelo', 27, 101, 258, [277, TOP], [341, TOP], [371, TOP]);
    P('moita', 13, 84, 157, 225, [269, TOP], [325, TOP]); P('cabeca', [337, TOP], [116, 94], [231, 94]);
    // ---- adereços de dentro ----
    P('candelabro', 128, 144, [139, 78], [91, 78], [133, 94], [295, TOP], [X(16), Y(32)], [X(30), Y(32)], [X(62), Y(32)]);
    P('velas', 133, [160, 78], [96, 78], [90, 94], [207, 94], [299, TOP], [X(50), Y(32)], [X(112), Y(32)]);
    P('armas', 147, [132, 78], [229, 94]); P('estante', [X(34), Y(32)], [163, 94], [114, 78]); P('altar', 130, [110, 78], [X(20), Y(32)]);
    P('correntes', 124, [166, 78], [124, 94], [149, 94], [209, 94], [X(39), Y(32)], [X(118), Y(32)]); P('desabe', [186, 78], [101, 94], [X(98), Y(32)], [X(75), Y(32)]);
    P('nicho', [152, 76], [92, 76], [128, 92], [170, 92], [204, 92], [X(115), Y(30)], [X(84), Y(30)]); P('suporte', [135, 73], [117, 91], [155, 88], [X(48), Y(29)], [X(120), Y(29)]);
    // pendurados: y é o teto
    const Hg = (t, ...xs) => { for (const [x, y] of xs) this.prop(t, x, y, { top: 1 }); };
    Hg('lustre', [145, 42], [100, 68], [137, 82], [217, 82], [298, 14], [X(110), Y(26)], [X(55), Y(26)], [X(25), Y(23)]);
    Hg('raizes', [155, 72], [175, 72], [95, 84], [118, 84], [181, 84], [196, 84], [X(76), Y(26)], [X(92), Y(26)]);
    Hg('trapo', [128, 42], [139, 67], [229, 82], [106, 68], [X(45), Y(26)], [X(106), Y(26)], [302, 14]);
    this.water = [[174, 199, 97 * TILE + 7]];
    for (let y = 40; y < H - 1; y++) for (let x = 2; x < W - 2; x++) {
      if (!this.isCave(x, y) || this.get(x, y) !== '.' || this.get(x, y - 1) !== '#') continue;
      const h = Math.abs(Math.sin(x * 91.7 + y * 37.3) * 43758.5) % 1;
      if (h > 0.45 && this.get(x - 1, y) === '#') this.props.push({ type: 'teia', x: x * TILE, y: y * TILE, top: 1 });
      else if (h > 0.45 && this.get(x + 1, y) === '#') this.props.push({ type: 'teia', x: (x + 1) * TILE, y: y * TILE, top: 1, flip: 1 });
    }
  }

  // Cripta do Campanário: 4 salas, opcional, com o mesmo desenho de antes
  buildCrypt() {
    const X = (x) => x + CX, Y = (y) => y + CY;
    this.carve(X(130), X(132), G, Y(25));
    this.prop('cryptgate', X(131), G);
    for (const x of [112, 60, 25]) this.prop('janela', X(x), Y(30));
    this.prop('gaiola', X(118), Y(30)); this.prop('ossos', X(55), Y(32)); this.prop('estatua', X(37), Y(32));
    this.carve(X(101), X(132), Y(26), Y(31)); this.carve(X(71), X(100), Y(26), Y(31)); this.carve(X(41), X(70), Y(26), Y(31)); this.carve(X(10), X(40), Y(23), Y(31));
    for (const y of [G, 53, 56, 59, 61]) this.plat(X(130), X(132), y);
    for (const x of [79, 87, 95]) this.fill(X(x), X(x), Y(29), Y(31), '#');
    this.fill(X(43), X(45), G, G, 'D');
    this.carve(X(43), X(45), G + 1, Y(25));
    for (const y of [53, 56, 59, 61]) this.plat(X(43), X(45), y);
    this.fill(X(100), X(100), Y(26), Y(28), '#'); this.fill(X(70), X(70), Y(26), Y(28), '#'); this.fill(X(40), X(40), Y(23), Y(28), '#');
    this.crypt = {
      x0: X(8), x1: X(134), y0: Y(22), y1: Y(32), trap: [X(43), X(45)],
      room1: [X(101), X(130)], vento: { x0: X(71), x1: X(100), top: Y(26), bot: Y(32) },
    };
    this.spawn('falsebell', X(124), Y(26), { id: 'fb1' }); this.spawn('falsebell', X(113), Y(26), { id: 'fb2' }); this.spawn('falsebell', X(106), Y(26), { id: 'fb3' });
    this.spawn('cinzeiro', X(104), Y(32), { patrol: this.patrol(X(102), X(109)) });
    this.spawn('pot', X(128), Y(32), { id: 'v6' }); this.spawn('pot', X(102), Y(32), { id: 'v7' });
    this.spawn('vent', X(72), Y(32), { id: 'vento' });
    this.spawn('rasteja', X(90), Y(32));
    this.spawn('herb', X(80), Y(32), { id: 'sal3', herb: 'salvia' }); this.spawn('herb', X(96), Y(32), { id: 'sal4', herb: 'salvia' });
    this.spawn('braseiro', X(58), Y(32));
    this.spawn('chest', X(66), Y(32), { id: 'protegido', reward: 'weapon', weapon: 'agulhas', coins: 80 });
    this.spawn('lever', X(47), Y(32), { id: 'atalho' });
    this.spawn('crate', X(52), Y(32), { id: 'v8' }); this.spawn('herb', X(42), Y(32), { id: 'liq4', herb: 'liquen' });
    this.spawn('sinoElite', X(22), Y(32));
    this.spawn('chest', X(13), Y(32), { id: 'guardiao', reward: 'weapon', weapon: 'machado', coins: 200, needs: 'cryptSilenced' });
    for (const x of [105, 121, 76, 92, 50, 64, 15, 34]) this.prop('torch', X(x), Y(28));
  }

  get(tx, ty) {
    if (tx < 0 || tx >= W) return '#';
    if (ty < 0) return '.';
    if (ty >= H) return '#';
    return this.g[ty][tx];
  }
  set(tx, ty, c) { if (tx >= 0 && tx < W && ty >= 0 && ty < H) { this.g[ty][tx] = c; this.ver++; } }
  solid(tx, ty) { const c = this.get(tx, ty); return c !== '.' && c !== '='; }
  oneway(tx, ty) { return this.get(tx, ty) === '='; }
  isCave(tx, ty) {
    if (!this.caveMap) {
      this.caveMap = new Uint8Array(W * H);
      for (const [x0, y0, x1, y1] of this.caves) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.caveMap[y * W + x] = 1;
    }
    return tx >= 0 && ty >= 0 && tx < W && ty < H && this.caveMap[ty * W + tx] === 1;
  }
  roomAt(px, py) {
    const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
    let best = null;
    for (const r of ROOMS) {
      if (tx < r.x0 || tx > r.x1 || ty < r.y0 || ty > r.y1) continue;
      if (!best || (r.x1 - r.x0) * (r.y1 - r.y0) < (best.x1 - best.x0) * (best.y1 - best.y0)) best = r;
    }
    return best;
  }

  groundBelow(px, py) {
    const tx = Math.floor(px / TILE);
    for (let ty = Math.max(0, Math.floor(py / TILE)); ty < H; ty++) if (this.solid(tx, ty) || this.oneway(tx, ty)) return ty * TILE;
    return H * TILE;
  }
  solidGroundBelow(px, py) {
    const tx = Math.floor(px / TILE);
    for (let ty = Math.max(0, Math.floor(py / TILE)); ty < H; ty++) if (this.solid(tx, ty)) return ty * TILE;
    return H * TILE;
  }

  setGate(closed) { const a = this.arena; this.fill(a.gateX, a.gateX, a.gateY, a.gateY + 3, closed ? 'G' : '.'); }
  openShortcut() { const [a, b] = this.crypt.trap; this.fill(a, b, G, G, '.'); }
  replaceAll(from, to) { for (const row of this.g) for (let x = 0; x < W; x++) if (row[x] === from) row[x] = to; this.ver++; }
}
