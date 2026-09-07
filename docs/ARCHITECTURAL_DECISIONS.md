# Decisões arquiteturais

Status: **registro canônico de decisões**

Cada decisão abaixo descreve problema, alternativas, escolha e consequências. Alterá-la exige nova decisão explícita; não basta uma refatoração local.

## ADR-001 — Next.js App Router

- **Problema:** compor experiência SSR, rotas e APIs no mesmo produto.
- **Alternativas:** SPA cliente; Pages Router; App Router.
- **Decisão:** Next.js App Router, com Server Components na composição e Client Components na interação.
- **Justificativa:** SSR, layouts, route handlers, serialização explícita e integração com Vercel.
- **Consequências:** APIs do Next.js devem seguir a versão instalada; dados enviados ao cliente precisam ser serializáveis.

## ADR-002 — Supabase como persistência e Realtime

- **Problema:** manter estado durável e sincronizar clientes e operação.
- **Alternativas:** backend próprio; Firebase; Supabase.
- **Decisão:** Supabase/PostgreSQL com RLS, triggers, RPC e Realtime.
- **Justificativa:** reduz infraestrutura inicial sem abrir mão de constraints transacionais.
- **Consequências:** segurança depende de RLS/grants corretos; migrations precisam ser versionadas e validadas.

## ADR-003 — Zustand somente para estado local

- **Problema:** preservar sessão, carrinho e jornada entre renders/refresh.
- **Alternativas:** Context único; estado em URL; Redux; Zustand.
- **Decisão:** Zustand com stores pequenas e persistência seletiva.
- **Justificativa:** baixo boilerplate e assinaturas granulares.
- **Consequências:** stores não são fonte operacional; estado deve ser reconciliado com Supabase.

## ADR-004 — Mesa como contexto operacional

- **Problema:** pedidos isolados não representam a visita nem o trabalho do Garçom.
- **Alternativas:** pedido como raiz; cliente como raiz; mesa/sessão como contexto.
- **Decisão:** mesa organiza a operação, enquanto TableSession representa a visita atual.
- **Justificativa:** equipe pensa por mesa e uma visita possui vários pedidos e participantes.
- **Consequências:** conta, timeline e painel do Garçom devem agregar por TableSession; mesa e sessão nunca são sinônimos.

## ADR-005 — QR identifica mesa, não pessoa

- **Problema:** o mesmo QR é usado por vários clientes e visitas.
- **Alternativas:** QR por cliente; QR por sessão; QR físico por mesa.
- **Decisão:** QR contém somente a mesa; sessão e pessoa são resolvidas depois.
- **Justificativa:** placas permanecem estáveis e vários participantes compartilham a visita.
- **Consequências:** rota precisa validar mesa e evitar sessões ativas duplicadas.

## ADR-006 — ExperienceProfile

- **Problema:** comportamento e conteúdo do +54 estavam espalhados pela UI.
- **Alternativas:** hardcodes; page builder; perfil tipado local.
- **Decisão:** ExperienceProfile tipado como fonte de seções, jornada, conteúdo e regras configuráveis.
- **Justificativa:** valida white label sem criar persistência prematura.
- **Consequências:** componentes renderizam decisões; não conhecem restaurantes específicos. Configuração remota fica para evolução futura.

## ADR-007 — BrandIdentity separada

- **Problema:** marca visual não deve alterar regra de negócio.
- **Alternativas:** CSS por restaurante; branches por `brand.id`; contrato de marca.
- **Decisão:** BrandIdentity fornece conteúdo visual e CSS variables.
- **Justificativa:** temas mudam sem duplicar componentes ou fluxo.
- **Consequências:** nenhuma lógica funcional pode testar o ID da marca.

## ADR-008 — Intenção semântica sem IDs do banco

- **Problema:** curadoria baseada em IDs quebra quando o catálogo é reimportado.
- **Alternativas:** IDs numéricos; nomes livres na UI; identificadores semânticos.
- **Decisão:** engines retornam papéis/identificadores semânticos, resolvidos fora do motor.
- **Justificativa:** domínio editorial permanece estável e independente da persistência.
- **Consequências:** referências ausentes geram issue em desenvolvimento e ocultam somente o bloco correspondente.

## ADR-009 — Catalog Repository e Mapper

