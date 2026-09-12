# Modelo de domínio

Status: **fonte canônica do domínio atual**

## 1. Princípio central

```text
Mesa física
→ TableSession
→ CustomerSession
→ Order
→ OrderLineItem snapshot
→ OrderStationExecution
→ produção pronta
→ delivered_at
→ conta da sessão
→ encerramento
```

Os conceitos acima não são sinônimos. Misturá-los recria os erros que Production Routing, Station Execution e Delivery Persistence resolveram.

A auditoria da MODARA-006 confirmou que esta raiz ainda é adequada para o +54 Full Service, mas não representa corretamente uma visita individual sem mesa física, como a operação alvo do Quintal Skatepark. A direção futura é introduzir uma raiz `ServiceSession`/Visit acima de uma `TableSession` opcional.

## 2. Classificação das entidades

| Conceito | Natureza atual | Persistência |
|---|---|---|
| BrandIdentity | configuração | arquivo local |
| ExperienceProfile | configuração | arquivo local |
| Mesa | identidade física por número | referenciada por `table_num`; tabela física dedicada não confirmada |
| TableSession | visita/ocupação atual | `table_sessions` |
| CustomerSession | participante identificado | `customer_sessions` |
| Category | organização do cardápio | `categories` |
| MenuItem | produto comercial e roteamento | `menu_items` |
| Cart | intenção ainda não enviada | Zustand/localStorage |
| Order | envio incremental de itens | `orders` |
| OrderLineItem | snapshot histórico | JSON em `orders.items` |
| OrderStationExecution | trabalho de uma estação | `order_station_executions` |
| Delivery | fato de entrega da execução | `delivered_at` na execução |
| Account | consumo, responsabilidade e liquidação por sessão com mesa | `table_account_items`, `table_account_allocations`, `table_account_settlements`; projeção local auxiliar em Zustand |
| ServiceSession / Visit | raiz genérica de atendimento sem mesa obrigatória | futuro; não implementado |

## 3. BrandIdentity

Define como uma casa se apresenta: nome, unidade, texto, logo, cores, tipografia opcional e raios. Não define produção, banco ou regra de negócio.

## 4. ExperienceProfile

Agrupa House Profile, entrada, seções, regras operacionais, Visual Theme e BrandIdentity. Decide quais experiências existem e em qual ordem, usando intenção semântica.

Invariantes:

- não usa IDs de produtos ou categorias como regra editorial;
- não contém branches por nome do restaurante;
- não substitui persistência operacional.

## 5. Mesa

É o lugar físico identificado pelo QR. Na implementação atual, sua identidade operacional é o número validado entre 1 e 23.

Mesa não é sessão. Clientes diferentes podem ocupar a mesma mesa em momentos diferentes.

## 6. TableSession

Representa uma visita atual à mesa.

Responsabilidades:

- associar unidade e número da mesa;
- manter `party_size`;
- agrupar participantes e pedidos;
- indicar ciclo `active → closing → closed`;
- impedir duas sessões ativas para a mesma unidade/mesa.

`party_size` é a quantidade informada ou estimada na chegada e pode ser atualizada pela operação no futuro.

No código atual, `TableSession` também é a raiz técnica da conta persistida: itens, allocations, settlements, realtime de conta e fechamento dependem de `table_session_id`. Usá-la para uma operação sem mesa física exigiria evolução semântica ou uma entidade superior; criar mesa fictícia não é um modelo aceito.

## 7. CustomerSession

Representa uma pessoa identificada dentro da TableSession. A entrada atual cria ou atualiza uma sessão com nome; telefone pode permanecer vazio até outro fluxo.

Não representa ainda um cadastro CRM ou identidade global recorrente.

Também não representa ainda, de forma independente, uma visita individual de Counter-Service. Hoje a validade do participante é verificada contra `table_session_id`.

## 8. Category e MenuItem

Category ordena a apresentação do catálogo. MenuItem contém conteúdo comercial e os contratos operacionais:

- `production_station` define quem executa;
- `production_mode` define se basta separar ou se exige preparo;
- `image_url` é opcional;
- preço e disponibilidade são validados no servidor.

Categoria, nome e origem da tela não podem substituir `production_station` ou `production_mode`.

