# Escopo e roadmap da V1

Status: **freeze oficial da V1**
Data-base: **7 de agosto de 2026**

## Definition of Done

A V1 estará concluída quando um restaurante puder:

```text
receber uma mesa
→ criar/reutilizar a sessão
→ identificar responsável e quantidade de pessoas
→ oferecer e enviar a primeira bebida
→ conduzir ou liberar a descoberta do cardápio
→ receber pedidos incrementais
→ rotear itens para Bar e Cozinha
→ produzir estações independentemente
→ entregar por estação
→ acompanhar a operação pelo Gerente
→ administrar o catálogo necessário à operação
→ consolidar a conta da sessão
→ encerrar a visita
→ liberar a mesa
```

O fluxo deve funcionar em Realtime, sobreviver a refresh, impedir alterações indevidas e manter uma experiência coerente com a marca configurada.

## Implementado

### Fundação

- Next.js App Router, TypeScript estrito, Supabase e Zustand;
- contratos de domínio e fronteiras de infraestrutura;
- UI Foundation, Visual Theme e BrandIdentity;
- ExperienceProfile e ExperienceProvider;
- white label por configuração local.

### Cliente

- QR Codes de 23 mesas;
- entrada canônica por `/mesa/[tableNum]`;
- resolução idempotente de sessão de mesa;
- identificação por nome e `party_size`;
- jornada de hospitalidade configurável;
- oferta rápida com pedido imediato;
- apresentação da casa e jornada guiada;
- catálogo, busca e navegação por 11 categorias;
- Product Experience, recomendações e carrinho;
- pedidos incrementais;
- Minha Mesa e acompanhamento Realtime;
- limpeza local e `/obrigado` quando a sessão recebe `closed`.

### Catálogo

- 57 produtos reais;
- repository e mapper Supabase;
- curadoria semântica sem IDs de persistência;
- First Gesture `bebidas` sem conflito com `drinks`;
- fallback visual para produtos sem imagem;
- snapshot de preço e roteamento resolvido no servidor.

### Operação

- Manager Command Center;
- Production Routing persistido;
- Station Execution independente;
- Bar Board;
- Kitchen Board;
- painel atual do Garçom;
- Delivery Persistence por estação;
- `orders.status` derivado;
- Realtime compartilhado;
- compatibilidade centralizada com pedidos históricos.

### Documentação

- inventário integral realizado no PATCH-DOC-001;
- base canônica criada pelo PATCH-DOC-002.

## Em desenvolvimento

MODARA-006 está em revisão local: converte a antiga referência genérica Fast/Self-Service em `quintal-skatepark` e documenta suas limitações antes do commit.

## Roadmap MODARA até Release Candidate

| Ordem | Entrega | Critério de conclusão |
|---:|---|---|
| 1 | **MODARA-006 — Quintal Skatepark Reference Implementation** | Segunda implementação real registrada como Counter-Service parcial, sem mesa física, sem hospitality, sem garçom e sem conta de mesa. |
| 2 | **MODARA-007 — ServiceSession / Visit Foundation** | Raiz de atendimento sem mesa física definida para check-in, visita ativa e encerramento sem consumo fictício. |
| 3 | **MODARA-008 — Individual Account / Consumption** | Consumo acumulado por visita e conta individual sem mesa preservando Account Core e invariantes do +54. |
| 4 | **MODARA-009 — Cashier Operations** | Caixa lê visitas, consumo, totais e confirma pagamento presencial sem criar gateway financeiro. |
| 5 | **MODARA-010 — Pickup / Counter Delivery** | Retirada de balcão modelada explicitamente sem confundir produção pronta com item retirado. |
| 6 | **MODARA-011 — Establishment/Data Isolation + Quintal Catalog** | Isolamento de dados por estabelecimento e catálogo próprio do Quintal, sem multi-tenant comercial completo. |
| 7 | **MODARA-012 — Two Operations E2E Validation** | +54 Full Service e Quintal Counter-Service validados de ponta a ponta sem regressão cruzada. |
| 8 | **MODARA-013 — V1 Hardening** | Segurança, RLS, autenticação operacional, payloads, idempotência, subscriptions, logs, lint, performance e responsividade auditados. |
| 9 | **MODARA-014 — Commercial V1 Release** | Ambiente, dados, QR/acesso, contas, deploy, smoke tests, backup, rollback e roteiro comercial validados. |

As etapas acima substituem a numeração antiga dos patches funcionais restantes. Nenhuma etapa futura deve ser tratada como implementada antes de validação própria.

## Opcional da V1

Itens permitidos somente se não atrasarem os obrigatórios:

- fotografias individuais adicionais além do mínimo comercial;
- refinamentos de motion não essenciais;
- métricas gerenciais derivadas que não exijam novo domínio;
- melhorias editoriais sem nova persistência;
- automação adicional de demonstração.

## V2

Não entram na V1:

- clientes recorrentes, CRM, favoritos e fidelidade;
- `guest_arrivals`, reservas, fila e acomodação automática;
- combinação de mesas;
- pagamento integrado, divisão avançada, fiscal e financeiro;
- domínio de caixa presencial completo;
- estoque, ficha técnica e fornecedores;
- produção e entrega individuais por item;
- pickup explícito e estações especializadas avançadas;
- analytics preditivo e IA contextual;
- delivery, iFood e marketplace;
- multi-tenant completo e app nativo.

O detalhamento está em [10_V2_BACKLOG.md](10_V2_BACKLOG.md).

## Dívida técnica

Dívida técnica descreve risco ou fragilidade do que já existe. Não substitui requisitos funcionais.

### P0

Nenhuma dívida P0 foi confirmada nesta auditoria.

### P1

- schema-base não reproduzível somente pelas migrations versionadas;
- autenticação e autorização dos painéis operacionais não estão endurecidas;
- RLS das tabelas anteriores ao PATCH-027A não está documentada/versionada por completo;
- `TableSessionListener` não exclui explicitamente a rota `/bar`;
- ação visível “Chamar garçom” não possui comportamento;
- conta e fechamento ainda permitem uma visão parcial da operação.

### P2

- Checkout exige telefone apesar da identificação inicial leve;
- `/identificacao` permanece acessível como rota legada;
- `useAccount` é uma projeção local não persistida e parcialmente duplicada com acompanhamento;
- fallback histórico de roteamento permanece necessário;
- 57 produtos não possuem imagem individual;
- alguns textos operacionais ainda mencionam migrations já aplicadas em estados de erro.

### P3

- arquivos e comentários antigos no código ainda usam nomenclaturas anteriores;
- partes da UI misturam stylesheets canônicos e estilos inline;
- não existe automação completa para validar links documentais e drift da documentação.

## Regras do freeze

1. Novo requisito só entra na V1 com decisão explícita do Product Owner.
2. Itens removidos da V1 devem ir para o backlog V2, nunca desaparecer.
3. Correções necessárias aos critérios já congelados não são expansão de escopo.
4. Nenhum documento histórico pode sobrepor este arquivo.
5. Após cada patch restante, atualizar apenas contexto, escopo, changelog e release quando necessário; não reorganizar novamente a árvore antes da RC.
