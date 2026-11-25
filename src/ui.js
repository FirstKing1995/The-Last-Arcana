// Menus da partida: inventário, loja do Morren e forja da Ysara. Trilho de abas, grade de espaços e ficha do item.
// Funcionam com toque, mouse e teclado.
import { POTIONS, POTION_IDS, WEAPONS, UPGRADE, ARCANA, MASTERY, MASTERY_DESC, RELICS, ITEMS, HERBS, MATERIALS } from './data.js';
import { masteryLevel, weaponName, addItem } from './state.js';
import { sfx } from './audio.js';
import { ROOMS, W as MW, H as MH } from './level.js';
import { el, ico, peca, cantos } from './hud.js';

const GRAU = ['0', 'I', 'II', 'III', 'IV', 'V'];
let root, state = null;

export function setupUI() {
  root = el('div'); root.id = 'menu'; document.body.appendChild(root);
  root.addEventListener('pointerdown', (e) => { if (e.target === root) closeMenu(); });
}
export function isMenuOpen() { return !!state; }

const ABAS = {
  inventory: [['armas', 'Armas', () => peca('i_fio')], ['pocoes', 'Poções', () => peca('i_cura')], ['itens', 'Itens', () => peca('i_bomba')], ['reliquias', 'Relíquias', () => peca('i_cinza')], ['arcanos', 'Arcanos', () => ico('arcano')], ['mapa', 'Mapa', () => ico('mapa')]],
  morren: [['comprar', 'Comprar', () => ico('bolsa')], ['vender', 'Vender', () => peca('i_flor')]],
  ysara: [['forja', 'Forja', () => ico('pesado')]],
};
const TITULO = { inventory: 'Inventário do Errante', morren: 'Morren, Mercador de Mil Coisas', ysara: 'Ysara, Forja das Brasas Frias' };

export function openMenu(world, kind, onClose) {
  const mapa = kind === 'map'; if (mapa) kind = 'inventory';
  state = { world, kind, onClose, tab: mapa ? 'mapa' : ABAS[kind][0][0], sel: 0 };
  monta(); root.classList.add('on'); sfx.abre();
}
export function closeMenu() {
  if (!state) return;
  const cb = state.onClose; state.world.save(); state = null;
  root.classList.remove('on'); root.innerHTML = ''; sfx.fecha(); cb && cb();
}

// Teclado: setas andam na grade, Q/R (ou Tab) trocam de aba, Enter confirma
export function menuKey(code) {
  if (!state) return false;
  const cels = [...root.querySelectorAll('.cel, .linha')], abas = ABAS[state.kind].map((a) => a[0]);
  if (code === 'Escape' || code === 'KeyI' || code === 'KeyP' || code === 'KeyN') { closeMenu(); return true; }
  const aba = (d) => { const i = abas.indexOf(state.tab); troca(abas[(i + d + abas.length) % abas.length]); };
  if (code === 'KeyQ') { aba(-1); return true; }
  if (code === 'KeyR' || code === 'Tab') { aba(1); return true; }
  let col = 1; if (cels.length > 1 && cels[0].classList.contains('cel')) { const y = cels[0].offsetTop; col = cels.filter((c) => c.offsetTop === y).length; }
  const d = { ArrowDown: col, KeyS: col, ArrowUp: -col, KeyW: -col, ArrowRight: 1, KeyD: 1, ArrowLeft: -1, KeyA: -1 }[code];
  if (d) { const n = Math.max(0, Math.min(cels.length - 1, state.sel + d)); if (n !== state.sel) { state.sel = n; sfx.passa(); ficha(); } return true; }
  if (code === 'Enter' || code === 'KeyJ' || code === 'Space' || code === 'KeyE') { const b = root.querySelector('.acoes .placa:not(:disabled)'); if (b) b.click(); return true; }
  return true;
}
function troca(t) { if (state.tab === t) return; state.tab = t; state.sel = 0; sfx.passa(); monta(); }

