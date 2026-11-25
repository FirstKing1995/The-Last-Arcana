// Área visível do mundo. A altura é fixa; a largura acompanha a tela (celular comprido mostra mais cenário).
export let VW = 384;
export const VH = 216;
export function setView(w) { VW = Math.max(340, Math.min(492, Math.round(w / 2) * 2)); return VW; }
