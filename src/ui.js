// Menus em HTML sobre o canvas: inventário, loja do Morren e forja da Ysara.
// Funcionam com toque, mouse e teclado (setas/Enter/Esc).
import { POTIONS, POTION_IDS, WEAPONS, UPGRADE, ARCANA, MASTERY, MASTERY_DESC, RELICS, ITEMS, HERBS, MATERIALS } from './data.js';
import { masteryLevel, weaponName, addItem } from './state.js';
import { sfx } from './audio.js';
import { ROOMS, W as MW, H as MH } from './level.js';

const CSS = `
#menu { position: fixed; inset: 0; z-index: 8; display: none; align-items: center; justify-content: center;
  background: rgba(8,6,10,.72); font-family: Silkscreen, monospace; color: #e8e0d0; }
#menu.on { display: flex; }
#menu .panel { width: min(720px, 94vw); max-height: 90vh; display: flex; flex-direction: column; background: #141216;
  border: 2px solid #6d4b32; box-shadow: 0 0 0 2px #0a090c, 0 0 40px rgba(182,106,59,.18); }
#menu header { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-bottom: 1px solid #3a2f2a; }
#menu h2 { margin: 0; font-size: 16px; font-weight: 400; color: #e8d2a8; letter-spacing: .04em; flex: 1; }
#menu .coins { color: #e8c96a; font-size: 12px; }
#menu .close { background: none; border: 1px solid #4a3d34; color: #a59d95; font: inherit; font-size: 12px; padding: 4px 8px; cursor: pointer; }
#menu .tabs { display: flex; gap: 2px; padding: 8px 12px 0; flex-wrap: wrap; }
#menu .tab { background: #1c191e; border: 1px solid #3a2f2a; border-bottom: none; color: #a59d95; font: inherit; font-size: 11px; padding: 6px 10px; cursor: pointer; }
#menu .tab.on { background: #241f22; color: #e8d2a8; border-color: #6d4b32; }
#menu .body { overflow-x: hidden; overflow-y: auto; padding: 10px 12px 14px; border-top: 1px solid #6d4b32; margin: 0 12px 12px; background: #19161b; }
#menu .row { display: grid; grid-template-columns: 1fr auto; gap: 4px 10px; align-items: center; padding: 8px; border-bottom: 1px solid #2a2428; }
#menu .row:last-child { border-bottom: none; }
#menu .row.sel { background: #241f22; outline: 1px solid #8b633f; }
#menu .name { font-size: 12px; color: #e8e0d0; }
#menu .name small { color: #b66a3b; font-size: 10px; margin-left: 6px; }
#menu .desc { grid-column: 1 / 2; font-family: system-ui, sans-serif; font-size: 12px; color: #a59d95; line-height: 1.35; }
#menu .btn { background: #2a2024; border: 1px solid #8b633f; color: #f0e0b8; font: inherit; font-size: 11px; padding: 6px 10px; cursor: pointer; white-space: nowrap; grid-row: 1 / 3; grid-column: 2; }
#menu .btn:disabled { opacity: .4; cursor: default; }
#menu .btn:focus-visible, #menu .tab:focus-visible, #menu .close:focus-visible { outline: 2px solid #d4b66f; }
#menu .tag { font-size: 10px; color: #7fc48a; }
#menu .bar { height: 6px; background: #0a090c; border: 1px solid #3a2f2a; margin-top: 4px; }
#menu .bar i { display: block; height: 100%; background: #d9b58a; }
#menu .hint { font-size: 10px; color: #6a635e; padding: 0 12px 10px; }
#menu canvas.map { display: block; box-sizing: border-box; width: 100%; image-rendering: pixelated; background: #0d0b0f; border: 1px solid #3a2f2a; }
#menu .legend { font-family: system-ui, sans-serif; font-size: 12px; color: #a59d95; padding: 8px 2px 0; display: flex; gap: 14px; flex-wrap: wrap; }
#menu .legend i { display: inline-block; width: 9px; height: 9px; margin-right: 5px; }
#menu .empty { font-family: system-ui, sans-serif; color: #7a726c; font-size: 12px; padding: 8px; }
@media (max-height: 420px) { #menu .panel { max-height: 96vh; } #menu header { padding: 6px 10px; } #menu .body { margin: 0 10px 8px; } }
`;

