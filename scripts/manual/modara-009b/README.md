# MODARA-009B: procedimento manual, exclusivamente local

**Preparado, nao executado.** Nao representa validacao aprovada. Pare no primeiro
erro inesperado e envie a saida antes de tentar novamente. Nunca execute estes
arquivos no Supabase. Nao use connection strings nem credenciais remotas.

## Dependencias examinadas e adaptacao declarada

- `202609080001_modara_003_catalog_management.sql`: tabela de administradores,
  predicado `modara_is_catalog_admin`, guard `modara_require_catalog_admin` e grants.
- `202609200001_modara_009a_catalog_isolation.sql`: unidade persistente, vinculos
  de catalogo e verificacao produto/categoria por unidade.
- `202609280001_modara_009b_pricing_promotions.sql`: migration original completa.
- `202610050001_modara_009b_buy_get_quantity.sql`: candidata completa.

PostgreSQL puro nao fornece `auth.users`, `auth.uid()`, roles `anon`/`authenticated`
nem PostgREST. O bootstrap cria uma **interface local reduzida**: dois UUIDs
sinteticos, `auth.uid()` lendo `request.jwt.claim.sub`, roles NOLOGIN e as mesmas
regras de autorizacao administrativa. `SET LOCAL ROLE` exercita ACL/RLS de verdade;
`SET LOCAL request.jwt.claim.sub` simula a identidade, nao valida JWT nem login.
Essa simulacao jamais deve ir para producao: um cliente SQL pode escolher o claim.

Roles sao globais ao cluster PostgreSQL. O bootstrap cria anon/authenticated somente
se ausentes e rejeita roles preexistentes privilegiadas ou com memberships.
Nao modifica roles existentes e nao as exclui automaticamente ao final.

Nao reaplicamos toda a historia do produto: migrations anteriores exigem o catalogo
historico especifico (11 categorias/57 produtos) e dominios alheios a Pricing.
O bootstrap reproduz somente as colunas de catalogo consumidas pelo SQL de Pricing,
FKs e leitura publica, com tres produtos sinteticos. A consistencia categoria/unidade
usa uma FK composta local em vez do trigger 009A. Nao valida Catalog Admin,
modifiers, Order Engine, Account Core, Realtime ou as policies completas do catalogo.
Nenhuma extensao adicional e necessaria para as duas migrations de Pricing.

As DUAS migrations de Pricing sao incluidas por `\ir`, sem extrair/remover trechos,
com seus proprios BEGIN/COMMIT. Nao use `psql --single-transaction` neste roteiro.

## Ordem obrigatoria (PowerShell, na pasta do repositorio)

Cada chamada psql usa localhost:5432/modara_test. `-W` solicita a senha somente no
terminal; nao a coloque no comando, no chat ou em arquivo do projeto. Cada arquivo
de entrada valida banco, usuario e endereco loopback antes de modificar o banco.

### 0. Preparar variaveis e conferir hashes (nao executa SQL)

```powershell
Set-Location 'C:\Users\Administrator\Documents\cardapio-digital'
$psql = 'C:\Program Files\PostgreSQL\18\bin\psql.exe'
$localArgs = @('-X','-W','-h','localhost','-p','5432','-U','postgres','-d','modara_test','-v','ON_ERROR_STOP=1','--echo-errors')
$original = 'supabase/migrations/202609280001_modara_009b_pricing_promotions.sql'
$candidate = 'supabase/migrations/202610050001_modara_009b_buy_get_quantity.sql'
if ((Get-FileHash $original -Algorithm SHA256).Hash -ne '7FAD1B2FA0F03CE699E6D33B10658F485E557BFAEC6C7307BEB2BF3146BA98B5') { throw 'Hash original divergente: PARE' }
if ((Get-FileHash $candidate -Algorithm SHA256).Hash -ne '2914F82CE96FDAB570DA172DEF0084D05F76CB41194D8A5C64B06F811A6B9233') { throw 'Hash candidata divergente: PARE' }
function Invoke-Local009b([string]$file) {
  & $psql @localArgs -f $file
  if ($LASTEXITCODE -ne 0) { throw "PARE: falha em $file" }
}
```

### 1. Harness existente de conflitos: PRIMEIRO, no banco ainda vazio

O gerador abaixo nao conecta ao banco. Produz SQL das funcoes reais e os 18 casos
ja definidos no validator. O SQL resultante cria tabelas reduzidas e faz ROLLBACK.
Nao execute esse harness depois do bootstrap: as tabelas ja existirao.

