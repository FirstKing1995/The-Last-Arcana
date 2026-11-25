# AREA_01 — Vale das Cinzas: auditoria e entrega

Fontes: dossiê `AREA_01`, seis manuais gerais (23/11) e o pacote `pc1` (24/11: ficha do chefe, Partes 1 a 4 e tabelas). Ordem de autoridade usada: pedido do usuário, documento oficial mais recente, dossiê, manuais gerais.

## Por que o chefe ficava a 15 segundos

O mapa antigo era uma linha reta de 240 tiles: do povoado até o gatilho da arena eram cerca de 170 tiles, sem nada que fechasse o caminho. Agora o caminho mínimo tem 823 tiles e passa por baixo da torre. Correndo sem parar, sem lutar e sem errar, são 94 s (155 s andando). A meta de 12 a 20 minutos na primeira exploração **ainda não foi medida com gente jogando**.

## Salas e conexões (PROPOSTA)

```
A01 Despertar → A02 Cinzeiral → A03 Pátio dos Sinos → A04 Galeria → B05 Ruínas ─┬─ B06 Telhados (opcional: mirante e nicho secreto)
                    ▲ alçapão                                   ▲ portão        ├─ Cripta do Campanário (opcional, 4 salas)
                    └───────────── Cripta                       │ (atalho)      └─ B07 Poço de Serviço
                                                                │                       │
                                                                │  B08 Caverna ← B09 Passagem Baixa (sala secreta por deslize)
                                                                │                       │
                                                                │  C10 Cripta de Serviço → C11 Fundações → C12 Mecanismo (2 alavancas)
                                                                │                                              │
                                                                │  C14 Galeria das Correntes ← C13 Cisterna (por cima: seguro; fundo: baú)
                                                                │        │
                                                                └─ D15 Pátio do Sino-Fendido → D16 Subida Externa → D17 Escadaria (pira) → D18 Antecâmara → Arena
```

## Situação dos requisitos

| Requisito | Classe | Situação |
|---|---|---|
| Errante com o design aprovado (elmo, espinhos, cabelo branco, runa) | CANON | IMPLEMENTADO a partir da imagem do Pedro; espinhos fora da colisão |
| Asgmor conforme a ficha de 24/11 (máscara, sino com brasa, correntes) | CANON | IMPLEMENTADO a partir da imagem do Pedro |
| 8.500 PV, kit completo, sino balança 0,7 s, rastro de 1,2 s | CANON | IMPLEMENTADO; corrigido erro em que a 2ª fase repetia o sino arrastado sem parar |
| Dificuldade dos mobs acima da tabela "Os 115 mobs" (vida ×1,75, postura ×1,45, dano ×1,6; Asgmor com dano ×1,45 e os mesmos 8.500 PV) | Pedido do dono do jogo (25/11) | IMPLEMENTADO; valores canônicos guardados em `base` e nos multiplicadores `FORCA` de `src/data.js` |
| Golpes extras dos mobs, variante Endurecida, garras e sino girado do Asgmor, no máximo três ataques simultâneos | PROPOSTA | IMPLEMENTADO; aguarda a palavra do Pedro |
| Adereços, fachadas, água rasa na Cisterna e arcos do Campanário (só aparência, colisão igual) | PROPOSTA | IMPLEMENTADO em 25/11 |
| Arena de 3,5 telas, porta de pedra, começo no círculo de cinza, sem mobs | CANON | IMPLEMENTADO (84 tiles; antes eram 2,3 telas) |
| Magia elemental removida | CANON | IMPLEMENTADO (saiu Brasa Lançada) |
| Três poções, recarga de 1,5 s, frascos divididos | CANON | IMPLEMENTADO (Q bebe, R troca, preparo na pira) |
| Começa de mãos vazias; a primeira arma (Fio do Peregrino) está num baú inicial; cada arma tem desenho e combo próprios | CANON (baús iniciais) | IMPLEMENTADO |
| Áudios do Pedro (21/11): combate rápido, parkour, sem nível, mundo livre e só os chefes trancados com chave | Pedido do autor | IMPLEMENTADO: a chave de Asgmor cai do Sino-Fendido do pátio (PROPOSTA) |
| Relíquia do Louco: 18%, garantida na 6ª vitória | CANON | IMPLEMENTADO (antes era garantida) |
| Ruptura: 35%, 15%, +10 p.p., teto de 75% | CANON | IMPLEMENTADO |
| Cinco funções de mobs, só da região | CANON | IMPLEMENTADO (sprites ainda desenhados por código) |
| Cripta do Campanário opcional, 4 salas | CANON | IMPLEMENTADO, mesmo desenho de antes |
| 18 salas em 4 setores, bifurcações, subnível, segredo, atalho, mirante | PROPOSTA | IMPLEMENTADO |
| Mapa que se revela, nomes de salas | PROPOSTA | IMPLEMENTADO (tecla N ou botão MAPA) |
| Deslize sob passagem baixa | PROPOSTA | IMPLEMENTADO, só em conteúdo opcional |
| Pira das Fundações e mecanismo de duas alavancas | PROPOSTA | IMPLEMENTADO |

## PENDENTE: precisa do Pedro

1. **Nome do chefe**: a ficha diz "Asmodeus (Asgmor)"; o dossiê, "Asgmor". Mantive Asgmor.
2. **Relíquia**: o dossiê lista a Cinza do Primeiro Passo como recompensa; a ficha de 24/11 dá 18%. Usei a ficha, por ser mais nova.
3. **Óleo de Brasa e Bomba de Fogo**: são itens, não magia, então ficaram. Saem junto com o fogo elemental?
4. **Foco**: sem feitiços, só as habilidades de Arcano usam Foco.
5. **O Louco com Maestria I na libertação** e o efeito da Ruptura continuam sendo propostas.
6. **Dificuldade e duração**: falta teste com gente jogando.
7. **Arte dos mobs e NPCs**: feita a partir das cores e formas do manual, sem imagem do Pedro. Ele aprova?
8. **Regeneração de Vigor**: subiu de 48 para 70 por segundo, para o ritmo frenético pedido nos áudios. Os custos do Vol. V não mudaram.
9. **Salto na parede e agarrar beiradas**: entram como parkour pedido nos áudios; nenhum caminho principal depende deles.

Os manuais pedem diagnóstico e aprovação antes de alterar o projeto. O dono do repositório pediu para dar continuidade direto, então o diagnóstico vem junto com a entrega.

## Testes

- `node tools/testar_mapa.mjs` (pasta do projeto): todo spawn no chão, toda sala alcançável com o pulo do jogo, setor D fechado até o mecanismo e volta possível de qualquer ponto testado.
- `tools/teste_jogo.js` (no console): 39 verificações de deslize, alavancas, save, poções, travessias, kit do chefe, recompensas, morte e mobs.
