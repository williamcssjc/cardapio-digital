# Contexto mestre do Parrilla OS

Status documental: **fonte canônica**
Estado auditado em: **7 de agosto de 2026**
Último patch funcional concluído: **PATCH-028A.1 — Delivery Persistence**
Próximo patch funcional: **PATCH-028B — Waiter Operations Board 2.0**

## 1. Ordem de autoridade

Quando duas fontes divergirem, use esta ordem:

1. código atual auditado;
2. migrations, contratos e comportamento remoto já validados;
3. este contexto mestre e os demais documentos canônicos;
4. decisões arquiteturais implementadas;
5. documentação histórica em `docs/archive/`.

Planejamento nunca deve ser descrito como implementação. Uma decisão substituída permanece no histórico, mas não orienta código novo.

## 2. O produto

Parrilla OS é uma plataforma white label para hospitalidade e operação presencial de restaurantes. Ela procura agir como um excelente garçom: recebe, orienta, recomenda, acompanha e encerra a visita sem disputar atenção com a refeição ou substituir a equipe.

O produto une duas perspectivas:

- **experiência do cliente:** entrada pela mesa, hospitalidade, descoberta, pedidos incrementais e acompanhamento;
- **operação do restaurante:** roteamento, produção por estação, entrega, supervisão e encerramento da mesa.

O piloto comercial usa o **+54 Parrilla — Jardim Aquarius**. `BrandIdentity` e `ExperienceProfile` isolam a marca e a narrativa do motor compartilhado. Isso prepara white label, mas não significa que multi-tenant completo já exista.

## 3. Evolução resumida

```text
Protótipo de cardápio
→ estabilização de sessão e pedidos
→ QR por mesa
→ Hospitality Engine e ExperienceProfile
→ catálogo real e BrandIdentity
→ jornada guiada
→ Manager Command Center
→ Production Routing
→ Station Execution
→ Bar Board
→ Delivery Persistence
→ consolidação documental atual
→ Waiter Operations Board 2.0
→ fechamento da V1
```

A cronologia detalhada está em [PROJECT_HISTORY.md](PROJECT_HISTORY.md).

## 4. Estado real atual

### Cliente

- QR Codes para mesas 01–23;
- `/mesa/[tableNum]` como entrada canônica;
- criação ou reutilização de `table_sessions`;
- identificação leve por nome e quantidade de pessoas;
- oferta rápida de bebida com envio imediato e idempotente;
- boas-vindas, familiaridade e apresentação da casa;
- jornada guiada de entrada e prato principal;
- catálogo, busca, navegação sticky e Product Experience;
- recomendações editoriais determinísticas;
- carrinho e pedidos incrementais;
- “Minha Mesa” com atualização Realtime;
- reação ao encerramento remoto da sessão e rota `/obrigado`.

### Catálogo

- 11 categorias e 57 produtos do catálogo inicial do +54 Jardim Aquarius;
- 21 produtos destinados ao Bar e 36 à Cozinha;
- 10 produtos de separação e 47 de preparação;
- nenhum produto possui `imageUrl` individual atualmente;
- persistência `image_url` traduzida para domínio `imageUrl` pelo mapper;
- catálogo carregado por `CatalogRepository` e `revalidate = 60`.

### Operação

- Cozinha e Bar usam o mesmo Station Board;
- produção independente por `order_id + production_station`;
- estados de produção `pending → preparing → ready`;
- produtos exclusivamente de separação podem avançar `pending → ready`;
- entrega persistida por `delivered_at` e confirmada por RPC;
- `orders.status` é projeção das execuções;
- Gerente possui snapshot, Realtime, mapa de mesas, KPIs, filas e alertas;
- Garçom confirma entrega por estação, mas a interface ainda é centrada em pedidos.

### Banco

Entidades utilizadas pelo runtime:

- `categories`;
- `menu_items`;
- `table_sessions`;
- `customer_sessions`;
- `orders`;
- `order_station_executions`.

Migrations incrementais presentes e aplicadas:

- `202607230001_patch_003_table_session_party_size.sql`;
- `202608050001_patch_026_production_station.sql`;
- `202608060001_patch_027a_station_execution_foundation.sql`;
- `202608060002_patch_028a_delivery_persistence.sql`.

