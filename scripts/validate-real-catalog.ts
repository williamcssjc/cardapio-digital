import { plus54JardimAquariusCatalog } from '@/data/catalog/plus54-jardim-aquarius.source'
import { validateCatalogImport } from '@/lib/catalog/import/catalog-import-validator'

const result = validateCatalogImport(plus54JardimAquariusCatalog)

if (!result.success) {
  console.error(JSON.stringify(result, null, 2))
  process.exitCode = 1
} else {
  console.log(JSON.stringify(result, null, 2))
}
