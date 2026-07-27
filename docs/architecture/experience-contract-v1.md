# Contrato de experiência V1

Status: contrato TypeScript inicial implementado em `types/experience.ts`. É deliberadamente pequeno e atende ao fluxo atual do +54.

```ts
type ExperienceProfile = {
  version: 1
  sections: readonly ExperienceSectionKey[]
  house: HouseProfile
  operationalRules: OperationalRules
  visualTheme: VisualTheme
}

type HouseProfile = {
  id: string
  name: string
  shortName: string
  description?: string
  story?: string
  personality: readonly string[]
  tone: 'warm' | 'editorial' | 'direct'
  welcome: WelcomeContent
  reception: ReceptionContent
  media: HouseMedia
  signatureProductIdentifiers: readonly string[]
  firstGesture: FirstGesture
  catalogSemantics: CatalogSemantics
  presentation?: HousePresentationConfig
  highlights?: HighlightsConfig
}

type OperationalRules = {
  tableIdentification: {
    minimumNumber: number
    maximumNumber: number
  }
  partySize: {
    required: boolean
    minimum: number
  }
}

type VisualTheme = {
  id: string
  className: string
}
```

## Separação

- **Hospitality engine:** componentes, stores, rotas e serviços que executam a jornada. Não faz parte do objeto de configuração.
- **House profile:** conteúdo e referências comerciais/editoriais.
- **Operational rules:** valores que alteram validação ou comportamento.
- **Visual theme:** identifica a aplicação visual; os valores continuam nos tokens CSS.

## Resolução e fallback atuais

`defaultExperienceProfile` é a única configuração ativa. Ele lê:

- `NEXT_PUBLIC_RESTAURANT_ID`, com fallback `default`;
- `NEXT_PUBLIC_RESTAURANT_NAME`, com fallback `(+54) PARRILLA`.

O `ExperienceProvider` aceita outro perfil por propriedade, mas usa o padrão quando nenhum é fornecido. O hook também retorna o padrão se estiver fora do provider. Assim, ausência de injeção não interrompe o fluxo.

## Decisões deliberadas

- Sem page builder ou blocos arbitrários.
- Sem fetch remoto de configuração.
- Sem schema/migration para perfis.
- Sem seleção de tenant por URL.
- Sem sobreposição de regras por unidade.
- Arrays de destaque e primeiro gesto começam vazios; o sistema não inventa produtos.

## Próxima extensão permitida

O First Gesture foi implementado no PATCH-005 com intenção semântica. O motor aceita `featured-category`, `featured-product`, `message` e `none`; ele nunca recebe nem devolve IDs de persistência. A associação entre papéis semânticos e nomes do catálogo pertence ao Perfil da Casa e é resolvida fora do motor.

House Presentation foi adicionada no PATCH-006 como conteúdo opcional do Perfil da Casa. Ela contém apenas texto resumido e conteúdo editorial expandido. Não contém tema visual, regra operacional ou decisão de fluxo.

Product Highlights foi adicionado no PATCH-008 como configuração opcional do Perfil da Casa. O perfil fornece título, descrição e uma lista ordenada de identificadores semânticos. O Hospitality Engine produz apenas essa intenção; a associação com `MenuItem` acontece depois, na camada de resolução de conteúdo.

Não existe campo de destaque no Supabase. Como o catálogo atual não expõe um identificador semântico persistido, `CatalogSemantics.productIdentifiers` mantém temporariamente o mapeamento explícito entre identificadores estáveis da experiência e nomes reais do catálogo. Essa limitação deve ser reavaliada apenas quando houver uma origem persistente aprovada para identificadores semânticos.

## Product Experience

Product Experience pertence à camada de interface e é implementada uma única vez pelo componente canônico exportado também como `MenuCard`. Categorias, Highlights, First Gesture e futuras origens recebem o mesmo `MenuItem` de domínio e reutilizam a mesma apresentação, Dialog de detalhes e integração com o carrinho.

O Hospitality Engine decide quais produtos apresentar. A Product Experience decide somente como mostrar o produto, abrir seus detalhes e encaminhar a adição ao Zustand já existente. Ela não acessa Supabase, não interpreta o `ExperienceProfile` e não contém conhecimento do estabelecimento.

## Recommendation Engine

