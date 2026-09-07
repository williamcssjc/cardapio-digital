# AI.md

# Inteligência Artificial do Projeto

## Filosofia

Este projeto é desenvolvido em conjunto por humanos e inteligências artificiais.

As IAs NÃO são autoras do produto.

As IAs são engenheiros auxiliares.

Toda decisão arquitetural pertence à arquitetura oficial do projeto.

---

# Objetivo das IAs

As IAs existem para acelerar:

* desenvolvimento;
* refatoração;
* documentação;
* testes;
* brainstorming;
* análise de código;
* análise de performance;
* geração de componentes;
* geração de SQL;
* geração de APIs.

Nunca para alterar a visão do produto.

---

# Regra número 1

Antes de escrever qualquer linha de código, a IA deve considerar obrigatoriamente:

* ARCHITECTURE.md
* PRODUCT.md
* BUSINESS.md
* ROADMAP.md
* BACKLOG.md
* DECISIONS.md
* DATABASE.md
* STORES.md
* API.md

Caso exista conflito entre arquivos, prevalece:

ARCHITECTURE → PRODUCT → DECISIONS → restante.

---

# A IA nunca deve

## Nunca criar arquitetura paralela

Errado:

```
useCart antigo

+

novo useCart
```

Correto:

```
refatorar o existente
```

---

## Nunca duplicar responsabilidades

Errado:

```
2 stores iguais

2 componentes iguais

2 APIs iguais
```

Correto:

```
uma responsabilidade

um componente

uma store
```

---

## Nunca criar código temporário

É proibido:

* gambiarra;
* workaround permanente;
* TODO eterno;
* solução improvisada.

Se precisar de solução temporária:

Ela deve estar explicitamente documentada.

---

## Nunca alterar comportamento sem motivo

Mudanças devem possuir:

* justificativa;
* impacto;
* benefício;
* compatibilidade.

---

## Nunca quebrar responsabilidades

Exemplo:

CartDrawer:

Responsabilidade:

```
Carrinho
```

Ele não deve controlar:

* pagamentos;
* sessão;
* histórico;
* IA;
* conta.

---

# Single Responsibility

Cada componente deve fazer apenas uma coisa.

Exemplo:

```
CartButton

↓

abre carrinho
```

Não:

```
abre carrinho

abre sessão

controla pedido

controla pagamento
```

---

# Stores

Toda store representa um domínio.

Exemplo:

```
useCart

↓

itens do carrinho
```

```
useOrderTracker

↓

pedidos
```

```
useAccount

↓

conta financeira
```

Nunca misturar estados.

---

# Componentes

Cada componente deve possuir:

Responsabilidade única.

Exemplo:

```
OrderCard

↓

mostrar pedido
```

Não:

```
mostrar pedido

editar pedido

cancelar pedido

abrir pagamento
```

---

# Regras de criação

Antes de criar um arquivo, perguntar:

Existe um semelhante?

Se existir:

refatorar.

Não criar outro.

---

# Fluxo correto

Problema

↓

Análise

↓

Arquitetura

↓

Implementação

↓

Teste

↓

Refatoração

↓

Documentação

Nunca:

Problema

↓

100 arquivos

↓

depois pensar

---

# Código

Prioridades:

1. legibilidade

2. escalabilidade

3. performance

4. otimização

Código bonito perde para código simples.

---

# Performance

Preferir:

* Server Components
* streaming
* cache
* suspense
* lazy loading

Evitar:

* renders desnecessários
* estados duplicados
* contextos gigantes
* props infinitas

---

# UI

Toda interface deve seguir:

Minimalismo

↓

Clareza

↓

Velocidade

↓

Consistência

Nunca excesso de elementos.

---

# UX

O usuário deve pensar:

"Isso é óbvio."

Jamais:

"Onde fica isso?"

---

# Mobile First

O projeto é pensado primeiro para:

Celular

Depois:

Tablet

Depois:

Desktop

Desktop não deve definir arquitetura.

---

# Escalabilidade

Toda decisão deve considerar que futuramente existirão:

* milhares de restaurantes;
* milhares de mesas;
* milhares de pedidos simultâneos;
* múltiplos idiomas;
* múltiplas moedas;
* múltiplos países.

---

# Banco

As IAs não devem criar tabelas redundantes.

Sempre analisar:

* normalização;
* índices;
* relacionamentos;
* escalabilidade.

---

# APIs

Devem ser:

* pequenas;
* previsíveis;
* reutilizáveis;
* independentes.

---

# IA Conversacional

No futuro existirá:

```
Cliente

↓

IA

↓

Sistema
```

Exemplo:

"Quero mais uma Coca."

IA interpreta.

IA cria pedido.

Sistema executa.

Portanto toda arquitetura deve permitir essa evolução.

---

# Processo de desenvolvimento

Sempre seguir:

Analisar

↓

Planejar

↓

Implementar

↓

Testar

↓

Refatorar

↓

Documentar

Nunca implementar primeiro.

---

# Quando houver dúvida

A IA deve preferir:

* perguntar;
* explicar;
* propor alternativas.

Nunca assumir.

---

# Objetivo final

Construir o melhor sistema de atendimento para restaurantes do Brasil, com arquitetura modular, escalável, orientada a domínio e preparada para integração com Inteligência Artificial, pagamentos digitais e expansão internacional.

Toda decisão deve aproximar o projeto desse objetivo.
