# The Last Arcana

Soulslike 2D em pixel art, com visão lateral. O Errante, uma consciência nascida do vazio que Aurelian deixou ao aprisionar as almas luminosas, precisa libertar os 22 Arcanos corrompidos.

Esta é a **primeira fatia jogável**: a **Região 1, Vale das Cinzas**, do povoado de Cinzeiral até a luta contra **Asgmor, O Louco**, no Campanário Caído. Tudo foi construído a partir do *Manual de Conteúdo, Recompensas e Sistemas*.

## Como jogar

Roda direto no navegador, sem instalar nada. Os módulos ES precisam de um servidor local:

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

Também funciona no GitHub Pages: publique a branch e abra o `index.html`.

### Controles

| Tecla | Ação |
|---|---|
| A / D | mover |
| W / Espaço | pular (segure para pular mais alto; S + Espaço desce da plataforma) |
| Shift | esquiva com invulnerabilidade (segure para correr) |
| J | ataque leve (combo de 3) |
| K | ataque pesado (segure para carregar) |
| L | aparar (parry) |
| Q | beber frasco de cura |
| R | feitiço do grimório (Brasa Lançada) |
| F | habilidade do Arcano ativo |
| Tab | trocar Arcano primário/secundário |
| E | interagir / finalizar inimigo com a postura quebrada |
| Esc | pausa |

Controle de Xbox/PS também funciona: A pula, B esquiva, X ataque leve, Y pesado, LB apara, RB Arcano, LT feitiço, RT interage, direcional ↑ troca o Arcano, direcional ↓ bebe frasco.

## O que tem nesta versão

- **Errante**: 1.000 PV, vigor, Foco, ataque leve e pesado, esquiva com quadros de invulnerabilidade, aparo, finalização e 5 frascos (cura de 35% em 2,5 s, interrompida por dano forte).
- **Cinco mobs do Vale das Cinzas**, com os PV da tabela do manual: Cinzeiro Trôpego, Braseiro Oco, Rasteja-Fumaça (golpes pesados passam por cima), Gralha de Fuligem (desce em ciclos para ser punida) e Sino-Fendido (ondas no chão e um reforço).
- **Asgmor, O Louco** (8.500 PV), conforme a ficha do Vol. V: saltos curtos e diagonais, o sino que balança 0,7 s antes da explosão de cinza, sino arrastado (aparável), chuva de cinza em leque com explosões retardadas e, na fase 2, saltos encadeados e um rolamento que deixa um rastro que detona em 1,2 s.
- **Leitura de ataques**: aviso amarelo pode ser aparado e aviso vermelho só pode ser evitado. Todo padrão tem uma janela de punição.
- **Sistemas**: piras de repouso (os inimigos voltam e o checkpoint muda), postura e quebra, queimadura, porta de pedra que fecha a arena, uma parede rachada escondendo um baú secreto (+1 frasco) e o diálogo de lore com Elion.
- **Recompensas**: derrotar Asgmor garante o Arcano **O Louco** (Salto de Cinzas) e a relíquia **Cinza do Primeiro Passo**. Depois disso, a cinza passa a cair para cima.
- Arte e som são gerados por código, usando as paletas HEX do Atlas. Não há nenhum arquivo externo.

Veja [`docs/DESIGN.md`](docs/DESIGN.md) para a relação entre o manual e o que já foi implementado, e para o que vem depois.

### Celular

Jogue com a tela deitada; com o celular em pé, aparece um aviso pra girar. Arraste o lado esquerdo da tela pra mover. Os botões ficam à direita: PULAR, ATACAR, PESADO, ESQUIVA, APARAR, E, CURA e FOGO. No topo ficam ARC (habilidade do Arcano), ⇄ (trocar Arcano) e pausa. No Android o jogo entra em tela cheia ao tocar no título.
