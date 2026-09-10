# Histórico do projeto

Status: **registro histórico canônico**

Este documento explica como o produto chegou ao estado atual. Ele não substitui o escopo vigente nem transforma propostas antigas em requisitos.

## Linha do tempo

```text
Cardápio digital inicial
→ carrinho, pedido e Minha Mesa
→ estabilização de sessão e QR
→ fundação visual
→ Hospitality Engine e ExperienceProfile
→ catálogo real
→ BrandIdentity e redesign
→ jornada de hospitalidade pelo QR
→ Manager Command Center
→ Production Routing
→ Station Execution
→ Bar Board
→ Delivery Persistence
→ base documental canônica
→ Platform Boundary MODARA
→ Account Core
→ Catalog Management
→ Operation Composition
→ Second Reference Implementation
→ conclusão operacional da V1
```

## Fase 0 — Protótipo

O projeto começou como cardápio digital específico. Foram criados catálogo, carrinho, checkout, pedidos, acompanhamento e uma primeira visão de conta. A arquitetura ainda misturava experiência, marca e operação.

## PATCH-001 — Entrada visual

- **Objetivo:** transformar a tela de boas-vindas em uma entrada premium.
- **Resultado:** fotografia full-screen, identidade editorial e fluxo visual da casa.
- **Impacto:** estabeleceu que o produto deveria parecer parte do restaurante, não um dashboard.

## PATCH-002 — QR e mesas

- **Objetivo:** identificar as 23 mesas físicas.
- **Resultado:** gerador de QR Codes, rotas `/mesa/[tableNum]` e material de impressão.
- **Impacto:** QR passou a representar mesa, não cliente.

## PATCH-003 — Sessão e quantidade de pessoas

- **Objetivo:** ligar a visita à mesa e persistir `party_size`.
- **Resultado:** resolução/criação de TableSession, CustomerSession e campo numérico de pessoas.
- **Impacto:** mesa, sessão e participante tornaram-se conceitos separados.

## PATCH-004 e 004.5 — Fundação escalável

- **Objetivo:** separar motor, perfil da casa, regras e tema; auditar contratos públicos.
- **Resultado:** ExperienceProfile, ExperienceProvider, tipos e reconciliação `image_url → imageUrl`.
- **Impacto:** comportamento universal deixou de depender diretamente do +54 e do Supabase.

## PATCH-005 — First Gesture

- **Objetivo:** escolher semanticamente a primeira experiência.
- **Resultado:** intenção `featured-category`, `featured-product`, `message` ou `none`.
- **Impacto:** motor não usa IDs do banco. A configuração atual usa `bebidas`.

## PATCH-006 a 008 — Apresentação, seções e destaques

- **Objetivo:** compor experiências sem tornar a página monolítica.
- **Resultado:** House Presentation, Experience Sections Engine e Product Highlights.
- **Impacto:** ExperienceProfile passou a controlar existência e ordem das seções.

## PATCH-009 — Product Experience

- **Objetivo:** unificar a descoberta de produtos.
- **Resultado:** card e Dialog canônicos, preço, disponibilidade e adição ao carrinho.
- **Impacto:** todas as origens usam a mesma experiência de produto.

## PATCH-010 e 011 — Recommendation Engine e Hospitality Memory

- **Objetivo:** oferecer curadoria determinística sem acoplar regras à UI.
- **Resultado:** recomendações por tipo, seletores de memória e troca de produto no mesmo Dialog.
- **Impacto:** interface ficou preparada para outra fonte futura sem reescrita.

## PATCH-012 — UI Foundation

- **Objetivo:** criar primitives e tokens reutilizáveis.
- **Resultado:** Button, Surface, IconButton e contrato visual sem domínio comercial.
- **Impacto:** identidade passou a ser aplicada por tokens e tema.

## PATCH-013 a 015 — Busca, navegação e imagens

- **Objetivo:** melhorar descoberta e entrega visual.
- **Resultado:** busca normalizada, navegação sticky e `ProductArtwork` com `next/image` e fallback.
- **Impacto:** catálogo ganhou navegação consistente sem duplicar fluxo de produto.

## PATCH-016 — Catalog Integration Boundary

- **Objetivo:** isolar Supabase da experiência.
- **Resultado:** CatalogRepository, implementação Supabase, mapper defensivo e erros normalizados.
- **Impacto:** página e motores passaram a consumir domínio serializável.

## PATCH-017 — Catálogo real

- **Objetivo:** substituir os sete itens demonstrativos.
- **Resultado:** seed validado com 11 categorias e 57 produtos do +54 Jardim Aquarius.
- **Impacto:** catálogo real tornou-se fonte inicial da demonstração; Cardápio Executivo ficou fora.

## PATCH-018 — Curadoria real

- **Objetivo:** eliminar referências editoriais aos produtos antigos.
- **Resultado:** identificadores semânticos do catálogo real, recomendações e separação `bebidas`/`drinks`.
- **Impacto:** zero dependência editorial de IDs numéricos.

## PATCH-019 e 019.1 — Marca e recuperação de entrada

- **Objetivo:** criar BrandIdentity e recuperar o fluxo real de entrada.
- **Resultado:** marca configurável, tokens CSS e integração efetiva de HospitalityEntry em `/mesa/[n]`.
- **Impacto:** white label ganhou contrato visual e o QR deixou de cair no fluxo legado.

## PATCH-020 — Redesign completo do cardápio

- **Objetivo:** elevar o catálogo do protótipo para experiência gastronômica.
- **Resultado:** composição editorial, tema +54, responsividade e refinamentos de marca.
- **Impacto:** apresentação mudou sem alterar domínio, Supabase ou comportamento.

## PATCH-021 a 023 — Jornada de hospitalidade

