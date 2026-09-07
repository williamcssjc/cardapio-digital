# Auditoria da superfície pública do banco

Data da auditoria: 25/07/2026.

Escopo: respostas acessíveis por `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`, consultas existentes no projeto e migrations presentes no repositório.

Esta não é uma auditoria administrativa do Supabase.

## 1. Confirmado pela API pública

As afirmações abaixo foram verificadas por consultas somente leitura usando a chave pública.

### Recursos acessíveis

| Recurso público consultado | Colunas observadas em resposta |
|---|---|
| `categories` | `id`, `name`, `emoji`, `sort_order`, `created_at` |
| `menu_items` | `id`, `category_id`, `name`, `description`, `price`, `image_url`, `available`, `created_at` |
| `orders` | `id`, `name`, `phone`, `table_num`, `items`, `total`, `status`, `created_at`, `table_session_id`, `customer_session_id`, `created_by` |
| `table_sessions` | `id`, `table_num`, `status`, `created_at`, `updated_at`, `closed_at`, `unit_id`, `party_size` |
| `customer_sessions` | `id`, `table_session_id`, `name`, `display_name`, `phone`, `created_at`, `updated_at` |

“Acessível” significa somente que a API pública aceitou a consulta realizada. Não implica acesso irrestrito, ausência de RLS ou visibilidade de todas as linhas.

### Contrato de imagem

- A persistência pública usa `menu_items.image_url`.
- Os sete registros observados durante a auditoria de conteúdo retornaram `image_url = null`.
- O TypeScript declarava `photo_url`, campo não observado nas respostas públicas de `menu_items`.
- O componente `MenuCard` consumia `photo_url`; portanto, uma futura imagem em `image_url` não seria exibida pelo contrato anterior.

O PATCH-004.5 estabelece:

```text
Supabase MenuItemRow.image_url
        ↓ mapMenuItem()
Domínio MenuItem.imageUrl
        ↓
MenuCard
```

Valores nulos e falhas de carregamento resultam no placeholder já existente.

### Migration local comparável

A migration `202607230001_patch_003_table_session_party_size.sql` declara `table_sessions.party_size`. A coluna foi observada na resposta pública.

Não foi possível confirmar pela API pública se a constraint positiva e o índice parcial declarados na migration estão efetivamente instalados.

## 2. Inferido pelo código, mas não confirmado administrativamente

- `unit_id` é tratado pelo código como identificador do estabelecimento atual.
- `table_sessions.status` usa ao menos os valores `active` e `closed` nos consumidores.
- `orders.status` é tratado como `pending`, `preparing`, `ready`, `delivered` ou `cancelled`.
- `table_session_id` e `customer_session_id` são tratados como vínculos relacionais.
- `categories.menu_items(*)` é tratado como relacionamento embutido pelo PostgREST.
- Os painéis assumem que o realtime de `orders` e `table_sessions` está habilitado.
- O projeto assume que a chave anônima pode criar e atualizar sessões e pedidos conforme as políticas remotas.

Essas conclusões descrevem expectativas do código. Não comprovam foreign keys, enums, políticas, grants ou configuração de realtime.

## 3. Não verificável com o acesso atual

### Recursos não expostos na consulta pública

As consultas públicas realizadas para `restaurants`, `establishments`, `units`, `tables`, `order_items` e `experience_contents` retornaram `PGRST205`.

Isso não comprova inexistência. Para todos esses recursos, o estado correto é:

> Não verificável com o acesso atual.

Eles podem não existir, estar em outro schema, não estar expostos pelo PostgREST ou não estar disponíveis à role anônima.

### Metadados administrativos

Não são verificáveis:

- políticas RLS e grants;
- triggers e funções;
- índices;
- constraints e foreign keys;
- tipos PostgreSQL exatos;
- schemas não públicos;
- configuração de realtime;
- histórico remoto de migrations;
- configuração de Auth;
- buckets e políticas de Storage;
- cobertura total de linhas escondidas por RLS;
- existência administrativa de tabelas não expostas.

### Limitação da comparação TypeScript × banco

Os tipos em `types/database.ts` representam somente as colunas observadas na superfície pública necessária ao menu. Eles não são tipos gerados do schema e não devem ser tratados como descrição administrativa completa do banco.

