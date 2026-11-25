// Controles de celular: analógico flutuante à esquerda, ataque grande à direita com as ações em arco ao redor do polegar.
// As posições são em "vh" a partir do canto inferior direito e podem ser mudadas em Opções > Editar botões.
import { Input } from './input.js';
import { cfg, setCfg, onCfg, vibrar } from './config.js';
import { el, ico, peca, acaoAtual, cantos } from './hud.js';
import { ARCANA, POTIONS, POTION_IDS, WEAPONS } from './data.js';

// id, rótulo, ícone, x, y (centro, vh da direita/de baixo), diâmetro, classe
const BOT = [
  ['atk', '', 'espada', 23, 23, 25, 'atk', ['light']],
  ['pulo', 'Pular', 'pulo', 46, 13, 17, '', ['jump', 'confirm']],
  ['esq', 'Esquivar', 'esquiva', 47, 33, 16, '', ['dodge']],
  ['pes', 'Pesado', 'pesado', 32, 48, 15.5, '', ['heavy']],
  ['apa', 'Aparar', 'aparar', 12, 49, 15.5, '', ['parry']],
  ['arc', 'Arcano', 'arcano', 64, 25, 13, '', ['ability']],
  ['poc', 'Poção', '', 62, 43, 13.5, '', null],
  ['item', 'Item', '', 49, 60, 12.5, '', null],
  ['tarc', 'Trocar', 'trocar', 76, 14, 9.5, '', ['swap']],
  ['atk2', '', 'espada', 0, 70, 16, 'atk', ['light']],
];
const TOPO = [['pausa', 'engrenagem', ['pause']], ['inv', 'bolsa', ['inventory']]];

let root, base, knob, setas = {}, bt = {}, editando = null, agir, agIc, agTx, arma, armaF, armaN;
const memo = {};
const set = (k, v, f) => { if (memo[k] !== v) { memo[k] = v; f(v); } };
const U = () => Math.min(window.innerHeight, 560) / 100;

function lugar(id, x, y, d) { const o = cfg.hud[id]; return o ? [o.x, o.y, d * (o.s || 1)] : [x, y, d]; }
function posiciona() {
  if (!root) return;
  const u = U();
  root.classList.toggle('semnomes', !cfg.nomes);
  for (const [id, , , x, y, d] of BOT) {
    const b = bt[id]; if (!b) continue;
    const [px, py, pd] = lugar(id, x, y, d), t = pd * cfg.tam * u;
    b.style.width = b.style.height = t + 'px'; b.style.opacity = cfg.opac;
    if (id === 'atk2') { const o = cfg.hud[id]; b.style.left = `calc(var(--sl) + ${(o ? o.x : 14) * u}px)`; b.style.right = 'auto'; b.style.bottom = `calc(var(--sb) + ${py * u - t}px)`; b.style.transformOrigin = '50% 50%'; b.style.display = cfg.atkEsq ? '' : 'none'; continue; }
    b.style.left = `calc(100% - var(--sr) - ${px * u}px)`; b.style.top = `calc(100% - var(--sb) - ${py * u}px)`;
  }
  const r = 33 * u * cfg.tam; base.style.width = base.style.height = r + 'px'; base.style.opacity = cfg.opac;
  if (!base.dataset.ativo) descansa();
  TOPO.forEach(([id], i) => { const b = bt[id], t = 10.5 * u; b.style.width = b.style.height = t + 'px'; b.style.left = `calc(100% - var(--sr) - ${(31 + i * 12.5) * u + (cfg.minimapa ? 2 : -26) * u}px)`; b.style.top = `calc(var(--st) + ${8 * u}px)`; b.style.opacity = cfg.opac; });
}
function descansa() { const u = U(); base.style.left = `calc(var(--sl) + ${25 * u}px)`; base.style.top = `calc(100% - var(--sb) - ${27 * u}px)`; base.classList.add('solto'); }