```powershell
$conflictSql = & npx.cmd tsx scripts/validate-pricing-schedule-conflicts.ts --print-sql
if ($LASTEXITCODE -ne 0) { throw 'Falha gerando harness: PARE' }
$conflictFile = Join-Path $env:TEMP 'modara-009b-conflicts-local.sql'
[System.IO.File]::WriteAllText($conflictFile, ($conflictSql -join "`n"), [System.Text.UTF8Encoding]::new($false))
& $psql @localArgs -f scripts/manual/modara-009b/guard.sql -f $conflictFile
if ($LASTEXITCODE -ne 0) { throw 'Falha no harness: PARE' }
```

Esperado: comandos DO/SELECT sem ERROR e ROLLBACK final. Cobre DATE, WEEKLY,
DATE_RANGE, limites inclusivos/exclusivos, recorrencias sem fim, DST gap/fold,
intersecao categoria/produto, targets distintos, autoedicao e lifecycle na funcao
de conflitos. Este harness ISOLADO nao e prova da migration completa.

### 2. Bootstrap e migration original completa

Execute uma linha de cada vez, aguarde e confira o PASS antes da proxima:

```powershell
Invoke-Local009b 'scripts/manual/modara-009b/01-bootstrap.sql'
Invoke-Local009b 'scripts/manual/modara-009b/02-original-and-fixtures.sql'
```

### 3. Provas negativas de preflight e rollback da candidata

```powershell
Invoke-Local009b 'scripts/manual/modara-009b/02b-preflight-rejection.sql'
Invoke-Local009b 'scripts/manual/modara-009b/03-rollback-proof.sql'
```

**Somente nesses dois arquivos ERROR e esperado.** O primeiro deve mostrar
`legacy_timezone_mismatch`. O segundo deve chegar perto do final e mostrar
`cannot change return type of existing function` em `modara_pricing_contract_version`.
Erros posteriores de transacao abortada sao consequencia desse erro esperado.
Confira a PRIMEIRA falha: se for outra, PARE mesmo que as assertions de rollback
imprimam PASS. Elas comprovam ausencia de efeitos, nao a origem do erro.
O conflito de tipo e criado somente neste banco para forcar rollback tardio;
o arquivo remove essa funcao sentinela depois das assertions.

### 4. Migration candidata completa: sucesso obrigatorio

```powershell
Invoke-Local009b 'scripts/manual/modara-009b/04-apply-candidate.sql'
```

Esperado: COMMIT e PASS, sem ERROR. Aqui a migration completa e realmente aplicada
ao banco local, com backfill BUY historico = 1 e timezone das duas unidades.

### 5. Testes integrados sobre schema real de Pricing

```powershell
Invoke-Local009b 'scripts/manual/modara-009b/05-integrated-tests.sql'
```

Esperado: ROLLBACK e PASS. Erros negativos sao capturados e verificados por SQLSTATE
e mensagem quando aplicavel. Qualquer erro inesperado interrompe psql.
Cobre anon, authenticated nao-admin, admin sem escrita direta, RPC, contrato v2,
payload timezone adulterado, trigger timezone/IANA, cross-unit de ID/target,
required_quantity, snapshot admin, public ACTIVE/PAUSED, edicao do mesmo ID,
conflito real categoria/produto via save, targets distintos, arquivamento,
auditoria e ausencia de campanhas de RPCs que falharam.

Estado esperado final: schema de Pricing completo; dois produtos Quintal e um +54
SINTETICOS; duas campanhas legadas sinteticas; auditoria vazia. Os testes integrados
nao deixam suas novas campanhas. Sequences podem avancar mesmo com ROLLBACK (normal).
O banco permanece disponivel para inspecao, sem limpeza destrutiva automatica.

## Resultado a enviar

Envie as saidas dos passos 1 a 5, principalmente qualquer ERROR, o COMMIT da etapa 4
e os PASS finais. Nao envie senha. Se houve interrupcao, nao reaplique arquivos sobre
estado parcial e nao execute DROP/limpeza improvisada: envie o ponto da falha.

Nenhum teste deste pacote foi executado por quem o preparou. Sem o resultado manual
nao ha veredito de seguranca para aplicacao remota. Mesmo com PASS, nao prova JWT,
PostgREST, RLS de outros dominios, concorrencia de saves nem equivalencia completa
de versoes de tzdata entre Node, PostgreSQL local e Supabase. O inventario remoto
e conhecido pelo relato do fundador; este procedimento nao acessa producao.
