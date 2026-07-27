import type { Category } from '@/types'
import { plus54JardimAquariusCatalog } from '@/data/catalog/plus54-jardim-aquarius.source'
import { defaultExperienceProfile } from '@/lib/config/experience'
import { validateHospitalityCuration } from '@/lib/hospitality/validate-hospitality-curation'

let productId = 0

const catalog: Category[] =
  plus54JardimAquariusCatalog.categories.map(
    (category, categoryIndex) => ({
      id: categoryIndex + 1,
      name: category.name,
      emoji: category.emoji,
      sort_order: category.sortOrder,
      menu_items: category.items.map((item) => ({
        id: ++productId,
        category_id: categoryIndex + 1,
        name: item.name,
        description: item.description,
        price: item.price,
        imageUrl: item.imageUrl,
        available: item.available,
      })),
    })
  )

const result = validateHospitalityCuration(
  catalog,
  defaultExperienceProfile
)

if (!result.success) {
  console.error(JSON.stringify(result, null, 2))
  process.exitCode = 1
} else {
  console.log(JSON.stringify(result, null, 2))
}