function botao(id, html, rot, cls, acts, longo) {
  const b = el('div', 'tb ' + cls, html + (rot ? `<span class="rot">${rot}</span>` : ''));
  const ids = new Set(); let timer = 0, segurou = false;
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation();
    if (editando) return pegaEdicao(id, b, e);
    ids.add(e.pointerId); try { b.setPointerCapture(e.pointerId); } catch (_) {}
    b.classList.remove('down'); void b.offsetWidth; b.classList.add('down'); vibrar(8);
    Input.onAny && Input.onAny();
    if (longo) { segurou = false; timer = setTimeout(() => { segurou = true; vibrar(18); toca(longo.segura); }, 320); } else Input.virtualPress(acts);
  });
  const up = (e) => {
    if (!ids.delete(e.pointerId) || ids.size) return;
    b.classList.remove('down');
    if (longo) { clearTimeout(timer); if (!segurou) toca(longo.toque); } else Input.virtualRelease(acts);
  };
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(t, up);
  b.addEventListener('contextmenu', (e) => e.preventDefault());
  root.appendChild(b); bt[id] = b;
  return b;
}
function toca(acts) { Input.virtualPress(acts); setTimeout(() => Input.virtualRelease(acts), 70); }

function analogico() {
  const zona = el('div', 'zona'); root.appendChild(zona);
  base = el('div', 'base solto', '<i class="seta e"></i><i class="seta d"></i><i class="seta b"></i><div class="knob"></div>'); root.appendChild(base);
  knob = base.querySelector('.knob'); setas = { e: base.querySelector('.e'), d: base.querySelector('.d'), b: base.querySelector('.b') };
  let id = null, ox = 0, oy = 0;
  const mexe = (dx, dy) => {
    const max = base.offsetWidth * 0.34 || 40, len = Math.hypot(dx, dy), k = len > max ? max / len : 1, zm = max * 0.26;
    knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    // passou muito do limite: a base acompanha o dedo, como um analógico solto
    if (len > max * 1.6) { ox += dx * (1 - max * 1.6 / len); oy += dy * (1 - max * 1.6 / len); poe(); }
    const l = dx < -zm, r = dx > zm, d = dy > max * 0.62 && Math.abs(dx) < max * 1.3, up = dy < -max * 0.75 && Math.abs(dx) < max * 0.5;
    Input.virtualHold('left', l); Input.virtualHold('right', r); Input.virtualHold('down', d); Input.virtualHold('up', up);
    setas.e.classList.toggle('lit', l); setas.d.classList.toggle('lit', r); setas.b.classList.toggle('lit', d);
  };
  const poe = () => { base.style.left = ox + 'px'; base.style.top = oy + 'px'; };
  zona.addEventListener('pointerdown', (e) => {
    e.preventDefault(); if (id !== null) return;
    id = e.pointerId; try { zona.setPointerCapture(id); } catch (_) {}
    const m = base.offsetWidth * 0.5; ox = Math.max(m, e.clientX); oy = Math.min(window.innerHeight - m * 0.8, e.clientY);
    base.dataset.ativo = '1'; base.classList.remove('solto'); poe(); mexe(e.clientX - ox, e.clientY - oy);
    Input.onAny && Input.onAny();
  });
  zona.addEventListener('pointermove', (e) => { if (e.pointerId === id) mexe(e.clientX - ox, e.clientY - oy); });
  const fim = (e) => { if (e.pointerId !== id) return; id = null; delete base.dataset.ativo; mexe(0, 0); descansa(); };
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) zona.addEventListener(t, fim);
}

// ---------- edição de posição ----------
let sel = null;
function pegaEdicao(id, b, e) {
  if (id === 'pausa' || id === 'inv') return;
  sel = id; for (const k in bt) bt[k].classList.toggle('sel', k === id);
  const [, , , x, y, d] = BOT.find((q) => q[0] === id), u = U(), [px, py] = lugar(id, id === 'atk2' ? 14 : x, y, d), sx = e.clientX, sy = e.clientY, o = cfg.hud[id] || {};
  root.querySelector('.editor .tam').value = o.s || 1;
  const mv = (q) => { const esq = id === 'atk2'; cfg.hud[id] = { x: Math.max(4, px + (esq ? 1 : -1) * (q.clientX - sx) / u), y: Math.max(4, Math.min(96, py - (q.clientY - sy) / u)), s: o.s || 1 }; posiciona(); };
  const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); };
  window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
}
export function editarBotoes(fim) {
  editando = fim || (() => {}); root.classList.add('on', 'editar'); root.classList.remove('some');
  for (const k in bt) bt[k].classList.remove('some');
}
function fechaEdicao() { setCfg({ hud: { ...cfg.hud } }); root.classList.remove('editar'); for (const k in bt) bt[k].classList.remove('sel'); if (!Input.touchMode) root.classList.remove('on'); const f = editando; editando = null; for (const k in memo) delete memo[k]; f && f(); }

