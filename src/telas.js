// Telas fora da partida: título, pausa, opções, controles e morte.
import { el, cantos } from './hud.js';
import { cfg, setCfg } from './config.js';
import { sfx } from './audio.js';
import { Input } from './input.js';
import { loadProgress, hasSave } from './state.js';
import { editarBotoes } from './touch.js';

const T = {}; let acoes = {}, pilha = [], foco = -1;
const CONTROLES = [['A / D', 'mover'], ['W / Espaço', 'pular (S + Espaço desce)'], ['Shift', 'rolar; com S correndo, desliza'], ['J / clique', 'atacar'], ['K / direito', 'golpe pesado; no ar, queda'], ['L / meio', 'aparar'], ['T / roda', 'trocar de arma'], ['Q', 'beber a poção'], ['R', 'trocar a poção'], ['F', 'habilidade do Arcano'], ['Tab', 'trocar Arcano'], ['E', 'interagir e finalizar'], ['C / V', 'usar / trocar item rápido'], ['I / N', 'inventário / mapa'], ['M', 'som'], ['Esc', 'pausa']];
const TOQUE = [['Analógico', 'arraste à esquerda para mover'], ['Para baixo', 'com Pular desce; correndo, desliza'], ['Botão grande', 'atacar'], ['Pesado', 'segure para carregar; no ar, queda'], ['Aparar', 'brilha em amarelo quando dá para aparar'], ['Esquivar', 'brilha em vermelho quando só dá para fugir'], ['Poção', 'toque bebe; segure troca o tipo'], ['Item', 'toque usa; segure troca'], ['Barra de baixo', 'troca de arma'], ['Botão que surge', 'abrir, falar, finalizar'], ['Minimapa', 'abre o mapa']];

function tela(id, html) { const t = el('div', 'tela', html); t.id = id; document.body.appendChild(t); T[id] = t; return t; }
function bot(lbl, f, cls = '') { const b = el('button', 'placa ' + cls, lbl); b.onclick = (e) => { e.preventDefault(); sfx.clica(); f(); }; b.onpointerenter = () => sfx.passa(); return b; }

export function setupTelas(a) {
  acoes = a;
  tela('titulo', `<div class="marca"><img alt="" src="assets/ui/emblema.webp"><h1><span>THE LAST</span>ARCANA</h1><div class="dv"></div><p>VALE DAS CINZAS</p></div><div class="botoes"></div><div class="pe">Um soulslike de Pedro · fones recomendados</div>`);
  tela('pausa', `<div class="painel">${cantos}<h2 class="tt">PAUSA</h2></div>`);
  tela('opcoes', `<div class="painel">${cantos}<h2 class="tt">OPÇÕES</h2><div class="ops"></div><div class="linhabt"></div></div>`);
  tela('controles', `<div class="painel">${cantos}<h2 class="tt">CONTROLES</h2><div class="cs"></div><div class="linhabt"></div></div>`);
  tela('morte', '<h2>VOCÊ SE DESFEZ</h2><p></p>');
  T.morte.appendChild(bot('Levantar da cinza', () => acoes.renascer()));
  const p = T.pausa.querySelector('.painel');
  for (const [l, f, c] of [['Continuar', () => acoes.continuar()], ['Inventário', () => acoes.inventario()], ['Mapa', () => acoes.mapa()], ['Opções', () => abre('opcoes')], ['Controles', () => abre('controles')], ['Voltar ao título', () => acoes.titulo(), 'perigo']]) p.appendChild(bot(l, f, c || ''));
  const fecha = (id) => { const l = T[id].querySelector('.linhabt'); l.appendChild(bot('Voltar', volta, 'peq')); };
  fecha('controles'); fecha('opcoes');
  T.opcoes.querySelector('.linhabt').prepend(bot('Editar botões do celular', () => { const antes = pilha.slice(); some(); editarBotoes(() => { pilha = antes.slice(0, -1); abre('opcoes'); }); }, 'peq edt'));
}
export function abre(id) { for (const k in T) T[k].classList.remove('on'); if (pilha[pilha.length - 1] !== id) pilha.push(id); T[id].classList.add('on'); foco = -1; if (id === 'opcoes') opcoes(); if (id === 'controles') T.controles.querySelector('.cs').innerHTML = (Input.touchMode ? TOQUE : CONTROLES).map(([k, d]) => `<div><kbd>${k}</kbd><span>${d}</span></div>`).join(''); if (id === 'titulo') titulo(); }
export function volta() { pilha.pop(); const a = pilha[pilha.length - 1]; if (a) { pilha.pop(); abre(a); } else { some(); acoes.continuar(); } }
export function some() { for (const k in T) T[k].classList.remove('on'); pilha = []; }
export function telaAberta() { return pilha[pilha.length - 1] || null; }
export function morte(txt) { abre('morte'); T.morte.querySelector('p').textContent = txt; T.morte.querySelector('.placa').style.visibility = 'hidden'; setTimeout(() => { T.morte.querySelector('.placa').style.visibility = ''; }, 1100); }

