# BACKLOG.md

# CARDÁPIO DIGITAL

## Banco Oficial de Funcionalidades

Versão: 1.0

---

# Objetivo

O BACKLOG representa todas as ideias do projeto.

Ele NÃO representa o que será feito agora.

Ele representa tudo que poderá existir no sistema futuramente.

Nenhuma ideia deve ser descartada sem análise.

---

# Status das tarefas

* Não iniciada
* Em análise
* Planejada
* Em desenvolvimento
* Em testes
* Concluída
* Arquivada

---

# PRIORIDADE MÁXIMA (P0)

## Arquitetura

* Separar Carrinho de Minha Mesa
* Eliminar dependências entre componentes
* Eliminar stores duplicadas
* Padronizar nomenclaturas
* Criar camada Services
* Criar camada Utils
* Criar camada Helpers
* Criar arquitetura escalável
* Revisar estrutura completa do projeto
* Criar testes arquiteturais

---

## Carrinho

* adicionar item
* remover item
* aumentar quantidade
* diminuir quantidade
* limpar carrinho
* cálculo automático
* persistência temporária
* animações
* indicador de quantidade
* indicador financeiro

---

## Checkout

* validação
* observações
* confirmação
* revisão
* loading
* prevenção de envio duplicado
* feedback visual
* tratamento de erros

---

## Minha Mesa

* painel independente
* pedidos ativos
* pedidos entregues
* pedidos cancelados
* resumo financeiro
* total consumido
* horário da sessão
* status da mesa
* identificação do cliente
* atualização automática

---

## Realtime

* atualização automática
* websocket
* Supabase Realtime
* sincronização cozinha
* sincronização garçom
* sincronização cliente
* atualização instantânea

---

# PRIORIDADE ALTA (P1)

## Conta

* subtotal
* total
* taxa
* descontos
* gorjeta
* histórico financeiro
* fechamento
* pagamento parcial
* pagamento integral

---

## Atendimento

* chamar garçom
* pedir conta
* pedir ajuda
* solicitar limpeza
* solicitar reposição
* solicitar talheres
* solicitar guardanapos

---

## Pagamentos

* Pix

* Cartão

* Dinheiro

* Carteira digital

* QR Code

* comprovante

* divisão de conta

* múltiplos pagadores

---

## Histórico

* histórico da visita

* pedidos antigos

* itens favoritos

* frequência

* ticket médio

---

# PRIORIDADE MÉDIA (P2)

## Cliente

* login opcional

* perfil

* avatar

* preferências

* restrições alimentares

* idiomas

---

## Produtos

* favoritos

* avaliações

* comentários

* fotos

* vídeos

* ingredientes

* tabela nutricional

* harmonizações

---

## Pesquisa

* busca inteligente

* busca por ingrediente

* busca por categoria

* busca por preço

* busca por popularidade

---

## Recomendações

* recomendados

* mais vendidos

* novidades

* combinações

* promoções

---

## Promoções

* cupons

* cashback

* descontos

* happy hour

* combos

* campanhas

---

# PRIORIDADE BAIXA (P3)

## Inteligência Artificial

* conversar com IA

* recomendar pratos

* recomendar bebidas

* recomendar sobremesas

* explicar ingredientes

* responder dúvidas

* sugerir harmonização

* repetir último pedido

* montar refeição

* adaptar dieta

---

## Experiência

* modo escuro

* modo claro

* modo turista

* acessibilidade

* alto contraste

* leitura por voz

* comandos por voz

---

## Fidelidade

* pontos

* medalhas

* ranking

* conquistas

* benefícios

* clube VIP

---

## Gamificação

* desafios

* recompensas

* níveis

* selos

* missões

---

## Social

* compartilhar pedido

* convidar amigos

* dividir conta por convite

* ranking da mesa

---

# ADMIN

## Gestão

* dashboard

* indicadores

* faturamento

* ticket médio

* vendas

* produtos vendidos

* horários de pico

* desempenho

---

## Produtos

* CRUD completo

* importação

* exportação

* ordenação

* disponibilidade

---

## Categorias

* CRUD

* ordenação

* ocultar

* destacar

---

## Pedidos

* fila

* preparo

* prontos

* entregues

* cancelados

* filtros

---

## Funcionários

* cadastro

* cargos

* permissões

* auditoria

---

## Relatórios

* PDF

* Excel

* gráficos

* exportações

---

# COZINHA

* painel próprio

* fila inteligente

* prioridades

* cronômetro

* impressão

* confirmação

* histórico

---

# GARÇOM

* visualizar mesas

* visualizar pedidos

* alterar status

* entregar pedido

* solicitar pagamento

---

# WHITE LABEL

* múltiplos restaurantes

* identidade visual

* domínio próprio

* personalização

* temas

---

# SAAS

* cadastro de clientes

* assinatura

* cobrança

* planos

* painel administrativo

* métricas globais

---

# MOBILE

* PWA

* instalação

* notificações

* funcionamento offline parcial

---

# API

* documentação

* versionamento

* autenticação

* rate limit

---

# SEGURANÇA

* logs

* auditoria

* criptografia

* validações

* proteção contra spam

---

# PERFORMANCE

* lazy loading

* cache

* otimização de imagens

* redução de re-renderizações

* monitoramento

---

# DOCUMENTAÇÃO

* README.md

* ARCHITECTURE.md

* ROADMAP.md

* BACKLOG.md

* DECISIONS.md

* DATABASE.md

* API.md

* STORES.md

* BUSINESS.md

* AI.md

* STYLEGUIDE.md

* CONTRIBUTING.md

---

# REGRA OFICIAL

Nenhuma funcionalidade pode ser implementada diretamente.

Toda ideia deve seguir o fluxo:

Ideia

↓

Registro no BACKLOG

↓

Discussão arquitetural

↓

Entrada no ROADMAP

↓

Implementação

↓

Testes

↓

Documentação

↓

Produção

Este documento é permanente e deverá evoluir continuamente junto com o produto.
 