# Release da V1

Status: **checklist oficial**

Uma Release Candidate só pode ser criada quando todos os itens obrigatórios abaixo estiverem confirmados por evidência.

## Escopo

- [ ] Todos os itens `REQUIRED_BEFORE_V1` concluídos.
- [ ] Nenhuma funcionalidade V2 entrou implicitamente.
- [ ] Changelog, contexto e escopo refletem o build candidato.
- [ ] Nenhuma ação visível sem comportamento.

## Arquitetura

- [ ] Nenhuma regra de restaurante específico em componentes universais.
- [ ] ExperienceProfile continua fonte da experiência.
- [ ] BrandIdentity continua fonte visual.
- [ ] Repository/Mapper continuam fronteira do catálogo.
- [ ] Production Routing não usa nome ou categoria no runtime atual.
- [ ] Fallback histórico permanece único e identificado.
- [ ] Snapshot de pedido permanece imutável.

## Banco

- [ ] Schema-base reproduzível e versionado.
- [ ] Migrations aplicadas na ordem correta em ambiente limpo.
- [ ] 11 categorias e 57 produtos validados.
- [ ] 21 Bar / 36 Kitchen.
- [ ] 10 separation / 47 preparation.
- [ ] Zero NULL ou valor inválido nos contratos obrigatórios.
- [ ] Zero execução duplicada por pedido/estação.
- [ ] Backfills históricos auditados.
- [ ] Backup e restore testados.
- [ ] Plano de rollback documentado.

## Segurança

- [ ] RLS auditada em todas as tabelas públicas.
- [ ] Grants públicos mínimos.
- [ ] Painéis operacionais exigem papel adequado.
- [ ] INSERT/UPDATE/DELETE indevidos testados com anon.
- [ ] Preço e roteamento enviados pelo cliente são ignorados.
- [ ] RPCs validam estado e associação.
- [ ] Troca de mesa e sessão encerrada não permitem acesso indevido.
- [ ] Dados secretos não estão no bundle ou repositório.

## Cliente

- [ ] QR válido abre a mesa correta.
- [ ] Sessão é criada ou reutilizada sem duplicata.
- [ ] Nome e quantidade persistem.
- [ ] Bebida rápida é idempotente.
- [ ] Voltar, refresh e janela anônima funcionam.
- [ ] Jornada guiada e exploração funcionam.
- [ ] Busca com/sem acento e caixa funciona.
- [ ] Carrinho e pedidos incrementais funcionam.
- [ ] Minha Mesa atualiza por Realtime.
- [ ] Conta agrega a sessão inteira.
- [ ] Fechamento limpa o cliente e libera a mesa.
- [ ] Nenhuma rota legada reaparece no fluxo.

## Operação

- [ ] Pedido somente Bar.
- [ ] Pedido somente Kitchen.
- [ ] Pedido misto com estações independentes.
- [ ] Separação direta e preparação completa.
- [ ] Bar pronto antes da Cozinha.
- [ ] Cozinha pronta antes do Bar.
- [ ] Entrega parcial persistida.
- [ ] Garçom opera por mesa.
- [ ] Gerente enxerga estados independentes.
- [ ] Pedido só vira entregue após todas as entregas.
- [ ] Cancelamento não é sobrescrito.
- [ ] Múltiplos operadores não duplicam transições.

## Realtime

- [ ] Snapshot inicial consistente.
- [ ] Atualização sem refresh em Bar, Cozinha, Garçom e Gerente.
- [ ] Cliente recebe acompanhamento e fechamento.
- [ ] Sem polling.
- [ ] Sem listener por item.
- [ ] Sem subscriptions duplicadas.
- [ ] Reconexão testada.
- [ ] Cleanup confirmado.

## Responsividade e UX

- [ ] Mobile 320/375px.
- [ ] Tablet 768px.
- [ ] Desktop 1280px e maior.
- [ ] Baixa altura de viewport.
- [ ] Sem overflow horizontal.
- [ ] Ações primárias alcançáveis.
- [ ] Dialogs e drawers com scroll correto.
- [ ] Contraste e foco por teclado.
- [ ] Sem hydration mismatch.
- [ ] Fallback de imagem consistente.

## Qualidade técnica

- [ ] Validadores de catálogo, curadoria, routing, station, manager e delivery.
- [ ] `npm run lint` sem erros.
- [ ] `npx tsc --noEmit` sem erros.
- [ ] `npm run build` sem erros.
- [ ] `git diff --check` sem erros.
- [ ] Console sem erros.
- [ ] Sem código morto crítico.
- [ ] Sem logs temporários.
- [ ] Performance e bundle auditados.

## Simulação

- [ ] 1 gerente, 2 garçons, Bar e Cozinha simultâneos.
- [ ] 8 mesas e 15–20 clientes.
- [ ] 30 ou mais pedidos incrementais.
- [ ] Dois clientes na mesma mesa.
- [ ] Pedidos concorrentes.
- [ ] Produto indisponível.
- [ ] Refresh e perda de conexão.
- [ ] Sessão antiga e nova sessão na mesma mesa.
- [ ] Solicitação de conta e fechamento com pendências.

## Deploy e demonstração

- [ ] Vercel vinculada ao projeto correto.
- [ ] Env de produção verificada.
- [ ] Supabase de produção confirmado.
- [ ] QR Codes usam URL final.
- [ ] Dados demo limpos e realistas.
- [ ] Contas operacionais preparadas.
- [ ] Smoke test pós-deploy.
- [ ] Roteiro comercial de 10–15 minutos.
- [ ] Procedimento de suporte e rollback.

## Aprovação

- [ ] Product Owner aprovou o escopo entregue.
- [ ] Arquitetura aprovou desvios documentados.
- [ ] QA não possui P0 ou P1 aberto.
- [ ] Versão e tag de release definidas.
- [ ] Working tree limpo antes da tag.