## 9. Cart

É uma intenção local e mutável. Não é pedido, conta nem verdade operacional. Após envio bem-sucedido, os itens passam a existir como snapshot do Order.

## 10. Order

É uma rodada incremental enviada durante a TableSession. Uma visita pode gerar vários Orders.

Responsabilidades:

- associar mesa e participante;
- preservar itens, quantidades e preços enviados;
- possuir chave idempotente;
- refletir uma projeção geral das execuções.

Estados atuais:

- `pending`;
- `preparing`;
- `ready`;
- `delivered`;
- `cancelled`.

O status não deve controlar diretamente todas as estações.

## 11. OrderLineItem snapshot

Cada item persistido em `orders.items` preserva:

- `id` do produto no momento do envio;
- nome;
- preço;
- quantidade;
- `productionStation`;
- `productionMode`;
- metadados transitórios de compatibilidade quando históricos.

Alterar o MenuItem depois não reescreve pedidos antigos.

## 12. OrderStationExecution

Representa o trabalho agregado de uma estação dentro de um pedido.

Granularidade V1:

```text
UNIQUE(order_id, production_station)
```

Campos estruturais e timestamps são protegidos. Transições:

```text
separation puro: pending → ready
com preparation: pending → preparing → ready
```

Se uma estação mistura itens de separação e preparação, segue o fluxo de preparação. Regressões são proibidas.

## 13. Delivery

Entrega não é um novo status de produção. Uma execução pode ser:

```text
status = ready
delivered_at = null      → pronta para retirada/entrega

status = ready
delivered_at = timestamp → entregue
```

Somente a RPC autorizada define `delivered_at`, usando horário do banco. O valor não pode ser alterado ou apagado.

## 14. Projeção de Order.status

Para pedidos não cancelados:

- todas execuções `pending` → `pending`;
- alguma avançou e nem todas estão `ready` → `preparing`;
- todas `ready` e alguma não entregue → `ready`;
- todas entregues → `delivered`.

`cancelled` é terminal e não deve ser sobrescrito pela projeção.

## 15. Account

Conta pertence hoje à TableSession e acumula todos os pedidos válidos da visita com mesa. A persistência de consumo, responsabilidade e liquidação foi introduzida na MODARA-002; confirmação fiscal/financeira de pagamento não existe.

Não existe atualmente uma entidade Payment operacional.

A persistência de conta existe para sessões com `table_session_id`: `table_account_items`, `table_account_allocations` e `table_account_settlements` materializam consumo, responsabilidade e liquidação. Ela ainda não suporta conta individual sem mesa porque todos esses registros exigem `table_session_id`.

Para Counter-Service como o Quintal, a evolução futura deve permitir:

```text
ServiceSession / Visit
→ consumo incremental
→ conta individual
→ fechamento solicitado
→ pagamento presencial confirmado operacionalmente
→ visita encerrada
```

Uma visita sem consumo deve poder ser encerrada sem settlement fictício, order fictício ou item R$0.

## 16. Invariantes

1. QR identifica mesa, não pessoa.
2. Uma mesa pode ter no máximo uma sessão ativa por unidade.
3. CustomerSession pertence a uma TableSession.
4. Order pertence à visita e preserva snapshot.
5. Estação e modo são resolvidos no servidor.
6. Cada pedido possui no máximo uma execução por estação.
7. Estações avançam independentemente.
8. Entrega exige execução pronta.
9. Entrega é imutável.
10. Pedido cancelado não é reaberto por projeção.
11. Alteração de catálogo não modifica histórico.
12. Estado local nunca substitui estado persistido operacional.

## 17. Conceitos que não existem na V1 atual

- Restaurant e Unit completos como domínio multi-tenant administrável;
- tabela física configurável;
- GuestArrival;
- Reservation e Waitlist;
- Round persistida como entidade própria;
- ProductionTask por item;
- DeliveryTask por item;
- ServiceRequest persistida;
- Payment;
- ServiceSession / Visit;
- Cashier;
- Pickup formal;
- Customer CRM global;
- estoque ou ficha técnica.

Esses conceitos não podem aparecer em documentação vigente como se estivessem implementados.
