# Do manual ao código

Fonte: *The Last Arcana — Manual de Conteúdo, Recompensas e Sistemas* (Volumes II a V, 95 páginas).

## Implementado (Região 1)

| Manual | Onde está no código |
|---|---|
| Errante: 1.000 PV, Vigor, Foco 100; custos do Vol. V (leve 8, pesado 20/28, esquiva 18, parry 14, finalização 15) | `src/data.js` → `PLAYER` |
| Ações do Errante (Vol. III §1) | `src/player.js` |
| Dois Arcanos, HUD com dois ícones fixos e recargas independentes (Vol. IV §9) | `prog.arcana`, `render.js` |
| Maestria I–V (100/300/650/1.100/1.700), ganho reduzido ao repetir ação | `MASTERY`, `World.addMastery` |
| O Louco: Salto de Cinzas (20 Foco), Risco Calculado, Caminho Improvável | `ARCANA.louco`, `Player.onPerfectDodge`, `World.spawnEcho` |
| Grimório separado; fogo na região 1 (Brasa Lançada) | `SPELLS` |
| Alquimia: 5 frascos (até 7), frasco consumido ao iniciar a animação | `PLAYER.heal`, `Player.updateAction('heal')` |
| Bomba (220, recarga 12 s, máx. 3), óleo (45 s, +8%), selo de retorno | `ITEMS`, `Player.useItem` |
| Armas regionais do Vale, 4% por fonte elegível; duplicatas viram Fragmentos | `WEAPONS`, `MOBS[].drop`, `grantWeapon` |
| Arma-signatura: 35% / 15% / +10 p.p. por falha até 75% | `World.bossReward` |
| Relíquias com 2 espaços; Cinza do Primeiro Passo garantida | `RELIC_SLOTS`, `ui.js` |
| Tabela dos 115 mobs, 01. Vale das Cinzas | `MOBS` + `src/enemies.js` |
| Spawn fixo, patrulha de 2 pontos, alerta único a aliados, reforço anunciado, retorno ao território | `Mob.doPatrol`, `World.alertNear`, `Sino` |
| Dungeon de 4 salas: Cripta do Campanário; silenciar o sino reduz reforços | `level.js`, `World.updateCrypt`, `SinoElite` |
| Mini-chefe de dungeon 2.800 PV | `MOBS.sinoElite` |
| Fauna neutra que foge; flora de poção distinta da decorativa | `World.updateFauna`, `render.js` (herb) |
| Coleta: comum volta após descanso, rara após dois | `World.restHerbs` |
| Objetos leves destrutíveis revelam recursos pequenos | `World.breakables` |
| Morren (comércio), Ysara (aprimoramento em passos pequenos), Elion (lore e maestria) | `ui.js`, `world.js` |
| Asgmor, 8.500 PV, kit e arena (Vol. V); marco sonoro de aproximação; porta que reabre após a morte; saída após a vitória | `src/boss.js`, `World.updateTips`, `portal` |
| Avisos: amarelo aparável, vermelho não aparável | `sprites.js` |
| Direção de arte: contorno escuro, 3–5 materiais com base/sombra/brilho, saturação no perigo | `sprites.js`, `render.js` |

## Simplificações e propostas próprias

- O Louco chega com Maestria I (100 pontos) ao ser libertado, para que a habilidade possa ser usada logo depois da luta. O manual deixa as habilidades para depois.
- O efeito da arma-signatura **Ruptura** (cinza que explode após uma esquiva perfeita) é proposta minha: o manual só dá o nome.
- O manual não define moeda; usei "moedas", citadas nos baús comuns do Vol. IV.
- As receitas de poção do manual usam ervas de outras regiões, então as ervas do Vale são vendidas ao Morren.

## Próximos passos sugeridos

1. Região 2: Bosque de Vidro, com Ilyrion e o feitiço de gelo.
2. Segundo Arcano equipado e Ressonância (janela de 3 s, teto de 125%).
3. Estação alquímica e receitas (quando houver ervas das outras regiões).
4. Mapa com Nara, a Cartógrafa.
5. Trocar a arte procedural por sprites desenhados à mão.

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
src/state.js      progresso e salvamento local
src/ui.js         inventário, loja e forja (HTML)
src/touch.js      controles de toque
```
