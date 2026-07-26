# Plano incremental

## Etapa 1 — Fundação local (PATCH-004)

- **Entrega:** tipos, perfil padrão, provider, extração da recepção e faixa de mesas.
- **Dependência:** nenhuma migration.
- **Risco:** baixo; os valores padrão reproduzem os hardcodes anteriores.
- **Aceite:** QR, Bem-vindo e Identificação mantêm comportamento.
- **Rollback:** remover provider/config e restaurar constantes locais.

## Etapa 2 — First Gesture (PATCH-005)

- **Entrega:** resolver semântico, adaptador do catálogo e componente universal.
- **Dependências:** configuração local do perfil; nenhuma migration.
- **Estado:** implementado com `drinks` no perfil padrão e `coffee` no cenário alternativo de validação.
- **Aceite:** `none` ou associação ausente não quebra o cardápio; nenhum componente conhece “bebida”, “café” ou “parrilla”.
- **Rollback:** configurar `firstGesture.type = 'none'`.

## Etapa 3 — Conteúdo da casa

- **Entrega:** apresentação inline concluída no PATCH-006; destaques e referências de produtos permanecem pendentes.
- **Dependência:** conteúdo auditado e aprovado.
- **Risco:** referências para itens indisponíveis.
- **Aceite:** identificadores semânticos validados contra catálogo e fallback sem quebra.

## Infraestrutura transversal — Experience Sections (PATCH-007)

- **Entrega:** sequência de seções configurada pelo `ExperienceProfile`, resolução segura e compositor único na página do cardápio.
- **Dependência:** nenhuma migration ou configuração remota.
- **Estado:** implementado com `first-gesture`, `house-presentation` e `categories`.
- **Aceite:** remover ou reordenar uma chave altera a composição sem modificar componentes React; chaves desconhecidas e seções sem conteúdo não interrompem a experiência.

## Fase 2 — Product Highlights (PATCH-008)

- **Entrega:** intenção semântica de destaques, resolução contra o catálogo de domínio e seção reutilizável registrada no Experience Sections.
- **Persistência:** nenhuma coluna, migration ou consulta específica de destaque.
- **Estado:** perfil padrão configurado com três produtos reais do catálogo; itens ausentes e repetidos são descartados com segurança.
- **Limitação:** enquanto o catálogo não possuir identificador semântico persistido aprovado, o perfil mantém um mapeamento explícito de identificador para nome.

## Fase 2 — Product Experience (PATCH-009)

- **Entrega:** experiência única de produto com resumo, Dialog de detalhes, disponibilidade, preço e adição ao carrinho.
- **Reutilização:** Categorias, Highlights e First Gesture continuam usando `MenuCard`, agora como exportação compatível da implementação canônica `ProductExperience`.
- **Separação:** seleção de produtos permanece no Engine; apresentação e interação permanecem na UI.
- **Persistência:** nenhuma alteração no Supabase ou no modelo de domínio.

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

1. Aprovar o PATCH-005.
2. Validar o fluxo completo no +54.
3. Resolver conteúdos editoriais adicionais do gesto.
4. Somente então decidir persistência e multi-tenant.
