// Densidade de pixel: o mundo continua em unidades de 384×216, mas a tela tem o dobro (768×432).
// A arte antiga (desenhada por código a 1 px por unidade) passa por Scale2x/Scale3x e ganha volume de luz.
export const S = 2;
export const r2 = (v) => Math.round(v * S) / S; // arredonda para o pixel real da tela

export function canvas(w, h, read) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d', read ? { willReadFrequently: true } : undefined);
  x.imageSmoothingEnabled = false;
  return [c, x];
}

// Scale2x / Scale3x (AdvMAME) sobre Uint32; n = 2 ou 3
function scaleN(src, w, h, n) {
  const out = new Uint32Array(w * n * h * n), W = w * n;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x, E = src[i];
      const B = y > 0 ? src[i - w] : 0, Hh = y < h - 1 ? src[i + w] : 0, D = x > 0 ? src[i - 1] : 0, F = x < w - 1 ? src[i + 1] : 0;
      const o = y * n * W + x * n;
      if (n === 2) {
        const c = B !== Hh && D !== F;
        out[o] = c && D === B ? D : E; out[o + 1] = c && B === F ? F : E;
        out[o + W] = c && D === Hh ? D : E; out[o + W + 1] = c && Hh === F ? F : E;
      } else {
        const A = y > 0 && x > 0 ? src[i - w - 1] : 0, C = y > 0 && x < w - 1 ? src[i - w + 1] : 0;
        const Gg = y < h - 1 && x > 0 ? src[i + w - 1] : 0, I = y < h - 1 && x < w - 1 ? src[i + w + 1] : 0;
        const c = B !== Hh && D !== F;
        out[o] = c && D === B ? D : E;
        out[o + 1] = c && ((D === B && E !== C) || (B === F && E !== A)) ? B : E;
        out[o + 2] = c && B === F ? F : E;
        out[o + W] = c && ((D === B && E !== Gg) || (D === Hh && E !== A)) ? D : E;
        out[o + W + 1] = E;
        out[o + W + 2] = c && ((B === F && E !== I) || (Hh === F && E !== C)) ? F : E;
        out[o + 2 * W] = c && D === Hh ? D : E;
        out[o + 2 * W + 1] = c && ((D === Hh && E !== I) || (Hh === F && E !== Gg)) ? Hh : E;
        out[o + 2 * W + 2] = c && Hh === F ? F : E;
      }
    }
  }
  return out;
}

const shade = (p, k) => {
  const f = (v) => Math.max(0, Math.min(255, v * k)) | 0;
  return ((p & 0xff000000) | (f((p >> 16) & 255) << 16) | (f((p >> 8) & 255) << 8) | f(p & 255)) >>> 0;
};

// Amplia um canvas pequeno. opts: n, light (volume), outline (cor ABGR), flash
export function upscale(ctx, w, h, opts = {}) {
  const n = opts.n || 2;
  const src = new Uint32Array(ctx.getImageData(0, 0, w, h).data.buffer);
  // recorta a área desenhada
  let x0 = w, x1 = -1, y0 = h, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (src[y * w + x] >>> 24 > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null;
  x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1); x1 = Math.min(w - 1, x1 + 1); y1 = Math.min(h - 1, y1 + 1);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const cut = new Uint32Array(cw * ch);
  for (let y = 0; y < ch; y++) cut.set(src.subarray((y + y0) * w + x0, (y + y0) * w + x0 + cw), y * cw);
  const big = scaleN(cut, cw, ch, n);
  const W = cw * n, H = ch * n, out = new Uint32Array(W * H);
  const ol = opts.outline === undefined ? 0xff0c090a : opts.outline;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, p = big[i];
    if (p >>> 24 < 8) {
      if (ol && ((x > 0 && big[i - 1] >>> 24 > 200) || (x < W - 1 && big[i + 1] >>> 24 > 200) || (y > 0 && big[i - W] >>> 24 > 200) || (y < H - 1 && big[i + W] >>> 24 > 200))) out[i] = ol;
      continue;
    }
    if (opts.flash) { out[i] = 0xffeaf6ff; continue; }
    if (opts.light) {
      let k = 1.06 - 0.28 * (y / H);
      if (y > 0 && big[i - W] >>> 24 < 8) k += 0.3; else if (y > 2 && big[i - 2 * W] >>> 24 < 8) k += 0.14;
      if (y < H - 1 && big[i + W] >>> 24 < 8) k -= 0.16;
      const t = ((x * 7 + y * 13) ^ (x * y)) & 7;
      k += t === 0 ? 0.07 : t === 5 ? -0.07 : 0;
      out[i] = shade(p, k);
    } else out[i] = p;
  }
  const [c, cx] = canvas(W, H);
  cx.putImageData(new ImageData(new Uint8ClampedArray(out.buffer), W, H), 0, 0);
  return { c, x: x0 * n, y: y0 * n, n };
}

// Desenho por código guardado em cache já ampliado (adereços, baús, tochas...)
const cache = new Map();
export function cached(key, w, h, draw, opts) {
  if (cache.has(key)) return cache.get(key);
  const [c, x] = canvas(w, h, true);
  draw(x);
  const s = upscale(x, w, h, { n: 2, light: true, outline: 0, ...(opts || {}) });
  cache.set(key, s);
  return s;
}
export function blit(ctx, s, x, y, ox, oy) {
  if (!s) return;
  const k = 1 / S;
  ctx.drawImage(s.c, r2(x) - ox * s.n * k + s.x * k, r2(y) - oy * s.n * k + s.y * k, s.c.width * k, s.c.height * k);
}
