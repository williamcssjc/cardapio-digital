# Auditoria da documentação

Status: **inventário canônico da consolidação**
Data-base: **7 de agosto de 2026**

## Escopo e critério

Foram auditados os 96 documentos existentes antes da consolidação: 93 em `docs/` e três na raiz. Cada documento recebeu exatamente uma das seis classificações aprovadas.

| Classe | Quantidade | Significado aplicado |
|---|---:|---|
| KEEP | 2 | Oficial e preservado no lugar. |
| UPDATE | 1 | Oficial, corrigido no próprio caminho. |
| MERGE | 40 | Conhecimento incorporado aos documentos canônicos; original arquivado. |
| REFERENCE | 10 | Fonte especializada ou evidência preservada sem autoridade atual. |
| ARCHIVE | 24 | Histórico, planejamento ou ideia substituída. |
| REMOVE | 19 | Duplicata exata ou artefato integralmente substituído e sem conhecimento exclusivo. |
| **Total** | **96** | |

O código implementado prevaleceu sobre planejamento; depois vieram migrations e contratos atuais; em seguida, a documentação mais recente. Nenhum arquivo foi removido antes de seu conteúdo relevante ser consolidado ou sua duplicidade ser comprovada.

## KEEP — 2

- `AGENTS.md`
- `CLAUDE.md`

## UPDATE — 1

- `README.md`

## MERGE — 40

- `docs/00-foundation/ARCHITECTURE.md`
- `docs/00-foundation/BUSINESS.md`
- `docs/00-foundation/PRODUCT.md`
- `docs/01-planning/BACKLOG.md`
- `docs/01-planning/MVP_SCOPE.md`
- `docs/01-planning/ROADMAP.md`
- `docs/02-engineering/API.md`
- `docs/02-engineering/DATABASE.md`
- `docs/02-engineering/IA.md`
- `docs/02-engineering/STORES.md`
- `docs/03-development/CONTRIBUTING.md`
- `docs/03-development/DECISIONS.md`
- `docs/03-development/QR_CODES.md`
- `docs/03-development/STYLEGUILD.md`
- `docs/04-product/USER_FLOWS.md`
- `docs/05-decisions/ADR-001.md`
- `docs/05-decisions/ADR-002.md`
- `docs/05-decisions/ADR-003.md`
- `docs/PROJECT_STATUS.md`
- `docs/architecture/customer-experience-blueprint-v1.md`
- `docs/architecture/experience-contract-v1.md`
- `docs/architecture/product-foundation.md`
- `docs/architecture/scalability-audit.md`
- `docs/DOCUMENTACAOV.1/002domain model.txt`
- `docs/DOCUMENTACAOV.1/01_CONCEPTUAL_ARCHITECTURE,MD.txt`
- `docs/DOCUMENTACAOV.1/02_DOMAIN_MODEL.txt`
- `docs/DOCUMENTACAOV.1/10.txt`
- `docs/DOCUMENTACAOV.1/banco de dados.txt`
- `docs/DOCUMENTACAOV.1/domaind 03.txt`
- `docs/DOCUMENTACAOV.1/estadte machine.txt`
- `docs/DOCUMENTACAOV.1/ideia.txt`
- `docs/DOCUMENTACAOV.1/l7.txt`
- `docs/DOCUMENTACAOV.1/nem lembra[.txt`
- `docs/DOCUMENTACAOV.1/real time.txt`
- `docs/DOCUMENTACAOV.1/state machine.txt`
- `docs/1IDEIAS-CARDAPIO/DIRECAO COSOLIDADA.txt`
- `docs/1IDEIAS-CARDAPIO/DIRECAO WHITE LABEL.txt`
- `docs/1IDEIAS-CARDAPIO/GPT.txt`
- `docs/1IDEIAS-CARDAPIO/master projetc.txt`
- `docs/1IDEIAS-CARDAPIO/TEAM.md`

## REFERENCE — 10

- `docs/architecture/delivery-persistence-foundation.md`
- `docs/architecture/production-routing-foundation.md`
- `docs/architecture/public-database-surface-audit.md`
- `docs/content-audit/image-recommendations.md`
- `docs/content-audit/instagram-inventory.md`
- `docs/content-audit/menu-inventory.md`
- `docs/content-audit/missing-content.md`
- `docs/content-audit/proposed-experience-map.md`
- `docs/1IDEIAS-CARDAPIO/ATUAL.txt`
- `docs/1IDEIAS-CARDAPIO/black log.txt`

## ARCHIVE — 24

