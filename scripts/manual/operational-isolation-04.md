# Implementação 04 — PARCIAL / NÃO PUBLICÁVEL

Preparação local. Nenhuma migration remota aplicada. O acompanhamento atual do
cliente não foi modificado; não publicar este conjunto antes da 02B.

## Fronteira preparada

- Cozinha/Bar carregam `modara_station_board` via Server Action. A unidade vem do
  deployment e é conferida com a identidade/permissão no banco. O filtro precede LIMIT.
- Unidade derivada de Order -> ServiceSession -> modara_units; vínculos opcionais
  precisam concordar. Sem backfill, atribuição por produto ou exclusão de histórico.
- Só execuções persistidas são operáveis. Sem fallback para UPDATE orders.status.
- Transições/entregas usam as RPCs autorizadas da 03. Entrega exige waiter; FAST
  não ganha retirada ou garçom automaticamente.
- Realtime invalida a visão e recarrega snapshot autorizado, nunca incorpora payload
  diretamente. Não há polling. Respostas antigas são descartadas por geração.
- Auth change, foco, reconexão e eventos de permissões invalidam/limpam a visão.
  Revogação efetiva no banco é imediata para novas consultas e mutações.

## Migration candidata

`202610160001_modara_operational_isolation.sql`, após 01/02A/03.
Restrictive SELECT fences impedem policies permissivas antigas de liberar linhas.
UPDATE/DELETE diretos em orders e INSERT/UPDATE/DELETE em executions são revogados,
incluindo grants de coluna. A RPC antiga de entrega perde EXECUTE público.
Novas RPCs internas têm search_path fixo e ACL explícita. Vínculos de pedidos/visitas
com consumo não podem ser realocados por UPDATE legado.

Esta migration fecha leituras anon: **quebraria o acompanhamento atual se aplicada
sozinha**. Não aplicar antes da identidade/posse, separação Auth cliente/equipe e
adaptação das leituras do cliente previstas na 02B. Não adicionar bypass por telefone.
Não há permissão de quitar conta ou encerrar mesa adicionada aqui.

## Testes

Banco descartável localhost/modara_test, dependências sintéticas de 01/02A/03.
`node scripts/validate-operational-isolation.mjs --apply-local` aplica a candidata
completa uma vez. Repetir sem flag executa fixtures com rollback.
Testes reais de SQL/RLS/ACL + regressões 03; Auth JWT/REST/Realtime não são simulados
como evidência remota. Verificação de fonte do consumidor não é E2E de browser.

## Bloqueios de homologação

1. Concluir 02B e leituras próprias sem afetar clientes históricos.
2. Homologar Manager/Waiter e Account com RLS preparada; não declarar esses painéis
   integralmente isolados só porque a entrega foi protegida.
3. Verificar Realtime real com exclusão/revogação de permission rows, troca de Auth,
   desconexão, reconexão e eventos adversariais. DELETE filtrado/sem entrega de evento
   pode deixar conteúdo já carregado na tela até foco/ação; não declarar revogação
   visual instantânea comprovada. O banco continua negando novos acessos.
4. Inventariar ACL/RPCs remotas antes de ativar: o ambiente sintético não comprova
   ausência de funções não versionadas nem grants de roles adicionais.
5. Aplicar 01/02A/03/04 em ambiente de homologação, provisionar permissões explícitas,
   executar acessos diretos negativos + fluxo cliente/produção/entrega e só então
   autorizar rollout coordenado. Nunca habilitar Auth anônimo antes desse fechamento.

Recuperação: interromper superfícies incompatíveis e corrigir; não reabrir SELECT ou
UPDATE público como rollback. Dados históricos permanecem intactos.
