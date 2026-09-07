# PATCH-028A — Delivery Persistence Foundation

## Diagnóstico

Antes deste patch, `order_station_executions.status` representava apenas a
produção (`pending`, `preparing`, `ready`), mas o painel do garçom marcava o
pedido inteiro como `delivered`. Em pedidos com Bar e Cozinha, essa atualização
global não conseguia representar uma entrega parcial sem encerrar a outra
estação.

A superfície pública confirmou que:

- `order_station_executions` existe e mantém uma linha por
  `order_id + production_station`;
- `orders.updated_at` não está disponível no schema atual;
- o cliente já acompanha a projeção de `orders.status` por Supabase Realtime;
- gerente, cozinha e bar já consomem `order_station_executions` pelo canal
  compartilhado, sem polling.

## Contrato

`status` continua representando exclusivamente a produção. A entrega é
representada por:

```text
order_station_executions.delivered_at timestamptz null
```

Não foi criado status adicional. Uma execução é entregável somente quando
`status = ready`, `ready_at` existe e `delivered_at` ainda é nulo.

O timestamp é definido pelo banco por
`confirm_station_execution_delivery(execution_id)`. A função é transacional,
idempotente para uma execução já entregue e não aceita timestamp do cliente.
Depois da confirmação, `delivered_at` não pode ser alterado nem limpo e a
produção daquela execução não pode sofrer novas transições.

O acesso público direto permanece limitado a `UPDATE(status)`, necessário aos
painéis de produção. A confirmação de entrega ocorre apenas pela função. INSERT
e DELETE públicos continuam sem permissão.

## Projeção do pedido

O estado geral é derivado de todas as execuções do pedido:

| Execuções | `orders.status` |
| --- | --- |
| Todas `pending` | `pending` |
| Alguma avançou e nem todas estão `ready` | `preparing` |
| Todas `ready`, ao menos uma sem entrega | `ready` |
| Todas com `delivered_at` | `delivered` |

`cancelled` nunca é sobrescrito. Um pedido com entrega parcial não pode ser
cancelado, evitando a combinação estruturalmente incoerente de pedido
cancelado com execução entregue. Um pedido `delivered` não pode regredir.

## Backfill histórico

A migration preenche `delivered_at` apenas em execuções existentes ligadas a
pedidos já marcados como `delivered`.

O banco atual não possui `orders.updated_at`. Por isso, `ready_at` é a melhor
evidência temporal disponível para essas execuções; `orders.created_at` é usado
somente como fallback. A migration possui um ramo compatível com ambientes que
tenham `orders.updated_at`, preferindo esse valor sem permitir uma entrega
anterior a `ready_at`.

Pedidos históricos sem snapshot válido de `productionStation` e
`productionMode` não recebem uma estação inventada. Eles permanecem legíveis
pelo fallback histórico centralizado. Se um pedido entregue possuir snapshot
válido, mas estiver sem a execução correspondente, a transação aborta.

Pedidos `cancelled` e pedidos ativos permanecem com `delivered_at = null`.

## Realtime e consumidores

- Garçom: observa o canal compartilhado de execuções e confirma apenas uma
  execução pronta por vez.
- Gerente: recebe a alteração de `delivered_at` pelo canal já existente e a
  projeção de `orders.status` pelo canal de pedidos.
- Cliente: continua acompanhando `orders.status`; não recebe nova store ou
  subscription operacional.
- Cozinha e Bar: continuam controlando somente produção. Uma execução entregue
  deixa de contar como trabalho ativo sem criar um novo estado.

## Limites intencionais

- granularidade de entrega por estação, não por item;
- sem `picked_up`, `delivering` ou outro estado;
- sem observações;
- sem redesign por mesa do painel do garçom;
- sem nova store, polling ou listener por item/mesa;
- migration preparada localmente e não executada remotamente neste patch.
