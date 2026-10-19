# 02B — integração local; ativação remota bloqueada

## Implementado

Cliente usa `modara-customer-auth`, factory browser própria com `isSingleton:false`
e factory server exclusiva. Equipe mantém o cliente/cookie anterior. Proxy renova os
dois contextos preservando todos os Set-Cookie; namespaces não são autorização.
`signOutCustomer` é local ao cliente. Nenhum signup/password/OTP foi adicionado.

Check-in explícito solicita Auth anônimo e chama `modara_start_owned_service_session`.
Falha de Auth/persistência não usa fallback. Telefone não concede posse histórica.
Server API de pedidos verifica posse e usa cookies de cliente. Consulta de pedidos
exige CustomerSession + ServiceSession e a unidade ativa do servidor, nunca telefone.
Drawer recarrega a visão própria em eventos Realtime, sem incorporar payload arbitrário.
Gate revalida posse após refresh/Auth/foco. Falha 401/403 limpa o vínculo local e exige
nova identificação, preservando o número do QR; não altera proprietário no banco.

## Banco

Complementar `202610160002_modara_customer_identity_integration.sql`, após 04.
Não reescreve 01/02A/03/04. INSERT de orders exige posse e status pending. Leitura de
participantes exige posse ou autorização de equipe. Check-in e encerramento legados
perdem EXECUTE público; wrappers SECURITY DEFINER continuam acessando-os internamente.
Dados históricos não recebem backfill de proprietário.

## Evidência local

`node scripts/validate-customer-identity-integration.mjs --apply-local` aplica a
complementar integral somente em localhost/modara_test (uma vez). Sem flag repete
fixtures com rollback. Reutiliza testes 02A de atomicidade e testa INSERT/SELECT reais,
dois clientes na mesma mesa, FAST sem mesa, perda de identidade, legado e acesso
operacional negado. As tabelas-base e auth.uid/auth.jwt são sintéticos. Grants de
leitura das dependências do trigger invoker de orders são fornecidos pelas fixtures.
`validate-operational-isolation.mjs` mantém as regressões da 04 após a complementar.

## Não comprovado / bloqueios

- Supabase Auth/REST/JWT/Realtime reais, renovação de cookies, logout simultâneo e
  dois contextos no mesmo navegador ainda exigem homologação. Testes estruturais
  de factories não comprovam esses cenários.
- Conta compartilhada continua com endpoints/repositories no contexto padrão da
  equipe e superfícies legadas de leitura/mutação. Não foram adaptadas nesta etapa
  para evitar alterar regras financeiras. Não declarar privacidade de TODA a
  aplicação ou habilitar Auth anônimo enquanto esses caminhos permanecerem abertos.
  O drawer ainda inclui a experiência de conta existente: só o acompanhamento de
  pedidos foi convertido para participação própria.
- Resolver TableSession mantém a superfície legada necessária ao QR. Antes de
  ativar, auditar/restringir UPDATE/fechamento direto de mesas e RPCs financeiras
  para que clientes autenticados não herdem permissões amplas.
- Confirmar privilégios reais das dependências do trigger de orders e grants de
  coluna em customer_sessions; o bootstrap sintético não substitui esse inventário.
- Histórico sem proprietário não pode ser recuperado apenas com nome/telefone.
  Nova identificação cria nova participação; consumo histórico continua preservado.

## Ativação segura (NÃO autorizada nesta execução)

1. Fechar as superfícies legadas acima com autorização explícita e testes negativos,
   sem alterar cálculos, pagamentos ou regras de responsabilidade financeira.
2. Em homologação isolada, aplicar 01 -> 02A -> 03 -> 04 -> 02B e publicar o código
   coordenadamente; manter clientes antigos fora da janela de troca.
3. Habilitar Auth anônimo apenas em homologação após revisar TODAS as permissões
   herdadas por authenticated. Provisionar equipe com permissões explícitas.
4. Testar QR +54/FAST Quintal, dois clientes/mesma mesa, staff simultâneo, refresh,
   renovação/logout/perda de sessão, REST/RPC adversarial, Realtime e entrega parcial.
5. Só então solicitar autorização remota com backup, inventário atualizado e janela
   de manutenção. Não criar fallback público durante a transição ou rollback.

Estado: PARCIAL / NÃO PUBLICÁVEL. Nenhuma alteração remota ou habilitação de Auth
anônimo foi realizada. Não avançar para Purchase/MODARA-010.
