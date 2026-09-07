# STYLEGUIDE.md

# Parrilla Digital

## Style Guide Oficial do Projeto

Versão: 1.0

---

# Objetivo

Este documento define todas as regras visuais, arquiteturais e de escrita de código do projeto.

Toda implementação futura deve seguir este documento.

Caso exista conflito entre uma implementação e este documento, este documento possui prioridade.

---

# Filosofia

O sistema deve transmitir:

* Elegância
* Minimalismo
* Velocidade
* Sofisticação
* Experiência Premium

Nunca parecer um sistema administrativo.

Nunca parecer um e-commerce.

Nunca parecer um cardápio comum.

O usuário deve sentir que está utilizando uma experiência criada para restaurantes de alto padrão.

---

# Regra nº1

Uma tela = uma responsabilidade.

Exemplo:

Correto:

Menu

Carrinho

Minha Mesa

Checkout

Pagamento

Histórico

Cada um separado.

Errado:

Uma tela fazendo tudo.

---

# Regra nº2

Um componente = uma responsabilidade.

Nunca criar componentes gigantes.

Exemplo:

Errado

```
Checkout.tsx

1000 linhas
```

Correto

```
Checkout

├── Header
├── Items
├── Resume
├── Payment
├── Footer
```

---

# Regra nº3

Nenhum componente conhece outro domínio.

Exemplo:

Cart não conhece:

* Conta

* Garçom

* IA

* Pagamento

Session conhece apenas Session.

Checkout conhece apenas Checkout.

---

# Arquitetura Visual

Sempre utilizar:

```
Page

↓

Sections

↓

Components

↓

Atoms
```

Jamais:

```
Page

↓

500 linhas
```

---

# Layout

Desktop:

```
max-width

centralizado
```

Mobile:

```
100%
```

Sempre responsivo.

---

# Bordas

Preferência:

```
2px
```

ou

```
border-radius:

2px
```

Evitar:

```
20px

30px

50px
```

A identidade é mais reta.

---

# Sombras

Sombras discretas.

Nunca exageradas.

Exemplo:

```
0 4px 24px rgba(...)
```

Nunca:

```
0 20px 80px
```

---

# Espaçamento

Utilizar escala consistente:

```
4

8

12

16

20

24

32

40

48

64
```

Evitar:

```
13

17

19

27
```

---

# Tipografia

Hierarquia:

Título

22-32

Subtítulo

16-20

Texto

13-16

Legenda

11-12

---

# Peso

Normal:

400

Médio:

500

SemiBold:

600

Bold:

700

---

# Letras

Labels:

```
uppercase
```

com

```
letter-spacing
```

Exemplo:

```
PEDIDOS
```

---

# Cores

Principal:

```
var(--parrilla-red)
```

Texto:

```
var(--parrilla-text)
```

Secundário:

```
var(--parrilla-muted)
```

Surface:

```
var(--parrilla-surface)
```

Border:

```
var(--parrilla-border)
```

Accent:

```
var(--parrilla-ember)
```

Nunca usar cores hardcoded espalhadas.

Sempre utilizar tokens.

---

# Botões

Possuem:

hover

active

transition

cursor

Nunca botão sem feedback.

---

# Inputs

Devem possuir:

focus

hover

disabled

erro

loading

---

# Cards

Estrutura:

```
Imagem

↓

Título

↓

Descrição

↓

Preço

↓

Ação
```

---

# Ícones

Poucos.

Preferência:

Lucide

ou

emoji simples.

Nunca excesso.

---

# Animações

Curtas.

150ms

200ms

250ms

Máximo:

300ms

Nunca animações lentas.

---

# Drawers

Entram lateralmente.

Carrinho:

direita

Minha Mesa:

esquerda

Cada drawer representa um contexto diferente.

---

# Modais

Utilizados apenas para:

confirmações

alertas

ações críticas

Jamais para navegação.

---

# Loading

Preferência:

Skeleton

Evitar spinner infinito.

---

# Empty States

Sempre amigáveis.

Exemplo:

```
Nenhum pedido ainda.

Que tal experimentar nossas especialidades?
```

Nunca:

```
Lista vazia
```

---

# Toasts

Curtos.

Exemplo:

```
Pedido enviado.

Conta atualizada.

Garçom chamado.
```

Nunca textos enormes.

---

# Estados

Todo estado global deve ficar em Store.

Nunca prop drilling desnecessário.

---

# Stores

Uma responsabilidade por store.

Exemplo:

```
useCart

useSession

useOrders

useAccount

useAI
```

Nunca:

```
useEverything
```

---

# Componentes

Estrutura:

```
components

├── cart
├── session
├── checkout
├── menu
├── account
├── ai
├── waiter
```

---

# Comentários

Todo arquivo inicia com sua responsabilidade.

Exemplo:

```ts
// Responsabilidade:
// Exibir o carrinho.
// Não conhece checkout.
// Não conhece pagamentos.
```

---

# Imports

Primeiro:

bibliotecas

Depois:

internos

Depois:

tipos

Depois:

styles

---

# Nomeação

Componentes:

PascalCase

```
CartDrawer
```

Hooks:

camelCase

```
useCart
```

Stores:

```
useAccount
```

Arquivos:

Mesmo nome do componente.

---

# Código

Preferência:

clareza > inteligência.

Código simples vence código "esperto".

---

# Performance

Evitar:

renders desnecessários

estado duplicado

efeitos redundantes

polling constante

Preferir:

memoização quando necessária

Realtime

Stores desacopladas

---

# Experiência

O usuário nunca deve pensar:

"Onde está meu pedido?"

Ele sempre deve enxergar:

* Carrinho

* Minha Mesa

* Conta

* Status

de maneira intuitiva.

---

# Filosofia Final

Este projeto não é apenas um cardápio digital.

É um sistema operacional da experiência do cliente dentro do restaurante.

Toda decisão técnica deve responder uma pergunta:

> Isso melhora a experiência do cliente e torna o produto mais escalável?

Se a resposta for não, a implementação deve ser reconsiderada.
