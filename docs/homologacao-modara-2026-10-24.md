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

O runner continuará fixo ao host de homologação e nunca usa `MODARA_STAGING_SECRET_KEY` no navegador. Como a chave não estava disponível nesta rodada, não foram executados signup/JWT/cookie Supabase reais, nem teste de REST real no Chrome. Auth anônimo permaneceu desabilitado; a fixture SQL usa claims sintéticos e não o habilita.
