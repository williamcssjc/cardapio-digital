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

Não há patch funcional parcialmente implementado no working tree. A consolidação documental aguarda revisão antes do próximo desenvolvimento.

## Obrigatório antes da Release Candidate

| Ordem | Entrega | Critério de conclusão |
|---:|---|---|
| 1 | **PATCH-028B — Waiter Operations Board 2.0** | Garçom opera por mesa, distingue itens prontos/em produção e confirma entregas parciais persistidas. |
| 2 | **PATCH-029 — Menu & Catalog Management** | Restaurante altera nome, descrição, preço, disponibilidade, imagem, categoria, ordem, estação e modo sem editar código; pedidos antigos preservam snapshot. |
| 3 | **PATCH-030 — Table Session, Account & Closing** | Conta pertence à sessão, pendências são verificadas, fechamento é persistido e a mesa é liberada com segurança. |
| 4 | **PATCH-031 — Operations UX 2.0** | Bar, Cozinha, Garçom e Gerente compartilham linguagem operacional coerente e projeções por mesa. |
| 5 | **PATCH-032 — Customer Experience Final Polish** | Jornada completa revisada em dispositivos reais, sem fluxo legado concorrente ou ações mortas. |
| 6 | **PATCH-033 — Full Restaurant Simulation** | Simulação multioperador/multimesa cobre concorrência, refresh, reconexão, pedidos mistos, entrega e fechamento. |
| 7 | **PATCH-034 — Security & V1 Hardening** | RLS, RPCs, autenticação operacional, payloads, idempotência, subscriptions, logs, lint e performance auditados. |
| 8 | **PATCH-036 — Demo & Release Candidate** | Ambiente, dados, QR, contas, deploy, smoke tests, backup, rollback e roteiro comercial validados. |

O antigo PATCH-035 de reconciliação documental foi antecipado e substituído pelos PATCH-DOC-001 e PATCH-DOC-002.

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
- pagamento integrado, divisão avançada, caixa e fiscal;
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
