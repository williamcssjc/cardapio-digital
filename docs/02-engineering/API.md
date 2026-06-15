# API.md

# Arquitetura Oficial da API

Projeto: Cardápio Digital +54

Versão: 1.0

Status: Documento Vivo

---

# Objetivo

Definir o contrato oficial entre:

* Frontend
* Backend
* Banco de Dados
* Serviços externos
* Inteligência Artificial

Nenhum componente deve acessar diretamente o banco quando existir uma camada de serviço apropriada.

---

# Filosofia

A API representa o domínio do negócio.

Ela não existe para servir telas.

Ela existe para servir regras.

---

# Fluxo oficial

```
Cliente

↓

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

↓

Resposta

↓

Store

↓

Interface
```

Nunca inverter esse fluxo.

---

# Princípios

API deve ser:

* previsível

* desacoplada

* escalável

* reutilizável

* versionável

* documentada

---

# Convenção

Endpoints:

```
/api/recurso
```

Nunca:

```
/api/fazerPedidoFinalNovo2
```

---

# Versionamento

Sempre preparado para:

```
/api/v1
```

Futuramente:

```
/api/v2
```

---

# Estrutura

```
API

├── restaurants

├── categories

├── menu-items

├── sessions

├── carts

├── orders

├── accounts

├── payments

├── notifications

├── ai

├── analytics
```

---

# Restaurant

GET

```
/api/restaurants/:id
```

Retorna:

* nome

* logo

* tema

* idioma

* moeda

---

# Categories

GET

```
/api/categories
```

Retorna:

lista ordenada.

---

# Menu

GET

```
/api/menu-items
```

Filtros possíveis:

category

available

featured

search

---

Exemplo:

```
GET

/api/menu-items?category=3
```

---

# Session

Criar sessão

POST

```
/api/sessions
```

Resposta:

```
sessionId

token

table

status
```

---

Consultar sessão

GET

```
/api/sessions/:id
```

---

Encerrar sessão

PATCH

```
/api/sessions/:id
```

---

# Cart

Adicionar item

POST

```
/api/cart/items
```

Payload:

```
menuItemId

quantity

notes
```

---

Remover item

DELETE

```
/api/cart/items/:id
```

---

Atualizar quantidade

PATCH

```
/api/cart/items/:id
```

---

Consultar carrinho

GET

```
/api/cart
```

---

# Checkout

Enviar pedido

POST

```
/api/orders
```

Payload:

```
sessionId

items

notes
```

Resposta:

```
orderId

status
```

---

# Orders

Consultar pedidos

GET

```
/api/orders
```

---

Consultar pedido

GET

```
/api/orders/:id
```

---

Atualizar status

PATCH

```
/api/orders/:id
```

---

Status possíveis

pending

accepted

preparing

ready

delivered

cancelled

---

# Account

Consultar conta

GET

```
/api/account
```

---

Atualizar conta

PATCH

```
/api/account
```

---

Resposta:

subtotal

discount

serviceFee

total

status

---

# Payment

Criar pagamento

POST

```
/api/payments
```

---

Consultar pagamento

GET

```
/api/payments/:id
```

---

Cancelar

PATCH

```
/api/payments/:id
```

---

Métodos

pix

credit_card

debit_card

cash

wallet

---

# Notifications

Consultar

GET

```
/api/notifications
```

---

Marcar como lida

PATCH

```
/api/notifications/:id
```

---

# AI

Enviar mensagem

POST

```
/api/ai/chat
```

Payload:

```
sessionId

message
```

---

Resposta

```
answer

suggestions

actions
```

---

# Recommendation

Consultar recomendações

GET

```
/api/recommendations
```

---

# Analytics

Registrar evento

POST

```
/api/analytics
```

Payload

```
event

metadata
```

---

# Realtime

Realtime NÃO substitui API.

Realtime apenas sincroniza estados.

Fluxo:

```
Frontend

↓

API

↓

Database

↓

Realtime

↓

Frontend
```

---

# Services

Os componentes NÃO chamam API diretamente.

Devem chamar:

```
checkoutService

↓

API
```

Nunca:

```
Component

↓

fetch()
```

---

# Stores

Stores também não conhecem a API.

Fluxo:

```
Service

↓

Store
```

---

# Tratamento de erros

Resposta padrão:

```
success

message

data

error
```

---

Exemplo

```
{
success:true,
data:{...}
}
```

---

Erro

```
{
success:false,
error:{
code,
message
}
}
```

---

# HTTP

GET

Consultar

POST

Criar

PATCH

Atualizar parcialmente

PUT

Substituição completa

DELETE

Remover

---

# Autenticação futura

JWT

↓

Session

↓

Restaurant

↓

Permissões

---

# Permissões

Cliente

Garçom

Caixa

Gerente

Administrador

Sistema

Cada endpoint deve validar permissões.

---

# Integrações futuras

PIX

ERP

PDV

WhatsApp

iFood

Rappi

OpenAI

Anthropic

Google

Stripe

Mercado Pago

---

# Logs

Toda operação relevante deve registrar:

timestamp

session

restaurant

user

endpoint

resultado

---

# Idempotência

Operações críticas devem impedir duplicidade.

Exemplo:

clicar duas vezes em "Enviar pedido"

↓

gera apenas um pedido.

---

# Timeouts

Operações externas devem possuir timeout.

Nunca deixar requisições indefinidamente abertas.

---

# Escalabilidade

A API deve suportar:

* milhares de restaurantes

* milhares de mesas simultâneas

* milhões de pedidos

* múltiplas integrações

* múltiplos idiomas

* múltiplas moedas

---

# Princípio arquitetural

Componentes não conhecem banco.

Stores não conhecem banco.

Banco não conhece interface.

Services conhecem regras.

API conhece contratos.

O sistema deve permanecer modular, substituível e escalável.

---

# Constituição da API

A API é a fronteira oficial entre todas as camadas do projeto.

Nenhuma funcionalidade deve depender de detalhes internos de outra camada.

Toda comunicação deve acontecer através de contratos claros, estáveis e documentados, permitindo evolução contínua sem quebrar o restante do sistema.
