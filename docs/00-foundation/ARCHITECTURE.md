# ARCHITECTURE.md

# CARDÁPIO DIGITAL

## Arquitetura Oficial do Projeto

Versão: 1.0

---

Lei nº 1 do Projeto

Nenhuma IA poderá criar um novo componente antes de verificar se ele já existe ou se sua responsabilidade pertence a outro componente.

# 1. Objetivo

Este documento define a arquitetura oficial do Cardápio Digital.

Ele possui prioridade superior sobre qualquer implementação.

Caso exista conflito entre código e este documento, considera-se que o código deverá ser refatorado.

O sistema deve evoluir continuamente sem perder organização.

Toda decisão arquitetural deve favorecer:

* escalabilidade
* desacoplamento
* reutilização
* simplicidade
* previsibilidade

---

# 2. Visão do Produto

O projeto não é um cardápio.

O projeto é uma plataforma completa de experiência do cliente dentro do restaurante.

O celular do cliente torna-se sua interface principal.

Tudo deve girar em torno dessa ideia.

Cliente:

entra

↓

faz pedido

↓

acompanha

↓

consome

↓

paga

↓

vai embora

↓

retorna

↓

é fidelizado

Todo o sistema existe para suportar esse fluxo.

---

# 3. Arquitetura Geral

Sistema dividido em módulos independentes.

```
UI

↓

Components

↓

Stores

↓

Services

↓

Supabase

↓

Database
```

Cada camada conversa apenas com a imediatamente inferior.

Nunca pular camadas.

Exemplo errado:

```
Component

↓

Supabase
```

Exemplo correto:

```
Component

↓

Store

↓

Service

↓

Supabase
```

---

# 4. Responsabilidade das Pastas

## app/

Responsável apenas por composição de páginas.

Nunca colocar regra de negócio.

Nunca colocar estados globais.

Nunca colocar lógica complexa.

---

## components/

Responsável pela interface.

Cada componente deve possuir apenas uma responsabilidade.

Exemplo:

MenuCard

Responsável:

mostrar produto

Não responsável:

checkout

pedido

pagamento

admin

---

## lib/

Responsável pela lógica compartilhada.

Contém:

stores

services

helpers

utils

config

---

## types/

Contém exclusivamente tipos.

Nunca colocar funções.

Nunca colocar estados.

---

## public/

Arquivos estáticos.

---

# 5. Filosofia dos Componentes

Todo componente deve responder:

"qual problema único eu resolvo?"

Se responder dois problemas:

o componente está errado.

---

Exemplo:

CartDrawer

Responsável:

mostrar carrinho

Errado:

mostrar pedidos

mostrar conta

mostrar histórico

mostrar pagamento

---

SessionDrawer

Responsável:

Minha Mesa

Pedidos

Conta

Histórico

Relacionamento

---

Checkout

Responsável:

finalização

Somente isso.

---

# 6. Filosofia das Stores

Cada store representa um domínio.

Nunca misturar domínios.

Exemplo:

useCart

somente carrinho

---

useOrderTracker

somente pedidos

---

useAccount

somente conta

---

useSession

somente sessão

---

useRestaurant

somente restaurante

---

useUser

somente cliente

---

# 7. Comunicação

Componentes:

não conhecem banco

↓

Stores

não conhecem interface

↓

Services

não conhecem React

↓

Supabase

↓

Database

---

# 8. Fluxo Cliente

Entrada

↓

Cardápio

↓

Produto

↓

Carrinho

↓

Checkout

↓

Pedido enviado

↓

Minha Mesa

↓

Acompanhamento

↓

Novo pedido

↓

Conta

↓

Pagamento

↓

Sessão encerrada

---

# 9. Fluxo Restaurante

Recebe pedido

↓

Fila

↓

Preparando

↓

Pronto

↓

Entregue

↓

Conta atualizada

↓

Pagamento

↓

Encerramento

---

# 10. Fluxo Admin

Login

↓

Dashboard

↓

Pedidos

↓

Produtos

↓

Categorias

↓

Mesas

↓

Financeiro

↓

Relatórios

↓

Configurações

---

# 11. Estados do Pedido

created

↓

confirmed

↓

preparing

↓

ready

↓

delivered

↓

closed

cancelled pode ocorrer em qualquer momento anterior ao delivered.

---

# 12. Estados da Conta

open

↓

partial

↓

requested

↓

closed

↓

paid

---

# 13. Estados da Sessão

created

↓

active

↓

waiting_payment

↓

finished

---

# 14. Minha Mesa

Minha Mesa é o centro da experiência.

Ela não pertence ao carrinho.

Ela é permanente durante toda a visita.

Contém:

Resumo

Pedidos

Conta

Histórico

Chamar garçom

Pedir conta

Pagamento

IA

Divisão

Fidelidade

---

# 15. Carrinho

Carrinho é temporário.

Serve apenas para preparar um novo pedido.

Após envio:

deve ser limpo.

Nunca armazenar histórico.

---

# 16. Regras de UI

Desktop:

painéis laterais

Mobile:

drawers

Tablet:

layout adaptativo

Nunca desenvolver pensando apenas em desktop.

O foco principal é mobile-first.

---

# 17. Regras para IA

Antes de implementar qualquer funcionalidade deve responder:

Qual domínio?

Qual store?

Qual componente?

Qual responsabilidade?

Existe algo semelhante?

Posso reutilizar?

Estou criando acoplamento?

Se alguma resposta for inadequada:

não implementar.

---

# 18. Convenções

Componentes:

PascalCase

Stores:

useNome

Hooks:

useNome

Interfaces:

PascalCase

Enums:

UPPER_CASE

Pastas:

lowercase

---

# 19. Estrutura Ideal

```
app/

components/

    cart/

    checkout/

    session/

    order/

    menu/

    account/

    admin/

lib/

    stores/

    services/

    utils/

    helpers/

types/

public/
```

---

# 20. Roadmap Arquitetural

Fase 1

✅ Cardápio

✅ Carrinho

✅ Checkout

---

Fase 2

Minha Mesa

Pedidos

Conta

Realtime

---

Fase 3

Pagamento

Pix

Conta compartilhada

---

Fase 4

IA

Recomendação

Upsell

CRM

---

Fase 5

Dashboard

Analytics

BI

---

Fase 6

Multi-restaurante

SaaS

Marketplace

---

# 21. Regra Suprema

Nenhuma implementação deve existir apenas porque funciona.

Ela deve existir porque possui arquitetura consistente.

Arquitetura primeiro.

Código depois.

Sempre.


Documentação técnica (docs/ ou ARCHITECTURE.md)
Vale registrar:

Fluxo da funcionalidade.
Como o frontend identifica a mesa.
Qual chave do localStorage é utilizada (parrilla-order-tracker).
Em quais eventos essa chave é criada, atualizada e removida.
Como ocorre a sincronização com o backend.