// ---------- estado por quadro ----------
export function touchUpdate(world, jogando) {
  if (!root || editando) return;
  set('some', !jogando || !world || !!world.dialog || world.player.dead, (v) => { root.classList.toggle('some', v); if (v) Input.soltaTudo && Input.soltaTudo(); });
  if (!world || !Input.touchMode || !jogando) return;
  const p = world.player, pr = world.prog, w = pr.equipped;
  set('arma', w || 'punho', () => { const h = w ? peca('i_' + w) : ico('punho'); armaF.innerHTML = h; armaN.textContent = w ? WEAPONS[w].name : 'Punhos'; for (const id of ['atk', 'atk2']) bt[id].querySelector('.fig').innerHTML = h; });
  const n = p.flasks[pr.potion];
  set('poc', pr.potion, (v) => { bt.poc.querySelector('.fig').innerHTML = peca('i_' + v); [...bt.poc.querySelectorAll('.tipos i')].forEach((e, i) => e.classList.toggle('on', POTION_IDS[i] === v)); });
  set('pocn', n, (v) => { bt.poc.querySelector('.n').textContent = v; bt.poc.classList.toggle('vazio', v <= 0); });
  cd('poc', p.drinkCd / 1.5, 0);
  const q = pr.quick, qn = pr.items[q] || 0;
  set('item', q, (v) => { bt.item.querySelector('.fig').innerHTML = peca('i_' + v); });
  set('itemn', qn, (v) => { bt.item.querySelector('.n').textContent = v; bt.item.classList.toggle('vazio', v <= 0); });
  cd('item', q === 'bomba' ? p.itemCd / 12 : 0, p.itemCd);
  const a = p.activeArcanum();
  set('arc', a || '', (v) => bt.arc.classList.toggle('vazio', !v));
  cd('arc', a ? (p.cooldowns[a] || 0) / ARCANA[a].abilities[0].cd : 0, a ? p.cooldowns[a] : 0);
  set('tarc', p.arcana.filter(Boolean).length > 1, (v) => bt.tarc.classList.toggle('some', !v));
  // aviso nos botões: amarelo pede aparo, vermelho pede esquiva
  let am = false, vm = false;
  for (const m of [...world.mobs, ...world.summons]) { if (m.dead || Math.abs(m.cx() - p.cx()) > 110 || Math.abs(m.cy() - p.cy()) > 60) continue; const s = m.state; if (s === 'shotWind' || s === 'spitWind' || s === 'slamWind' || s === 'wind' || s === 'rainWind' || s === 'eruptWind') vm = true; else if (s === 'windup' || s.endsWith('Wind')) am = true; }
  const b = world.boss, t = b && !b.dead && world.arenaLocked ? b.telegraph() : null; if (t === 'parry') am = true; else if (t) vm = true;
  set('am', am, (v) => bt.apa.classList.toggle('apara', v)); set('vm', vm, (v) => bt.esq.classList.toggle('foge', v));
  const ac = acaoAtual(world);
  set('ac', ac ? ac.ic + ac.tx : '', () => { agir.classList.remove('on'); if (ac) { agIc.innerHTML = ico(ac.ic); agTx.textContent = ac.tx; void agir.offsetWidth; agir.classList.add('on'); } });
}
function cd(id, f, s) { const b = bt[id]; set(id + 'cd', Math.round(Math.max(0, f) * 60) / 60, (v) => { const c = b.querySelector('.cd'); c.style.setProperty('--c', v); c.style.display = v > 0 ? 'block' : 'none'; }); const g = b.querySelector('.seg'); if (g) set(id + 'sg', f > 0 && s > 0 ? Math.ceil(s) : '', (v) => { g.textContent = v; }); }

export function isTouchDevice() { return (window.matchMedia && matchMedia('(pointer: coarse)').matches) || (navigator.maxTouchPoints > 0 && 'ontouchstart' in window); }