let root, state = null;

function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }

export function setupUI() {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  root = el('div'); root.id = 'menu';
  document.body.appendChild(root);
  root.addEventListener('pointerdown', (e) => { if (e.target === root) closeMenu(); });
}

export function isMenuOpen() { return !!state; }

export function openMenu(world, kind, onClose) {
  const toMap = kind === 'map';
  if (toMap) kind = 'inventory';
  state = { world, kind, onClose, tab: toMap ? 'mapa' : kind === 'inventory' ? 'armas' : kind === 'morren' ? 'comprar' : 'forja', sel: 0 };
  render();
  root.classList.add('on');
  sfx.ui();
}

export function closeMenu() {
  if (!state) return;
  const cb = state.onClose;
  state.world.save();
  state = null;
  root.classList.remove('on');
  root.innerHTML = '';
  cb && cb();
}

// Navegação por teclado
export function menuKey(code) {
  if (!state) return false;
  const rows = [...root.querySelectorAll('.row')];
  const tabs = [...root.querySelectorAll('.tab')];
  if (code === 'Escape' || code === 'KeyI' || code === 'KeyP' || code === 'KeyN') { closeMenu(); return true; }
  if (code === 'ArrowDown' || code === 'KeyS') { state.sel = Math.min(rows.length - 1, state.sel + 1); render(); return true; }
  if (code === 'ArrowUp' || code === 'KeyW') { state.sel = Math.max(0, state.sel - 1); render(); return true; }
  if ((code === 'ArrowRight' || code === 'KeyD' || code === 'ArrowLeft' || code === 'KeyA') && tabs.length) {
    const ids = tabs.map((t) => t.dataset.tab);
    const i = ids.indexOf(state.tab);
    state.tab = ids[(i + (code === 'ArrowRight' || code === 'KeyD' ? 1 : ids.length - 1)) % ids.length];
    state.sel = 0; render(); sfx.ui(); return true;
  }
  if (code === 'Enter' || code === 'KeyJ' || code === 'Space' || code === 'KeyE') {
    const b = rows[state.sel] && rows[state.sel].querySelector('.btn:not(:disabled)');
    if (b) b.click();
    return true;
  }
  return true;
}

function render() {
  const { world, kind } = state;
  const prog = world.prog;
  root.innerHTML = '';
  const panel = el('div', 'panel');
  const head = el('header');
  const title = { inventory: 'Inventário do Errante', morren: 'Morren · Mercador de Mil Coisas', ysara: 'Ysara · Forja das Brasas Frias' }[kind];
  head.appendChild(el('h2', '', title));
  head.appendChild(el('span', 'coins', `◆ ${prog.coins} moedas`));
  const close = el('button', 'close', 'Fechar');
  close.onclick = closeMenu;
  head.appendChild(close);
  panel.appendChild(head);

  const tabsDef = kind === 'inventory'
    ? [['mapa', 'Mapa'], ['armas', 'Armas'], ['pocoes', 'Poções'], ['reliquias', 'Relíquias'], ['itens', 'Itens'], ['arcanos', 'Arcanos']]
    : kind === 'morren' ? [['comprar', 'Comprar'], ['vender', 'Vender ervas']] : [['forja', 'Aprimorar']];
  if (tabsDef.length > 1) {
    const tabs = el('div', 'tabs');
    for (const [id, label] of tabsDef) {
      const t = el('button', 'tab' + (state.tab === id ? ' on' : ''), label);
      t.dataset.tab = id;
      t.onclick = () => { state.tab = id; state.sel = 0; sfx.ui(); render(); };
      tabs.appendChild(t);
    }
    panel.appendChild(tabs);
  }
  const body = el('div', 'body');
  const rows = state.tab === 'mapa' ? [] : buildRows(world, state.tab);
  if (state.tab === 'mapa') drawMap(body, world);
  else if (!rows.length) body.appendChild(el('div', 'empty', 'Nada aqui ainda.'));
  rows.forEach((r, i) => {
    const row = el('div', 'row' + (i === state.sel ? ' sel' : ''));
    row.appendChild(el('div', 'name', r.name));
    if (r.desc) row.appendChild(el('div', 'desc', r.desc));
    if (r.btn) {
      const b = el('button', 'btn', r.btn);
      b.disabled = !!r.disabled;
      b.onclick = () => { state.sel = i; r.act(); world.save(); render(); };
      row.appendChild(b);
    }
    row.addEventListener('pointerenter', () => { if (state.sel !== i) { state.sel = i; [...body.children].forEach((c, k) => c.classList.toggle('sel', k === i)); } });
    body.appendChild(row);
  });
  panel.appendChild(body);
  panel.appendChild(el('div', 'hint', 'Setas: navegar · Enter: confirmar · Esc: fechar'));
  root.appendChild(panel);
  const selRow = body.children[state.sel];
  if (selRow && selRow.scrollIntoView) selRow.scrollIntoView({ block: 'nearest' });
}

