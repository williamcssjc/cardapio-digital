# 05 — autorização de Conta e Mesa (local)

## Fronteiras

- GET `/api/table-account` usa exclusivamente cookies de cliente e a projeção
  `modara_get_own_table_account`: responsabilidade própria, sem participantes,
  telefones ou consumo de terceiros. Não há fallback para a sessão da equipe.
- Mutações existentes exigem capability `tableAccount`, equipe com `management`
  na unidade ativa e escopo do objeto. A RPC repete a autorização, com lock das
  associações através da fundação 03. Admin global não concede essa permissão.
- Cálculos e lifecycle da 002 são preservados. A migration injeta somente a
  precondição nas três RPCs; identidade do ator da API vem do usuário autenticado.
- SELECT financeiro bruto é restrito a management. Clientes recebem uma projeção
  mínima. INSERT/UPDATE/DELETE diretos e grants de coluna legados são revogados.
- Mesa/visita somente são lidas por proprietário ou equipe com permissão. Customer
  só é lido por identidade com participação própria vinculada. Histórico não recebe
  proprietário ou atribuição automática de unidade.
- QR público identifica o número, não participantes. Resolver exige identidade
  técnica, unidade do servidor e RPC transacional; não altera tamanho de uma mesa
  existente. FAST não chama o resolver. Check-in valida a mesa novamente.
- Realtime da conta invalida por UPDATE da participação própria: mudanças de
  allocations/settlements e status de pedido notificam sem revelar linhas de terceiros.

## Operações bloqueadas intencionalmente

Cliente não liquida, redistribui nem encerra mesa. Solicitação digital de ajuste ou
de conta ainda não tem contrato persistente; a UI orienta falar com a equipe e não
afirma que um garçom foi notificado. Não foi criado provedor de pagamento nem UI nova
para operação financeira. Os endpoints da equipe permanecem disponíveis à identidade
autorizada. `management` é exigida; `waiter` isoladamente não concede liquidação.

## Reprodução local

Somente localhost:5432, usuário postgres, banco novo `modara_auth05_test`.
O runner pode reutilizar em memória a entrada local exata de pgpass já usada por
`modara_test`. Não imprime, grava ou altera credenciais. Não lê `.env.local`.

```powershell
node scripts/validate-account-table-authorization.mjs --bootstrap-local --apply-local
node scripts/validate-account-table-authorization.mjs
node scripts/validate-account-table-authorization.mjs --cleanup-local
```

Bootstrap recusa banco existente. Cleanup é restrito ao nome acima, recusa resíduo
de fixtures e não utiliza FORCE. Nenhum outro banco é removido ou alterado.

Usa migrations integrais 002, 007, 01, 02A, 03, 04, 02B e 05. Auth e tabelas anteriores
são sintéticos; duas dependências de Station Execution são stubs que não executam
produção/entrega. Portanto os testes da 05 comprovam SQL/RLS/ACL financeiro real em
PostgreSQL, não Supabase Auth/JWT assinado, REST, navegador ou Realtime real.

## Homologação e ativação

1. Revisar inventário/ACLs reais e backup, incluindo funções não versionadas. Não
   declarar o remoto protegido a partir dos testes sintéticos.
2. Em ambiente de homologação isolado: 01 → 02A → 03 → 04 → 02B → 05, com código
   correspondente e usuários de equipe provisionados explicitamente por unidade.
3. Só após o fechamento coordenado das ACLs, habilitar Auth anônimo na homologação.
4. Testar dois clientes + funcionário no mesmo navegador, +54 com mesa, FAST sem
   mesa, refresh/expiração/logout, REST/RPC negativos e Realtime por proprietário.
5. Solicitar autorização separada para produção, com janela coordenada. Não manter
   leitura pública como fallback e não reabrir grants inseguros para rollback.

Limitação de produto preservada: não existe solicitação digital de aprovação de
divisão/pagamento. Limitação de evidência: E2E Supabase real ainda é obrigatório.

## Resultado da rodada local

Migration 05 integral e dependências executadas no PostgreSQL local: PASS.
Projeção própria, dois participantes, mesmo telefone, outra visita/unidade,
negações por RPC/SQL direto, grants de coluna, settlement idempotente, fechamento
com pendências bloqueado, fechamento após saldo zero e invalidação por cancelamento:
PASS. Fixtures revertidas; banco descartável removido ao terminar.

TypeScript, ESLint direcionado sem warnings, builds Quintal/+54, Account Core,
Routing, Station Execution, Delivery, Waiter, Manager, Operation Composition e
Reference Implementations: PASS. Nenhum resultado SQL substitui teste real de REST,
JWT/cookies ou Realtime. Preparado para homologação coordenada; não para publicação
direta nem habilitação imediata de Auth anônimo em produção.
