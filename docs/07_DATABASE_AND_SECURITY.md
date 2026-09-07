# Banco de dados e segurança

Status: **contrato confirmado pelo código, migrations versionadas e validações remotas já realizadas**

## Limite de evidência

Este documento não inventa o schema-base. O repositório contém migrations incrementais a partir do PATCH-003, mas não contém a criação completa das tabelas iniciais.

Fatos sobre constraints, triggers, policies e Realtime adicionados pelos PATCHES 027A/028A vêm das migrations versionadas e da validação remota realizada no projeto Supabase `riuiccyhrlbfggzfkedr`. RLS anterior a essas migrations precisa ser reauditada no hardening.

## Tabelas em uso

### `categories`

Campos consumidos:

- `id`;
- `name`;
- `emoji`;
- `sort_order`;
- `created_at`.

### `menu_items`

Campos consumidos:

- `id`;
- `category_id`;
- `name`;
- `description`;
- `price`;
- `image_url`;
- `available`;
- `created_at`;
- `production_station`;
- `production_mode`.

`production_station` e `production_mode` são `NOT NULL` no estado remoto atual.

### `table_sessions`

Campos confirmados pelo consumo atual:

- `id`;
- `unit_id`;
- `table_num`;
- `status`;
- `party_size`;
- `created_at`;
- `updated_at`;
- `closed_at`.

Existe índice único parcial para uma sessão ativa por unidade e mesa.

### `customer_sessions`

Campos consumidos:

- `id`;
- `table_session_id`;
- `name`;
- `display_name`;
- `phone`;
- `created_at`;
- `updated_at`.

### `orders`

Campos consumidos:

- `id`;
- `name`;
- `phone`;
- `table_num`;
- `table_session_id`;
- `customer_session_id`;
- `items` JSON;
- `total`;
- `status`;
- `created_at`;
- `created_by`.

O nome exato da coluna de idempotência é consumido pelas APIs/migrations existentes, mas o schema-base deve ser versionado antes de ser descrito integralmente aqui.

### `order_station_executions`

Campos:

- `id`;
- `order_id`;
- `production_station`;
- `status`;
- `created_at`;
- `updated_at`;
- `started_at`;
- `ready_at`;
- `delivered_at`.

Possui `UNIQUE(order_id, production_station)` e índices de fila/entrega.

## Relacionamentos

```text
categories.id
  └─ menu_items.category_id

table_sessions.id
  ├─ customer_sessions.table_session_id
  └─ orders.table_session_id

customer_sessions.id
  └─ orders.customer_session_id

orders.id
  └─ order_station_executions.order_id
```

## Migrations aplicadas

| Migration | Resultado |
|---|---|
| `202607230001_patch_003_table_session_party_size.sql` | Adiciona `party_size` e unicidade da sessão ativa. |
| `202608050001_patch_026_production_station.sql` | Adiciona e preenche `production_station`; 21 Bar e 36 Kitchen. |
| `202608060001_patch_027a_station_execution_foundation.sql` | Adiciona `production_mode`; cria execuções, transições, projeção, RLS e Realtime. |
| `202608060002_patch_028a_delivery_persistence.sql` | Adiciona `delivered_at`, backfill, guardas, projeção e RPC de entrega. |

## Snapshots de pedido

`orders.items` preserva dados comerciais e operacionais no momento do envio. O servidor ignora preço/estação informados pelo cliente e resolve:

- produto existente;
- disponibilidade;
- preço;
- `productionStation`;
- `productionMode`.

Isso protege histórico contra alterações futuras do catálogo.

## Triggers e funções

Funções versionadas relevantes:

- `patch_027a_guard_station_execution`;
- `patch_027a_derive_order_status`;
- `patch_027a_project_order_after_execution`;
- `patch_027a_guard_order_status_projection`;
- `patch_027a_sync_order_station_executions`;
- `confirm_station_execution_delivery`.

Responsabilidades:

- criar execuções a partir de snapshots válidos;
- impedir regressões e mutação estrutural;
- controlar timestamps;
- projetar `orders.status` sem recursão;
- preservar `cancelled`;
- confirmar entrega de forma transacional.

## RLS e privilégios

Para `order_station_executions`:

- leitura pública compatível com os painéis atuais;
- INSERT e DELETE públicos bloqueados;
- UPDATE direto restrito a transições válidas e protegido por trigger;
- alteração arbitrária de `delivered_at`, timestamps, pedido ou estação é bloqueada;
- entrega deve ocorrer pela RPC.

O acesso aos painéis usa a chave pública. O Manager consulta `auth.getUser()`, mas ainda não exige autenticação. Antes da RC é obrigatório:

- definir papéis operacionais;
- restringir páginas e mutations;
- auditar policies de `orders`, `table_sessions`, `customer_sessions`, `categories` e `menu_items`;
- remover privilégios públicos desnecessários;
- validar isolamento por unidade.

## Realtime

`order_station_executions` foi adicionada à publicação `supabase_realtime` e usa `REPLICA IDENTITY FULL`. Orders e sessões também são observados pelos consumidores existentes.

Realtime transporta alterações persistidas; não concede autoridade para violar RLS ou triggers.

## Compatibilidade histórica

Pedidos anteriores ao roteamento atual continuam legíveis pelo fallback centralizado. A migration não inventa estação para pedidos terminais que não possuem metadados seguros.

O fallback deve permanecer até que a política de retenção/migração de históricos seja aprovada.

## Idempotência e concorrência

- APIs de pedido usam chaves de requisição;
- resolução de TableSession trata corrida de inserção;
- unicidade impede duas sessões ativas da mesma mesa;
- execução é única por pedido/estação;
- triggers controlam transições concorrentes;
- cliente não escolhe preço, estação, modo ou timestamps.

## Dívidas antes da RC

1. criar uma migration-base ou snapshot versionado capaz de reconstruir o schema;
2. realizar auditoria administrativa completa de RLS e grants;
3. proteger rotas operacionais por papel;
4. documentar e validar fechamento da sessão/conta;
5. definir backup, restore e rollback;
6. revisar dados de teste e políticas de retenção.

## Proibido inferir

Não descrever como existente sem migration ou auditoria:

- `restaurants`;
- `units` completas;
- `tables` físicas;
- `accounts`;
- `payments`;
- `service_requests`;
- `production_tasks` por item;
- `delivery_tasks` por item;
- estoque, reservas ou CRM.