// Mapa: mostra só as salas já visitadas; segredos e ligações desconhecidas ficam escondidos
const SECTOR = { A: '#8f99a8', B: '#a08a6a', C: '#c86c43', D: '#b0a890', ARENA: '#c0404a', SEGREDO: '#d4b66f', CRIPTA: '#6f8f86' };
function drawMap(body, world) {
  const seen = world.prog.rooms || {}, lv = world.level, k = 2;
  const c = document.createElement('canvas'); c.className = 'map'; c.width = MW * k; c.height = (MH - 4) * k;
  const x = c.getContext('2d');
  for (const r of ROOMS) {
    if (!seen[r.id]) continue;
    x.globalAlpha = 0.5; x.fillStyle = SECTOR[r.sector];
    for (let ty = r.y0; ty <= r.y1; ty++) for (let tx = r.x0; tx <= r.x1; tx++) {
      const t = lv.get(tx, ty);
      // no céu aberto, só a faixa perto do chão interessa
      const open = !lv.solid(tx, ty);
      if (!open) continue;
      let near = lv.isCave(tx, ty);
      for (let d = 1; !near && d < 7; d++) if (lv.solid(tx, ty + d) || lv.oneway(tx, ty + d)) near = true;
      if (near) x.fillRect(tx * k, (ty - 4) * k, k, k);
      if (t === '=') { x.globalAlpha = 1; x.fillRect(tx * k, (ty - 4) * k, k, 1); x.globalAlpha = 0.5; }
    }
  }
  x.globalAlpha = 1;
  for (const it of world.interactables) {
    const r = lv.roomAt(it.x, it.y - 4);
    if (!r || !seen[r.id]) continue;
    const tx = Math.floor(it.x / 16) * k, ty = (Math.floor(it.y / 16) - 5) * k;
    if (it.type === 'shrine') { x.fillStyle = '#ffb070'; x.fillRect(tx - 2, ty - 4, 5, 6); }
    if (it.type === 'chest' && !world.flags.chests[it.id] && r.sector !== 'SEGREDO') { x.fillStyle = '#d4b66f'; x.fillRect(tx - 1, ty - 1, 4, 3); }
  }
  const p = world.player, px = Math.floor(p.cx() / 16) * k, py = (Math.floor((p.y + p.h) / 16) - 6) * k;
  x.fillStyle = '#0a090c'; x.fillRect(px - 4, py - 4, 9, 9); x.fillStyle = '#ffffff'; x.fillRect(px - 3, py - 3, 7, 7); x.fillStyle = '#e0404a'; x.fillRect(px - 1, py - 1, 3, 3);
  body.appendChild(c);
  const main = ROOMS.filter((r) => /^[ABCD]$/.test(r.sector)), n = main.filter((r) => seen[r.id]).length;
  body.appendChild(el('div', 'legend', `<span><i style="background:#e0404a"></i>Você: ${world.room ? world.room.name : 'Vale das Cinzas'}</span><span><i style="background:#ffb070"></i>Pira</span><span><i style="background:#d4b66f"></i>Baú visto</span><span>Salas: ${n} de ${main.length}</span>`));
}