- **Problema:** UI e engines estavam expostos a tabelas e formatos PostgREST.
- **Alternativas:** Supabase direto em componentes; API duplicada; repository + mapper.
- **Decisão:** `CatalogRepository` e mapper defensivo formam a fronteira.
- **Justificativa:** domínio recebe contratos estáveis e erros normalizados.
- **Consequências:** novas origens implementam o mesmo contrato; colunas do banco não vazam para componentes.

## ADR-010 — Snapshots imutáveis no pedido

- **Problema:** alterar preço ou roteamento do catálogo poderia reescrever o sentido de pedidos antigos.
- **Alternativas:** consultar produto atual sempre; normalizar itens sem snapshot; JSON imutável.
- **Decisão:** servidor preserva nome, preço, quantidade, estação e modo no Order.
- **Justificativa:** histórico comercial e operacional continua explicável.
- **Consequências:** administração do catálogo nunca atualiza snapshots antigos; cliente não escolhe valores confiáveis.

## ADR-011 — Production Routing explícito

- **Problema:** consumidores deduziam destino por categoria, nome ou origem.
- **Alternativas:** convenções de nome; `category_role`; destino no pedido; campo no produto.
- **Decisão:** `menu_items.production_station` é fonte; snapshot preserva o valor.
- **Justificativa:** responsabilidade operacional torna-se verificável e expansível.
- **Consequências:** nomes só aparecem no backfill histórico; novas estações estendem o contrato.

## ADR-012 — Production Mode explícito

- **Problema:** algumas bebidas só precisam ser separadas e outras exigem preparo.
- **Alternativas:** inferir por produto/categoria; fluxo único; campo explícito.
- **Decisão:** `production_mode = separation | preparation`.
- **Justificativa:** transição direta é segura somente quando todos os itens da estação são separação.
- **Consequências:** execução mista segue preparação e modo é preservado no snapshot.

## ADR-013 — Station Execution normalizada

- **Problema:** `orders.status` compartilhado não permite Bar pronto enquanto Cozinha prepara.
- **Alternativas:** `bar_status`/`kitchen_status`; status por item; tabela por pedido/estação.
- **Decisão:** `order_station_executions` com unicidade pedido + estação.
- **Justificativa:** suporta estações futuras sem colunas fixas e atende a granularidade da V1.
- **Consequências:** Order.status vira projeção; produção individual por item fica para V2.

## ADR-014 — Produção e entrega independentes

- **Problema:** `ready` não prova que o item chegou à mesa.
- **Alternativas:** novo status `delivered`; tabela DeliveryTask; timestamp na execução.
- **Decisão:** produção mantém `pending/preparing/ready`; entrega usa `delivered_at`.
- **Justificativa:** evita misturar responsabilidades e permite entrega parcial.
- **Consequências:** RPC controla entrega; execução entregue é imutável; pedido só vira `delivered` quando todas foram entregues.

## ADR-015 — Estado geral do pedido como projeção

- **Problema:** múltiplas fontes poderiam disputar `orders.status`.
- **Alternativas:** UI calcula; cliente atualiza; trigger deriva.
- **Decisão:** banco deriva o status das execuções e preserva `cancelled`.
- **Justificativa:** todos os consumidores observam o mesmo estado.
- **Consequências:** updates arbitrários são bloqueados e triggers devem evitar recursão.

## ADR-016 — Snapshot inicial + Realtime

- **Problema:** somente Realtime perde estado anterior; polling aumenta carga e atraso.
- **Alternativas:** polling; subscription sem snapshot; snapshot + eventos.
- **Decisão:** Server Component carrega estado e cliente reconcilia eventos Realtime.
- **Justificativa:** primeira renderização completa e atualizações imediatas.
- **Consequências:** subscriptions precisam de cleanup e eventos devem ser idempotentes.

## ADR-017 — Compatibilidade histórica centralizada

- **Problema:** pedidos antigos não possuem os metadados atuais.
- **Alternativas:** ignorar; espalhar fallbacks; migração forçada; fallback central.
- **Decisão:** manter uma resolução legada explícita em um único módulo.
- **Justificativa:** histórico continua visível sem contaminar consumidores novos.
- **Consequências:** issues são reportadas; fallback só será removido com política aprovada.

## ADR-018 — Conta pertence à TableSession

- **Problema:** último pedido não representa o consumo completo da mesa.
- **Alternativas:** conta por pedido; conta por cliente; conta por sessão.
- **Decisão:** alvo da V1 é consolidar conta por TableSession.
- **Justificativa:** a visita contém vários pedidos e participantes.
- **Consequências:** fechamento deve verificar todas as execuções e entregas; implementação completa está no PATCH-030.
