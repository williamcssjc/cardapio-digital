export type HouseTone = 'warm' | 'editorial' | 'direct'

export type ExperienceSectionKey =
  | 'first-gesture'
  | 'house-presentation'
  | 'highlights'
  | 'categories'

export type FirstGesture =
  | {
      type: 'featured-category'
      role: string
    }
  | {
      type: 'featured-product'
      identifier: string
    }
  | {
      type: 'message'
      title: string
      description?: string
    }
  | {
      type: 'none'
    }

export type CatalogSemantics = {
  categoryRoles: Readonly<Record<string, string>>
  productIdentifiers: Readonly<Record<string, string>>
}

export type HousePresentationContent = {
  title: string
  paragraphs: readonly string[]
}

export type HousePresentationConfig = {
  eyebrow?: string
  title: string
  description: string
  actionLabel?: string
  actionContent?: HousePresentationContent
}

export type HighlightsConfig = {
  eyebrow?: string
  title: string
  description?: string
  productIdentifiers: readonly string[]
}

export type HouseProfile = {
  id: string
  name: string
  shortName: string
  description?: string
  story?: string
  personality: readonly string[]
  tone: HouseTone
  welcome: {
    title: string
    message: string
    tableUnavailableMessage: string
    invitationLabel: string
  }
  reception: {
    eyebrow: string
    namePrompt: string
    nameLabel: string
    namePlaceholder: string
    partySizePrompt: string
    partySizeHint: string
    continueLabel: string
    loadingLabel: string
  }
  media: {
    welcomeImage: string
    welcomeImageAlt: string
  }
  signatureProductIdentifiers: readonly string[]
  firstGesture: FirstGesture
  catalogSemantics: CatalogSemantics
  presentation?: HousePresentationConfig
  highlights?: HighlightsConfig
}

export type OperationalRules = {
  tableIdentification: {
    minimumNumber: number
    maximumNumber: number
  }
  partySize: {
    required: boolean
    minimum: number
  }
}

export type VisualTheme = {
  id: string
  className: string
}

export type ExperienceProfile = {
  version: 1
  sections: readonly ExperienceSectionKey[]
  house: HouseProfile
  operationalRules: OperationalRules
  visualTheme: VisualTheme
}
