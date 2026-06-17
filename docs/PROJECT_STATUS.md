# PROJECT_STATUS.md

# Parrilla Digital

## Status Atual do Projeto

Última atualização: 15/Junho/2026

---

# Visão Geral

Parrilla Digital é uma plataforma de atendimento digital para restaurantes baseada em QR Code.

O cliente acessa o cardápio pelo celular, realiza pedidos sem depender do garçom e acompanha toda sua experiência através da área "Minha Mesa".

O objetivo é reduzir atrito operacional, aumentar ticket médio e melhorar a experiência do cliente.

---

# Status Geral

MVP: Em desenvolvimento

Progresso estimado: 60%

Arquitetura: Definida

Documentação: Estruturada

Banco de dados: Parcialmente implementado

Fluxo principal: Em estabilização

---

# O Que Já Foi Concluído

## Estrutura Base

* Next.js App Router
* TypeScript
* Supabase
* Zustand
* Estrutura inicial de componentes
* Organização inicial de stores

---

## Cardápio

Status: Concluído

Implementado:

* Categorias
* Produtos
* Preços
* Imagens
* Navegação por categorias

---

## Carrinho

Status: Concluído

Implementado:

* Adicionar item
* Remover item
* Alterar quantidade
* Cálculo automático do total

Observação:

Recentemente houve uma migração para:

```text
lib/stores/useCart.ts
```

Existiam duas versões do useCart.

A versão antiga deve ser removida após validação completa.

---

## Checkout

Status: Parcialmente concluído

Implementado:

* Fluxo de finalização
* Integração com stores
* Limpeza do carrinho após envio

Necessita:

* Validação completa do fluxo

---

## Pedidos

Status: Parcialmente concluído

Implementado:

* Criação de pedidos
* Store de pedidos
* Rastreamento inicial

Necessita:

* Realtime Supabase
* Atualização automática de status

---

## Documentação

Status: Concluída

Arquivos criados:

* README
* ARCHITECTURE
* MVP_SCOPE
* ROADMAP
* BACKLOG
* DATABASE
* STORES
* API
* AI
* STYLEGUIDE
* CONTRIBUTING
* USER_FLOWS
* ADRs

---

# Decisões Arquiteturais Ativas

ADR-001

Next.js + Supabase

---

ADR-002

Zustand para gerenciamento de estado

---

ADR-003

Separação entre:

CartDrawer

e

Minha Mesa (SessionDrawer)

---

# Onde Estamos Agora

Estamos realizando a transição de:

```text
CartDrawer
    +
Pedidos
```

para

```text
CartDrawer

responsável apenas pelo carrinho
```

e

```text
Minha Mesa

responsável pela sessão do cliente
```

Essa é atualmente a principal refatoração em andamento.

---

# Problemas Identificados

## Problema 01

Existência de dois useCart.

Situação:

Resolvido parcialmente.

Necessário validar que todo o projeto utiliza:

```text
lib/stores/useCart.ts
```

---

## Problema 02

Mistura de responsabilidades.

Situação:

Em correção.

Antes:

CartDrawer também era responsável pelos pedidos.

Agora:

Minha Mesa será um módulo independente.

---

## Problema 03

Erros de Server Components e Client Components.

Situação:

Em correção.

Problemas encontrados:

* onMouseEnter em Server Component
* onMouseLeave em Server Component
* abertura de drawers compartilhando estado incorretamente

Necessário revisar arquitetura dos componentes interativos.

---

# Funcionalidades Em Desenvolvimento

## Minha Mesa

Status:

Em desenvolvimento

Objetivo:

Centralizar toda a experiência da visita.

Conteúdo previsto:

* Pedidos ativos
* Pedidos entregues
* Resumo da conta
* Histórico da sessão

---

## SessionButton

Status:

Em desenvolvimento

Objetivo:

Substituir a dependência do CartDrawer para acesso aos pedidos.

---

## SessionDrawer

Status:

Em desenvolvimento

Objetivo:

Criar painel independente da visita.

---

# Próxima Prioridade

Prioridade máxima:

Estabilizar o fluxo principal do MVP.

Fluxo:

```text
Cliente acessa cardápio

↓

Adiciona itens

↓

Abre carrinho

↓

Finaliza pedido

↓

Pedido é criado

↓

Minha Mesa aparece

↓

Cliente acompanha pedido
```

---

# O Que NÃO Deve Ser Feito Agora

Não iniciar:

* Pagamento Pix
* Divisão de conta
* Fidelidade
* CRM
* IA conversacional
* Programa de pontos
* Multi-restaurante

Essas funcionalidades pertencem a fases futuras.

---

# Critério Atual de Sucesso

Consideraremos esta etapa concluída quando:

* Carrinho funcionar sem bugs
* Checkout funcionar sem bugs
* Pedido for criado corretamente
* Minha Mesa funcionar separadamente
* SessionDrawer substituir completamente o sistema antigo

---

# Próximo Marco

Marco:

MVP Flow Complete

Definição:

Todo o fluxo principal funcionando do início ao fim sem erros.

Cardápio

↓

Carrinho

↓

Checkout

↓

Pedido

↓

Minha Mesa

Quando esse marco for atingido, iniciaremos a implementação de Realtime via Supabase.

---

# Regra Operacional

Antes de iniciar qualquer tarefa:

1. Ler PROJECT_STATUS.md
2. Ler ARCHITECTURE.md
3. Ler MVP_SCOPE.md
4. Verificar ROADMAP.md
5. Implementar apenas o necessário para o estágio atual do produto

Objetivo:

Evitar crescimento descontrolado do escopo e manter foco na entrega 
do MVP.


## Minha Mesa

### Persistência

O frontend utiliza a chave `parrilla-order-tracker` no `localStorage`
para manter o vínculo entre o dispositivo do cliente e a mesa acompanhada.

### Limpeza

A chave é removida automaticamente quando:
- a conta é encerrada;
- a mesa é finalizada;
- o backend informa que a sessão não é mais válida.

Isso evita que um cliente continue visualizando pedidos de uma mesa já encerrada.


minha mesa concluido*