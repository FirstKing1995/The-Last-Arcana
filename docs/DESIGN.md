# Do manual ao código

Fonte: *The Last Arcana — Manual de Conteúdo, Recompensas e Sistemas* (Volumes II a V, 95 páginas).

## Implementado (Região 1)

| Manual | Onde está no código |
|---|---|
| Errante: 1.000 PV, vigor separado, Foco 100 | `src/data.js` → `PLAYER` |
| Ações do Errante (Vol. III §1): leve, pesado, esquiva, parry, finalização, troca de Arcano | `src/player.js` |
| Dois Arcanos, HUD com dois ícones fixos e recargas independentes (Vol. IV §9) | `player.arcana`, `render.js` → `drawHUD` |
| Grimório elemental separado dos Arcanos; fogo apresentado na região 1 (Brasa Lançada, 18 de Foco, 160 de dano) | `SPELLS`, ensinado na primeira pira |
| Foco: +1 por acerto corpo a corpo, +8 no parry perfeito, +2/s fora de combate | `player.js` |
| Alquimia: 5 frascos, até 7 por exploração; cura de 35% em 2,5 s, não instantânea | `PLAYER.heal`, baú secreto |
| Tabela dos 115 mobs, 01. Vale das Cinzas (PV 170/430/250/300/820) | `MOBS` + `src/enemies.js` |
| Funções: bucha, intermediário, rastejador, voador, especialista | classes em `enemies.js` |
| Reforço anunciado por sino (no máximo 1 por encontro) | `Sino.think` |
| Caçadores voltam ao território | `Mob.common` (limite de distância do spawn) |
| Asgmor, 8.500 PV, kit e arena (Vol. V) | `src/boss.js`, `level.js` (arena) |
| Porta de pedra fecha atrás; a luta começa no círculo de cinza | `World.update` (gatilho da arena) |
| Avisos: cor de perigo primeiro no aviso, depois no impacto | `sprites.js` (amarelo/vermelho) |
| Baús escondidos com pistas ambientais (rachaduras luminosas) | parede `X` em `level.js` |
| Recompensa garantida: Arcano + relíquia temática na primeira vitória | `World.onBossDefeated` |
| Lore: o Errante, Elion, a cinza que cai para cima | `world.js` (diálogos) |
| Paletas HEX do Atlas (Vol. III) | `sprites.js`, `render.js` |

## Simplificações desta fatia

- Maestria: O Louco chega com a habilidade 1 já liberada, para dar pra testar o sistema na hora. O manual pede Maestria I com 100 pontos.
- A arena tem cerca de 2,3 telas de largura; o Vol. V pede 3,5.
- A Cripta do Campanário (dungeon de 4 salas) ainda não existe.
- Morren e Ysara (comércio e forja), armas regionais, drops e materiais ainda não foram implementados.

## Próximos passos sugeridos

1. Maestria com pontos (I–V) e as habilidades 2 e 3 de O Louco.
2. Cripta do Campanário (dungeon da região 1).
3. Inventário: armas (Fio do Peregrino etc.), relíquias com slots (2/3/4) e drops pela regra de chance do chefe (35% → +10 p.p. até 75%).
4. Região 2: Bosque de Vidro, com Ilyrion e o feitiço de gelo.
5. Salvar o progresso (localStorage).
6. Trocar a arte procedural por sprites desenhados à mão, seguindo as regras de animação do Vol. IV §11.

## Estrutura

```
index.html        canvas 480×270, escala inteira
src/main.js       loop de 60 Hz, telas (título, pausa, morte)
src/world.js      orquestra o nível, câmera, piras, diálogos e chefe
src/level.js      mapa da região em tiles (16 px)
src/player.js     o Errante
src/enemies.js    mobs
src/boss.js       Asgmor
src/fx.js         partículas, projéteis, ondas de choque, cinza retardada
src/sprites.js    pixel art procedural
src/render.js     cenário, tiles, HUD
src/audio.js      sons sintetizados (WebAudio)
src/data.js       números do manual
```
