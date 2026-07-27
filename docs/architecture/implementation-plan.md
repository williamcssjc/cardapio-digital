
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

## Fase 2 — Recommendation Engine (PATCH-010)

- **Entrega:** Engine puro, resolver de conteúdo, Provider de catálogo e navegação entre produtos no mesmo Dialog. A curadoria local foi posteriormente transferida para Hospitality Memory.
- **Tipos:** recomendação do chef, harmonização e popularidade editorial determinística.
- **Integração:** Product Experience consome seções resolvidas e mantém apenas o produto ativo local; o carrinho continua no Zustand existente.
- **Persistência:** nenhuma tabela, migration, API, histórico, analytics ou IA.
- **Limitação:** a identidade semântica continua associada aos nomes reais por um mapa local compartilhado até existir um identificador persistido aprovado.

## Fase 2 — Hospitality Memory (PATCH-011)

- **Entrega:** domínio editorial próprio com memória tipada e seletores puros.
- **Conhecimento:** recomendações do chef, harmonizações, popularidade editorial, badges, prioridade e observações.
- **Integração:** Recommendation Engine mantém o contrato público e consulta somente seletores; resolver e UI permanecem inalterados.
- **Persistência:** memória local, sem Supabase, migration, Context ou Zustand.
- **Evolução:** uma implementação remota futura deverá preservar os seletores para não alterar os consumidores.

## Etapa 4 — Consistência visual

- **Entrega:** UI Foundation implementada no PATCH-012 com tokens primitivos, contrato semântico, tema `plus54` e primitives `Button`, `Surface` e `IconButton`.
- **Dependência:** tema aprovado.
- **Estado:** migração controlada concluída no card, CTA e fechamento da Product Experience; o restante da aplicação permanece em migração incremental.
- **Risco:** regressão visual.
- **Aceite:** contraste, foco, reduced motion e responsividade preservados.
- **Próximos candidatos:** superfícies de recomendação e controles compactos compartilhados, somente quando houver ganho comprovado. `Badge` permanece adiado até existir reutilização real.

## Etapa 5 — Fundação multiestabelecimento

- **Entrega:** entidades de restaurante/unidade, tenant em catálogo/pedidos, RLS e resolução segura.
- **Dependência:** segundo cliente real ou requisitos aprovados.
- **Migrations prováveis:** `restaurants`, `units`, chaves estrangeiras e índices de tenant.
- **Risco:** alto; dados e sessões existentes.
- **Estratégia:** migrations aditivas, backfill do +54, dupla leitura temporária, validação e só depois constraints.
- **Rollback:** manter colunas antigas e feature flag durante transição.

## Fase 3 — Search Experience (PATCH-013)

- **Entrega:** campo de busca integrado ao cardápio, índice local em memória, engine puro e resultados reutilizando Product Experience.
- **Campos atuais:** nome, descrição e categoria.
- **Normalização:** caixa, acentos, espaços externos e espaços duplicados.
- **Ordenação:** nome exato, início do nome, ocorrência parcial, categoria e posição original.
- **Integração:** busca vazia preserva Experience Sections; busca preenchida apresenta apenas resultados sem criar rota ou Dialog paralelo.
- **Persistência:** nenhuma API, tabela, migration ou cache remoto.
- **Evolução:** fuzzy search, busca semântica ou índice remoto somente mediante novo contrato aprovado; a Product Experience deve permanecer inalterada.

## Fase 3 — Menu Navigation (PATCH-014)

- **Entrega:** modelo puro de categorias, identidade navegável centralizada, barra sticky responsiva e sincronização da categoria ativa.
- **Identidade:** `Category.id` gera o alvo determinístico `menu-category-{id}` utilizado pelo link e pela seção real.
- **Interação:** links com fallback de âncora e scroll suave nativo; `scroll-margin-top` preserva o título abaixo das camadas sticky.
- **Sincronização:** `IntersectionObserver` local, sem listener contínuo, polling, Zustand ou persistência.
- **Busca:** a navegação pertence às Experience Sections e é ocultada naturalmente enquanto Search Experience apresenta resultados.
- **Persistência:** nenhuma tabela, migration ou estado remoto.
- **Evolução:** ajustes de layout ou navegação adicional devem reutilizar o mesmo modelo e identidade, sem transformar categorias em filtros ou rotas.

