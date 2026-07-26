export type HouseTone = 'warm' | 'editorial' | 'direct'

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
  signatureProductIds: readonly number[]
  initialGestureProductIds: readonly number[]
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
  house: HouseProfile
  operationalRules: OperationalRules
  visualTheme: VisualTheme
}

