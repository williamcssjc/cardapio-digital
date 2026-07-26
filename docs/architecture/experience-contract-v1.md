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
