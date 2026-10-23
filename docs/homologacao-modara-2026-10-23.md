# Homologação integrada MODARA — 23/10/2026

Projeto exclusivo: `tjsztjssiatxcqgloazw`. Branch: `feature/modara-operational-isolation`.

## Resultado

Auth/JWT, REST, isolamento entre restaurantes, permissões e entrega Realtime
aprovados nos cenários abaixo. Homologação completa de navegador e entrada anônima
continua pendente. Não houve acesso ao projeto original nem alteração da configuração
de Auth. `docs/FOUNDER_TECHNICAL_SOURCE.md` não faz parte desta alteração.

## Migration de segurança

Confirmados no banco os efeitos de
`202610220001_modara_access_resolution_authorization.sql`: autorização por posse ou
permissão explícita antes de retornar snapshots, bloqueio de equipe anônima, horário
do servidor, remoção de `resolvedAt` do contexto persistido e EXECUTE negado a `anon`.
As fixtures de acesso e check-in passaram no schema real, dentro de transações com
rollback. O projeto não tem `supabase_migrations.schema_migrations`; portanto não há
registro de versão a apresentar. A confirmação é pela definição e comportamento
remotos, não pelo histórico de migrations. A migration não foi reaplicada.

## Testes reais aprovados

O runner `scripts/validate-staging-integration.mjs` concluiu 13 grupos de verificações:

- Criação administrativa de quatro usuários sintéticos, login por senha, JWT com
  emissor do projeto e identidade confirmada pelo Auth. Nenhum e-mail foi enviado.
- JWT adulterado rejeitado tanto pelo Auth quanto pelo REST.
- Mesmo número de mesa em dois restaurantes gera mesas distintas; QR idempotente
  não concede leitura privada nem altera o tamanho da mesa.
- Participantes com o mesmo telefone não leem a participação alheia; FAST permanece
  sem mesa. São usuários autenticados sintéticos, não signups anônimos.
- Resolução de acesso com relógio do banco, snapshot idempotente, casos pago/grátis,
  autorização do proprietário e funcionário, negação entre unidades.
- Projeção da conta nega outro participante e outro restaurante.
- Estação permitida funciona; outra estação/unidade e cliente sem permissão são
  negados. Elevação de privilégios e fechamento direto da mesa também são negados.
- Revogação de vínculo bloqueia operações mesmo usando JWT emitido anteriormente.
- Renovação real por refresh token preserva a identidade.
- Três assinaturas Realtime recebem UPDATE da própria participação. Cada uma recebeu
  um evento próprio e zero eventos de terceiros, inclusive entre participantes da
  mesma mesa. Os três eventos próprios são controles positivos da entrega.
- Logout revoga o refresh do cliente e mantém a sessão independente da equipe.
- Exclusão dos registros sintéticos e usuários Auth, seguida de verificação de
  ausência de resíduos. Todas as rodadas, inclusive as interrompidas, foram limpas.

A conferência final independente retornou zero usuários Auth, unidades, vínculos,
clientes e visitas com o marcador das rodadas, e confirmou o trigger de ownership ativo.

As requisições usam `apikey` no servidor e JWT do usuário em `Authorization` nos
testes de permissão. Credenciais, senhas, tokens e payloads pessoais não são impressos.
O runner não carrega `.env.local` e não aceita URL de projeto arbitrária. A conexão
SQL exige uma entrada pgpass identificada exatamente com o projeto de homologação.

A limpeza dos vínculos imutáveis usa uma transação administrativa com lock de tabela,
suspensão/restauração do trigger de ownership e DELETE limitado às unidades únicas
da rodada. Não altera RLS. Uma falha reverte a transação. Um arquivo temporário sem
credenciais registra apenas IDs para recuperação e é removido após a limpeza.

## Ajustes na execução

- JWT inválido pode retornar 401 ou 403; ambos representam rejeição. O teste aceita
  os dois, sem aceitar sucesso.
- O relógio do computador estava alguns minutos adiantado em relação ao banco.
  A prova de horário usa o relógio do banco, não o relógio local.
- A primeira janela de entrega Realtime de 15 segundos não confirmou todos os
  eventos. Com janela de até 30 segundos e controles positivos por assinante,
  os três eventos próprios foram observados, sem vazamento. Isto não é uma medição
  nem garantia de latência de produção.

## Validação local

O lint geral revelou dois efeitos antigos com atualização síncrona de estado.
Foi removido o espelho redundante de status em `OrderConfirmation`, e `DrinksFAB`
passou a usar o indicador de hidratação já existente no store de sessão.

TypeScript e ESLint, builds Quintal e +54, fixtures SQL remotas com rollback,
verificações estruturais de check-in/Realtime e Conta/Mesa, e validadores funcionais
de autorização por unidade, Account Core, Production Routing, Station Execution,
Delivery, Waiter, Manager, Operation Composition, Reference Implementations e Fast
Access Events. Os builds usam explicitamente a URL de homologação e uma chave
pública fictícia; não usam a chave secreta em configuração pública.

## Pendências e limites

- Não havia navegador conectado às ferramentas da sessão. Não foram comprovados
  cookies separados no navegador, refresh de página, QR na UI ou equipe e clientes
  simultâneos no mesmo navegador.
- Auth anônimo permanece desabilitado. Não foi executado signup anônimo nem JWT
  anônimo emitido pelo Auth. A negação de equipe anônima passou somente na fixture
  SQL com claims simulados, que não substitui esse cenário real.
- A auditoria/testes cobrem as fronteiras indicadas, não todas as funções, tabelas
  e ACLs existentes. Não constituem autorização para habilitar Auth anônimo ou
  publicar a aplicação em produção.
- Realtime foi exercitado em UPDATE de `customer_sessions`; não certifica todos
  os eventos operacionais, pedidos, pagamentos ou o fluxo financeiro completo.

## Reexecução autorizada na homologação

```powershell
node scripts/lib/staging-database.mjs --preflight
node scripts/lib/staging-database.mjs --sql-fixtures
node scripts/validate-staging-integration.mjs
node scripts/lib/staging-database.mjs --postflight
```

Requer a variável `MODARA_STAGING_SECRET_KEY`, a entrada pgpass exclusiva da
homologação e PostgreSQL 18/psql no caminho documentado pelo helper. O runner integrado
cria e remove dados sintéticos; não é um teste somente de leitura.
