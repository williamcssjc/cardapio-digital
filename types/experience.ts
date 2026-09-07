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
    maximum: number
  }
}

export type VisualTheme = {
  id: string
  className: string
}

export type HospitalityEntryStep =
  | 'guest-identification'
  | 'quick-drinks'
  | 'welcome'
  | 'familiarity'
  | 'house-introduction'
  | 'guest-choice'
  | 'guided-opening'
  | 'guided-main'
  | 'complete'

export type HospitalitySurfaceVisual = {
  imageUrl: string
  imageAlt: string
  imagePosition?: string
  contentAlignment?: 'left' | 'right'
  overlayStrength?: 'soft' | 'standard' | 'strong'
}

export type HospitalityVisualStep =
  | 'guest-identification'
  | 'quick-drinks'
  | 'welcome'
  | 'familiarity'
  | 'house-introduction'
  | 'guest-choice'

export type QuickDrinkDispatchState =
  | {
      status: 'idle'
    }
  | {
      status: 'selected' | 'sending' | 'error'
      requestKey: string
      productId: number
      quantity: number
    }
  | {
      status: 'sent'
      requestKey: string
      productId: number
      quantity: number
      orderId: number
      createdAt: string
    }

export type HouseIntroductionDetail = {
  title?: string
  description: string
}

export type GuidedRecommendationReference = {
  productIdentifier: string
  eyebrow?: string
  reason: string
  servingNote?: string
}

export type GuidedJourneyMomentRole =
  | 'opening'
  | 'beverage'
  | 'main'
  | 'complement'
  | 'custom'

export type GuidedJourneyMoment = {
  id: string
  role: GuidedJourneyMomentRole
  isPrimaryDecision?: boolean
  introduction: {
    eyebrow?: string
    title: string
    description?: string
  }
  recommendations: readonly GuidedRecommendationReference[]
  presentation: {
    addLabel: string
    alternativeLabel: string
    declineLabel: string
    continueLabel: string
    exploreLabel: string
  }
  behavior: {
    allowDirectAdd: boolean
    allowAlternative: boolean
    maxAlternatives: number
    advanceAfterAdd: boolean
    advanceAfterDecline: boolean
    allowSkip: boolean
  }
  completion: {
    addedMessage: string
    declinedMessage: string
    nextMomentMessage?: string
  }
}

export type GuidedJourneyConfig = {
  enabled: boolean
  moments: readonly GuidedJourneyMoment[]
  unavailable: {
    title: string
    description: string
    exploreLabel: string
  }
  completion: {
    eyebrow?: string
    title: string
    description?: string
    reviewOrderLabel: string
    exploreLabel: string
  }
}

export type GuidedJourneyStatus =
  | 'active'
  | 'moment-completed'
  | 'journey-completed'
  | 'unavailable'

export type GuidedJourneyDecisionType =
  | 'added'
  | 'declined'
  | 'explored'
  | 'unavailable'

export type GuidedJourneyDecision = {
  momentId: string
  productId?: number
  decision: GuidedJourneyDecisionType
}

export type GuidedJourneyState = {
  status: GuidedJourneyStatus
  currentMomentIndex: number
  recommendationIndex: number
  decisions: readonly GuidedJourneyDecision[]
}

export type HouseIntroductionContent = {
  specialty: {
    eyebrow?: string
    title: string
    description: string
    imageUrl?: string
    imageAlt?: string
  }
  houseDifferential?: HouseIntroductionDetail
  offeringOverview?: HouseIntroductionDetail
  orderingGuidance?: HouseIntroductionDetail
  introductionAction: string
  guestChoice: {
    title: string
    description?: string
    guided: {
      label: string
      description?: string
    }
    explore: {
      label: string
      description?: string
    }
  }
  guidedJourney?: GuidedJourneyConfig
}

export type HospitalityEntryContent = {
  welcomeEyebrow?: string
  welcomeTitle: string
  welcomeDescription?: string
  welcomeAction: string
  tableLabel: string
  firstVisitQuestion: string
  firstVisitDescription?: string
  firstVisitAction: string
  familiarGuestAction: string
  houseIntroduction?: HouseIntroductionContent
}

export type HospitalityEntryConfig = {
  enabled: boolean
  entryMode: 'table_qr'
  allowSkipIntroduction: boolean
  visuals?: Partial<
    Readonly<Record<HospitalityVisualStep, HospitalitySurfaceVisual>>
  >
  quickDrinks: {
    enabled: boolean
    eyebrow?: string
    title: string
    description?: string
    productIdentifiers: readonly string[]
    maximumOptions: number
    addLabel: string
    confirmLabel: string
    sendingLabel: string
    continueLabel: string
    skipLabel: string
    sentEyebrow?: string
    sentTitle: string
    sentDescription?: string
    errorTitle: string
    errorDescription: string
    retryLabel: string
    continueWithoutLabel: string
    unavailableMessage: string
  }
  transitions?: {
    enabled: boolean
    intensity: 'subtle' | 'standard'
  }
  content: HospitalityEntryContent
}

export type ExperienceProfile = {
  version: 1
  sections: readonly ExperienceSectionKey[]
  house: HouseProfile
  entry: HospitalityEntryConfig
}
