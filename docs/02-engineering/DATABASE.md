# DATABASE.md

# Arquitetura do Banco de Dados

Projeto: Cardápio Digital +54

Versão: 1.0

Status: Documento Vivo

---

# Objetivo

Definir a arquitetura oficial do banco de dados do projeto.

Este documento serve como referência para qualquer desenvolvedor ou IA antes de criar novas tabelas, relacionamentos ou migrations.

Toda alteração estrutural deve respeitar este documento.

---

# Filosofia

O banco deve ser:

* escalável

* desacoplado

* multiempresa (multi-tenant)

* preparado para IA

* preparado para analytics

* preparado para realtime

* preparado para white label

Nunca modelar pensando apenas no MVP.

Sempre modelar pensando no produto final.

---

# Entidades principais

Restaurant

↓

Category

↓

MenuItem

↓

Session

↓

Cart

↓

Order

↓

OrderItem

↓

Account

↓

Payment

↓

AI

↓

Analytics

---

# Modelo conceitual

```
Restaurant

├── Categories
│
├── Menu Items
│
├── Tables
│
├── Sessions
│
├── Orders
│
├── Payments
│
├── Employees
│
└── Settings
```

---

# Restaurant

Representa um restaurante.

Campos:

id

name

slug

logo

primary_color

secondary_color

currency

language

timezone

active

created_at

updated_at

---

# Category

Categorias do cardápio.

Exemplo:

Entradas

Carnes

Massas

Sobremesas

Bebidas

Campos:

id

restaurant_id

name

emoji

sort_order

active

created_at

updated_at

---

# MenuItem

Produto vendido.

Campos:

id

restaurant_id

category_id

name

description

price

photo_url

available

featured

sort_order

created_at

updated_at

---

# Table

Mesa física.

Campos:

id

restaurant_id

number

qr_code

status

created_at

updated_at

Status possíveis:

available

occupied

reserved

maintenance

---

# Session

Representa uma visita.

Uma sessão começa quando o cliente entra e termina quando a conta é encerrada.

Campos:

id

restaurant_id

table_id

token

status

opened_at

closed_at

created_at

updated_at

---

Status:

active

closing

closed

cancelled

---

# Customer

Opcional.

Pode existir ou não.

Campos:

id

name

phone

email

created_at

---

# Cart

Carrinho temporário.

Pode existir apenas durante a sessão.

Campos:

id

session_id

created_at

updated_at

---

# CartItem

Campos:

id

cart_id

menu_item_id

quantity

unit_price

notes

created_at

---

# Order

Pedido enviado.

Campos:

id

restaurant_id

session_id

number

status

total

notes

created_at

updated_at

---

Status possíveis

pending

accepted

preparing

ready

delivered

cancelled

---

# OrderItem

Itens do pedido.

Campos:

id

order_id

menu_item_id

quantity

unit_price

notes

created_at

---

# Account

Conta da mesa.

Campos:

id

session_id

subtotal

discount

service_fee

tax

total

status

created_at

updated_at

---

Status

open

closing

paid

cancelled

---

# Payment

Pagamento.

Campos:

id

account_id

method

amount

status

transaction_id

created_at

---

Métodos

pix

credit_card

debit_card

cash

wallet

---

Status

pending

approved

failed

cancelled

refunded

---

# Employee

Funcionários.

Campos:

id

restaurant_id

name

role

active

created_at

---

Roles

admin

manager

waiter

kitchen

cashier

---

# Notification

Sistema de notificações.

Campos:

id

restaurant_id

session_id

type

payload

read

created_at

---

# AI Conversation

Histórico da IA.

Campos:

id

session_id

role

content

created_at

---

Role

system

assistant

user

---

# Recommendation

Recomendações geradas pela IA.

Campos:

id

session_id

menu_item_id

accepted

created_at

---

# AnalyticsEvent

Toda ação relevante gera um evento.

Campos:

id

restaurant_id

session_id

event

metadata

created_at

---

Exemplos

menu_opened

item_viewed

item_added

checkout_started

order_sent

payment_started

payment_finished

recommendation_clicked

---

# Settings

Configurações do restaurante.

Campos:

restaurant_id

theme

logo

currency

language

timezone

service_fee

tax_enabled

pix_enabled

ai_enabled

---

# Relações

Restaurant

↓

Category

↓

MenuItem

---

Restaurant

↓

Table

↓

Session

↓

Order

↓

OrderItem

---

Session

↓

Account

↓

Payment

---

Session

↓

AI Conversation

---

Session

↓

Analytics Events

---

# Realtime

Realtime deverá observar:

orders

accounts

notifications

sessions

Nunca utilizar polling quando houver suporte a realtime.

---

# Índices importantes

Restaurant

slug

Category

restaurant_id

sort_order

MenuItem

category_id

restaurant_id

Order

session_id

status

created_at

OrderItem

order_id

Payment

account_id

Analytics

restaurant_id

created_at

---

# Multi-tenant

Toda entidade pertencente ao negócio deve possuir vínculo com restaurant_id direta ou indiretamente.

Nenhuma consulta deve assumir restaurante único.

---

# Soft Delete

Sempre que possível utilizar:

deleted_at

ao invés de remoção física.

---

# Auditoria

Registrar:

created_at

updated_at

Opcionalmente:

created_by

updated_by

---

# Escalabilidade

A estrutura deve suportar:

* milhares de restaurantes

* milhões de pedidos

* múltiplas moedas

* múltiplos idiomas

* múltiplos fusos horários

* múltiplas unidades

---

# Regras arquiteturais

Nunca armazenar lógica de negócio no frontend.

Nunca duplicar dados desnecessariamente.

Nunca criar relacionamento circular.

Nunca criar tabela específica para um único restaurante.

Sempre pensar em reutilização.

---

# Roadmap do banco

MVP

✅ Restaurant

✅ Category

✅ MenuItem

✅ Session

✅ Order

✅ OrderItem

Próxima fase

⬜ Account

⬜ Payment

⬜ Notification

⬜ Employee

⬜ Settings

Futuro

⬜ AI Conversation

⬜ Recommendation

⬜ AnalyticsEvent

⬜ Loyalty

⬜ Cashback

⬜ Coupons

⬜ Reservations

⬜ Inventory

⬜ CRM

---

# Princípio máximo

O banco de dados deve representar o domínio do negócio, e não apenas as telas da aplicação.

As interfaces podem mudar.

As regras de negócio podem evoluir.

A modelagem deve permanecer consistente, escalável e preparada para o futuro.