O Recommendation Engine recebe a identidade textual canônica de um produto e retorna intenções agrupadas como `chefRecommendation`, `pairingRecommendation` e `popularRecommendation`. Desde o PATCH-011, ele não armazena curadoria: todo conhecimento editorial é obtido exclusivamente pelos seletores públicos da Hospitality Memory. O Engine não recebe `MenuItem` e não acessa React, Context, Zustand, Supabase ou `ExperienceProfile`.

Um resolver puro transforma as intenções em `MenuItem` do domínio utilizando o catálogo fornecido pelo `RecommendationCatalogProvider`. Referências ausentes, repetidas e autorreferências são descartadas. Se uma seção não possuir produtos resolvidos, ela não chega à interface.

O Provider fica na fronteira de composição da página e apenas disponibiliza o catálogo já carregado. A Product Experience mantém `activeProduct` local durante o Dialog; selecionar uma recomendação substitui o conteúdo no mesmo Dialog, e fechar restaura o produto original.

Os identificadores existentes foram centralizados em `lib/catalog/product-identifiers.ts`. Isso evita um segundo sistema de identidade, mas permanece uma solução local baseada no nome do produto enquanto o catálogo persistido não expõe um identificador semântico próprio.

## Hospitality Memory

Hospitality Memory é a fonte oficial de conhecimento editorial local do restaurante. Seus registros podem conter recomendações do chef, harmonizações, popularidade editorial, badges, prioridade de recomendações e observações editoriais. A estrutura interna não é consumida por componentes React.

O acesso público acontece por seletores puros: `getProductHospitality`, `getChefRecommendations`, `getPairings`, `getPopularTogether`, `getProductBadges`, `getHospitalityMetadata` e `getRecommendationsByKind`. Badges, notas e prioridade já fazem parte do contrato do domínio, mas somente a prioridade influencia a ordem das intenções nesta versão. Nenhuma badge ou nota é renderizada.

A memória atual é local, determinística e sem persistência. Uma futura origem remota poderá substituir seu armazenamento desde que preserve os seletores; Recommendation Engine, resolver e Product Experience não precisarão conhecer essa mudança.

## UI Foundation

A UI Foundation é uma camada exclusivamente visual entre o tema e os componentes de domínio. Tokens primitivos definem escalas estruturais; tokens semânticos expressam intenções visuais; o tema `plus54` associa essas intenções à identidade atual. Nenhum primitive conhece `MenuItem`, Hospitality Memory, Recommendation Engine, Supabase, Zustand ou regras comerciais.

O conjunto inicial foi limitado ao uso comprovado:

- `Button`: botão nativo, variantes visuais existentes, loading e disabled reais;
- `Surface`: superfícies base, elevada e interativa;
- `IconButton`: ação compacta com nome acessível obrigatório.

Não foi criado `Badge`, pois ainda não existem usos concretos suficientes. Product Experience valida a fundação consumindo `Button`, `Surface` e `IconButton`, sem transferir para eles qualquer decisão de produto.

Temas futuros deverão fornecer o mesmo contrato de tokens semânticos. Não existe seletor, persistência ou troca de tema em runtime nesta versão.

## Search Experience

Search Experience é um ponto de entrada local para o mesmo catálogo já utilizado pelas Experience Sections. Ela recebe as categorias carregadas pela composição da página e alterna apenas a apresentação: consulta vazia mantém as seções originais; consulta preenchida apresenta resultados que reutilizam a Product Experience canônica.

O Search Index é uma representação imutável em memória. Cada entrada mantém o `MenuItem`, a posição original e versões normalizadas do nome, descrição e categoria. A criação do índice ocorre somente quando a referência do catálogo muda.

O Search Engine é puro e recebe apenas consulta e índice. Ele remove diferenças de caixa, acentos, espaços externos e espaços duplicados. A prioridade determinística é:

1. nome exato;
2. início do nome;
3. ocorrência no nome ou descrição;
4. ocorrência na categoria;
5. posição original do catálogo como desempate.

React não contém regras de correspondência ou ordenação. Search Engine e Search Index não acessam Supabase, Zustand, Dialog, Hospitality Memory ou Recommendation Engine. Uma futura origem remota poderá produzir o mesmo contrato de índice ou substituir a consulta na fronteira de composição sem criar um segundo fluxo de produto.

Esta versão não inclui fuzzy search, busca semântica, IA, autocomplete, histórico, filtros, analytics ou persistência.