O schema-base anterior ao PATCH-003 não está integralmente versionado no repositório. Essa é uma dívida de reprodutibilidade, não licença para reconstruir tabelas por inferência.

## 5. Arquitetura resumida

```text
ExperienceProfile + BrandIdentity
                ↓
QR → TableSession → HospitalityEntry → Catálogo
                                      ↓
                         Carrinho → API de pedidos
                                      ↓
                     snapshot validado no servidor
                                      ↓
              order_station_executions por estação
                       ↙                         ↘
                     Bar                       Cozinha
                       ↘                         ↙
                          Garçom → entrega
                                  ↓
                              Gerente
```

As páginas Server Component carregam o snapshot inicial. Componentes cliente assumem interação, Zustand e subscriptions Realtime. O banco permanece fonte durável; stores não substituem persistência operacional.

## 6. Decisões vigentes

- QR identifica a mesa, não a pessoa.
- Mesa física, sessão da mesa e sessão do cliente são conceitos distintos.
- A visita comporta vários pedidos incrementais.
- Preço, estação e modo de produção são resolvidos no servidor.
- O pedido preserva snapshot imutável do item enviado.
- Produção pertence à estação; entrega pertence ao atendimento.
- `productionStation` é a única fonte de destino para itens atuais.
- Pedidos históricos sem metadados usam um fallback centralizado.
- `delivered_at` não é um status de produção.
- Curadoria usa identificadores semânticos, nunca IDs do banco.
- `bebidas` e `drinks` são papéis independentes.
- Marca e experiência são configuração; componentes não verificam o nome do restaurante.

As justificativas completas estão em [ARCHITECTURAL_DECISIONS.md](ARCHITECTURAL_DECISIONS.md).

## 7. Escopo da V1

A V1 estará pronta quando o restaurante puder receber uma mesa, conduzir a experiência, aceitar pedidos incrementais, produzir Bar e Cozinha independentemente, entregar, supervisionar, administrar o catálogo, consolidar a conta, encerrar a sessão e liberar a mesa com segurança e Realtime.

Ainda faltam:

1. Garçom 2.0 por mesa;
2. gestão operacional do catálogo;
3. conta e fechamento completos;
4. refinamento unificado dos painéis;
5. polish final do cliente;
6. simulação integral do restaurante;
7. hardening de segurança e qualidade;
8. preparação da Release Candidate.

O freeze detalhado está em [02_V1_SCOPE_AND_ROADMAP.md](02_V1_SCOPE_AND_ROADMAP.md).

## 8. Limites atuais

- não há multi-tenant completo nem seleção remota de perfil;
- não há pagamento integrado, fiscal ou caixa;
- conta é uma projeção local parcial, não uma entidade persistida completa;
- “Chamar garçom” ainda não possui comportamento operacional;
- Checkout ainda exige telefone, embora a entrada seja leve;
- a autorização dos painéis operacionais não está endurecida;
- as imagens individuais dos 57 produtos não estão cadastradas;
- produção e entrega continuam na granularidade pedido + estação, não item individual.

## 9. Documentação oficial

- [Visão do produto](01_PRODUCT_VISION.md)
- [Escopo e roadmap da V1](02_V1_SCOPE_AND_ROADMAP.md)
- [Arquitetura](03_ARCHITECTURE.md)
- [Modelo de domínio](04_DOMAIN_MODEL.md)
- [Experiência do cliente](05_CUSTOMER_EXPERIENCE.md)
- [Operação](06_OPERATIONS.md)
- [Banco e segurança](07_DATABASE_AND_SECURITY.md)
- [Guia de desenvolvimento](08_DEVELOPMENT_GUIDE.md)
- [Release](09_RELEASE.md)
- [Backlog V2](10_V2_BACKLOG.md)
- [Histórico](PROJECT_HISTORY.md)
- [Decisões arquiteturais](ARCHITECTURAL_DECISIONS.md)
- [Changelog](CHANGELOG.md)
- [Auditoria da documentação](DOCUMENTATION_AUDIT.md)

Documentos em `archive/` são referência histórica e não concorrem com esta base.
