# STORES.md

# Arquitetura Oficial das Stores

Projeto: Cardápio Digital +54

Versão: 1.0

Status: Documento Vivo

---

# Objetivo

Definir a arquitetura oficial de gerenciamento de estado da aplicação.

Nenhuma store deve ser criada sem seguir este documento.

Toda store possui responsabilidade única.

---

# Filosofia

Componentes exibem dados.

Stores gerenciam estado.

Services executam regras de negócio.

Banco persiste informações.

Cada camada possui uma única responsabilidade.

---

# Fluxo geral

```
Interface

↓

Component

↓

Store

↓

Service

↓

API

↓

Database
```

Jamais inverter esse fluxo.

---

# Regra número 1

Uma responsabilidade = uma store.

Nunca criar stores híbridas.

Exemplo errado:

```
useCart

↓

carrinho

↓

checkout

↓

pedidos

↓

pagamento
```

Isso gera acoplamento.

---

# Arquitetura ideal

```
useCart

↓

itens temporários
```

```
useOrderTracker

↓

pedidos enviados
```

```
useSession

↓

sessão do cliente
```

```
useAccount

↓

conta financeira
```

```
useRestaurant

↓

dados do restaurante
```

Cada uma independente.

---

# Comunicação

Stores nunca conversam diretamente.

Quem coordena é a camada superior.

Exemplo:

```
Checkout

↓

useCart

↓

envia pedido

↓

useOrderTracker

↓

clearCart()
```

Não:

```
useCart

↓

modifica

↓

useOrderTracker
```

---

# Store oficial: useCart

Responsabilidade:

Carrinho temporário.

Contém:

* items

* total

Ações:

* addItem

* removeItem

* clearCart

Nunca armazenar:

* pedidos enviados

* pagamento

* sessão

---

# Store oficial: useOrderTracker

Responsabilidade:

Pedidos enviados.

Contém:

* orders

* activeOrders

* deliveredOrders

Ações:

* addOrder

* updateOrder

* removeOrder

* clearOrders

Nunca armazenar:

* carrinho

* pagamento

---

# Store oficial: useSession

Responsabilidade:

Sessão atual da mesa.

Contém:

* sessionId

* token

* table

* status

Ações:

* openSession

* closeSession

* updateSession

---

# Store oficial: useAccount

Responsabilidade:

Conta da mesa.

Contém:

* subtotal

* discount

* serviceFee

* total

* status

Ações:

* updateSubtotal

* applyDiscount

* updateStatus

---

# Store oficial: useRestaurant

Responsabilidade:

Dados institucionais.

Contém:

* name

* logo

* theme

* currency

* language

---

# Store oficial: useUser

Responsabilidade:

Dados do cliente.

Contém:

* id

* name

* phone

* email

---

# Store oficial: useSettings

Responsabilidade:

Configurações locais.

Exemplo:

tema

idioma

moeda

preferências

---

# Store oficial: useAI

Responsabilidade:

Estado da conversa com IA.

Contém:

conversation

recommendations

loading

actions

---

# Store oficial: useNotifications

Responsabilidade:

Notificações.

Contém:

toast

alerts

messages

badgeCount

---

# Store oficial: useRealtime

Responsabilidade:

Conexão realtime.

Contém:

connected

lastEvent

channel

status

---

# Store oficial: useAnalytics

Responsabilidade:

Eventos locais.

Exemplo:

menuOpened

itemViewed

checkoutStarted

orderSent

---

# Estrutura recomendada

```
lib

└── stores

      useCart.ts

      useOrderTracker.ts

      useSession.ts

      useAccount.ts

      useRestaurant.ts

      useUser.ts

      useAI.ts

      useSettings.ts

      useNotifications.ts

      useRealtime.ts

      useAnalytics.ts
```

---

# Responsabilidade dos Components

Components:

renderizam.

Nunca centralizam lógica.

---

Exemplo:

```
MenuCard

↓

botão

↓

useCart.addItem()
```

Fim.

---

# Responsabilidade dos Services

Services fazem trabalho pesado.

Exemplo:

```
checkoutService

↓

valida

↓

cria pedido

↓

envia API

↓

retorna resultado
```

---

# Responsabilidade das Stores

Stores:

guardam estado.

Não executam regras complexas.

---

# O que NÃO fazer

Errado:

```
useCart

↓

faz fetch

↓

salva banco

↓

abre modal

↓

envia toast

↓

controla pagamento
```

---

Correto:

```
Component

↓

Service

↓

Store atualizada
```

---

# Duplicação

Nunca existirão duas stores para o mesmo domínio.

Exemplo proibido:

```
lib/cart/useCart

lib/stores/useCart
```

Existe apenas uma implementação oficial.

---

# Convenção

Nome:

```
useNome.ts
```

Exemplo:

```
useCart

useSession

useAccount
```

Nunca:

```
cartStoreFinal

newCart

cart2

cartTemp
```

---

# Estrutura padrão

Cada store deve conter:

Estado

↓

Actions

↓

Selectors (quando necessário)

↓

Export

---

# Persistência

Somente persistir quando fizer sentido.

Exemplo:

Configurações

Sim.

Carrinho temporário

Depende.

Sessão encerrada

Não.

---

# Realtime

Eventos do Supabase atualizam stores.

Nunca componentes diretamente.

Fluxo:

```
Supabase

↓

Realtime

↓

Store

↓

Interface
```

---

# Dependências

Store A não importa Store B.

Coordenação acontece por componentes ou serviços.

Isso reduz acoplamento.

---

# Testabilidade

Cada store deve poder ser testada isoladamente.

Sem dependência de interface.

Sem dependência de banco.

---

# Escalabilidade

A arquitetura deve suportar:

* milhares de mesas

* múltiplos restaurantes

* múltiplas sessões

* múltiplos usuários

* múltiplos pedidos simultâneos

---

# Regra máxima

Antes de criar uma nova store, responder:

1. Ela possui responsabilidade única?

2. Essa responsabilidade já existe em outra store?

3. Um componente poderia resolver isso sem criar estado global?

4. Ela será reutilizada em diferentes partes do sistema?

Se alguma resposta indicar duplicação ou acoplamento, a store não deve ser criada.

---

# Constituição das Stores

As stores representam o estado global da aplicação.

Elas não são componentes, não são serviços e não são banco de dados.

Sua única função é armazenar e disponibilizar estado de forma previsível, isolada e escalável para todo o sistema.
