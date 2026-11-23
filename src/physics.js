export const TILE = 16;
export const GRAVITY = 950;

export function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Move um corpo retangular contra os tiles do nível (eixo X, depois Y).
export function moveBody(b, level, dt) {
  b.hitWall = false;
  b.x += b.vx * dt;
  const top = Math.floor(b.y / TILE);
  const bot = Math.floor((b.y + b.h - 0.01) / TILE);
  if (b.vx > 0) {
    const tx = Math.floor((b.x + b.w - 0.01) / TILE);
    for (let ty = top; ty <= bot; ty++) {
      if (level.solid(tx, ty)) { b.x = tx * TILE - b.w; b.vx = 0; b.hitWall = true; break; }
    }
  } else if (b.vx < 0) {
    const tx = Math.floor(b.x / TILE);
    for (let ty = top; ty <= bot; ty++) {
      if (level.solid(tx, ty)) { b.x = (tx + 1) * TILE; b.vx = 0; b.hitWall = true; break; }
    }
  }

  const prevBottom = b.y + b.h;
  b.y += b.vy * dt;
  const wasGround = b.onGround;
  b.onGround = false;
  const left = Math.floor(b.x / TILE);
  const right = Math.floor((b.x + b.w - 0.01) / TILE);
  if (b.vy >= 0) {
    const ty = Math.floor((b.y + b.h - 0.01) / TILE);
    for (let tx = left; tx <= right; tx++) {
      const oneway = !b.dropThrough && level.oneway(tx, ty) && prevBottom <= ty * TILE + 1;
      if (level.solid(tx, ty) || oneway) {
        b.y = ty * TILE - b.h;
        b.landedSpeed = b.vy;
        b.vy = 0;
        b.onGround = true;
        break;
      }
    }
  } else {
    const ty = Math.floor(b.y / TILE);
    for (let tx = left; tx <= right; tx++) {
      if (level.solid(tx, ty)) { b.y = (ty + 1) * TILE; b.vy = 0; break; }
    }
  }
  b.justLanded = b.onGround && !wasGround;
}