export function setupTouch(onFirst) {
  document.body.appendChild(Object.assign(el('div'), { id: 'rotate', innerHTML: '<div class="ph"></div><div>Gire o celular para jogar<br>com a tela deitada</div>' }));
  root = el('div'); root.id = 'touch'; root.classList.add('some'); document.body.appendChild(root);
  analogico();
  const fig = (h) => `<span class="fig" style="width:64%;height:64%;display:grid;place-items:center">${h}</span>`, seg = '<span class="cd" style="display:none"></span><span class="seg"></span>';
  for (const [id, rot, ic, , , , cls, acts] of BOT) {
    if (id === 'poc') botao(id, `<span class="tipos">${POTION_IDS.map((k) => `<i style="background:${POTIONS[k].color};color:${POTIONS[k].color}"></i>`).join('')}</span>` + fig('') + seg + '<span class="n">0</span>', rot, cls, null, { toque: ['potion'], segura: ['nextpotion'] });
    else if (id === 'item') botao(id, fig('') + seg + '<span class="n">0</span>', rot, cls, null, { toque: ['item'], segura: ['cycle'] });
    else if (cls === 'atk') botao(id, fig(ico(ic)), rot, cls, acts);
    else botao(id, ico(ic) + seg, rot, cls, acts);
  }
  for (const [id, ic, acts] of TOPO) botao(id, ico(ic), '', 'sq', acts);
  for (const f of root.querySelectorAll('.fig')) f.classList.add('figx');
  arma = el('div', 'arma', `<span class="f"></span><b></b><span class="tr">${ico('trocar')}</span>`); armaF = arma.querySelector('.f'); armaN = arma.querySelector('b'); root.appendChild(arma);
  arma.addEventListener('pointerdown', (e) => { e.preventDefault(); if (editando) return; arma.classList.add('down'); vibrar(8); toca(['nextweapon']); setTimeout(() => arma.classList.remove('down'), 140); });
  agir = el('div', 'agir', '<i></i><span></span>'); agIc = agir.querySelector('i'); agTx = agir.querySelector('span'); root.appendChild(agir);
  agir.addEventListener('pointerdown', (e) => { e.preventDefault(); if (editando) return; vibrar(12); toca(['interact']); });
  const ed = el('div', 'editor painel', `${cantos}<span>Arraste os botões</span><label>Tamanho <input class="tam" type="range" min="0.7" max="1.5" step="0.05" value="1"></label><label>Opacidade <input class="op" type="range" min="0.35" max="1" step="0.05" value="${cfg.opac}"></label><button class="placa peq rst">Restaurar</button><button class="placa peq ok">Salvar</button>`); root.appendChild(ed);
  ed.querySelector('.tam').addEventListener('input', (e) => { if (!sel) return; const [, , , x, y, d] = BOT.find((q) => q[0] === sel), [px, py] = lugar(sel, sel === 'atk2' ? 14 : x, y, d); cfg.hud[sel] = { x: px, y: py, s: +e.target.value }; posiciona(); });
  ed.querySelector('.op').addEventListener('input', (e) => { cfg.opac = +e.target.value; posiciona(); });
  ed.querySelector('.rst').onclick = () => { cfg.hud = {}; cfg.opac = 0.9; posiciona(); };
  ed.querySelector('.ok').onclick = () => { setCfg({ opac: cfg.opac }); fechaEdicao(); };
  posiciona(); onCfg(posiciona); window.addEventListener('resize', posiciona);
  const liga = () => { if (Input.touchMode) return; Input.touchMode = true; root.classList.add('on'); document.body.classList.add('touch'); posiciona(); onFirst && onFirst(); };
  if (isTouchDevice()) liga();
  window.addEventListener('touchstart', liga, { passive: true });
  // Teclado físico esconde os botões
  window.addEventListener('keydown', () => { if (!Input.touchMode || editando) return; Input.touchMode = false; root.classList.remove('on'); document.body.classList.remove('touch'); onFirst && onFirst(); });
}

// Tela cheia + travar na horizontal quando o navegador permite (Android). No iPhone é ignorado.
export function tryFullscreenLandscape() {
  const e = document.documentElement, req = e.requestFullscreen || e.webkitRequestFullscreen;
  if (!req || document.fullscreenElement) return;
  try { const p = req.call(e, { navigationUI: 'hide' }); if (p && p.then) p.then(() => { try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}); } catch (_) {} }).catch(() => {}); } catch (_) {}
}
