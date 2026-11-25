// Preferências do jogador (som, vídeo, botões). Ficam no aparelho.
const KEY = 'tla_config_v1';
const padrao = { vmus: 0.8, vsfx: 1, tremor: true, vibrar: true, numeros: true, qualidade: 'auto', nomes: true, atkEsq: false, opac: 0.9, tam: 1, hud: {}, minimapa: true };
export const cfg = { ...padrao };
try { Object.assign(cfg, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (_) {}
const fns = [];
export function onCfg(f) { fns.push(f); }
export function setCfg(o) { Object.assign(cfg, o); try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (_) {} fns.forEach((f) => f(cfg)); }
export function vibrar(ms) { if (cfg.vibrar && navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) try { navigator.vibrate(ms); } catch (_) {} }
// Qualidade automática: cai um degrau se o aparelho não acompanhar, e guarda o degrau durante a sessão
export const Q = { nivel: 2, media: 16 };
let acum = 0, n = 0;
export function medir(ms) {
  if (cfg.qualidade !== 'auto') { Q.nivel = { alta: 2, media: 1, baixa: 0 }[cfg.qualidade]; return; }
  if (ms > 120 || !document.hasFocus()) return;
  acum += ms; n++;
  if (n >= 90) { Q.media = acum / n; acum = n = 0; if (Q.media > 24 && Q.nivel > 0) Q.nivel--; }
}
