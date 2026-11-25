// Interface da partida em HTML por cima do canvas: nítida em qualquer tela e só é redesenhada quando algo muda.
import { ARCANA, ITEMS, POTIONS, POTION_IDS } from './data.js';
import { CENA } from './cenameta.js';
import { img } from './art.js';
import { ROOMS } from './level.js';
import { Input } from './input.js';
import { cfg } from './config.js';
import { VW, VH } from './view.js';
import { TILE } from './physics.js';

export const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
// ícone do conjunto da interface (0–15)
export const ICO = { espada: 0, pesado: 1, esquiva: 2, aparar: 3, pulo: 4, mao: 5, arcano: 6, bolsa: 7, mapa: 8, engrenagem: 9, trocar: 10, punho: 11, finalizar: 12, descansar: 13, falar: 14, alavanca: 15 };
export const ico = (n) => { const k = ICO[n]; return `<span class="ic" style="background-position:${(k % 4) / 3 * 100}% ${Math.floor(k / 4) / 3 * 100}%"></span>`; };
// peça do atlas como imagem (armas, poções, retratos)
const urls = {};
export function pecaURL(nome, corte) {
  const k = nome + (corte || ''); if (urls[k]) return urls[k];
  const q = CENA[nome]; if (!q || !img.atlas) return '';
  const [x, y, w, h] = q, c = document.createElement('canvas'), hh = corte ? Math.min(h, corte) : h; c.width = corte ? corte : w; c.height = hh;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(img.atlas, x, y, w, hh, Math.round((c.width - w) / 2), 0, w, hh);
  return (urls[k] = c.toDataURL());
}
export const peca = (nome) => `<img class="px" alt="" src="${pecaURL(nome)}">`;
export const cantos = '<i class="cn a"></i><i class="cn b"></i><i class="cn c"></i><i class="cn d"></i>';

const RETRATO = { Elion: ['m_elion_0', 40], Morren: ['m_morren_0', 50], Ysara: ['m_ysara_0', 42], Baú: ['bauaberto', 56], 'Baú secreto': ['bauaberto', 56], Inscrição: ['pedra', 50], Mirante: ['pedra', 50], Portão: ['grade', 100], Comporta: ['engrenagem', 110], Memória: ['i_fragmento', 30], 'Porta de Asgmor': ['m_asg_0', 60], 'Arcano Maior': ['m_asg_14', 60], 'Eco de Asgmor': ['m_asg_0', 60], 'Arma-signatura': ['i_ruptura', 32], Relíquia: ['i_cinza', 30], Material: ['i_fragmento', 30] };
const ACAO = { shrine: ['descansar', 'Descansar'], elion: ['falar', 'Conversar'], chest: ['mao', 'Abrir'], stone: ['falar', 'Ler'], sign: ['falar', 'Examinar'], morren: ['bolsa', 'Comércio'], ysara: ['pesado', 'Forja'], herb: ['mao', 'Colher'], lever: ['alavanca', 'Puxar'], bigbell: ['mao', 'Tocar o sino'], portal: ['mao', 'Voltar a Cinzeiral'] };
// O que o jogador pode fazer agora: usado pela dica no teclado e pelo botão no celular
export function acaoAtual(world) {
  const p = world.player;
  if (world.dialog || p.action || p.dead) return null;
  const f = world.finisherTarget();
  if (f) return { ic: 'finalizar', tx: 'Finalizar', x: f.cx(), y: f.y - 16 };
  const it = world.nearbyInteractable();
  if (!it) return null;
  const [ic, tx] = ACAO[it.type] || ['mao', 'Usar'];
  return { ic, tx, x: it.x, y: it.y - (it.type === 'herb' ? 20 : 44) };
}

let R = null; const E = {}, memo = {};
const set = (k, v, f) => { if (memo[k] !== v) { memo[k] = v; f(v); } };
const larg = (k, e, v) => set(k, Math.round(Math.max(0, Math.min(1, v)) * 500) / 500, (q) => { e.style.transform = `scaleX(${q})`; });

