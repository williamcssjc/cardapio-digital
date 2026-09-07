# ROADMAP.md

# CARDÁPIO DIGITAL

## Roadmap Oficial do Produto

Versão do documento: 1.0

---

# Missão

Transformar um simples cardápio digital em uma plataforma completa de experiência do cliente dentro do restaurante, conectando cliente, cozinha, atendimento, gestão e inteligência artificial em um único ecossistema.

---

# Visão de Longo Prazo

O cliente não utilizará apenas um cardápio.

Ele possuirá uma identidade digital dentro do restaurante, podendo:

* realizar pedidos;
* acompanhar o preparo;
* controlar sua conta;
* pagar;
* dividir despesas;
* chamar atendimento;
* conversar com uma IA;
* receber recomendações;
* participar de programas de fidelidade.

O sistema deverá evoluir até ser uma plataforma SaaS multi-restaurante.

---

# Princípios

Antes de adicionar funcionalidades, priorizar:

* arquitetura;
* desacoplamento;
* escalabilidade;
* reutilização;
* experiência do usuário;
* performance.

Nunca implementar funcionalidades apenas porque são interessantes.

Cada funcionalidade deve resolver um problema real.

---

# STATUS ATUAL

## Infraestrutura

* Estrutura inicial em Next.js
* Supabase integrado
* Organização inicial de componentes
* Uso de stores com Zustand

Status:

Em evolução

---

# V0.1 — Fundação

Objetivo:

Criar a base técnica do sistema.

## Entregas

* estrutura inicial
* organização de pastas
* integração Supabase
* categorias
* produtos
* renderização do cardápio

Status:

Concluído ou em fase final.

---

# V0.2 — Carrinho

Objetivo:

Permitir montagem do pedido.

## Entregas

* adicionar item
* remover item
* alterar quantidade
* cálculo automático
* botão de carrinho
* drawer do carrinho

Status:

Em evolução.

---

# V0.3 — Checkout

Objetivo:

Transformar carrinho em pedido.

## Entregas

* formulário
* identificação do cliente
* observações
* confirmação
* criação do pedido
* limpeza do carrinho

Status:

Em evolução.

---

# V0.4 — Minha Mesa

Objetivo:

Criar a central permanente da experiência do cliente.

## Entregas

* painel independente
* pedidos ativos
* pedidos entregues
* resumo financeiro
* identidade da sessão
* acesso permanente

Importante:

Minha Mesa NÃO pertence ao carrinho.

Ela representa toda a visita do cliente.

Prioridade:

Muito alta.

---

CONCLUIDO***

# V0.5 — Realtime

Objetivo:

Eliminar necessidade de atualização manual.

## Entregas

* atualização automática
* integração Supabase Realtime
* mudança instantânea de status
* sincronização entre cozinha e cliente

Status esperado:

Tempo real.

---

# V0.6 — Conta

Objetivo:

Mostrar tudo que o cliente consumiu.

## Entregas

* subtotal
* taxas
* pedidos
* histórico
* total atualizado
* situação da conta

---

# V0.7 — Atendimento

Objetivo:

Eliminar necessidade de procurar um funcionário.

## Entregas

* chamar garçom
* solicitar conta
* solicitar limpeza
* solicitar ajuda

---

# V0.8 — Pagamentos

Objetivo:

Permitir encerramento da experiência pelo próprio cliente.

## Entregas

* Pix
* cartão
* divisão da conta
* pagamento parcial
* comprovante

---

# V1.0 — MVP Comercial

Objetivo:

Primeira versão pronta para utilização real.

## Deve possuir

* cardápio
* carrinho
* checkout
* pedidos
* Minha Mesa
* conta
* realtime

Meta:

Primeiro restaurante utilizando o sistema.

---

# V2.0 — Inteligência Artificial

Objetivo:

Transformar a experiência em conversacional.

## Exemplos

* "Quero mais uma Coca."
* "Repete meu último pedido."
* "Qual carne combina com Malbec?"
* "Tenho alergia a amendoim."

A IA deverá compreender intenção, não apenas comandos.

---

# V3.0 — CRM

Objetivo:

Conhecer o cliente.

## Recursos

* histórico
* frequência
* preferências
* ticket médio
* favoritos

---

# V4.0 — Fidelização

Objetivo:

Incentivar retorno.

## Recursos

* pontos
* benefícios
* recompensas
* campanhas
* cashback

---

# V5.0 — Dashboard Gerencial

Objetivo:

Dar inteligência ao restaurante.

## Recursos

* vendas
* faturamento
* ticket médio
* horários de pico
* produtos mais vendidos
* desempenho

---

# V6.0 — Administração Completa

## Recursos

* categorias
* produtos
* mesas
* pedidos
* funcionários
* usuários
* permissões

---

# V7.0 — Multi Unidade

Objetivo:

Controlar várias lojas.

## Recursos

* matriz
* filiais
* estoque independente
* relatórios por unidade

---

# V8.0 — White Label

Objetivo:

Permitir venda para terceiros.

## Recursos

* identidade visual personalizada
* domínio próprio
* configurações por cliente
* parametrização

---

# V9.0 — SaaS

Objetivo:

Transformar o sistema em plataforma.

## Recursos

* cadastro de restaurantes
* planos
* cobrança recorrente
* onboarding
* painel administrativo global

---

# V10.0 — Plataforma de Experiência

Objetivo:

Ir além do cardápio.

## Possibilidades

* recomendações inteligentes
* integração com delivery
* reservas
* eventos
* clube de assinatura
* programa de fidelidade avançado
* assistente IA omnichannel

---

# Regras do Roadmap

1. Arquitetura sempre vem antes de funcionalidades.

2. Nenhuma funcionalidade deve gerar acoplamento desnecessário.

3. Refatorações fazem parte do projeto e são consideradas evolução.

4. O roadmap é um documento vivo e pode ser atualizado, desde que preserve a visão estratégica do produto.

5. O objetivo final não é criar um cardápio digital, mas uma plataforma tecnológica para gestão e experiência completa do cliente no restaurante.