- `docs/architecture/current-classification.md`
- `docs/architecture/implementation-plan.md`
- `docs/1IDEIAS-CARDAPIO/# CUSTOMER JOURNEY V1.txt`
- `docs/1IDEIAS-CARDAPIO/# RESTAURANT_RULES.md`
- `docs/1IDEIAS-CARDAPIO/CUSTOMER_JOURNEY_V1.md`
- `docs/1IDEIAS-CARDAPIO/DESIGN_SYSTEM.txt`
- `docs/1IDEIAS-CARDAPIO/FLUXO CLIENTE IDEIAS.txt`
- `docs/1IDEIAS-CARDAPIO/jornadacliente.txt`
- `docs/1IDEIAS-CARDAPIO/nao lembro.txt`
- `docs/1IDEIAS-CARDAPIO/WHITE_LABEL_SYSTEM.txt`
- `docs/1IDEIAS-CARDAPIO/FLUXO CLIENTE EXCECUCAO.txt`
- `docs/1IDEIAS-CARDAPIO/MODULOS V1.0.txt`
- `docs/1IDEIAS-CARDAPIO/patchs.txt`
- `docs/1IDEIAS-CARDAPIO/PROJECT_CONTEXT.txt`
- `docs/1IDEIAS-CARDAPIO/proximos passos.txt`
- `docs/1IDEIAS-CARDAPIO/reta final.txt`
- `docs/1IDEIAS-CARDAPIO/RETOMADA.txt`
- `docs/1IDEIAS-CARDAPIO/conversagpt.txt`
- `docs/1IDEIAS-CARDAPIO/DEBATE.txt`
- `docs/1IDEIAS-CARDAPIO/pactch24.txt`
- `docs/1IDEIAS-CARDAPIO/paineis.txt`
- `docs/1IDEIAS-CARDAPIO/patch 11.txt`
- `docs/1IDEIAS-CARDAPIO/patch 24.txt`
- `docs/1IDEIAS-CARDAPIO/PRODUCT OWNER.txt`

## REMOVE — 19

- `docs/1IDEIAS-CARDAPIO/DOCUMENTACAOV.1/002domain model.txt`
- `docs/1IDEIAS-CARDAPIO/DOCUMENTACAOV.1/01_CONCEPTUAL_ARCHITECTURE,MD.txt`
- `docs/1IDEIAS-CARDAPIO/DOCUMENTACAOV.1/02_DOMAIN_MODEL.txt`
- `docs/1IDEIAS-CARDAPIO/DOCUMENTACAOV.1/10.txt`
- `docs/1IDEIAS-CARDAPIO/DOCUMENTACAOV.1/banco de dados.txt`
- `docs/1IDEIAS-CARDAPIO/DOCUMENTACAOV.1/documentacao.txt`
- `docs/1IDEIAS-CARDAPIO/DOCUMENTACAOV.1/domaind 03.txt`
- `docs/1IDEIAS-CARDAPIO/DOCUMENTACAOV.1/estadte machine.txt`
- `docs/1IDEIAS-CARDAPIO/DOCUMENTACAOV.1/ideia.txt`
- `docs/1IDEIAS-CARDAPIO/DOCUMENTACAOV.1/l7.txt`
- `docs/1IDEIAS-CARDAPIO/DOCUMENTACAOV.1/nem lembra[.txt`
- `docs/1IDEIAS-CARDAPIO/DOCUMENTACAOV.1/real time.txt`
- `docs/1IDEIAS-CARDAPIO/DOCUMENTACAOV.1/state machine.txt`
- `docs/1IDEIAS-CARDAPIO/resumo.txt`
- `docs/1IDEIAS-CARDAPIO/CLAUDE.txt`
- `docs/1IDEIAS-CARDAPIO/gemini.txt`
- `docs/1IDEIAS-CARDAPIO/diario de dev.txt`
- `docs/DOCUMENTACAOV.1/documentacao.txt`
- `docs/content-audit/proposed-seed.json`

Os primeiros 13 arquivos eram cópias binariamente idênticas dos arquivos homônimos em `docs/DOCUMENTACAOV.1/`. `resumo.txt` era cópia exata de `master projetc.txt`. Os demais removidos eram prompts, conteúdo pessoal, índice obsoleto ou seed proposto dos sete produtos demonstrativos, já substituído pelo catálogo real versionado.

## Resultado final

- documentos oficiais: raiz de `docs/`;
- originais MERGE, REFERENCE e ARCHIVE: `docs/archive/`, organizados por contexto;
- duplicatas exatas restantes: zero;
- conhecimento histórico apagado sem preservação: zero;
- código, banco, migration ou comportamento alterado: zero.

Esta auditoria é o registro definitivo da reorganização. Não deve ser refeita antes da Release Candidate; novos documentos devem seguir [08_DEVELOPMENT_GUIDE.md](08_DEVELOPMENT_GUIDE.md).
