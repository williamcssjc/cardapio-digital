# Plano incremental

## Etapa 1 — Fundação local (PATCH-004)

- **Entrega:** tipos, perfil padrão, provider, extração da recepção e faixa de mesas.
- **Dependência:** nenhuma migration.
- **Risco:** baixo; os valores padrão reproduzem os hardcodes anteriores.
- **Aceite:** QR, Bem-vindo e Identificação mantêm comportamento.
- **Rollback:** remover provider/config e restaurar constantes locais.

## Etapa 2 — First Gesture

- **Entrega:** componente universal que recebe conteúdo configurado e pode ser omitido.
- **Dependências:** quatro ofertas reais do +54, disponibilidade e imagens aprovadas.
- **Arquivos prováveis:** `types/experience.ts`, `lib/config/experience.ts`, novo componente de experiência e composição da jornada.
- **Migration:** nenhuma se a validação começar em arquivo; futura persistência deve ser decidida separadamente.
- **Risco:** alterar navegação pós-identificação.
- **Aceite:** ausência de configuração mantém o caminho atual; componente não conhece “bebida” ou “parrilla”.
- **Rollback:** desligar configuração do gesto.

## Etapa 3 — Conteúdo da casa

- **Entrega:** apresentação, destaques e referências de produtos.
- **Dependência:** conteúdo auditado e aprovado.
- **Risco:** referências para itens indisponíveis.
- **Aceite:** IDs validados contra catálogo e fallback sem quebra.

## Etapa 4 — Consistência visual

- **Entrega:** migrar cores inline dos componentes tocados para tokens semânticos.
- **Dependência:** tema aprovado.
- **Risco:** regressão visual.
- **Aceite:** contraste, foco, reduced motion e responsividade preservados.

## Etapa 5 — Fundação multiestabelecimento

- **Entrega:** entidades de restaurante/unidade, tenant em catálogo/pedidos, RLS e resolução segura.
- **Dependência:** segundo cliente real ou requisitos aprovados.
- **Migrations prováveis:** `restaurants`, `units`, chaves estrangeiras e índices de tenant.
- **Risco:** alto; dados e sessões existentes.
- **Estratégia:** migrations aditivas, backfill do +54, dupla leitura temporária, validação e só depois constraints.
- **Rollback:** manter colunas antigas e feature flag durante transição.

## Etapa 6 — Configuração administrável

Aguardar requisitos do segundo restaurante. Não criar editor visual ou painel completo antes disso.

## Ordem recomendada

1. Aprovar o PATCH-004.
2. Resolver pendências de conteúdo do First Gesture.
3. Implementar First Gesture com fallback.
4. Validar o fluxo completo no +54.
5. Somente então decidir persistência e multi-tenant.

