# Changelog

Resumo arquitetural e operacional. A narrativa completa está em [PROJECT_HISTORY.md](PROJECT_HISTORY.md).

## PATCH-028B — Waiter Operations 2.0

- substitui cards por pedido por uma única visão agregada para cada mesa;
- projeta clientes, contagens, estações, prioridade e timeline sem estado novo no banco;
- preserva entrega por estação, compatibilidade histórica e Realtime por tabela.

## PATCH-DOC-002 — Base canônica

- consolida documentação oficial, domínio, decisões, release e V2;
- arquiva material histórico e remove duplicatas aprovadas;
- congela a V1 sem alterar código ou banco.

## PATCH-028A.1 — Delivery Persistence

- aplica `delivered_at` e RPC de confirmação;
- preserva entrega parcial após refresh;
- deriva `orders.status = delivered` somente quando todas as execuções foram entregues.

## PATCH-027B — Bar Operations Board

- adiciona painel do Bar sobre Station Board compartilhado;
- usa exclusivamente `productionStation = bar`;
- mantém Realtime e fluxo de estados comuns à Cozinha.

## PATCH-027A.1 — Station Execution

- aplica `production_mode` e `order_station_executions`;
- separa ciclos de Bar e Cozinha;
- cria transições, projeção do pedido, RLS e Realtime.

## PATCH-026.1 — Production Routing

- aplica `production_station` aos 57 produtos;
- fixa 21 itens Bar e 36 Kitchen;
- preserva destino no snapshot validado pelo servidor.

## PATCH-025 — Manager Command Center

- adiciona mapa de mesas, KPIs, filas e alertas;
- combina snapshot server-side e Realtime;
- consolida Bar, Cozinha, Garçom e sessões em uma visão operacional.

## PATCH-024.x — Integridade e mobile

- estabiliza largura, altura, scroll e ações no celular;
- sincroniza jornada com histórico do navegador;
- integra identificação e oferta rápida;
- envia bebida inicial imediatamente com idempotência.

## PATCH-021–023 — Hospitality Journey

- implementa entrada universal pela mesa;
- adiciona apresentação da casa, escolha do ritmo e recomendações guiadas;
- mantém decisões no ExperienceProfile.

## PATCH-020 — Menu Experience Redesign

- redesenha visualmente o cardápio;
- preserva catálogo, SSR, busca, carrinho e motores;
- traduz BrandIdentity para composição gastronômica.

## PATCH-019 — Brand Identity

- cria contrato de marca e CSS variables;
- aplica identidade +54 sem branches específicos nos componentes;
- preserva possibilidade futura de white label.

## PATCH-018 — Curadoria real

- substitui identificadores demonstrativos;
- restaura destaques e recomendações para os 57 produtos;
- separa semanticamente Bebidas e Drinks.

## PATCH-017 — Catálogo real

- substitui 7 produtos demonstrativos por 11 categorias e 57 produtos;
- preserva valores da fonte Colinas & Aquarius;
- mantém imagens individuais nulas e exclui Executivo.

## PATCH-016 — Catalog Boundary

- isola Supabase em repository e mapper;
- normaliza falhas e contratos serializáveis;
- preserva `revalidate = 60`.

## PATCH-013–015 — Descoberta e entrega visual

- adiciona busca normalizada;
- cria navegação sticky por categorias;
- centraliza imagens e fallback em ProductArtwork.

## PATCH-009–012 — Produto, recomendação e UI

- unifica Product Experience;
- introduz Recommendation Engine e Hospitality Memory;
- estabelece UI Foundation e tokens.

## PATCH-004–008 — Experience Platform

- cria ExperienceProfile e quatro camadas;
- implementa First Gesture, House Presentation, Sections e Highlights;
- separa intenção semântica de persistência.

## PATCH-001–003 — Entrada, QR e sessão

- cria linguagem visual da entrada;
- gera QR Codes para 23 mesas;
- separa TableSession e CustomerSession;
- persiste quantidade de pessoas.

## Fundação inicial

- catálogo, carrinho, Checkout e Orders;
- Minha Mesa e atualização Realtime;
- primeiras telas de Cozinha, Garçom e conta.