## Fase 3 — Performance & Image Delivery (PATCH-015)

- **Entrega:** `ProductArtwork` canônico, `next/image`, geometria estável e fallback compartilhado entre card, busca, Highlights, First Gesture e Product Dialog.
- **Proporções:** `1:1` para o artwork de 80px dos cards e `15:8` para o Dialog de até 480px; ambos usam crop com `object-fit: cover`.
- **Entrega responsiva:** `sizes="80px"` nos cards e `(max-width: 512px) calc(100vw - 32px), 480px` no Dialog; lazy loading padrão.
- **Prioridade:** nenhum preload ativo enquanto não houver uma imagem preenchida e comprovadamente crítica acima da dobra.
- **Fallback:** ausência, fonte inválida, origem não autorizada e falha de request preservam a mesma geometria e o símbolo semântico existente.
- **Renderização:** a Product Experience assina somente sua quantidade no carrinho e memoiza apenas a resolução de recomendações por produto ativo e catálogo.
- **Loading:** nenhum skeleton adicionado; a consulta atual é resolvida no Server Component e não apresentou espera client-side que o justificasse.
- **Persistência:** nenhuma alteração em `MenuItem`, Supabase, migrations ou curadoria.
- **Evolução:** autorizar somente `remotePatterns` observados no catálogo real; então validar política de cache, dimensões de origem e candidato único a LCP antes de ativar preload.

## Fase 4 — Supabase Integration Boundary (PATCH-016)

- **Entrega:** contrato `CatalogRepository`, composição server-only, implementação Supabase isolada, mapper defensivo e erros normalizados.
- **Dependências:** `Supabase → Repository → Mapper → Category[] → Experience Platform`; UI e engines não conhecem infraestrutura.
- **Consulta:** uma consulta de categorias com relação de produtos, sem N+1; categorias por `sort_order`/ID e produtos por nome/ID.
- **Domínio:** `Category` e `MenuItem` preservados; somente o mapper conhece nomes persistidos em snake_case.
- **Falhas:** configuração, query e dados raiz inválidos não expõem detalhes técnicos; catálogo carregado sem produtos possui estado próprio.
- **Cache:** `revalidate = 60` permanece na rota; nenhuma nova camada de cache foi criada.
- **Persistência:** nenhuma migration, tabela, coluna, RLS, service role ou carregamento client-side.
- **Evolução:** repository em memória para testes, fonte HTTP alternativa e cache por tags poderão implementar o mesmo contrato sem alterar Search, Navigation ou Product Experience.

## Fase 4 — Real Catalog Import & Validation (PATCH-017)

- **Fonte:** imagens do cardápio Colinas & Aquarius, aprovadas como fonte
  canônica inicial da demonstração comercial do +54 Jardim Aquarius.
- **Escopo preparado:** 11 categorias e 57 produtos do cardápio principal.
- **Exclusões deliberadas:** Cardápio Executivo; itens exclusivos das duas
  variantes divergentes de Bebidas; imagens sem associação individual
  autorizada.
- **Representação:** fonte TypeScript auditável com `sourceKey` estável,
  metadados da origem e ausência explícita de imagens.
- **Validação:** função pura para chaves, nomes, ordem, categorias, preços,
  campos opcionais e disponibilidade.
- **Persistência:** seed SQL transacional, determinístico e protegido por
  pré-condição exata do snapshot conhecido.
- **Estado:** importação preparada localmente; seed remoto não executado e
  aguardando aprovação explícita.
- **Arquitetura:** a importação permanece operacional e separada do fluxo de
  leitura implementado no PATCH-016.
- **Limitações:** ano e vigência comercial não confirmados; regras comerciais
  de Lanches e itens variáveis permanecem apenas no material-fonte porque o
  schema atual não possui campos próprios para horários ou modalidades.

## Etapa 6 — Configuração administrável

Aguardar requisitos do segundo restaurante. Não criar editor visual ou painel completo antes disso.

## Ordem recomendada

1. Aprovar o PATCH-005.
2. Validar o fluxo completo no +54.
3. Resolver conteúdos editoriais adicionais do gesto.
4. Somente então decidir persistência e multi-tenant.