function buildRows(world, tab) {
  const prog = world.prog, p = world.player;
  const out = [];
  if (tab === 'armas') {
    for (const id of Object.keys(WEAPONS)) {
      if (prog.weapons[id] === undefined) continue;
      const W = WEAPONS[id];
      const eq = prog.equipped === id;
      out.push({
        name: `${weaponName(prog, id)}<small>${W.cat} · ${W.rarity}</small>${eq ? ' <span class="tag">equipada</span>' : ''}`,
        desc: `${W.desc} Golpes: ${W.combo.length} · alcance ${W.reach} · ${W.speed > 1 ? 'rápida' : W.speed < 1 ? 'lenta' : 'equilibrada'}.`,
        btn: eq ? 'Equipada' : 'Equipar', disabled: eq,
        act: () => { p.equip(id); },
      });
    }
    if (!out.length) out.push({ name: 'Punhos', desc: 'O Errante ainda não tem arma. A primeira está num baú, perto de onde ele despertou.' });
    const missing = Object.keys(WEAPONS).filter((id) => prog.weapons[id] === undefined);
    if (missing.length) out.push({ name: `<small>${missing.length} arma(s) ainda não encontrada(s) no vale</small>`, desc: 'Armas regionais caem de inimigos (4% por fonte) ou estão em baús. Nenhuma é obrigatória.' });
  } else if (tab === 'reliquias') {
    prog.relicSlots.forEach((r, i) => {
      out.push({ name: `Espaço ${i + 1}: ${r ? RELICS[r].name : '<small>vazio</small>'}`, desc: r ? RELICS[r].desc : 'Relíquias são obtidas de chefes e da exploração.', btn: r ? 'Remover' : null, act: () => { prog.relicSlots[i] = null; sfx.ui(); } });
    });
    for (const r of prog.relicsOwned) {
      if (prog.relicSlots.includes(r)) continue;
      const free = prog.relicSlots.indexOf(null);
      out.push({ name: RELICS[r].name, desc: RELICS[r].desc, btn: 'Equipar', disabled: free < 0, act: () => { prog.relicSlots[free] = r; sfx.chest(); } });
    }
    if (!prog.relicsOwned.length) out.push({ name: '<small>Nenhuma relíquia ainda</small>', desc: 'Cada chefe guarda uma relíquia temática. Espaços: 2 no início, 3 após a região 8, 4 após a região 16.' });
  } else if (tab === 'pocoes') {
    const pr = prog.prep;
    for (const id of POTION_IDS) {
      const P = POTIONS[id], other = POTION_IDS.filter((q) => q !== id && pr[q] > 0).sort((a, b) => pr[b] - pr[a])[0];
      out.push({
        name: `${P.name} <small>agora ${p.flasks[id]} · preparo ${pr[id]}</small>${prog.potion === id ? ' <span class="tag">selecionada</span>' : ''}`,
        desc: `${P.desc} Recarga de 1,5 s.`, btn: 'Preparar +1', disabled: !other,
        act: () => { pr[other]--; pr[id]++; sfx.ui(); },
      });
    }
    out.push({ name: `<small>${p.maxPotions} frascos no total, divididos entre os três tipos</small>`, desc: 'O novo preparo vale no próximo descanso numa pira. Dano forte interrompe a cura, e o frasco se perde.' });
  } else if (tab === 'itens') {
    for (const id of Object.keys(ITEMS)) {
      const it = ITEMS[id];
      const q = prog.quick === id;
      out.push({ name: `${it.name} ×${prog.items[id] || 0}${q ? ' <span class="tag">item rápido</span>' : ''}`, desc: it.desc, btn: q ? 'Selecionado' : 'Usar como rápido', disabled: q, act: () => { prog.quick = id; sfx.ui(); } });
    }
    for (const id of Object.keys(HERBS)) if (prog.herbs[id]) out.push({ name: `${HERBS[id].name} ×${prog.herbs[id]}`, desc: 'Erva do Vale das Cinzas. Morren compra.' });
    for (const id of Object.keys(MATERIALS)) if (prog.materials[id]) out.push({ name: `${MATERIALS[id].name} ×${prog.materials[id]}`, desc: MATERIALS[id].desc });
  } else if (tab === 'arcanos') {
    const owned = prog.arcana.filter(Boolean);
    if (!owned.length) out.push({ name: '<small>Nenhum Arcano liberto</small>', desc: 'Derrote um corrompido para libertar seu Arcano. O Errante equipa exatamente dois: primário e secundário.' });
    for (const a of owned) {
      const pts = Math.floor(prog.mastery[a] || 0), lv = masteryLevel(pts);
      const next = MASTERY[lv + 1];
      const frac = next ? (pts - MASTERY[lv]) / (next - MASTERY[lv]) : 1;
      out.push({ name: `${ARCANA[a].name} · ${ARCANA[a].title}<small>Maestria ${['0', 'I', 'II', 'III', 'IV', 'V'][lv]}</small>`, desc: `${pts}${next ? ' / ' + next : ''} pontos. ${MASTERY_DESC[lv]}<div class="bar"><i style="width:${Math.round(frac * 100)}%"></i></div>` });
      ARCANA[a].abilities.forEach((ab, i) => {
        const ok = lv >= ab.mastery;
        out.push({ name: `${ok ? '' : '🔒 '}${ab.name}<small>${ab.passive ? 'passiva' : `ativa · ${ab.foco} Foco · ${ab.cd} s`}</small>`, desc: `${ab.desc}${ok ? '' : ` Requer Maestria ${['', 'I', 'II', 'III'][ab.mastery]}.`}` });
      });
    }
    out.push({ name: '<small>Como ganhar maestria</small>', desc: 'Use o Arcano ativo em combate: derrotar inimigos, aparar, esquivar no instante certo e acertar habilidades. Repetir a mesma ação em sequência rende menos.' });
  } else if (tab === 'comprar') {
    for (const id of Object.keys(ITEMS)) {
      const it = ITEMS[id];
      const have = prog.items[id] || 0;
      out.push({ name: `${it.name} <small>${it.price} moedas · você tem ${have}/${it.max}</small>`, desc: it.desc, btn: 'Comprar', disabled: prog.coins < it.price || have >= it.max, act: () => { if (addItem(prog, id)) { prog.coins -= it.price; sfx.chest(); } } });
    }
  } else if (tab === 'vender') {
    let any = false;
    for (const id of Object.keys(HERBS)) {
      const n = prog.herbs[id] || 0;
      if (!n) continue;
      any = true;
      out.push({ name: `${HERBS[id].name} ×${n} <small>${HERBS[id].price} cada</small>`, desc: HERBS[id].rare ? 'Rara: nasce perto de sinos caídos.' : 'Comum: volta a crescer depois de um descanso.', btn: 'Vender 1', act: () => { prog.herbs[id]--; prog.coins += HERBS[id].price; sfx.ui(); } });
    }
    if (!any) out.push({ name: '<small>Sem ervas para vender</small>', desc: 'Sálvia Cinzenta cresce em fendas protegidas do vento; Flor de Cinza, perto de sinos caídos; Líquen de Brasa, nas pedras quentes.' });
  } else if (tab === 'forja') {
    for (const id of Object.keys(WEAPONS)) {
      if (prog.weapons[id] === undefined) continue;
      const lv = prog.weapons[id];
      const maxed = lv >= UPGRADE.max;
      const coins = UPGRADE.coins[lv], frags = UPGRADE.fragments[lv];
      const haveF = prog.materials.fragmento || 0;
      out.push({
        name: `${weaponName(prog, id)}${prog.equipped === id ? ' <span class="tag">equipada</span>' : ''}`,
        desc: maxed ? 'Aprimoramento máximo.' : `Próximo: +${lv + 1} (+${Math.round(UPGRADE.dmgPerLevel * 100)}% de dano). Custo: ${coins} moedas${frags ? ` e ${frags} Fragmento(s) de Memória (você tem ${haveF})` : ''}.`,
        btn: maxed ? 'Máximo' : 'Aprimorar', disabled: maxed || prog.coins < coins || haveF < frags,
        act: () => { prog.coins -= coins; prog.materials.fragmento = haveF - frags; prog.weapons[id] = lv + 1; sfx.heavy(); sfx.chest(); },
      });
    }
  }
  return out;
}