export function setupHUD() {
  R = el('div'); R.id = 'hud';
  R.innerHTML = `
  <div class="vital"><div class="medalha"><img class="px" alt="" src="assets/ui/emblema.webp"></div><div class="barras">
    <div class="barra vida"><b></b><i class="cura"></i><i class="v"></i></div><div class="barra vigor"><i></i></div><div class="barra foco"><i></i></div>
    <div class="sub"><span class="moedas">0</span><span class="buffs"></span></div></div></div>
  <div class="mini"><canvas width="114" height="75"></canvas><span></span></div>
  <div class="barraskill">
    <div class="slot" data-s="pocao"><div class="tipos">${POTION_IDS.map((k) => `<i style="background:${POTIONS[k].color};color:${POTIONS[k].color}"></i>`).join('')}</div><div class="fig"></div><div class="cd"></div><u></u><kbd>Q</kbd></div>
    <div class="slot" data-s="item"><div class="fig"></div><div class="cd"></div><u></u><kbd>C</kbd></div>
    <div class="slot" data-s="arc0"><div class="fig"></div><div class="cd"></div><kbd>F</kbd></div>
    <div class="slot" data-s="arc1"><div class="fig"></div><div class="cd"></div><kbd>Tab</kbd></div>
    <div class="slot g" data-s="arma"><div class="fig"></div><kbd>T</kbd></div></div>
  <div class="chefe"><div class="nome"></div><div class="arco"><div class="barra"><b></b><i></i></div></div><div class="post"><i></i></div></div>
  <div class="sala"></div><div class="avisos"></div><div class="faixa"><h3></h3><p></p></div><div class="dica"><b>E</b><span></span></div>
  <div class="fala painel">${cantos}<div class="ret"></div><h4></h4><p></p><em></em></div>`;
  document.body.appendChild(R);
  const q = (s) => R.querySelector(s);
  Object.assign(E, { vida: q('.vida'), vv: q('.vida .v'), vg: q('.vida b'), vc: q('.vida .cura'), vigor: q('.vigor'), vi: q('.vigor i'), fi: q('.foco i'), moedas: q('.moedas'), buffs: q('.buffs'), mini: q('.mini'), mc: q('.mini canvas'), mt: q('.mini span'), chefe: q('.chefe'), cn: q('.chefe .nome'), cb: q('.chefe .barra b'), ci: q('.chefe .barra i'), cp: q('.chefe .post i'), sala: q('.sala'), avisos: q('.avisos'), faixa: q('.faixa'), fh: q('.faixa h3'), fp: q('.faixa p'), dica: q('.dica'), dt: q('.dica span'), fala: q('.fala'), fr: q('.fala .ret'), fn: q('.fala h4'), ft: q('.fala p'), tipos: [...R.querySelectorAll('.tipos i')] });
  for (const s of R.querySelectorAll('.slot')) E['s_' + s.dataset.s] = { e: s, f: s.querySelector('.fig'), cd: s.querySelector('.cd'), n: s.querySelector('u') };
  // .fig precisa ocupar a célula
  for (const f of R.querySelectorAll('.slot .fig')) f.style.cssText = 'position:absolute;inset:0;display:grid;place-items:center';
  E.fala.addEventListener('pointerdown', (e) => { e.preventDefault(); Input.virtualPress(['confirm']); setTimeout(() => Input.virtualRelease(['confirm']), 60); });
  E.mini.addEventListener('pointerdown', (e) => { e.preventDefault(); Input.virtualPress(['map']); setTimeout(() => Input.virtualRelease(['map']), 60); });
}
export function hudFit(rect) { if (!R) return; R.style.left = rect.left + 'px'; R.style.top = rect.top + 'px'; R.style.width = rect.width + 'px'; R.style.height = rect.height + 'px'; document.documentElement.style.setProperty('--u', rect.height / 108 + 'px'); }
export function hudMostra(on) { if (R) set('on', on, (v) => R.classList.toggle('on', v)); }

const fant = { v: 1, c: 1 };
function slot(id, html, n, cd, vazio, ativo) {
  const s = E['s_' + id];
  set(id + 'h', html, (v) => { s.f.innerHTML = v; });
  if (s.n) set(id + 'n', n, (v) => { s.n.textContent = v; });
  if (s.cd) set(id + 'c', Math.round((cd || 0) * 60) / 60, (v) => { s.cd.style.setProperty('--c', v); s.cd.style.display = v > 0 ? 'block' : 'none'; });
  set(id + 'k', (vazio ? 'vazio ' : '') + (ativo ? 'ativo' : ''), (v) => { s.e.className = 'slot ' + (id === 'arma' ? 'g ' : '') + v; });
}

