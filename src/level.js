import { TILE } from './physics.js';

// Região 1 — Vale das Cinzas (Cinzeiral -> trilha -> Campanário Caído)
export const W = 240;
export const H = 24;

export class Level {
  constructor() {
    this.g = Array.from({ length: H }, () => Array(W).fill('.'));
    this.spawns = [];
    this.props = [];
    this.build();
  }

  fill(x0, x1, y0, y1, c) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (y >= 0 && y < H && x >= 0 && x < W) this.g[y][x] = c;
  }
  ground(x0, x1, top) { this.fill(x0, x1, top, H - 1, '#'); }
  plat(x0, x1, y) { this.fill(x0, x1, y, y, '='); }
  spawn(type, x, y, extra = {}) { this.spawns.push({ type, x: x * TILE + TILE / 2, y: y * TILE, ...extra }); }
  prop(type, x, y, extra = {}) { this.props.push({ type, x: x * TILE + TILE / 2, y: y * TILE, ...extra }); }

  build() {
    // Paredes externas
    this.fill(0, 1, 0, H - 1, '#');
    this.fill(W - 2, W - 1, 0, H - 1, '#');

    // Cinzeiral (povoado inicial)
    this.ground(2, 51, 17);
    this.prop('house', 5, 17); this.prop('house', 18, 17, { v: 1 }); this.prop('house', 30, 17);
    this.prop('bellpost', 10, 17); this.prop('bellpost', 36, 17); this.prop('bellpost', 46, 17);
    this.prop('fallenbell', 26, 17);
    this.spawn('player', 7, 17);
    this.spawn('shrine', 13, 17, { id: 'cinzeiral', name: 'Pira de Cinzeiral' });
    this.spawn('elion', 23, 17);

    // Trilha de cinza
    this.spawn('cinzeiro', 41, 17);
    this.spawn('cinzeiro', 48, 17);
    this.ground(52, 60, 15);
    this.prop('column', 55, 15);
    this.spawn('braseiro', 58, 15);

    // Fosso das fuligens
    this.ground(61, 86, 21);
    this.plat(66, 69, 15); this.plat(75, 78, 14); this.plat(82, 84, 15);
    this.plat(63, 65, 18); this.plat(78, 80, 18); this.plat(85, 86, 18);
    this.spawn('rasteja', 70, 21);
    this.spawn('rasteja', 76, 21);
    this.spawn('gralha', 74, 21);
    this.prop('fallenbell', 72, 21);

    // Ruínas e o nicho secreto
    this.ground(87, 132, 16);
    this.spawn('braseiro', 97, 16);
    this.spawn('cinzeiro', 104, 16);
    this.plat(104, 107, 13); this.plat(110, 113, 10);
    this.fill(115, 127, 7, 8, '#');
    this.fill(115, 127, 3, 3, '#');
    this.fill(127, 127, 4, 6, '#');
    this.fill(119, 119, 4, 6, 'X');
    this.spawn('chest', 124, 7, { id: 'secreto', reward: 'flask' });
    this.spawn('gralha', 112, 16);
    this.prop('column', 92, 16); this.prop('column', 129, 16, { broken: 1 });
    this.prop('bellpost', 100, 16);

    // Pátio do Sino-Fendido
    this.ground(133, 156, 16);
    this.spawn('cinzeiro', 136, 16);
    this.spawn('sino', 145, 16);
    this.spawn('gralha', 150, 16);

    // Antessala
    this.ground(157, 166, 16);
    this.spawn('shrine', 159, 16, { id: 'campanario', name: 'Pira do Campanário' });
    this.spawn('stone', 163, 16);

    // Campanário Caído — arena do chefe
    this.ground(167, W - 3, 16);
    this.arena = { x0: 168 * TILE, x1: (W - 2) * TILE, gateX: 167, trigger: 178 * TILE };
    this.fill(167, 167, 0, 11, '#');
    this.plat(182, 186, 13); this.plat(201, 205, 12); this.plat(220, 224, 13);
    this.prop('column', 176, 16, { broken: 1 }); this.prop('column', 229, 16, { broken: 1 });
    this.prop('bigbell', 203, 16);
    this.spawn('boss', 212, 16);
  }

  get(tx, ty) {
    if (tx < 0 || tx >= W) return '#';
    if (ty < 0) return '.';
    if (ty >= H) return '#';
    return this.g[ty][tx];
  }
  set(tx, ty, c) { if (tx >= 0 && tx < W && ty >= 0 && ty < H) this.g[ty][tx] = c; }
  solid(tx, ty) { const c = this.get(tx, ty); return c === '#' || c === 'X' || c === 'G'; }
  oneway(tx, ty) { return this.get(tx, ty) === '='; }

  // Primeira superfície (sólida ou plataforma) abaixo de py na coluna de px
  groundBelow(px, py) {
    const tx = Math.floor(px / TILE);
    for (let ty = Math.max(0, Math.floor(py / TILE)); ty < H; ty++) {
      if (this.solid(tx, ty) || this.oneway(tx, ty)) return ty * TILE;
    }
    return H * TILE;
  }
  solidGroundBelow(px, py) {
    const tx = Math.floor(px / TILE);
    for (let ty = Math.max(0, Math.floor(py / TILE)); ty < H; ty++) if (this.solid(tx, ty)) return ty * TILE;
    return H * TILE;
  }

  setGate(closed) { this.fill(this.arena.gateX, this.arena.gateX, 12, 15, closed ? 'G' : '.'); }
}