function monta() {
  const { world, kind } = state;
  root.innerHTML = '';
  const p = el('div', 'painel', cantos), h = el('header');
  h.appendChild(el('h2', '', TITULO[kind])); h.appendChild(el('span', 'coins', String(world.prog.coins)));
  const x = el('button', 'fechar', '×'); x.setAttribute('aria-label', 'Fechar'); x.onclick = closeMenu; h.appendChild(x); p.appendChild(h);
  const corpo = el('div', 'corpo'), tr = el('div', 'trilho');
  for (const [id, nome, ic] of ABAS[kind]) { const t = el('button', 'tab' + (state.tab === id ? ' on' : ''), `<i>${ic()}</i>${nome}`); t.dataset.tab = id; t.onclick = () => troca(id); tr.appendChild(t); }
  corpo.appendChild(tr);
  const c = el('div', 'cont'); corpo.appendChild(c); p.appendChild(corpo);
  p.appendChild(el('div', 'rodape', '<span><kbd>Setas</kbd>escolher</span><span><kbd>Q / R</kbd>trocar de aba</span><span><kbd>Enter</kbd>confirmar</span><span><kbd>Esc</kbd>fechar</span>'));
  root.appendChild(p);
  if (state.tab === 'mapa') { c.className = 'cont uma'; mapa(c, world); return; }
  state.its = itens(world, state.tab); state.sel = Math.min(state.sel, Math.max(0, state.its.length - 1));
  const lista = state.tab === 'arcanos' || state.tab === 'reliquias', g = el('div', lista ? 'lista' : 'grade');
  if (!state.its.length) g.appendChild(el('div', 'vaz', state.vazio || 'Nada aqui ainda.'));
  state.its.forEach((it, i) => {
    let e;
    if (lista) e = el('button', 'linha' + (it.off ? ' off' : ''), `<i>${it.ic}</i><b>${it.nome}</b><small>${it.sub || ''}</small>`);
    else e = el('button', 'cel' + (it.off ? ' off' : '') + (it.rara ? ' rara' : ''), `${it.ic}${it.qtd !== undefined ? `<u>${it.qtd}</u>` : ''}${it.on ? '<s></s>' : ''}`);
    e.setAttribute('aria-label', it.nome);
    e.addEventListener('click', () => { if (state.sel === i) return; state.sel = i; sfx.passa(); ficha(); });
    e.addEventListener('dblclick', () => { if (it.btn && !it.disabled) age(it); });
    g.appendChild(e);
  });
  c.appendChild(g); c.appendChild(el('div', 'det')); ficha();
}
function age(it) { it.act(); state.world.save(); const s = root.querySelector('.grade, .lista'), y = s ? s.scrollTop : 0; monta(); const n = root.querySelector('.grade, .lista'); if (n) n.scrollTop = y; }
function ficha() {
  const d = root.querySelector('.det'), it = state.its[state.sel];
  root.querySelectorAll('.cel, .linha').forEach((e, i) => { e.classList.toggle('sel', i === state.sel); if (i === state.sel) e.scrollIntoView({ block: 'nearest' }); });
  if (!d) return; d.innerHTML = '';
  if (!it) { d.appendChild(el('p', '', state.texto || '')); return; }
  d.appendChild(el('div', 'topo', `<div class="fig">${it.ic}</div><div><h3>${it.nome}</h3><div class="tipo">${it.tipo || ''}</div>${it.tag ? `<span class="tag">${it.tag}</span>` : ''}</div>`));
  d.appendChild(el('div', 'div')); d.appendChild(el('p', '', it.desc || ''));
  if (it.est) { const e = el('div', 'est'); for (const [n, v, f, dif] of it.est) e.innerHTML += `<span>${n}</span><span class="tr"><i style="width:${Math.round(Math.min(1, f) * 100)}%"></i></span><b class="${dif > 0 ? 'mais' : dif < 0 ? 'menos' : ''}">${v}${dif > 0 ? ' ▲' : dif < 0 ? ' ▼' : ''}</b>`; d.appendChild(e); }
  if (it.extra) d.appendChild(el('div', '', it.extra));
  if (it.preco) d.appendChild(el('div', 'preco', it.preco));
  if (it.btn) { const a = el('div', 'acoes'), b = el('button', 'placa peq', it.btn); b.disabled = !!it.disabled; b.onclick = () => age(it); a.appendChild(b); d.appendChild(a); if (it.btn2) { const q = el('button', 'placa peq', it.btn2); q.disabled = !!it.dis2; q.onclick = () => age({ act: it.act2 }); a.appendChild(q); } }
}