export function hudUpdate(world, dt) {
  if (!R || !world) return;
  const p = world.player, pr = world.prog, hp = p.hp / p.maxHp;
  fant.v = fant.v > hp ? Math.max(hp, fant.v - dt * 0.4) : hp;
  larg('v', E.vv, hp); larg('vg', E.vg, fant.v); larg('vc', E.vc, p.healLeft > 0 ? hp + p.healLeft / p.maxHp : 0);
  set('vb', hp < 0.28 && !p.dead, (v) => E.vida.classList.toggle('baixo', v));
  larg('vi', E.vi, p.vigor / p.maxVigor); larg('fi', E.fi, p.foco / p.maxFoco);
  set('vib', p.vigor < 18, (v) => E.vigor.classList.toggle('baixo', v));
  set('moedas', pr.coins, (v) => { E.moedas.textContent = v; });
  const bf = [];
  if (p.oil > 0) bf.push(['#ffb070', 'ÓLEO ' + Math.ceil(p.oil)]);
  if (p.empowered > 0) bf.push(['#f6f1e8', 'RISCO']);
  if (p.defBuff > 0) bf.push([POTIONS.defesa.color, 'DEFESA ' + Math.ceil(p.defBuff)]);
  if (p.dmgBuff > 0) bf.push([POTIONS.dano.color, 'DANO ' + Math.ceil(p.dmgBuff)]);
  set('bf', bf.map((b) => b.join()).join('|'), () => { E.buffs.innerHTML = bf.map(([c, t]) => `<span class="buff" style="color:${c}">${t}</span>`).join(''); });
  if (!Input.touchMode) {
    slot('pocao', peca('i_' + pr.potion), p.flasks[pr.potion], p.drinkCd / 1.5, p.flasks[pr.potion] <= 0);
    E.tipos.forEach((e, i) => set('tp' + i, POTION_IDS[i] === pr.potion, (v) => e.classList.toggle('on', v)));
    const q = pr.quick, n = pr.items[q] || 0; slot('item', peca('i_' + q), n, q === 'bomba' ? p.itemCd / 12 : 0, n <= 0);
    for (let i = 0; i < 2; i++) { const a = p.arcana[i]; slot('arc' + i, ico('arcano'), '', a ? (p.cooldowns[a] || 0) / ARCANA[a].abilities[0].cd : 0, !a, !!a && p.activeSlot === i); }
    slot('arma', pr.equipped ? peca('i_' + pr.equipped) : ico('punho'), '', 0, false, true);
  }
  // minimapa
  E.mtime = (E.mtime || 0) - dt;
  if (E.mtime <= 0) { E.mtime = 0.2; set('mm', cfg.minimapa, (v) => { E.mini.style.display = v ? '' : 'none'; }); if (cfg.minimapa) miniMapa(world); set('mt', world.room ? world.room.name : '', (v) => { E.mt.textContent = v; }); }
  // chefe
  const b = world.boss, bo = world.arenaLocked && b && !b.dead && b.state !== 'dormant';
  set('bo', bo, (v) => E.chefe.classList.toggle('on', !!v));
  if (bo) { const f = b.hp / b.def.hp; fant.c = fant.c > f ? Math.max(f, fant.c - dt * 0.25) : f; set('cn', b.isEcho ? 'Eco de Asgmor' : b.def.name, (v) => { E.cn.textContent = v; }); larg('ci', E.ci, f); larg('cb', E.cb, fant.c); larg('cp', E.cp, b.posture / b.def.posture); }
  // dica de ação junto do objeto
  const a = Input.touchMode ? null : acaoAtual(world);
  set('da', a ? a.tx : '', (v) => { E.dica.classList.toggle('on', !!v); if (v) E.dt.textContent = v; });
  if (a) { const k = R.clientHeight / VH; E.dica.style.transform = `translate(${Math.round((a.x - world.cam.x) * k)}px, ${Math.round((a.y - world.cam.y) * k)}px) translate(-50%, -100%)`; }
  // nome da sala, avisos, faixa
  const rn = world.roomName && !world.banner && !world.dialog ? world.roomName : null;
  if (rn) set('rn', rn.text, (v) => { E.sala.textContent = v; });
  set('rno', rn ? Math.round(Math.max(0, Math.min(1, rn.t * 2, (3.2 - rn.t) * 2)) * 20) / 20 : 0, (v) => { E.sala.style.opacity = v; });
  set('av', world.toasts.map((t) => t.text).join('|'), () => {
    const vivos = new Set(world.toasts.map((t) => t.text));
    for (const c of [...E.avisos.children]) if (!vivos.has(c.dataset.t)) c.remove(); else vivos.delete(c.dataset.t);
    for (const t of vivos) { const d = el('div', 'aviso'); d.dataset.t = t; d.textContent = t; E.avisos.appendChild(d); }
  });
  const bn = world.banner;
  if (bn) { set('bn', bn.text + bn.sub, () => { E.fh.textContent = bn.text; E.fp.textContent = bn.sub || ''; E.faixa.classList.toggle('peq', !!bn.small); }); }
  set('bno', bn ? Math.round(Math.max(0, Math.min(1, bn.t * 2, (bn.dur - bn.t) * 2)) * 20) / 20 : 0, (v) => { E.faixa.style.opacity = v; });
  // conversa
  const d = world.dialog;
  set('dl', !!d, (v) => { E.fala.classList.toggle('on', v); document.body.classList.toggle('falando', v); });
  if (d) {
    const [who, msg] = d.lines[d.i];
    set('dw', who, (v) => { E.fn.textContent = v; const r = RETRATO[v] || RETRATO.Memória; E.fr.innerHTML = `<img class="px" alt="" src="${pecaURL(r[0], r[1])}">`; });
    const n = Math.floor(d.chars), t = msg.slice(0, n);
    set('dm', t, (v) => { E.ft.textContent = v; });
    set("df", n >= msg.length, (v) => { E.fala.classList.toggle("fim", v); E.fala.querySelector("em").textContent = Input.touchMode ? "TOQUE" : "E"; });
  }
}

