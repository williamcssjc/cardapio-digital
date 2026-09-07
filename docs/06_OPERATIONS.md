# Operação

Status: **fonte canônica da operação atual**

## Princípio

```text
Pedido pertence à visita da mesa.
Produção pertence à estação.
Entrega pertence ao atendimento.
Gerente observa a operação inteira.
```

O sistema não deve deduzir responsabilidade por nome, categoria, origem da tela ou marca.

## Production Station

Estações previstas no contrato:

- `bar`;
- `kitchen`;
- `service`.

Catálogo atual:

- Bar: 21 produtos;
- Kitchen: 36 produtos;
- Service: nenhum produto atual.

Novas estações podem ser adicionadas no futuro sem criar colunas como `bar_status` ou `kitchen_status`.

## Production Mode

- `separation`: item pode ser separado sem etapa intermediária obrigatória;
- `preparation`: item exige início explícito de preparo.

Contagens atuais:

- separation: 10;
- preparation: 47.

Uma execução mista segue `preparation`.

## Station Execution

Granularidade:

```text
order_id + production_station
```

Fluxos:

```text
separation puro
pending → ready

preparation ou misto
pending → preparing → ready
```

Regressões são bloqueadas. `order_id`, estação, criação e vínculos estruturais são imutáveis. `started_at` e `ready_at` são controlados pelas transições do banco.

## Pedido misto

Exemplo:

```text
Order #180
├── Bar: Chopp Brahma → preparing → ready → delivered_at
└── Kitchen: Bife de Chorizo → preparing → ready → delivered_at
```

Bar pode estar entregue enquanto Kitchen ainda prepara. Nesse caso o pedido geral continua `preparing`. Ele só se torna `delivered` quando todas as execuções forem entregues.

## Bar

Rota: `/bar`.

O Bar Board:

- carrega somente projeções com `productionStation = bar`;
- exige execução persistida para pedidos atuais;
- usa o Station Board compartilhado;
- mostra pendente, em preparo e pronto;
- recebe Orders e Station Executions por Realtime;
- não usa nome ou categoria para classificar.

A interface diferencia apresentação de itens, mas `productionMode` — e não aparência — controla transições.

## Cozinha

Rota: `/cozinha`.

A Cozinha:

- carrega apenas `productionStation = kitchen`;
- compartilha cards, timers, ações, subscriptions e estados com o Bar;
- não exibe bebidas do Bar;
- avança a própria execução sem afetar indevidamente outras estações.

## Garçom

Rota: `/garcom`.

Implementado:

- leitura de pedidos e execuções;
- visibilidade das estações envolvidas;
- identificação de execuções prontas e entregues;
- confirmação de entrega por RPC;
- Realtime compartilhado;
- painel de alertas com instante estável na hidratação.

Limitação atual:

- organização principal ainda é por pedido/status;
- não consolida todos os pedidos ativos em um card por mesa;
- não apresenta a visita inteira como unidade de trabalho.

PATCH-028B mudará somente a projeção e experiência operacional, preservando Station Execution, Delivery Persistence e Realtime.

## Gerente

Rota: `/gerente`.

O Manager Command Center possui:

- snapshot server-side;
- Realtime de sessões, clientes, pedidos e execuções;
- mapa das 23 mesas;
- ocupação e quantidade de pessoas;
- subtotais;
- filas de Bar e Cozinha;
- alertas de tempo e inconsistência;
- detalhes da mesa;
- abertura operacional de mesa;
- filtros e busca.

O gerente usa a mesma classificação das estações. Não existe um segundo motor de roteamento.

Limitação: `auth.getUser()` produz um rótulo de operador, mas a página não bloqueia acesso quando não há sessão autenticada. Isso pertence ao hardening da V1.

## Delivery

Uma execução pronta pode ser confirmada pela RPC `confirm_station_execution_delivery`.

Regras:

- exige `status = ready`;
- exige `ready_at`;
- banco define `delivered_at`;
- timestamp é imutável;
- entrega não pode ser limpa;
- execução entregue não volta a produzir;
- pedido cancelado não recebe entrega.

## Realtime

Bar, Cozinha, Garçom e Gerente usam snapshot inicial seguido por canais compartilhados. Não há polling, listener por item nem listener por mesa para produção.

Eventos são reconciliados por ID e as subscriptions são removidas no unmount.

## Fallback histórico

Pedidos antigos podem não conter `productionStation`, `productionMode` ou execução persistida. Um único fallback em `lib/orders/order-routing.ts` mantém leitura:

1. `dispatchKind = instant-beverage` → Bar;
2. `fulfillmentDestination = kitchen` → Kitchen;
3. `fulfillmentDestination = waiter` → Service;
4. ausência total → Kitchen com issue explícita.

O fallback não deve ser usado para os 57 produtos atuais nem copiado para novos consumidores.

## Alertas atuais

O Gerente calcula níveis por tempo decorrido e inconsistências. Esses alertas são projeções, não uma tabela persistida de OperationalAlert.

## Próximas entregas da V1

- Waiter Board 2.0 por mesa;
- consolidação da conta e fechamento;
- linguagem visual operacional unificada;
- autenticação e RLS endurecidas;
- simulação com múltiplas mesas e operadores.

## Fora da V1

- execução individual por item;
- pickup/delivering explícitos;
- heat map preditivo;
- escala de funcionários;
- estação avançada configurável por painel;
- inteligência automática de priorização.