- **Objetivo:** receber, perguntar familiaridade, apresentar a casa e guiar recomendações.
- **Resultado:** HospitalityEntry, House Introduction, Guest Choice e Guided Journey.
- **Impacto:** a chegada virou uma jornada configurável, não uma sequência fixa de páginas.

## PATCH-024 e correções 024.1–024.3 — Integridade da jornada

- **Objetivo:** orquestrar momentos, corrigir mobile, voltar, refresh e envio da bebida.
- **Resultado:** estado persistido, histórico do navegador, identificação integrada e quick drink idempotente.
- **Impacto:** QR passou a conduzir uma experiência única até catálogo/carrinho.

## PATCH-025 — Manager Command Center

- **Objetivo:** dar ao gerente visão da casa.
- **Resultado:** snapshot, Realtime, KPIs, mesas, filas, alertas, filtros e detalhes.
- **Impacto:** gerente passou a operar a unidade, mas revelou a necessidade de roteamento explícito.

## PATCH-026 e 026.1 — Production Routing

- **Objetivo:** parar de deduzir destino por nome/categoria.
- **Resultado:** `production_station` persistido; 21 Bar, 36 Kitchen; snapshot do pedido validado no servidor.
- **Impacto:** destino virou contrato operacional explícito e expansível.

## PATCH-027A e 027A.1 — Station Execution

- **Objetivo:** permitir que estações avancem independentemente.
- **Resultado:** `production_mode`, `order_station_executions`, transições, triggers, RLS e Realtime.
- **Impacto:** pedido misto deixou de compartilhar um único ciclo de produção.

## PATCH-027B — Bar Board

- **Objetivo:** criar a operação do Bar sem sistema paralelo.
- **Resultado:** Bar reutiliza Station Board, cards, timers e subscriptions da Cozinha.
- **Impacto:** Bar e Cozinha tornaram-se perspectivas da mesma infraestrutura.

## PATCH-028A e 028A.1 — Delivery Persistence

- **Objetivo:** separar produção pronta de entrega.
- **Resultado:** `delivered_at`, RPC segura, backfill histórico e projeção de `orders.status`.
- **Impacto:** entrega parcial sobrevive a refresh e estações concluídas não encerram prematuramente o pedido.

Commit funcional de referência: `51b6f56 feat(delivery): add station delivery persistence`.

## PATCH-DOC-001 — Auditoria

- **Objetivo:** inventariar e classificar todo o conhecimento acumulado.
- **Resultado:** 96 documentos analisados, 14 grupos de duplicatas e conflitos entre código e planejamento identificados.
- **Impacto:** criou base verificável para a consolidação.

## PATCH-DOC-002 — Consolidação canônica

- **Objetivo:** transformar documentos, conversas e ideias em uma única base oficial.
- **Resultado:** contexto, visão, freeze, arquitetura, domínio, jornada, operação, banco, guia, release, V2, histórico, ADRs e changelog.
- **Impacto:** encerra reorganizações estruturais até a Release Candidate.

## PATCH-028B — Waiter Operations 2.0

- **Objetivo:** fazer o Garçom operar a visita por mesa, não por número de pedido.
- **Resultado:** snapshot agregado de sessões, clientes, pedidos e execuções; grupos automáticos; status derivados; timeline; entrega parcial por estação e atualização Realtime.
- **Impacto:** o último operador da cadeia passa a enxergar o contexto completo da mesa sem criar domínio, store, status ou persistência paralela.

## MODARA-001 — Platform Boundary

- **Objetivo:** iniciar a fase de plataforma sem reescrever a implementação de referência.
- **Resultado:** separação conceitual entre core, implementação gastronômica e configuração ativa.
- **Impacto:** +54 Jardim Aquarius permanece referência, não regra arquitetural.

## MODARA-002 — Account Core

- **Objetivo:** transformar Conta em capability modular.
- **Resultado:** itens de conta, allocations, settlements, fechamento individual e fechamento da mesa por saldo zero.
- **Impacto:** consumo e responsabilidade financeira foram separados de pagamento/fiscal.

## MODARA-003 — Catalog Management

- **Objetivo:** tornar o catálogo administrável com fronteira segura.
- **Resultado:** `sort_order`, RPCs administrativas, autorização por `modara_admin_users` e validador real de persistência.
- **Impacto:** o catálogo público e administrativo passam a operar sobre a mesma fonte de verdade.

## MODARA-004 — Operation Composition Foundation

- **Objetivo:** fazer superfícies operacionais dependerem explicitamente de capabilities.
- **Resultado:** guardas reutilizáveis para páginas e APIs, aplicadas a Bar, Cozinha, Garçom, Gerente, Catalog Admin e Conta.
- **Impacto:** módulos podem ser ligados/desligados por implementação sem transformar capability em permissão de usuário.

## MODARA-005 — Second Reference Implementation

- **Objetivo:** provar que MODARA comporta operações diferentes sem fork de aplicação.
- **Resultado:** implementação Fast/Self-Service local com BrandIdentity, ExperienceProfile, OperationProfile, CapabilitiesProfile e GastronomicImplementation próprios.
- **Impacto:** +54 passa a ser referência Full Service/Hospitality, enquanto Fast Counter demonstra catálogo direto, pedido rápido, produção por Bar/Cozinha e retirada no balcão como composição do mesmo core.

## Próxima fase

O desenvolvimento retorna ao núcleo operacional:

1. PATCH-029 — gestão de catálogo;
2. PATCH-030 — conta e fechamento;
3. PATCH-031/032 — polish operacional e do cliente;
4. PATCH-033 — simulação completa;
5. PATCH-034 — hardening;
6. PATCH-036 — Release Candidate.

O escopo oficial está em [02_V1_SCOPE_AND_ROADMAP.md](02_V1_SCOPE_AND_ROADMAP.md).
