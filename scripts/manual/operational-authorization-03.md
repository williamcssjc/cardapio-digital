# Implementação 03 — fronteiras locais não integradas

## Inventário e responsável

| Operação atual | Dados / chamada | Responsável e decisão |
| --- | --- | --- |
| Produção | StationCard atualiza orders ou order_station_executions diretamente pelo browser | Equipe com kitchen/bar na unidade; nova RPC disponível, consumidor intacto |
| Entrega | confirm_station_execution_delivery(execution_id) pelo browser | Equipe com waiter; nova fronteira exige pedido com mesa; não é retirada FAST |
| Encerrar visita sem consumo | API service-session/close chama modara_close_service_session_without_consumption | Cliente proprietário somente se visita individual sem mesa/consumo; compartilhada bloqueada na nova fronteira |
| Consultar conta | API table-account, items/allocations/settlements | Cliente e equipe têm necessidades diferentes; policies públicas existentes não foram substituídas |
| Redistribuir responsabilidade | replace_table_account_item_allocations(item_id, version, allocations) | Altera responsabilidade de terceiros: falta decidir consentimento e autoridade do cliente/equipe; NÃO implementada nova permissão |
| Liquidar responsabilidade | settle_table_account_responsibility(table_id, customer_id, scope, key, created_by) | Não é gateway de pagamento. Posse não prova quitação; falta definir responsável autorizado; bloqueio de produto |
| Encerrar conta da mesa | close_table_account_session(table_id) | Saldo zero não prova autorização; falta definir responsável pela mesa compartilhada |
| Encerrar visita pela equipe | RPC de visita atual não exige operador | management é consulta, não autorização implícita de encerramento; decisão necessária |

As APIs de conta hoje exigem capability, não posse nem associação operacional. A UI
TableAccountExperience expõe divisão/liquidação/encerramento no fluxo da mesa. Não é
correto presumir que todas as ações são exclusivas de funcionários, nem autorizá-las
ao cliente apenas por possuir uma participação. Nenhuma RPC financeira foi envolvida
por uma guarda arbitrária; testes de negação financeira permanecem bloqueados.

## Escopo e autoridade

- Execution.order_id -> Order.service_session_id -> ServiceSession.unit_id -> modara_units.
- Vínculos opcionais de mesa/participante/customer devem concordar com essa visita.
- Nenhuma inferência por produto, telefone, marca, default ou unidade de validação.
- Pedido sem visita/unidade canônica resolvível é negado pela nova fronteira.
- expected_unit_id é apenas uma asserção do contexto; RPC também exige permissão
  do chamador na unidade real. expected_station não altera a estação persistida.
- RPCs de equipe recusam JWT is_anonymous mesmo se houver associação acidental.
- Leitura/carga inicial/realtime globais NÃO foram corrigidos nesta etapa.
- Capability continua verificada pelo adaptador server-side; perfis ainda não estão
  persistidos no banco. RPCs não consultam configuração Next nem implementam retirada.
- Não há migração dos dados históricos, alteração de status financeiro ou exclusão.

## PostgreSQL local

Pré-requisitos: banco descartável modara_test com os fixtures locais de 01/02A.
`node scripts/validate-operational-authorization.mjs --bootstrap-local` cria somente
dependências ausentes das execuções e aplica a migration nova completa. Não repetir
bootstrap se já executado; `node scripts/validate-operational-authorization.mjs`
repete apenas os testes, sempre com rollback das fixtures.

O harness usa definições exatas das funções/triggers de produção e entrega extraídas
das migrations 027A/028A. NÃO executa os backfills comerciais dessas migrations.
As tabelas-base e auth.uid/auth.jwt são sintéticos. Os testes usam PostgreSQL real,
SET ROLE e chamadas diretas às RPCs. Isso não comprova REST, emissão de JWT pelo
Supabase, cookies ou Realtime. Os grants legados não são revogados nem considerados
seguros pelo teste. Não usar o bootstrap fora do banco local descartável.

## Ativação futura (nova autorização necessária)

1. Resolver as decisões de conta/encerramento compartilhado e a separação Auth 02B.
2. Preparar e testar a migração de escopo/policies e a revogação dos caminhos legados,
   incluindo EXECUTE herdado de PUBLIC. Não basta esconder botões ou conceder RPC nova.
3. Aplicar fundações remotas após inventário/backup/aprovação; Auth anônimo continua OFF.
4. Provisionar vínculos e permissões explicitamente; validar acesso da equipe.
5. Integrar consumidores novos em janela controlada; fechar escrita direta e RPCs
   legadas em conjunto. Clientes antigos devem receber erro seguro, não fallback público.
6. Validar acesso direto (REST/RPC), leitura/RLS/realtime por unidade e posse do cliente.
7. Só habilitar Auth anônimo e publicar o check-in 02B após os testes negativos passarem.

Rollback não deve reabrir acessos públicos: suspender a superfície afetada e corrigir.
Enquanto grants/policies antigos existirem, há caminhos de bypass conhecidos.
Não declarar concluída a segurança operacional ou habilitar identidade anônima.
