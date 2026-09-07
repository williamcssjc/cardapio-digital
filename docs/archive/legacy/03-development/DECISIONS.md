# DECISIONS.md

# Registro Oficial de Decisões Arquiteturais

Projeto: Cardápio Digital +54

Versão: 1.0

Status: Documento Vivo

---

# Objetivo

Este documento registra todas as decisões importantes tomadas durante o desenvolvimento.

Sua função é impedir regressões arquiteturais, perda de contexto e mudanças arbitrárias.

Toda alteração estrutural deve ser adicionada aqui.

---

# Princípios do projeto

O projeto foi criado seguindo cinco pilares:

* Simplicidade
* Escalabilidade
* Separação de responsabilidades
* Experiência do usuário
* Inteligência Artificial como diferencial

Qualquer decisão futura deve respeitar esses pilares.

---

# DECISÃO 001

## O projeto não é um cardápio digital.

Ele é uma plataforma operacional para restaurantes.

O cardápio é apenas uma funcionalidade.

---

# DECISÃO 002

## Mobile First

Toda experiência será pensada primeiro para celular.

Depois será adaptada para desktop.

Nunca o contrário.

---

# DECISÃO 003

## UX acima da tecnologia

Nenhuma tecnologia será utilizada apenas porque é moderna.

Toda escolha deve melhorar a experiência do usuário.

---

# DECISÃO 004

## Componentes possuem responsabilidade única

Cada componente deve fazer apenas uma função.

Exemplo:

Errado:

CartDrawer

* carrinho
* pedidos
* conta
* pagamento
* histórico

Correto:

CartDrawer

↓

apenas carrinho

SessionDrawer

↓

apenas sessão do cliente

Checkout

↓

apenas checkout

OrderTracker

↓

apenas pedidos

---

# DECISÃO 005

## Stores não conhecem outras stores

Cada store é independente.

Exemplo:

useCart

não conhece

useSession

não conhece

useOrderTracker

não conhece

A comunicação ocorre pela camada de aplicação.

---

# DECISÃO 006

## O carrinho é temporário

Carrinho representa intenção.

Pedido representa compromisso.

Depois do envio:

Carrinho

↓

zera

Pedido

↓

continua existindo

---

# DECISÃO 007

## Pedido nunca volta para o carrinho

Depois enviado:

não editar

não remover

não voltar

Apenas novos pedidos.

---

# DECISÃO 008

## Minha Mesa será o centro do sistema

O cliente deve possuir uma área própria.

Ela concentrará:

* pedidos
* histórico
* consumo
* pagamento
* chamar garçom
* dividir conta
* PIX
* IA
* avaliações

Ela não depende do carrinho.

---

# DECISÃO 009

## Carrinho e Minha Mesa são entidades diferentes

Carrinho:

"quero comprar"

Minha Mesa:

"quero acompanhar minha experiência"

Misturar ambos gera confusão.

---

# DECISÃO 010

## Drawers independentes

CartDrawer

abre pela direita

SessionDrawer

abre pela esquerda

Cada um possui ciclo de vida próprio.

---

# DECISÃO 011

## Botão Minha Mesa persiste

Após o primeiro pedido:

o botão permanece disponível.

Mesmo com carrinho vazio.

---

# DECISÃO 012

## O botão Minha Mesa evoluirá

Hoje:

abre sessão

No futuro:

* conta
* pagamento
* pedidos
* IA
* cashback
* fidelidade
* notificações

---

# DECISÃO 013

## O botão Ver Pedido representa apenas o carrinho

Ele desaparece quando:

itens = 0

Ele nunca será usado para abrir histórico.

---

# DECISÃO 014

## Fluxo correto

Adicionar item

↓

Carrinho

↓

Checkout

↓

Pedido

↓

Minha Mesa

---

# DECISÃO 015

## IA é parte do produto

A IA não será um chatbot decorativo.

Ela será um agente operacional.

---

# DECISÃO 016

## IA deve vender

Exemplos:

"quer adicionar fritas?"

"esse vinho harmoniza"

"sobremesa mais pedida"

---

# DECISÃO 017

## IA deve conhecer contexto

Ela considera:

mesa

horário

pedidos

histórico

tempo

consumo

---

# DECISÃO 018

## Realtime sempre que possível

Evitar refresh.

Evitar polling.

Preferência:

Supabase Realtime

---

# DECISÃO 019

## Backend é a fonte da verdade

Frontend apenas representa estado.

---

# DECISÃO 020

## Banco preparado para expansão

O banco deve suportar:

uma mesa

várias mesas

vários restaurantes

white label

franquias

---

# DECISÃO 021

## White Label desde o início

Nenhuma regra pode depender do nome "+54".

Tudo deve ser configurável.

---

# DECISÃO 022

## Não criar componentes gigantes

Se um componente ultrapassa aproximadamente 300 linhas:

avaliar divisão.

---

# DECISÃO 023

## Não duplicar lógica

Se duas telas fazem a mesma coisa:

extrair componente.

---

# DECISÃO 024

## Não duplicar stores

Existe apenas uma store oficial para cada domínio.

Exemplo:

um único useCart.

Nunca dois useCart diferentes.

---

# DECISÃO 025

## Não criar código temporário

Evitar:

TODO gigante

gambiarras

fix rápido permanente

Todo código novo deve ser pensado para permanecer.

---

# DECISÃO 026

## Documentação faz parte do software

Código sem documentação é considerado incompleto.

---

# DECISÃO 027

## Antes de implementar

Perguntar:

Isso resolve um problema?

Isso escala?

Isso simplifica?

Isso melhora UX?

---

# DECISÃO 028

## Antes de aceitar sugestão de outra IA

Verificar:

Arquitetura

Escalabilidade

Acoplamento

Duplicação

Consistência

Se falhar em qualquer ponto:

não implementar imediatamente.

---

# DECISÃO 029

## Este documento é soberano

Em caso de conflito entre:

* conversa
* memória
* comentário
* código
* sugestão

prevalece este documento até decisão oficial posterior.

---

# DECISÃO 030

## Filosofia final

Não estamos construindo um cardápio.

Estamos construindo uma plataforma inteligente para restaurantes, preparada para operar milhares de estabelecimentos e evoluir continuamente sem perder consistência arquitetural.
