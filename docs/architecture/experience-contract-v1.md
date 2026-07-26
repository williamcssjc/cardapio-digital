# Contrato de experiência V1

Status: contrato TypeScript inicial implementado em `types/experience.ts`. É deliberadamente pequeno e atende ao fluxo atual do +54.

```ts
type ExperienceProfile = {
  version: 1
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
  signatureProductIds: readonly number[]
  initialGestureProductIds: readonly number[]
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

Para First Gesture, criar um contrato pequeno de gesto com título, tipo semântico, produtos referenciados e política de ausência. Só adicionar os campos quando os quatro conteúdos reais e as regras de disponibilidade estiverem aprovados.

