# Fundação do produto

Status: arquitetura mínima aprovada no PATCH-004. Este documento não congela o processo completo de implantação, o painel administrativo ou o roadmap posterior ao primeiro restaurante.

## Visão

O Parrilla OS é um sistema de hospitalidade para restaurantes. O produto domina comportamentos universais do atendimento; cada estabelecimento fornece sua identidade, seu conteúdo, suas regras e seu tema.

O +54 Parrilla é o primeiro perfil real usado para validar essa separação. Ele não deve se tornar uma coleção de condicionais no motor.

## Princípio central

> A profissão é universal; a identidade e o funcionamento da casa são específicos.

Toda nova funcionalidade deve ser classificada antes da implementação.

## Quatro camadas

### 1. Motor de hospitalidade

Responsável por comportamentos universais: reconhecer a mesa, iniciar e acompanhar sessões, receber o cliente, conduzir a jornada, montar e enviar pedidos, acompanhar status e encerrar a visita.

Não conhece nome, texto, imagem, produto ou cor de uma casa específica.

### 2. Perfil da casa

Contém conhecimento editorial e comercial: nome, história aprovada, descrição, personalidade, tom, mensagens, destaques, produtos assinatura, primeiro gesto, categorias, recomendações e harmonizações.

O perfil referencia produtos; não redefine pedidos, sessões ou status.

### 3. Regras operacionais

Contém configurações que alteram comportamento: faixa de mesas, quantidade de pessoas, escopo do pedido, horários, serviço, disponibilidade e regras por unidade.

Regras devem ser explícitas, validadas e aplicadas pelo motor. Texto promocional não é regra operacional.

### 4. Tema visual

Contém o uniforme da casa: logo, tipografia, cores, imagens e tokens semânticos. O tema pode mudar a expressão, mas não pode reduzir acessibilidade, legibilidade ou previsibilidade.

## Regra de classificação

1. O comportamento existiria da mesma forma em outra casa? Motor.
2. É algo que a casa diz, vende, recomenda ou conta? Perfil.
3. Muda quando, como ou sob quais condições a operação funciona? Regras.
4. Muda apenas a expressão visual? Tema.
5. Se a resposta continuar ambígua, documentar a dúvida antes de implementar.

## Decisões congeladas

- as quatro camadas;
- o princípio central;
- QR identifica mesa, não pessoa;
- `table_sessions` representa a visita ativa da mesa;
- `customer_sessions` representa participantes identificados;
- sequência inicial: mesa, acolhimento, nome, grupo e próxima experiência;
- preservação de Supabase, Zustand, App Router e fluxo operacional atual.

## Decisões abertas

- persistência definitiva de perfis, regras e temas;
- resolução de estabelecimento por domínio, unidade ou QR;
- modelo de permissões e isolamento multi-tenant;
- painel de configuração;
- herança entre marca e unidade;
- versionamento/publicação de configuração;
- processo de implantação de uma segunda casa;
- catálogo real, destaques e primeiro gesto do +54.

Essas decisões aguardam necessidade real ou um segundo estabelecimento. O contrato V1 não deve ser interpretado como schema definitivo do banco.

