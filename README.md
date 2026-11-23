# The Last Arcana

Soulslike 2D em pixel art, com visão lateral. O Errante, uma consciência nascida do vazio que Aurelian deixou ao aprisionar as almas luminosas, precisa libertar os 22 Arcanos corrompidos.

Esta versão traz a **Região 1 completa, o Vale das Cinzas**: o povoado de Cinzeiral, a trilha, o fosso, as ruínas, a **Cripta do Campanário** e a luta contra **Asgmor, O Louco**. Tudo foi construído a partir do *Manual de Conteúdo, Recompensas e Sistemas* (Volumes II a V).

## Como jogar

Roda direto no navegador, sem instalar nada. Os módulos ES precisam de um servidor local:

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

Também funciona no GitHub Pages: Settings → Pages → *Deploy from a branch* → escolha este branch, pasta `/ (root)`.

O progresso é salvo no navegador ao descansar nas piras, abrir baús, comprar e vencer chefes. Na tela-título aparece **Continuar**.

### Teclado

| Tecla | Ação |
|---|---|
| A / D | mover |
| W / Espaço | pular (segure para pular mais alto; S + Espaço desce da plataforma) |
| Shift | esquiva com invulnerabilidade (segure para correr) |
| J | ataque leve (combo) |
| K | ataque pesado (segure para carregar) |
| L | aparar (parry) |
| Q | frasco de cura |
| R | feitiço do grimório (Brasa Lançada) |
| F | habilidade do Arcano ativo |
| Tab | trocar Arcano primário/secundário |
| C / V | usar / trocar o item rápido (bomba, óleo, selo) |
| E | interagir, colher, finalizar inimigo com a postura quebrada |
| I | inventário (armas, relíquias, itens, Arcanos) |
| M | som liga/desliga |
| Esc | pausa |

### Celular

Jogue com a tela deitada. Arraste o lado esquerdo da tela para mover. Os botões ficam à direita (PULAR, ATACAR, PESADO, ESQUIVA, APARAR, E, CURA e FOGO) e no topo (pausa, INV, ⇄, ARC e ITEM). No Android, o jogo entra em tela cheia.

### Controle

A pula, B esquiva, X ataque leve, Y pesado, LB apara, RB Arcano, LT feitiço, RT interage. Direcional: ↑ troca Arcano e ↓ bebe frasco. Select abre o inventário; L3 e R3 usam e trocam o item rápido.

## O que tem nesta versão

- **Combate soulslike** com os custos de Vigor e Foco do Vol. V: ataques leve e pesado, esquiva com invulnerabilidade, esquiva perfeita, aparo, postura e finalização.
- **5 mobs** do Vale com os PV da tabela, patrulhas, alerta a aliados, territórios e reforço anunciado por sino.
- **Asgmor, O Louco** (8.500 PV), conforme a ficha do Vol. V. Depois de vencê-lo, tocar o grande sino chama o eco dele para uma revanche.
- **Cripta do Campanário**, a dungeon de 4 salas descrita no manual:
  1. Sinos falsos que atraem patrulhas.
  2. Cinza soprada em ciclos, com pilares como abrigo.
  3. Um desvio com baú protegido e a alavanca do atalho para Cinzeiral.
  4. O Sino-Fendido Ancestral (mini-chefe, 2.800 PV). Silenciá-lo reduz os reforços no vale.
- **Armas regionais**: Fio do Peregrino, Lança de Cinza Longa, Machado de Lenhador Cinzento, Agulhas do Errante e a arma-signatura **Ruptura** (35% na 1ª vitória, 15% nas seguintes, +10 p.p. por falha, até 75%). Armas repetidas viram Fragmentos de Memória.
- **Maestria I–V** de O Louco: Salto de Cinzas, Risco Calculado e Caminho Improvável.
- **Aliados**: Elion conta a história; Morren vende bombas, óleos e selos e compra ervas; Ysara aprimora armas de +1 a +5.
- **Mundo vivo**: coleta de Líquen de Brasa, Sálvia Cinzenta e Flor de Cinza (as raras voltam depois de dois descansos), vasos e caixas quebráveis, e fauna neutra que foge.
- **Direção de arte do manual**: pixel art com contorno escuro, materiais com base, sombra e brilho, paletas HEX do Atlas e iluminação das brasas. Arte e som são gerados por código.

Veja [`docs/DESIGN.md`](docs/DESIGN.md) para a relação entre o manual e o código.