const SETOR = { A: '#8f99a8', B: '#a08a6a', C: '#c86c43', D: '#b0a890', ARENA: '#c0404a', SEGREDO: '#d4b66f', CRIPTA: '#6f8f86' };
function miniMapa(world) {
  const c = E.mc, x = c.getContext('2d'), l = world.level, p = world.player, W = c.width, H = c.height, k = 2, px = Math.floor(p.cx() / TILE), py = Math.floor(p.cy() / TILE), x0 = px - Math.floor(W / k / 2), y0 = py - Math.floor(H / k / 2) + 2, seen = world.prog.rooms || {};
  x.clearRect(0, 0, W, H);
  const vis = ROOMS.filter((r) => seen[r.id] && r.x1 >= x0 && r.x0 <= x0 + W / k && r.y1 >= y0 && r.y0 <= y0 + H / k);
  for (const r of vis) {
    x.fillStyle = SETOR[r.sector];
    for (let ty = Math.max(r.y0, y0); ty <= Math.min(r.y1, y0 + H / k); ty++) for (let tx = Math.max(r.x0, x0); tx <= Math.min(r.x1, x0 + W / k); tx++) {
      if (l.solid(tx, ty)) continue;
      let perto = l.isCave(tx, ty); for (let d = 1; !perto && d < 6; d++) if (l.solid(tx, ty + d) || l.oneway(tx, ty + d)) perto = true;
      if (!perto) continue;
      x.globalAlpha = l.oneway(tx, ty) ? 0.95 : 0.4; x.fillRect((tx - x0) * k, (ty - y0) * k, k, k);
    }
  }
  x.globalAlpha = 1;
  for (const it of world.interactables) { const r = l.roomAt(it.x, it.y - 4); if (!r || !seen[r.id]) continue; const mx = (it.x / TILE - x0) * k, my = (it.y / TILE - y0 - 1) * k; if (it.type === 'shrine') { x.fillStyle = '#ffb070'; x.fillRect(mx - 1, my - 2, 3, 3); } else if (it.type === 'chest' && !world.flags.chests[it.id] && r.sector !== 'SEGREDO') { x.fillStyle = '#e8c96a'; x.fillRect(mx - 1, my - 1, 2, 2); } }
  x.fillStyle = '#ff5a4a'; for (const m of world.mobs) if (!m.dead && m.aggro) x.fillRect((m.cx() / TILE - x0) * k - 1, (m.cy() / TILE - y0) * k - 1, 2, 2);
  const mx = (p.cx() / TILE - x0) * k, my = (p.cy() / TILE - y0) * k;
  x.fillStyle = '#0a090c'; x.fillRect(mx - 3, my - 3, 6, 6); x.fillStyle = '#fff'; x.fillRect(mx - 2, my - 2, 4, 4);
}
