# CONTRIBUTING.md

# Contribuindo com o Projeto

Parrilla Digital

Versão 1.0

---

# Introdução

Este projeto é desenvolvido de forma colaborativa entre:

* Desenvolvedores humanos
* Inteligências artificiais
* Ferramentas de automação

Por esse motivo, existe um risco elevado de:

* Duplicação de código
* Criação de componentes redundantes
* Quebra de arquitetura
* Acoplamento excessivo
* Implementações conflitantes

Este documento existe para evitar esses problemas.

---

# Antes de Implementar Qualquer Coisa

Leia obrigatoriamente:

1. ARCHITECTURE.md
2. PRODUCT.md
3. STYLEGUIDE.md
4. DECISIONS.md
5. ROADMAP.md

Nenhuma implementação deve ser iniciada sem consultar esses documentos.

---

# Regra Fundamental

Antes de escrever código responda:

### O problema já possui solução?

Se sim:

Melhore a solução existente.

Não crie outra.

---

# Fluxo de Trabalho

Sempre seguir:

```text
Entender o problema

↓

Ler documentação

↓

Validar arquitetura

↓

Implementar

↓

Testar

↓

Documentar

↓

Commit
```

Nunca:

```text
Ideia

↓

Código

↓

Código

↓

Mais código

↓

Caos
```

---

# Responsabilidade Única

Cada arquivo deve possuir uma responsabilidade clara.

Exemplo:

Correto:

```text
CartDrawer

responsável apenas pelo carrinho
```

Errado:

```text
CartDrawer

carrinho
checkout
pedido
conta
garçom
pagamento
```

---

# Regra dos Domínios

O sistema é dividido em domínios.

---

## Menu

Responsável por:

* Categorias
* Produtos
* Navegação

Não conhece:

* Conta
* Pagamento
* IA

---

## Cart

Responsável por:

* Itens selecionados

Não conhece:

* Histórico
* Pagamento
* Conta

---

## Checkout

Responsável por:

* Confirmar pedido

Não conhece:

* Garçom
* IA
* CRM

---

## Session

Responsável por:

* Minha Mesa
* Histórico da visita
* Conta atual

Não conhece:

* Cardápio

---

## Account

Responsável por:

* Total consumido
* Pagamento
* Divisão de conta

---

## Waiter

Responsável por:

* Chamar garçom
* Solicitações

---

## AI

Responsável por:

* Recomendações
* Linguagem natural
* Assistência ao cliente

---

# Stores

Antes de criar uma store:

Pergunte:

### Já existe uma store que resolve isso?

Se existir:

Utilize.

Não crie outra.

---

## Exemplo correto

```text
useCart
useSession
useAccount
useOrders
```

---

## Exemplo incorreto

```text
useCart2
useNewCart
useCustomerCart
useTemporaryCart
```

---

# Componentes

Antes de criar um componente:

Pergunte:

### O componente já existe?

Se existir:

Reutilize.

---

# Tamanho Máximo

Se um componente passar de:

```text
300 linhas
```

Avaliar divisão.

Se passar de:

```text
500 linhas
```

Refatoração obrigatória.

---

# Comentários

Todo componente deve iniciar com:

```ts
// Responsabilidade:
// O que faz.
// O que NÃO faz.
```

Exemplo:

```ts
// Responsabilidade:
// Exibir os pedidos da sessão.
//
// Não conhece pagamento.
// Não conhece checkout.
```

---

# Nomenclatura

---

## Componentes

PascalCase

```text
CartDrawer
SessionButton
OrderCard
```

---

## Hooks

camelCase

```text
useCart
useSession
useOrders
```

---

## Stores

Sempre iniciar com:

```text
use
```

---

## Arquivos

Mesmo nome do componente.

```text
SessionDrawer.tsx
```

---

# Estilo de Código

Prioridade:

```text
Legibilidade
↓
Manutenção
↓
Performance
↓
Elegância
```

Nunca o contrário.

---

# Performance

Evitar:

* Estados duplicados
* Re-renderizações desnecessárias
* Polling constante
* Queries repetidas

Preferir:

* Zustand
* Realtime
* Cache
* Computações derivadas

---

# Pull Requests

Todo PR deve responder:

## O que foi feito?

## Por que foi feito?

## Qual problema resolve?

## Impacta outro domínio?

## Há riscos?

---

# Commits

Formato recomendado:

```text
feat(cart): adiciona contador de itens

fix(session): corrige atualização da conta

refactor(checkout): separa lógica de validação

docs(architecture): atualiza fluxo da sessão
```

---

# Quando Refatorar

Refatoração é obrigatória quando:

* Existe duplicação
* Existe acoplamento excessivo
* Existe complexidade desnecessária
* Existe quebra da arquitetura

---

# Quando NÃO Refatorar

Não refatorar apenas porque:

```text
"Existe um jeito mais bonito"
```

Arquitetura estável vale mais que perfeição estética.

---

# Inteligências Artificiais

Toda IA deve:

1. Ler a documentação primeiro
2. Respeitar decisões existentes
3. Evitar recriar estruturas
4. Justificar mudanças arquiteturais

Uma IA nunca deve:

* Criar novas stores sem necessidade
* Criar componentes duplicados
* Ignorar decisões registradas
* Introduzir tecnologias não aprovadas

---

# Processo para Grandes Mudanças

Mudanças que impactam arquitetura devem seguir:

```text
Problema

↓

Proposta

↓

Análise

↓

Decisão

↓

Registro em DECISIONS.md

↓

Implementação
```

Nunca implementar primeiro e pensar depois.

---

# Filosofia do Projeto

O objetivo não é apenas entregar funcionalidades.

O objetivo é construir um produto sustentável por anos.

Toda contribuição deve melhorar pelo menos um destes pilares:

* Experiência do cliente
* Experiência do restaurante
* Escalabilidade
* Manutenibilidade
* Receita

Se não melhorar nenhum deles, a implementação deve ser questionada.

---

# Regra Final

Antes de qualquer alteração, faça a pergunta:

"Isso aproxima o Parrilla Digital da visão de se tornar o sistema operacional da experiência do cliente dentro do restaurante?"

Se a resposta for sim:

Prossiga.

Se a resposta for não:

Reavalie a implementação.
