# MVP_SCOPE.md

# Parrilla Digital

## Escopo Oficial da Versão 1.0

Versão 1.0

---

# Objetivo

Definir exatamente:

* O que entra na V1
* O que NÃO entra na V1
* O que entra depois

Este documento existe para impedir crescimento descontrolado do escopo.

---

# Regra Principal

Se uma funcionalidade não está listada neste documento:

Ela NÃO faz parte da V1.

---

# O Que é o MVP

MVP significa:

Minimum Viable Product

Ou seja:

A menor versão possível do produto capaz de gerar valor real para um restaurante.

---

# Objetivo do MVP

Permitir que um cliente:

```text
Sente na mesa

↓

Escaneie QR Code

↓

Visualize o cardápio

↓

Faça pedidos

↓

Acompanhe pedidos

↓

Visualize sua conta parcial
```

Sem depender do garçom.

---

# Problema Que Estamos Resolvendo

Hoje:

* garçom leva cardápio
* cliente espera atendimento
* cliente espera para pedir
* cliente espera para pedir novamente
* cliente espera para pedir conta

Existem muitos pontos de atrito.

O MVP reduz esse atrito.

---

# Funcionalidades Obrigatórias

Estas funcionalidades precisam existir para considerar a V1 concluída.

---

# 1. Cardápio Digital

Status:

Obrigatório

---

## Requisitos

Categorias

Produtos

Descrição

Preço

Imagem

Navegação rápida

---

# 2. Carrinho

Status:

Obrigatório

---

## Requisitos

Adicionar item

Remover item

Alterar quantidade

Visualizar total

Persistência durante a sessão

---

# 3. Checkout

Status:

Obrigatório

---

## Requisitos

Confirmar pedido

Enviar pedido

Gerar Order

Limpar carrinho após envio

---

# 4. Gestão de Pedidos

Status:

Obrigatório

---

## Requisitos

Criar pedido

Listar pedidos

Atualizar status

Histórico da sessão

---

# 5. Minha Mesa

Status:

Obrigatório

---

## Requisitos

Painel independente

Pedidos em andamento

Pedidos entregues

Resumo da conta

Histórico da visita

---

# 6. Conta Parcial

Status:

Obrigatório

---

## Requisitos

Somar pedidos

Exibir consumo

Atualizar automaticamente

---

# 7. Sessão da Mesa

Status:

Obrigatório

---

## Requisitos

Identificar visita

Relacionar pedidos

Manter histórico da sessão

---

# 8. Dashboard Restaurante

Status:

Obrigatório

---

## Requisitos

Visualizar pedidos

Atualizar status

Gerenciar cardápio

---

# 9. Banco de Dados

Status:

Obrigatório

---

## Tabelas mínimas

restaurants

categories

menu_items

sessions

orders

order_items

---

# 10. Responsividade

Status:

Obrigatório

---

## Requisitos

Mobile

Tablet

Desktop

---

# Funcionalidades Desejáveis

Entram na V1 apenas se o núcleo estiver pronto.

---

# Realtime

Prioridade:

Alta

---

## Objetivo

Atualizar status sem refresh.

---

# Notificações

Prioridade:

Média

---

## Objetivo

Informar mudanças de status.

---

# Histórico de Pedidos

Prioridade:

Alta

---

## Objetivo

Mostrar tudo que foi consumido na visita.

---

# Fora do Escopo da V1

Estas funcionalidades NÃO devem ser implementadas agora.

Mesmo que pareçam importantes.

---

# Chamar Garçom

Motivo:

Pode ser feito manualmente.

---

# Pedir Conta

Motivo:

Não bloqueia validação do produto.

---

# Pagamento PIX

Motivo:

Complexidade financeira.

---

# Cartão

Motivo:

Integração desnecessária no MVP.

---

# Dividir Conta

Motivo:

Complexidade alta.

---

# Fidelidade

Motivo:

Necessita usuários recorrentes.

---

# CRM

Motivo:

Necessita base de clientes.

---

# Marketing

Motivo:

Ainda não há produto validado.

---

# IA Conversacional

Motivo:

Não resolve o problema principal agora.

---

# Recomendação Inteligente

Motivo:

Necessita dados históricos.

---

# Upsell Inteligente

Motivo:

Depende da IA.

---

# App Mobile

Motivo:

Web resolve.

---

# Programa de Assinatura

Motivo:

Prematuro.

---

# Multi Restaurante

Motivo:

Validar primeiro em um.

---

# Multi Idioma

Motivo:

Não é gargalo atual.

---

# Critério de Conclusão da V1

A V1 estará concluída quando:

---

## Cliente

Conseguir:

* abrir cardápio
* montar pedido
* enviar pedido
* acompanhar pedido
* visualizar conta

---

## Restaurante

Conseguir:

* receber pedido
* atualizar status
* visualizar pedidos

---

## Sistema

Conseguir:

* armazenar dados
* recuperar dados
* manter sessão

---

# Métrica de Sucesso

A V1 será considerada validada quando:

Um restaurante conseguir operar durante um serviço real utilizando o sistema.

---

# Regra de Ouro

Sempre perguntar:

"Essa funcionalidade é necessária para que um restaurante consiga usar o Parrilla Digital hoje?"

Se a resposta for:

SIM

Ela pode entrar na V1.

Se a resposta for:

NÃO

Ela vai para o ROADMAP ou BACKLOG.

---

# Visão

O MVP não é o produto final.

O MVP é apenas a primeira ponte.

O objetivo da V1 é provar que clientes desejam pedir pelo celular e que restaurantes conseguem operar através da plataforma.

Todo o restante será construído sobre essa fundação.
