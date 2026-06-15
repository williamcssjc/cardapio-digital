# USER_FLOWS.md

# Parrilla Digital

## Fluxos Oficiais do Sistema

Versão 1.0

---

# Objetivo

Este documento define todos os fluxos de utilização do sistema.

Toda funcionalidade futura deve encaixar em algum fluxo existente.

Caso um novo fluxo seja criado, este documento deve ser atualizado.

---

# Usuários do Sistema

O sistema possui quatro perfis principais:

```text
Cliente

↓

Garçom

↓

Cozinha

↓

Administrador
```

---

# Fluxo 01

# Cliente - Primeiro Acesso

Objetivo:

Permitir que um cliente faça um pedido sem precisar baixar aplicativo.

---

## Jornada

```text
Cliente senta na mesa

↓

Escaneia QR Code

↓

Abre o cardápio

↓

Visualiza categorias

↓

Visualiza produtos

↓

Adiciona ao carrinho

↓

Finaliza pedido

↓

Pedido enviado
```

---

## Resultado Esperado

O cliente consegue fazer seu primeiro pedido em menos de 2 minutos.

---

# Fluxo 02

# Cliente - Adicionar Produtos

Objetivo:

Montar o carrinho.

---

## Jornada

```text
Abrir cardápio

↓

Escolher categoria

↓

Escolher item

↓

Adicionar

↓

Carrinho atualizado

↓

Continuar navegando
```

---

## Regras

O cliente pode:

* adicionar
* remover
* aumentar quantidade
* diminuir quantidade

Sem recarregar a página.

---

# Fluxo 03

# Cliente - Checkout

Objetivo:

Enviar pedido para o restaurante.

---

## Jornada

```text
Carrinho

↓

Continuar

↓

Checkout

↓

Confirmar pedido

↓

Criar Order

↓

Limpar carrinho

↓

Abrir sessão da mesa
```

---

## Resultado

Pedido registrado.

---

# Fluxo 04

# Cliente - Minha Mesa

Objetivo:

Acompanhar toda a experiência.

---

## Jornada

```text
Pedido enviado

↓

Botão Minha Mesa aparece

↓

Cliente abre painel

↓

Visualiza pedidos

↓

Visualiza conta

↓

Visualiza histórico
```

---

## Informações exibidas

Pedidos ativos

Pedidos entregues

Total consumido

Status da conta

Ações disponíveis

---

# Fluxo 05

# Cliente - Acompanhar Pedido

Objetivo:

Eliminar dúvidas.

---

## Jornada

```text
Minha Mesa

↓

Pedido

↓

Status
```

---

## Estados

```text
Recebido

↓

Em preparo

↓

Pronto

↓

Entregue
```

---

## Futuro

Realtime via Supabase.

Sem refresh.

Sem polling.

---

# Fluxo 06

# Cliente - Fazer Novo Pedido

Objetivo:

Permitir múltiplos pedidos.

---

## Jornada

```text
Pedido em andamento

↓

Voltar ao cardápio

↓

Adicionar novos itens

↓

Novo checkout

↓

Novo pedido criado
```

---

## Regra

Uma sessão pode possuir vários pedidos.

---

# Fluxo 07

# Cliente - Chamar Garçom

Fase futura.

---

## Jornada

```text
Minha Mesa

↓

Chamar Garçom

↓

Confirmação

↓

Notificação restaurante
```

---

## Status

Planejado.

---

# Fluxo 08

# Cliente - Pedir Conta

Fase futura.

---

## Jornada

```text
Minha Mesa

↓

Pedir Conta

↓

Conta gerada

↓

Restaurante notificado
```

---

# Resultado

Conta pronta para pagamento.

---

# Fluxo 09

# Cliente - Pagamento PIX

Fase futura.

---

## Jornada

```text
Minha Mesa

↓

Pagar

↓

Gerar PIX

↓

Pagamento

↓

Confirmação
```

---

## Resultado

Conta encerrada.

---

# Fluxo 10

# Cliente - Dividir Conta

Fase futura.

---

## Jornada

```text
Minha Mesa

↓

Dividir Conta

↓

Selecionar participantes

↓

Calcular valores

↓

Pagamento individual
```

---

# Fluxo 11

# Cliente - Assistente IA

Fase futura.

---

## Jornada

```text
Minha Mesa

↓

Abrir IA

↓

Digitar pedido

↓

IA interpreta

↓

Confirmação

↓

Pedido criado
```

---

## Exemplos

```text
Quero mais uma Coca.

Me traz outra porção.

Repete meu último pedido.

O que combina com essa carne?
```

---

# Fluxo 12

# Garçom

Objetivo:

Acompanhar solicitações.

---

## Jornada

```text
Novo pedido

↓

Notificação

↓

Visualizar mesa

↓

Entregar
```

---

## Futuro

Painel operacional.

---

# Fluxo 13

# Cozinha

Objetivo:

Produção.

---

## Jornada

```text
Pedido recebido

↓

Fila de preparo

↓

Preparando

↓

Pronto

↓

Entregue
```

---

## Estados

```text
pending

preparing

ready

delivered
```

---

# Fluxo 14

# Administrador

Objetivo:

Gerenciar restaurante.

---

## Jornada

```text
Login

↓

Dashboard

↓

Categorias

↓

Produtos

↓

Pedidos

↓

Relatórios
```

---

# Fluxo 15

# Gestão de Cardápio

Administrador.

---

## Jornada

```text
Criar categoria

↓

Criar produto

↓

Definir preço

↓

Publicar
```

---

# Fluxo 16

# Gestão de Pedidos

Administrador.

---

## Jornada

```text
Pedido recebido

↓

Atualizar status

↓

Finalizar
```

---

# Fluxo 17

# Encerramento da Sessão

Objetivo:

Finalizar experiência.

---

## Jornada

```text
Conta paga

↓

Sessão encerrada

↓

Histórico salvo

↓

Mesa liberada
```

---

# Fluxos MVP

Entram na V1:

✅ Primeiro acesso

✅ Cardápio

✅ Carrinho

✅ Checkout

✅ Pedidos

✅ Minha Mesa

✅ Histórico da visita

---

# Fluxos Pós MVP

Entram depois:

⏳ Chamar garçom

⏳ Pedir conta

⏳ PIX

⏳ Divisão de conta

⏳ IA

⏳ CRM

⏳ Fidelidade

⏳ Recomendação inteligente

---

# Regra Final

Nenhuma funcionalidade deve ser implementada sem estar vinculada a um fluxo definido neste documento.

Fluxos dirigem funcionalidades.

Não o contrário.
