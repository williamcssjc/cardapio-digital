# Continuação da homologação MODARA — 24/10/2026

Projeto consultado: `tjsztjssiatxcqgloazw`. Branch: `feature/modara-operational-isolation`, base `c7a18e5`. Nenhuma chamada foi feita ao projeto original. Auth anônimo permaneceu desabilitado; nenhuma alteração foi feita em `docs/FOUNDER_TECHNICAL_SOURCE.md`.

## Aprovado

- A migration `202610230001_modara_anonymous_preflight_hardening.sql` está refletida no banco de homologação: `modara_units` tem RLS, leitura pública de metadados e nenhuma permissão direta de escrita para `anon` ou `authenticated`; a coluna `timezone` segue legível. A função `modara_is_catalog_admin()` rejeita JWT com `is_anonymous=true`; `patch_027a_derive_order_status(bigint)` não é executável por `anon`.
- A fixture `node scripts/validate-anonymous-preflight.mjs` passou no banco real dentro de uma transação revertida. Os claims anônimos e administrativos dessa fixture são simulados; ela não cria nem autentica usuário anônimo.
- Playwright 1.62.1 e Chrome local já estavam disponíveis. `node scripts/validate-staging-browser.mjs` passou no Chrome isolado: QR inválido/fora de faixa sem signup ou cookie, estado de sessão persistido após reload, ausência de signup duplicado, troca de identidade expirada no novo check-in, manutenção do cookie em falha 503, bloqueio de conteúdo durante offline, recuperação após reconexão, encerramento 410 e vínculo revogado 403.
- `npx tsc --noEmit`, ESLint direcionado aos arquivos alterados e `git diff --check` passaram.
- `node scripts/lib/staging-database.mjs --postflight` encontrou zero usuários Auth, unidades, vínculos, clientes e visitas sintéticas. O trigger de ownership está ativo. Os dados de sessão do Chrome eram locais e sintéticos; não foram criados registros remotos pelo runner.
- Não ficou listener na porta isolada 3107 após os testes.

## Corrigido localmente

- A validação de ownership da visita agora também exige `service_sessions.status = 'active'`; falha de consulta retorna indisponibilidade e sessão ausente/encerrada retorna 410.
- O gate do cliente volta a verificar ao recuperar conexão, esconde conteúdo protegido enquanto a visita não é revalidada e remove estado local em 401/403/410. Falha temporária preserva a visita para nova tentativa.
- No check-in explícito por QR, uma sessão Auth comprovadamente expirada (401) é removida localmente e pode ser substituída; falha temporária de Auth preserva a sessão.
- O teste Playwright foi ajustado para a mensagem real da experiência +54 e para não depender de um estado visual transitório durante a queda de rede.

## Reprovado / risco que bloqueia habilitação de Auth anônimo

- `modara_admin_users` está com RLS ligado, porém possui grants de SELECT/INSERT/UPDATE/DELETE para `anon` e grants de leitura para `authenticated`, sem políticas RLS nessa tabela. A RLS sem política atualmente impede acesso às linhas; ainda assim, os grants diretos são excessivos e criam risco de regressão se uma política permissiva for adicionada. A correção é revogar esses grants (inclusive grants por coluna) e comprovar que a função administrativa `SECURITY DEFINER` continua funcionando. Nenhuma migration adicional foi aplicada nesta rodada.
- A auditoria também encontrou grants amplos em tabelas do catálogo e funções auxiliares. Os testes prévios de permissões continuam aprovados para os fluxos cobertos, mas o inventário amplo não é uma certificação completa de todas as ACLs/RPCs.
- O lint geral `npm run lint` não terminou após vários minutos sem saída; foi interrompido apenas o processo iniciado por esta rodada. ESLint direcionado passou.

## Pendente / não executado