// ---------- mapa: só as salas visitadas; arraste e aproxime ----------
const SECTOR = { A: '#8f99a8', B: '#a08a6a', C: '#c86c43', D: '#b0a890', ARENA: '#c0404a', SEGREDO: '#d4b66f', CRIPTA: '#6f8f86' };
function mapa(body, world) {
  const seen = world.prog.rooms || {}, lv = world.level, k = 3, box = el('div', 'mapa'), tela = el('div', 'quadro'), c = el('canvas'); box.appendChild(tela); tela.appendChild(c);
  c.width = MW * k; c.height = MH * k; const x = c.getContext('2d');
  for (const r of ROOMS) {
    if (!seen[r.id]) continue;
    for (let ty = r.y0; ty <= r.y1; ty++) for (let tx = r.x0; tx <= r.x1; tx++) {
      if (lv.solid(tx, ty)) continue;
      let perto = lv.isCave(tx, ty); for (let d = 1; !perto && d < 7; d++) if (lv.solid(tx, ty + d) || lv.oneway(tx, ty + d)) perto = true;
      if (!perto) continue;
      x.globalAlpha = 0.42; x.fillStyle = SECTOR[r.sector]; x.fillRect(tx * k, ty * k, k, k); x.globalAlpha = 1;
      x.fillStyle = '#e8dcc6'; if (lv.solid(tx, ty + 1)) x.fillRect(tx * k, (ty + 1) * k - 1, k, 1); else if (lv.oneway(tx, ty)) { x.globalAlpha = 0.6; x.fillRect(tx * k, ty * k, k, 1); x.globalAlpha = 1; }
      x.fillStyle = 'rgba(232,220,198,.45)'; if (lv.solid(tx - 1, ty)) x.fillRect(tx * k, ty * k, 1, k); if (lv.solid(tx + 1, ty)) x.fillRect((tx + 1) * k - 1, ty * k, 1, k);
    }
  }
  x.font = '600 13px "Alegreya Sans", sans-serif'; x.textAlign = 'center';
  for (const r of ROOMS) { if (!seen[r.id] || r.x1 - r.x0 < 16) continue; x.fillStyle = 'rgba(0,0,0,.6)'; x.fillText(r.name, (r.x0 + r.x1) / 2 * k + 1, (r.y0 - 1) * k + 1); x.fillStyle = '#e6d6b8'; x.fillText(r.name, (r.x0 + r.x1) / 2 * k, (r.y0 - 1) * k); }
  for (const it of world.interactables) {
    const r = lv.roomAt(it.x, it.y - 4); if (!r || !seen[r.id]) continue;
    const tx = it.x / 16 * k, ty = it.y / 16 * k;
    if (it.type === 'shrine') { x.fillStyle = '#2a1408'; x.fillRect(tx - 4, ty - 9, 8, 9); x.fillStyle = '#ffb070'; x.fillRect(tx - 3, ty - 8, 6, 7); x.fillStyle = '#fff0c8'; x.fillRect(tx - 1, ty - 6, 2, 4); }
    if (it.type === 'chest' && !world.flags.chests[it.id] && r.sector !== 'SEGREDO') { x.fillStyle = '#1a1208'; x.fillRect(tx - 4, ty - 6, 8, 6); x.fillStyle = '#e0bc62'; x.fillRect(tx - 3, ty - 5, 6, 4); }
  }
  const p = world.player, px = p.cx() / 16 * k, py = (p.y + p.h) / 16 * k - 5;
  x.save(); x.translate(px, py); x.rotate(Math.PI / 4); x.fillStyle = '#0a090c'; x.fillRect(-7, -7, 14, 14); x.fillStyle = '#fff'; x.fillRect(-5, -5, 10, 10); x.fillStyle = '#e0404a'; x.fillRect(-2.5, -2.5, 5, 5); x.restore();
  const main = ROOMS.filter((r) => /^[ABCD]$/.test(r.sector)), n = main.filter((r) => seen[r.id]).length;
  box.appendChild(el('div', 'legenda', `<span><i style="background:#e0404a"></i>${world.room ? world.room.name : 'Vale das Cinzas'}</span><span><i style="background:#ffb070"></i>Pira</span><span><i style="background:#e0bc62"></i>Baú visto</span><span>Salas: ${n} de ${main.length}</span><span style="margin-left:auto">Arraste para ver · toque duplo aproxima</span>`));
  body.appendChild(box);
  let z = 1, ox = 0, oy = 0; const ap = () => { c.style.transform = `translate(${ox}px, ${oy}px) scale(${z})`; };
  requestAnimationFrame(() => { z = Math.max(0.5, Math.min(1.6, tela.clientHeight / 230)); ox = tela.clientWidth / 2 - px * z; oy = tela.clientHeight / 2 - py * z; ap(); });
  const pts = new Map(); let d0 = 0;
  tela.addEventListener('pointerdown', (e) => { pts.set(e.pointerId, [e.clientX, e.clientY]); tela.setPointerCapture(e.pointerId); });
  tela.addEventListener('pointermove', (e) => {
    const a = pts.get(e.pointerId); if (!a) return;
    if (pts.size === 1) { ox += e.clientX - a[0]; oy += e.clientY - a[1]; } else { const [p1, p2] = [...pts.values()], d = Math.hypot(p1[0] - p2[0], p1[1] - p2[1]); if (d0) amplia(d / d0, (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2); d0 = d; }
    a[0] = e.clientX; a[1] = e.clientY; ap();
  });
  const solta = (e) => { pts.delete(e.pointerId); d0 = 0; }; tela.addEventListener('pointerup', solta); tela.addEventListener('pointercancel', solta);
  const amplia = (f, cx, cy) => { const r = tela.getBoundingClientRect(), mx = cx - r.left, my = cy - r.top, nz = Math.max(0.4, Math.min(3, z * f)); ox = mx - (mx - ox) * nz / z; oy = my - (my - oy) * nz / z; z = nz; ap(); };
  tela.addEventListener('wheel', (e) => { e.preventDefault(); amplia(e.deltaY < 0 ? 1.15 : 0.87, e.clientX, e.clientY); }, { passive: false });
  tela.addEventListener('dblclick', (e) => amplia(z > 1.8 ? 0.5 : 1.7, e.clientX, e.clientY));
}

// ---------- conteúdo ----------
function estat(prog, id) {
  const W = WEAPONS[id], lv = prog.weapons[id] || 0, f = 1 + lv * UPGRADE.dmgPerLevel, m = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  return { dano: Math.round(m(W.combo) * f), pesado: Math.round(W.heavy[1] * f), vel: W.speed, alc: W.reach, post: Math.round(m(W.posture)) };
}
function barrasArma(prog, id, up) {
  const a = estat(prog, id), eq = prog.equipped && prog.weapons[prog.equipped] !== undefined ? estat(prog, prog.equipped) : null, b = up ? { ...a } : eq || a, D = (k) => (up ? 0 : Math.sign(a[k] - b[k]));
  return [['Dano', a.dano, a.dano / 190, D('dano')], ['Pesado', a.pesado, a.pesado / 520, D('pesado')], ['Velocidade', Math.round(a.vel * 100), a.vel / 1.5, D('vel')], ['Alcance', a.alc, a.alc / 56, D('alc')], ['Postura', a.post, a.post / 40, D('post')]];
}
function itens(world, tab) {
  const prog = world.prog, p = world.player, out = []; state.vazio = ''; state.texto = '';
  if (tab === 'armas') {
    for (const id of Object.keys(WEAPONS)) {
      const W = WEAPONS[id];
      if (prog.weapons[id] === undefined) { out.push({ ic: peca('i_' + id), nome: 'Não encontrada', tipo: W.cat, off: 1, desc: `Pista: ${W.where}. Armas regionais caem de inimigos (4% por fonte) ou estão em baús. Nenhuma é obrigatória.` }); continue; }
      const eq = prog.equipped === id;
      out.push({ ic: peca('i_' + id), nome: weaponName(prog, id), tipo: `${W.cat} · ${W.rarity}`, rara: W.rarity === 'Rara', on: eq, tag: eq ? 'NA MÃO' : '', qtd: prog.weapons[id] ? '+' + prog.weapons[id] : undefined, desc: W.desc, est: barrasArma(prog, id), btn: eq ? 'Equipada' : 'Equipar', disabled: eq, act: () => p.equip(id) });
    }
  } else if (tab === 'reliquias') {
    prog.relicSlots.forEach((r, i) => out.push({ ic: r ? peca('i_' + r) : ico('arcano'), off: !r, nome: r ? RELICS[r].name : `Espaço ${i + 1} vazio`, sub: r ? 'Equipada' : 'Relíquias vêm de chefes e da exploração', tipo: 'Espaço de relíquia', desc: r ? RELICS[r].desc : 'Cada chefe guarda uma relíquia temática. São 2 espaços no início, 3 após a região 8 e 4 após a região 16.', btn: r ? 'Remover' : null, act: () => { prog.relicSlots[i] = null; sfx.ui(); } }));
    for (const r of prog.relicsOwned) { if (prog.relicSlots.includes(r)) continue; const free = prog.relicSlots.indexOf(null); out.push({ ic: peca('i_' + r), nome: RELICS[r].name, sub: 'Guardada', tipo: 'Relíquia', desc: RELICS[r].desc, btn: 'Equipar', disabled: free < 0, act: () => { prog.relicSlots[free] = r; sfx.chest(); } }); }
  } else if (tab === 'pocoes') {
    const pr = prog.prep;
    for (const id of POTION_IDS) {
      const P = POTIONS[id], other = POTION_IDS.filter((q) => q !== id && pr[q] > 0).sort((a, b) => pr[b] - pr[a])[0], on = prog.potion === id;
      out.push({ ic: peca('i_' + id), nome: P.name, qtd: p.flasks[id], on, tag: on ? 'SELECIONADA' : '', tipo: `Agora ${p.flasks[id]} · preparo ${pr[id]} de ${p.maxPotions}`, desc: `${P.desc} Recarga de 1,5 s. O novo preparo vale no próximo descanso numa pira. Dano forte interrompe a cura, e o frasco se perde.`, btn: on ? 'Em uso' : 'Selecionar', disabled: on, act: () => { prog.potion = id; sfx.ui(); }, btn2: 'Preparar +1', dis2: !other, act2: () => { pr[other]--; pr[id]++; sfx.ui(); } });
    }
  } else if (tab === 'itens') {
    for (const id of Object.keys(ITEMS)) { const it = ITEMS[id], q = prog.quick === id, n = prog.items[id] || 0; out.push({ ic: peca('i_' + id), nome: it.name, qtd: n, off: !n, on: q, tag: q ? 'ITEM RÁPIDO' : '', tipo: `Consumível · máximo ${it.max}`, desc: it.desc, btn: q ? 'Selecionado' : 'Usar como rápido', disabled: q, act: () => { prog.quick = id; sfx.ui(); } }); }
    for (const id of Object.keys(HERBS)) if (prog.herbs[id]) out.push({ ic: peca('i_' + id), nome: HERBS[id].name, qtd: prog.herbs[id], tipo: HERBS[id].rare ? 'Erva rara' : 'Erva comum', desc: 'Erva do Vale das Cinzas. Morren compra.' });
    for (const id of Object.keys(MATERIALS)) if (prog.materials[id]) out.push({ ic: peca(id === 'cinzaviva' ? 'i_cinza' : 'i_fragmento'), nome: MATERIALS[id].name, qtd: prog.materials[id], tipo: 'Material', desc: MATERIALS[id].desc });
  } else if (tab === 'arcanos') {
    const owned = prog.arcana.filter(Boolean);
    if (!owned.length) { out.push({ ic: ico('arcano'), off: 1, nome: 'Nenhum Arcano liberto', sub: '22 almas presas esperam', tipo: 'Arcano Maior', desc: 'Derrote um corrompido para libertar seu Arcano. O Errante equipa exatamente dois: primário e secundário.' }); }
    for (const a of owned) {
      const pts = Math.floor(prog.mastery[a] || 0), lv = masteryLevel(pts), next = MASTERY[lv + 1], f = next ? (pts - MASTERY[lv]) / (next - MASTERY[lv]) : 1;
      out.push({ ic: ico('arcano'), nome: `${ARCANA[a].name} · ${ARCANA[a].title}`, sub: `Maestria ${GRAU[lv]}`, tipo: `Maestria ${GRAU[lv]}`, desc: MASTERY_DESC[lv], extra: `<p style="margin-top:.7em">${pts}${next ? ' de ' + next : ''} pontos</p><div class="mbar"><i style="width:${Math.round(f * 100)}%"></i></div>` });
      ARCANA[a].abilities.forEach((ab) => { const ok = lv >= ab.mastery; out.push({ ic: ico(ab.passive ? 'esquiva' : 'espada'), off: !ok, nome: ab.name, sub: ok ? (ab.passive ? 'Passiva' : `${ab.foco} de Foco · ${ab.cd} s`) : `Bloqueada: Maestria ${GRAU[ab.mastery]}`, tipo: ab.passive ? 'Habilidade passiva' : 'Habilidade ativa', desc: ab.desc }); });
    }
    out.push({ ic: ico('falar'), nome: 'Como ganhar maestria', sub: 'Dica', tipo: 'Dica', desc: 'Use o Arcano ativo em combate: derrotar inimigos, aparar, esquivar no instante certo e acertar habilidades. Repetir a mesma ação em sequência rende menos.' });
  } else if (tab === 'comprar') {
    for (const id of Object.keys(ITEMS)) { const it = ITEMS[id], have = prog.items[id] || 0, sem = prog.coins < it.price; out.push({ ic: peca('i_' + id), nome: it.name, qtd: have, tipo: `Você tem ${have} de ${it.max}`, desc: it.desc, preco: `<span class="${sem ? 'falta' : ''}">${it.price} moedas</span>`, btn: have >= it.max ? 'Cheio' : 'Comprar', disabled: sem || have >= it.max, act: () => { if (addItem(prog, id)) { prog.coins -= it.price; sfx.compra(); } } }); }
  } else if (tab === 'vender') {
    for (const id of Object.keys(HERBS)) { const n = prog.herbs[id] || 0; if (!n) continue; out.push({ ic: peca('i_' + id), nome: HERBS[id].name, qtd: n, tipo: HERBS[id].rare ? 'Rara: nasce perto de sinos caídos' : 'Comum: volta a crescer depois de um descanso', desc: 'Morren paga na hora.', preco: `${HERBS[id].price} moedas cada`, btn: 'Vender 1', act: () => { prog.herbs[id]--; prog.coins += HERBS[id].price; sfx.compra(); }, btn2: 'Vender tudo', dis2: n < 2, act2: () => { prog.coins += HERBS[id].price * prog.herbs[id]; prog.herbs[id] = 0; sfx.compra(); } }); }
    state.vazio = 'Sem ervas para vender.'; state.texto = 'Sálvia Cinzenta cresce em fendas protegidas do vento; Flor de Cinza, perto de sinos caídos; Líquen de Brasa, nas pedras quentes.';
  } else if (tab === 'forja') {
    for (const id of Object.keys(WEAPONS)) {
      if (prog.weapons[id] === undefined) continue;
      const lv = prog.weapons[id], max = lv >= UPGRADE.max, coins = UPGRADE.coins[lv], fr = UPGRADE.fragments[lv], hf = prog.materials.fragmento || 0;
      out.push({ ic: peca('i_' + id), nome: weaponName(prog, id), qtd: '+' + lv, on: prog.equipped === id, tag: prog.equipped === id ? 'NA MÃO' : '', tipo: WEAPONS[id].cat, desc: max ? 'Aprimoramento máximo.' : `Aprimorar para +${lv + 1}: mais ${Math.round(UPGRADE.dmgPerLevel * 100)}% de dano.`, est: barrasArma(prog, id, true).slice(0, 2), preco: max ? '' : `<span class="${prog.coins < coins ? 'falta' : ''}">${coins} moedas</span>${fr ? `<span class="${hf < fr ? 'falta' : ''}">${hf}/${fr} fragmentos</span>` : ''}`, btn: max ? 'Máximo' : 'Aprimorar', disabled: max || prog.coins < coins || hf < fr, act: () => { prog.coins -= coins; prog.materials.fragmento = hf - fr; prog.weapons[id] = lv + 1; sfx.forja(); } });
    }
    state.vazio = 'Você ainda não tem armas para afiar.';
  }
  return out;
}
