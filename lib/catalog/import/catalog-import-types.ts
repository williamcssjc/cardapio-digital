export type CatalogImportItem = {
  sourceKey: string
  name: string
  description: string | null
  price: number
  imageUrl: string | null
  available: boolean
}

export type CatalogImportCategory = {
  sourceKey: string
  name: string
  emoji: string | null
  sortOrder: number
  items: CatalogImportItem[]
}

export type CatalogImportSource = {
  source: {
    label: string
    unit: string
    apparentVersion: string
    references: string[]
  }
  categories: CatalogImportCategory[]
}

export type CatalogImportIssue = {
  sourceReference: string
  field:
    | 'sourceKey'
    | 'category'
    | 'name'
    | 'description'
    | 'price'
    | 'image'
    | 'available'
    | 'sortOrder'
  reason: string
}

export type CatalogImportValidation =
  | {
      success: true
      categoryCount: number
      itemCount: number
    }
  | {
      success: false
      issues: CatalogImportIssue[]
    }