- O processo atual não tem `MODARA_STAGING_PUBLISHABLE_KEY` nem `MODARA_STAGING_SECRET_KEY` (somente presença foi verificada). O runner usa uma chave pública fictícia e intercepta Auth/API; por isso os testes de UI são reais no Chrome, mas Auth, respostas REST e estados de backend foram simulados. Não houve signup anônimo real, JWT real de navegador, cookies emitidos pelo Supabase, expiração/logout real, nem teste real de isolamento via navegador.
- O fluxo de Auth anônimo segue sem aprovação de segurança. Antes de habilitá-lo: corrigir os grants de `modara_admin_users`, auditar grants/políticas das RPCs com EXECUTE por `anon`, e repetir os testes com chave pública de homologação e Auth anônimo ainda restrito ao projeto de staging.
- A suíte Playwright deixa screenshots em `test-results/invalid-qr.png` e `test-results/closed-visit.png` (diretório local ignorado pelo Git). Os logs `PASS REAL BROWSER` e `PASS SIMULATED` do runner distinguem o que foi renderizado/testado no Chrome do que foi mockado.
- Não foi feito commit ou push: os critérios de homologação integrada não estão todos aprovados e o risco de grants residual requer correção/revalidação antes de afirmar prontidão para V1.

## Reprodução

```powershell
node scripts/audit-staging-anonymous.mjs --summary
node scripts/validate-anonymous-preflight.mjs
node scripts/validate-staging-browser.mjs
node scripts/lib/staging-database.mjs --postflight
npx tsc --noEmit
npx eslint components/session/ServiceSessionIdentityGate.tsx lib/session/customer-session-ownership.ts lib/supabase/customer-client.ts scripts/audit-staging-anonymous.mjs scripts/validate-anonymous-preflight.mjs scripts/validate-staging-browser.mjs
git diff --check
```

## Atualização da continuidade — migration de ACL

Migration `202610240001_modara_admin_users_acl_hardening.sql` aplicada e validada somente no projeto `tjsztjssiatxcqgloazw`.

- A tabela pertence a `postgres`; `modara_is_catalog_admin()` também pertence a `postgres`, é `SECURITY DEFINER` e seu owner mantém SELECT. `authenticated` conserva EXECUTE no predicado usado pela interface. Os RPCs administrativos validam o admin pelo mesmo predicado; não há leitura direta de `modara_admin_users` no código da aplicação.
- Pós-condição remota: RLS ativa, zero políticas, zero privilégios de tabela e zero privilégios por coluna para `public`, `anon` e `authenticated`. `service_role` conserva SELECT/INSERT/UPDATE/DELETE para manutenção privilegiada. A fixture de rollback negou leitura e CRUD diretos para `anon` e `authenticated`, rejeitou admin anônimo e reconheceu o usuário administrativo sintético não anônimo através da função `SECURITY DEFINER`.
- `node scripts/audit-staging-anonymous.mjs --admin-acl`, `--summary`, `node scripts/validate-anonymous-preflight.mjs` e `--postflight` passaram. A pós-conferência encontrou zero dados sintéticos.
- `npx tsc --noEmit`, `npm run lint`, `git diff --check` e builds de `quintal-skatepark` e `plus54-jardim-aquarius` passaram. Os builds receberam `NEXT_PUBLIC_SUPABASE_URL=https://tjsztjssiatxcqgloazw.supabase.co` e uma chave fictícia; não autenticaram nem escreveram no backend. O lint passou após incluir `.next-staging/**` nos ignores do ESLint, evitando varredura dos artefatos isolados do Playwright.

## Chave publicável e Auth real no navegador

A variável `MODARA_STAGING_PUBLISHABLE_KEY` não está no processo do Codex nem nas variáveis de usuário/máquina. `.env.local` contém uma configuração de chave pública associada a outro host/projeto; o valor da chave não foi lido nem usado nos testes. Não use essa configuração de outro projeto no runner.

Para habilitar a execução Playwright com tráfego Auth real de homologação, obtenha a **Publishable key** do projeto `tjsztjssiatxcqgloazw` em Supabase Dashboard → projeto de homologação → **Settings → API Keys → Publishable key** (prefixo `sb_publishable_`). Antes de iniciar o Codex CLI pelo PowerShell, configure somente essa chave:

```powershell
$env:MODARA_STAGING_PUBLISHABLE_KEY = 'sb_publishable_chave_do_projeto_de_homologacao'
codex
```

## Resultado da rodada Playwright com Auth real

A chave publicável estava presente. O endpoint de configurações do host fixo de homologação retornou HTTP 200 e `external.anonymous_users=false`. A chave secreta estava ausente do processo e nunca foi enviada ao browser.

`node scripts/validate-staging-browser-auth.mjs` passou em Chrome real, sem mocks de Auth:

- QR inválido e fora da faixa, inclusive após reload: nenhum signup e nenhum cookie de cliente.
- QR de faixa válida: chamada real de signup ao Auth de staging, rejeitada com HTTP 422 e `anonymous_provider_disabled`; nenhum usuário/cookie foi criado.
- POST real a `/api/customer-table` sem identidade: HTTP 401.
- Reload preservou o estado bloqueado; retry explícito enviou nova tentativa real e recebeu a mesma rejeição, sem persistência de identidade.
- ESLint do runner passou; pós-flight encontrou zero dados sintéticos. Não restou listener na porta 3108.

Esta rodada comprova a recusa real do Auth e as proteções sem identidade. Não comprova sessão anônima válida, cookies de signup bem-sucedido, refresh/logout, isolamento sob JWT anônimo ou Realtime no navegador. Esses fluxos continuam sem execução enquanto Auth anônimo permanecer desabilitado, conforme a restrição de segurança.

```powershell
node scripts/validate-staging-browser-auth.mjs
node scripts/lib/staging-database.mjs --postflight
```

## Revisão de compatibilidade SQL do runner de fixtures (24/10/2026)

Esta revisão foi somente leitura no staging; não executou `--fixtures-only`, `PATCH` de Auth, Playwright ou qualquer mutação.

### Erros e correções

- `customer_sessions.unit_id` e `orders.unit_id` não existem. Preflight, inventário e postflight agora derivam a unidade pelas relações com `customers`, `service_sessions` e `table_sessions`.
- `modara_customer_session_owners` usa `customer_session_id` como PK; não possui `id`. A coleta, auditoria e exclusão usam essa chave.
- O catálogo revelou `fast_access_audit` como efeito persistente de `modara_resolve_service_session_access`, sem FK para a linha de acesso. O runner agora identifica seus IDs por unidade reservada, `subject_type` e IDs das linhas sintéticas de acesso, exclui por esses IDs e verifica zero resíduos no postflight.
- A validação SQL anterior havia parado antes de demonstrar as queries de dependência. A conversão de IDs agora ignora os campos de contagem para evitar tratar inteiros como listas de IDs.
- A limpeza reconcilia fixtures pelo UUID da execução, nomes e unidade esperados; a mesa também exige a unidade sintética identificada pelo label, número e ID. Inventário parcial ou duplicado interrompe a limpeza e conserva o relatório de recuperação.
- O inventário de FKs inclui referências públicas a `auth.users`. Antes de excluir uma identidade, o runner bloqueia se encontrar membership ou vínculo administrativo; não depende de cascatas para remover permissões ou dados fora do conjunto sintético.
- A preparação bloqueia as relações consultadas dentro da transação e faz rollback automático se qualquer precondição ou inserção falhar. Uma FK de entrada que não tenha tratamento explícito bloqueia o preflight.

### Evidência do esquema efetivo

- Consulta `SELECT` aos catálogos do projeto `tjsztjssiatxcqgloazw`: contrato passou para 31 relações, incluindo colunas, PKs, chaves únicas e FKs com suas ações `ON DELETE`. As FKs que chegam às tabelas removidas estão cobertas pela ordem de limpeza ou por dependência bloqueadora verificada.
- O catálogo confirma que `customer_sessions.unit_id`, `orders.unit_id` e `modara_customer_session_owners.id` não existem. Confirma também a PK de owners em `customer_session_id`, a relação única composta de `customer_sessions(id, table_session_id)` e as restrições das tabelas de pedidos/conta.
- `supabase_migrations.schema_migrations` não existe no staging (`to_regclass` retornou `NULL`). Assim, a estrutura implantada foi comparada ao catálogo real e às migrations fonte listadas no contrato, mas não foi possível provar uma lista de versões aplicadas por ledger do Supabase.

### Validação local

- `npm run test:staging-lifecycle`: 11 testes passaram, cobrindo schema/relacionamentos, arquivos migration fonte, referências legadas inválidas, dependências não reconhecidas, rollback simulado, falha de limpeza parcial e preservação do inventário.
- ESLint dos scripts alterados, `npx tsc --noEmit` e `git diff --check` passaram.
- Nenhuma fixture foi criada ou removida nesta revisão. Auth anônimo permaneceu sem alteração e Playwright não foi iniciado.

