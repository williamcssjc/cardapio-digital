# CARDÁPIO DIGITAL

# Visão do Projeto

O Cardápio Digital não é apenas um sistema de pedidos.

Ele é uma plataforma de experiência do cliente dentro do restaurante.

O objetivo é transformar o celular do cliente no principal ponto de interação com o estabelecimento, eliminando atritos entre atendimento, pedidos, pagamento e relacionamento.

O projeto foi pensado desde o início para crescer até se tornar uma plataforma SaaS utilizada por milhares de restaurantes.

---

# Missão

Criar o sistema de autoatendimento mais inteligente, elegante e escalável do mercado.

O cliente deve conseguir fazer praticamente toda sua experiência sem depender de um garçom.

Enquanto isso, o restaurante ganha produtividade, redução de erros e dados estratégicos.

---

# Filosofia

Todo desenvolvimento segue quatro princípios:

- Simplicidade
- Escalabilidade
- Baixo acoplamento
- Alta coesão

Nenhum componente deve possuir responsabilidades que pertencem a outro componente.

---

# Objetivos

## Curto prazo

Construir um MVP funcional contendo:

- Cardápio
- Categorias
- Produtos
- Carrinho
- Checkout
- Envio do pedido
- Acompanhamento do pedido

---

## Médio prazo

Adicionar:

- Minha Mesa
- Conta parcial
- Histórico
- Realtime
- Chamar garçom
- Pedir conta

---

## Longo prazo

Transformar o sistema em uma plataforma completa contendo:

- IA integrada
- Pix
- Divisão de conta
- CRM
- Programa de fidelidade
- Dashboard gerencial
- Analytics
- Delivery
- Marketplace

---

# Stack

Frontend

- Next.js

- React

- TypeScript

Backend

- Supabase

Estado

- Zustand

Banco

- PostgreSQL

Deploy

- Vercel

---

# Estrutura

app/

components/

lib/

types/

public/

---

# Fluxo do Cliente

Entrada

↓

Visualiza cardápio

↓

Escolhe categoria

↓

Escolhe produto

↓

Adiciona ao carrinho

↓

Checkout

↓

Pedido enviado

↓

Minha Mesa

↓

Acompanha pedido

↓

Continua pedindo

↓

Solicita conta

↓

Pagamento

↓

Sessão encerrada

---

# Fluxo Restaurante

Pedido recebido

↓

Fila da cozinha

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

Mesa encerrada

---

# Princípios de desenvolvimento

Sempre:

Uma responsabilidade por componente

Uma responsabilidade por store

Código reutilizável

Código previsível

Código desacoplado

Nunca:

Criar componentes gigantes

Duplicar lógica

Acoplar stores

Misturar responsabilidades

---

# Convenções

Componentes:

PascalCase

Stores:

useNome

Hooks:

useAlgo

Tipos:

PascalCase

Pastas:

lowercase

---

# Roadmap

Consultar ROADMAP.md

---

# Arquitetura

Consultar ARCHITECTURE.md

---

# Decisões

Consultar DECISIONS.md

---

# Backlog

Consultar BACKLOG.md

---

# Regra máxima

Sempre pensar primeiro na arquitetura.

Depois implementar.

Nunca implementar primeiro para descobrir depois como deveria funcionar.

README.md (caso descreva funcionalidades)
Acrescente algo como:

Cliente pode acompanhar os pedidos da sua mesa.
Histórico atualizado em tempo real.
Estado persistido entre recarregamentos da página.
Rastreamento removido automaticamente quando a mesa é encerrada.