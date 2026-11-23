import { TILE } from './physics.js';

// Região 1 — Vale das Cinzas
// Cinzeiral -> trilha de cinza -> fosso -> ruínas (nicho secreto) -> pátio do Sino-Fendido
// -> antessala -> Campanário Caído (arena). Sob as ruínas: a Cripta do Campanário (4 salas).
export const W = 240;
export const H = 40;
export const CRYPT = { x0: 8, x1: 134, y0: 22, y1: 32 };

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
  patrol(a, b) { return [a * TILE + TILE / 2, b * TILE + TILE / 2]; }

  build() {
    this.fill(0, 1, 0, H - 1, '#');
    this.fill(W - 2, W - 1, 0, H - 1, '#');

    // ---------- Cinzeiral (povoado inicial, seguro) ----------
    this.ground(2, 51, 17);
    this.prop('house', 5, 17); this.prop('house', 18, 17, { v: 1 }); this.prop('house', 30, 17);
    this.prop('bellpost', 10, 17); this.prop('bellpost', 40, 17);
    this.prop('fallenbell', 25, 17);
    this.prop('forge', 35, 17);
    this.spawn('player', 7, 17);
    this.spawn('shrine', 13, 17, { id: 'cinzeiral', name: 'Pira de Cinzeiral' });
    this.spawn('elion', 22, 17);
    this.spawn('morren', 27, 17);
    this.spawn('ysara', 33, 17);
    this.spawn('chest', 3, 17, { id: 'inicial', reward: 'weapon', weapon: 'lanca' });
    this.spawn('herb', 26, 17, { id: 'flor1', herb: 'flor' });
    this.spawn('pot', 8, 17, { id: 'v1' }); this.spawn('pot', 16, 17, { id: 'v2' }); this.spawn('crate', 20, 17, { id: 'v3' });
    this.spawn('fauna', 15, 17, { kind: 'rato' }); this.spawn('fauna', 29, 17, { kind: 'gralhinha' }); this.spawn('fauna', 38, 17, { kind: 'gralhinha' });
    // alçapão do atalho da cripta (abre por dentro)
    this.fill(43, 45, 17, 17, 'D');

    // ---------- Trilha de cinza ----------
    this.spawn('cinzeiro', 48, 17, { patrol: this.patrol(46, 51) });
    this.ground(52, 60, 15);
    this.prop('column', 55, 15);
    this.spawn('braseiro', 58, 15);
    this.spawn('fauna', 54, 15, { kind: 'lagarto' });

    // ---------- Fosso das fuligens ----------
    this.ground(61, 86, 21);
    this.plat(66, 69, 15); this.plat(75, 78, 14); this.plat(82, 84, 15);
    this.plat(63, 65, 18); this.plat(78, 80, 18); this.plat(85, 86, 18);
    this.spawn('rasteja', 70, 21);
    this.spawn('rasteja', 76, 21);
    this.spawn('gralha', 74, 21);
    this.prop('fallenbell', 72, 21);
    this.spawn('herb', 71, 21, { id: 'flor2', herb: 'flor' });
    this.spawn('herb', 64, 21, { id: 'liq1', herb: 'liquen' });
    this.spawn('chest', 62, 21, { id: 'fosso', reward: 'coins', amount: 120 });

    // ---------- Ruínas e o nicho secreto ----------
    this.ground(87, 132, 16);
    this.spawn('braseiro', 97, 16);
    this.spawn('cinzeiro', 106, 16, { patrol: this.patrol(103, 110) });
    this.plat(104, 107, 13); this.plat(110, 113, 10);
    this.fill(115, 127, 7, 8, '#');
    this.fill(115, 127, 3, 3, '#');
    this.fill(127, 127, 4, 6, '#');
    this.fill(119, 119, 4, 6, 'X');
    this.spawn('chest', 124, 7, { id: 'secreto', reward: 'flask' });
    this.spawn('gralha', 112, 16);
    this.prop('column', 92, 16); this.prop('column', 129, 16, { broken: 1 });
    this.prop('bellpost', 100, 16);
    this.spawn('herb', 93, 16, { id: 'sal1', herb: 'salvia' });
    this.spawn('pot', 89, 16, { id: 'v4' }); this.spawn('crate', 117, 16, { id: 'v5' });
    this.spawn('fauna', 120, 16, { kind: 'lagarto' });

    // Entrada da cripta: poço sob o campanário
    this.fill(130, 132, 16, 25, '.');
    this.plat(130, 132, 16); this.plat(130, 132, 19); this.plat(130, 132, 22); this.plat(130, 132, 25); this.plat(130, 132, 28);
    this.prop('cryptgate', 131, 16);

    // ---------- Cripta do Campanário (4 salas) ----------
    // Sala 1 — sinos falsos atraem patrulhas
    this.fill(101, 132, 26, 31, '.');
    // Sala 2 — cinza soprada em ciclos; pilares protegem do vento
    this.fill(71, 100, 26, 31, '.');
    this.fill(79, 79, 29, 31, '#'); this.fill(87, 87, 29, 31, '#'); this.fill(95, 95, 29, 31, '#');
    // Sala 3 — desvio: baú protegido e alavanca do atalho
    this.fill(41, 70, 26, 31, '.');
    this.fill(43, 45, 18, 25, '.');
    this.plat(43, 45, 20); this.plat(43, 45, 23); this.plat(43, 45, 26); this.plat(43, 45, 29);
    // Sala 4 — sala do Sino-Fendido Ancestral
    this.fill(10, 40, 23, 31, '.');
    // batentes entre as salas
    this.fill(100, 100, 26, 28, '#'); this.fill(70, 70, 26, 28, '#'); this.fill(40, 40, 23, 28, '#');
    this.crypt = CRYPT;

    this.spawn('falsebell', 124, 26, { id: 'fb1' }); this.spawn('falsebell', 113, 26, { id: 'fb2' }); this.spawn('falsebell', 106, 26, { id: 'fb3' });
    this.spawn('cinzeiro', 104, 32, { patrol: this.patrol(102, 109) });
    this.spawn('pot', 128, 32, { id: 'v6' }); this.spawn('pot', 102, 32, { id: 'v7' });
    this.spawn('vent', 72, 32, { id: 'vento' });
    this.spawn('rasteja', 90, 32);
    this.spawn('herb', 80, 32, { id: 'sal2', herb: 'salvia' }); this.spawn('herb', 96, 32, { id: 'sal3', herb: 'salvia' });
    this.spawn('braseiro', 58, 32);
    this.spawn('chest', 66, 32, { id: 'protegido', reward: 'weapon', weapon: 'agulhas', coins: 80 });
    this.spawn('lever', 47, 32, { id: 'atalho' });
    this.spawn('crate', 52, 32, { id: 'v8' }); this.spawn('herb', 42, 32, { id: 'liq2', herb: 'liquen' });
    this.spawn('sinoElite', 22, 32);
    this.spawn('chest', 13, 32, { id: 'guardiao', reward: 'weapon', weapon: 'machado', coins: 200, needs: 'cryptSilenced' });
    for (const x of [105, 121, 76, 92, 50, 64, 15, 34]) this.prop('torch', x, 28);

    // ---------- Pátio do Sino-Fendido ----------
    this.ground(133, 156, 16);
    this.spawn('cinzeiro', 137, 16);
    this.spawn('sino', 145, 16);
    this.spawn('gralha', 150, 16);
    this.spawn('herb', 141, 16, { id: 'flor3', herb: 'flor' });
    this.prop('fallenbell', 140, 16);

    // ---------- Antessala (sem inimigos, 20–35 s até a arena) ----------
    this.ground(157, 166, 16);
    this.spawn('shrine', 159, 16, { id: 'campanario', name: 'Pira do Campanário' });
    this.spawn('stone', 163, 16);

    // ---------- Campanário Caído — arena do chefe ----------
    this.ground(167, W - 3, 16);
    this.arena = { x0: 168 * TILE, x1: (W - 2) * TILE, gateX: 167, trigger: 178 * TILE };
    this.fill(167, 167, 0, 11, '#');
    this.plat(182, 186, 13); this.plat(201, 205, 12); this.plat(220, 224, 13);
    this.prop('column', 176, 16, { broken: 1 }); this.prop('column', 229, 16, { broken: 1 });
    this.prop('bigbell', 203, 16);
    this.spawn('boss', 212, 16);
    this.spawn('bigbell', 203, 16, { id: 'revanche' });
    this.spawn('portal', 234, 16, { id: 'portal' });
  }

  get(tx, ty) {
    if (tx < 0 || tx >= W) return '#';
    if (ty < 0) return '.';
    if (ty >= H) return '#';
    return this.g[ty][tx];
  }
  set(tx, ty, c) { if (tx >= 0 && tx < W && ty >= 0 && ty < H) this.g[ty][tx] = c; }
  solid(tx, ty) { const c = this.get(tx, ty); return c === '#' || c === 'X' || c === 'G' || c === 'D'; }
  oneway(tx, ty) { return this.get(tx, ty) === '='; }
  isCave(tx, ty) { return ty >= CRYPT.y0 && ty <= CRYPT.y1 && tx >= CRYPT.x0 && tx <= CRYPT.x1 && !(tx >= 130 && ty < 26) && !(tx >= 43 && tx <= 45 && ty < 26); }

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
  openShortcut() { this.fill(43, 45, 17, 17, '.'); }
}