Antes de repetir `--fixtures-only`, confirme que as chaves do processo ainda pertencem exclusivamente ao staging, execute novamente a auditoria de schema somente leitura e confirme zero dados nas unidades reservadas. O runner deve parar se o ledger continuar ausente e uma versão de migration exigir prova formal de aplicação, se surgir FK sem handler ou se qualquer fixture/identidade não puder ser reconciliada por ID e marcador.

## Preparação do runner de Auth real — infraestrutura (24/10/2026)

Esta alteração fortalece `scripts/validate-staging-anonymous-browser.mjs`; **não executa a rodada integrada**. Nenhuma conexão, gravação ou alteração de Auth foi feita no Supabase durante esta etapa.

### Corrigido no runner

- O runner agora grava um relatório de recuperação em `test-results/<execução>-recovery.json` antes de preparar as fixtures e atualiza as fases, IDs, tentativas de Auth, dependências verificadas, contagens individuais de exclusão e auditoria final. O relatório não serializa variáveis de ambiente, chaves, JWTs, respostas de usuários ou dados pessoais.
- A confirmação de Auth é limitada a oito tentativas. Cada tentativa consulta tanto Management API quanto `/auth/v1/settings`, registra apenas HTTP e booleano e exige HTTP 200 com o estado esperado nos dois lados. A restauração só recebe `restored=true` após ambas confirmarem `false`; falha ou timeout mantém o relatório para recuperação.
- As fixtures Quintal e +54 são inseridas numa transação depois de locks e de uma verificação que recusa qualquer dado existente nas unidades fixas ou nos domínios dependentes consultados. Não há `UPSERT` nem substituição. São preparadas duas unidades, categorias e produtos sintéticos, uma regra fallback gratuita do Quintal e uma sessão de mesa +54 identificada por ID, unidade e número. A mesa sintética é criada antecipadamente para que o check-in reutilize exatamente essa sessão, sem adotar uma mesa encontrada por acaso.
- A limpeza opera por IDs retornados e marcadores da execução; a sessão de mesa também exige unidade e número. Ela registra contagens por tabela, remove dependências na ordem de FK, confere marcadores antes das fixtures de catálogo e só marca limpeza concluída após auditoria individual sem resíduos e confirmação do trigger de ownership habilitado. Não apaga por `LIKE` ou somente por unidade. Falha interrompe novos testes e mantém o relatório com os IDs já conhecidos.
- `scripts/lib/staging-anonymous-lifecycle.mjs` concentra a confirmação limitada e as garantias de escopo da inventariação. `npm run test:staging-lifecycle` cobre essas propriedades sem rede ou banco.

### Risco e recuperação

As tabelas de aplicação não guardam um marcador de execução em todos os registros. Por isso o runner persiste cada ID assim que é recebido e, para fixtures sem coluna de marcador (sessão de mesa), exige o conjunto exato ID + unidade + número. Se o processo for encerrado no intervalo entre o commit da fixture e a leitura dos IDs, a rotina falha fechada: mantém o plano de marcadores no relatório, não exclui registros desconhecidos e não inicia testes. A recuperação deve usar o JSON indicado no erro para identificar os IDs e validar referências; não use exclusões por unidade ou curingas. Se a restauração do Auth não for confirmada, a rodada continua reprovada e requer consulta administrativa manual do estado antes de qualquer nova rodada.

### Validação local e limites

- Testes locais do ciclo de vida, lint direcionado, TypeScript e `git diff --check`: resultados registrados no commit associado a esta atualização.
- Nenhum fixture, identidade Auth, pedido ou sessão foi criado no staging nesta etapa. Nenhum teste Playwright real contra Supabase foi executado, Auth anônimo não foi habilitado e o procedimento de recuperação/restauração ainda precisa ser comprovado numa rodada real autorizada.
- Portanto, a infraestrutura fica **preparada localmente**, mas não certificada para V1 até a rodada de staging confirmar criação, restauração efetiva, limpeza e ausência de resíduos.

O runner continuará fixo ao host de homologação e nunca usa `MODARA_STAGING_SECRET_KEY` no navegador. Como a chave não estava disponível nesta rodada, não foram executados signup/JWT/cookie Supabase reais, nem teste de REST real no Chrome. Auth anônimo permaneceu desabilitado; a fixture SQL usa claims sintéticos e não o habilita.