let confirmar = false;
function titulo() {
  const b = T.titulo.querySelector('.botoes'); b.innerHTML = ''; confirmar = false;
  if (hasSave()) {
    const s = loadProgress() || {}, m = Math.floor((s.playTime || 0) / 60);
    b.appendChild(bot('Continuar', () => acoes.jogar(true)));
    b.appendChild(el('div', 'save', `${s.checkpoint && s.checkpoint.name ? s.checkpoint.name : 'Cinzeiral'} · ${m >= 60 ? Math.floor(m / 60) + ' h ' : ''}${m % 60} min · ${s.coins || 0} moedas`));
  }
  const n = bot('Novo jogo', () => { if (hasSave() && !confirmar) { confirmar = true; n.textContent = 'Apagar o salvo?'; n.classList.add('perigo'); return; } acoes.jogar(false); }); b.appendChild(n);
  b.appendChild(bot('Opções', () => abre('opcoes'))); b.appendChild(bot('Controles', () => abre('controles')));
}
function opcoes() {
  const o = T.opcoes.querySelector('.ops'); o.innerHTML = '';
  T.opcoes.querySelector('.edt').style.display = Input.touchMode ? '' : 'none';
  const sec = (t) => o.appendChild(el('div', 'sec', t)), lab = (t, e) => { const l = el('label', '', `<span>${t}</span>`); l.appendChild(e); o.appendChild(l); };
  const faixa = (t, k, a, b, st) => { const i = el('input'); i.type = 'range'; i.min = a; i.max = b; i.step = st; i.value = cfg[k]; i.oninput = () => setCfg({ [k]: +i.value }); i.onchange = () => sfx.clica(); lab(t, i); };
  const chave = (t, k) => { const c = el('button', 'chave' + (cfg[k] ? ' on' : '')); c.setAttribute('role', 'switch'); c.setAttribute('aria-label', t); c.onclick = () => { setCfg({ [k]: !cfg[k] }); c.classList.toggle('on', cfg[k]); sfx.clica(); }; lab(t, c); };
  const segs = (t, k, vs) => { const s = el('div', 'segs'); for (const [v, n] of vs) { const b = el('button', cfg[k] === v ? 'on' : '', n); b.onclick = () => { setCfg({ [k]: v }); [...s.children].forEach((q) => q.classList.toggle('on', q === b)); sfx.clica(); }; s.appendChild(b); } lab(t, s); };
  sec('SOM'); faixa('Música', 'vmus', 0, 1, 0.05); faixa('Efeitos', 'vsfx', 0, 1, 0.05);
  sec('IMAGEM'); segs('Qualidade', 'qualidade', [['auto', 'Auto'], ['alta', 'Alta'], ['media', 'Média'], ['baixa', 'Baixa']]); chave('Tremor de tela', 'tremor'); chave('Números de dano', 'numeros'); chave('Minimapa', 'minimapa');
  if (Input.touchMode) { sec('CELULAR'); chave('Nomes nos botões', 'nomes'); chave('Vibração', 'vibrar'); chave('Ataque também à esquerda', 'atkEsq'); faixa('Tamanho dos botões', 'tam', 0.75, 1.3, 0.05); faixa('Opacidade', 'opac', 0.35, 1, 0.05); }
}
// Teclado nas telas
export function telaKey(code) {
  const id = telaAberta(); if (!id) return false;
  if (code === 'Escape' || (code === 'KeyP' && id === 'pausa')) { if (id === 'titulo' || id === 'morte') return true; sfx.fecha(); volta(); return true; }
  const bs = [...T[id].querySelectorAll('.placa')].filter((b) => b.offsetParent && b.style.visibility !== 'hidden' && b.style.display !== 'none'); if (!bs.length) return true;
  const d = { ArrowDown: 1, KeyS: 1, ArrowRight: 1, ArrowUp: -1, KeyW: -1, ArrowLeft: -1 }[code];
  if (d) { foco = (Math.max(foco, d > 0 ? -1 : 0) + d + bs.length) % bs.length; bs.forEach((b, i) => b.classList.toggle('on', i === foco)); sfx.passa(); return true; }
  if (code === 'Enter' || code === 'Space' || code === 'KeyE' || code === 'KeyJ') { const b = bs[Math.max(0, foco)]; b && b.click(); return true; }
  return id !== 'titulo' || code !== 'KeyM';
}
