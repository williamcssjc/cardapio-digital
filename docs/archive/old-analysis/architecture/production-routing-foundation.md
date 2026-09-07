# Production Routing Foundation

Data da decisão: 05/08/2026.

## Contrato canônico

O domínio operacional reconhece inicialmente três códigos de estação:

- `bar`: bebidas e itens preparados ou separados pelo bar;
- `kitchen`: alimentos preparados pela cozinha;
- `service`: solicitações humanas que não representam produção.

O contrato é definido uma única vez em `types/production.ts`. Componentes não decidem estações e não possuem listas próprias de produtos, categorias ou marcas.

## Fonte de verdade e transição

A superfície pública auditada antes deste patch não expunha `menu_items.production_station`. Por isso, a transição possui duas fontes com prioridade explícita:

1. `menu_items.production_station`, quando o campo estiver presente;
2. configuração temporária por identificador semântico estável, enquanto a migration não for aplicada.

A configuração temporária cobre exatamente os 57 produtos do catálogo comercial inicial do +54 Jardim Aquarius. Ela não usa IDs do Supabase nem categorias para decidir o destino. O nome canônico é usado somente na fronteira atual para resolver a identidade semântica porque o schema público ainda não expõe um identificador estável do produto.

A migration `202608050001_patch_026_production_station.sql` foi preparada, mas não executada. Ela:

- valida o snapshot de 57 produtos antes de alterar dados;
- adiciona a coluna de forma transacional;
- realiza backfill explícito;
- valida 21 produtos no bar e 36 na cozinha;
- torna o campo obrigatório após o backfill;
- aplica uma constraint de formato extensível, sem congelar uma lista global de estações por restaurante.

Depois da aplicação da migration, o mapper rejeita ou sinaliza valor ausente/inválido e não recorre à configuração transitória quando a coluna está presente.

## Snapshot do pedido

O servidor consulta os produtos solicitados em uma única operação, valida disponibilidade, preço, identidade e estação, recalcula o total e persiste em cada item:

```text
id
name
price
qty
productionStation
```

O cliente não escolhe a estação. Alterações posteriores no catálogo não mudam pedidos já enviados.

Pedidos comuns também recebem uma `submissionKey` estável para que uma repetição da mesma submissão possa recuperar o pedido existente. Bebidas rápidas preservam `dispatchKey` e `dispatchKind` para a idempotência e o contexto já existentes.

## Compatibilidade legada

Todo fallback está centralizado em `lib/orders/order-routing.ts`, nesta ordem:

1. snapshot `productionStation` válido;
2. `dispatchKind: instant-beverage` legado → `bar`;
3. `fulfillmentDestination: kitchen` legado → `kitchen`;
4. `fulfillmentDestination: waiter` legado não instantâneo → `service`;
5. item histórico sem metadados → `kitchen`, preservando a invariável anterior;
6. valor explícito inválido → `unknown`.

Fallbacks geram issue deduplicada em desenvolvimento. Itens `unknown` não são enviados arbitrariamente para uma estação e aparecem como atenção operacional no gerente.

## Projeções operacionais

Pedidos continuam persistidos como uma rodada com itens em JSON. Cada consumidor recebe uma projeção por estação:

```text
pedido misto
  Água                  → bar
  Bife de Chorizo       → kitchen
  Mini Churros          → kitchen
```

A cozinha recebe somente os dois itens `kitchen`; o gerente recebe uma projeção para bar e outra para cozinha; o garçom mantém o contexto do pedido e enxerga a estação sem ser tratado como produtor.

## Limites conhecidos

- A migration remota depende de aprovação e ainda não foi executada.
- Enquanto isso, a identidade semântica do registro público é resolvida pelo nome canônico auditado; esse bridge deixa de decidir o roteamento quando a coluna persistida existir.
- O status ainda pertence ao pedido inteiro, não a uma tarefa por estação. Estados independentes de preparo dependem de uma futura entidade de tarefas de produção.
- RLS, grants, triggers, índices, constraints remotas e consumidores externos não são verificáveis com a chave pública atual.
