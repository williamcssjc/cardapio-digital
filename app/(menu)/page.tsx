import { loadMenuCatalog } from '@/lib/catalog/load-menu-catalog'
import { defaultExperienceProfile } from '@/lib/config/experience'
import { resolveExperienceSections } from '@/lib/experience/resolve-experience-sections'
import { ExperienceSections } from '@/components/experience/ExperienceSections'
import { RecommendationCatalogProvider } from '@/components/product/RecommendationCatalogProvider'
import { SearchExperience } from '@/components/search/SearchExperience'
import { MenuHero } from '@/components/brand/MenuHero'
import { ActiveTableSessionGate } from '@/components/session/ActiveTableSessionGate'
import { MenuExperienceShell } from '@/components/menu/MenuExperienceShell'

export const revalidate = 60

function CatalogState({ children }: { children: string }) {
  return (
    <main className="menu-page grid min-h-dvh place-items-center px-6">
      <div className="menu-empty text-center">
        <h1 className="menu-empty__title">Um momento.</h1>
        <p className="menu-empty__copy">{children}</p>
      </div>
    </main>
  )
}

async function MenuContent() {
  const catalogResult = await loadMenuCatalog()

  if (!catalogResult.ok) {
    return (
      <CatalogState>
        Não foi possível carregar o cardápio agora.
      </CatalogState>
    )
  }

  const menu = catalogResult.catalog
  const brand = defaultExperienceProfile.brandIdentity
  const hasProducts = menu.some(
    (category) => (category.menu_items?.length ?? 0) > 0
  )

  if (!hasProducts) {
    return (
      <CatalogState>
        O cardápio está sendo preparado.
      </CatalogState>
    )
  }

  const experienceSections = resolveExperienceSections(
    defaultExperienceProfile,
    menu
  )

  return (
    <MenuExperienceShell brand={brand}>
      <MenuHero brand={brand} />

      <RecommendationCatalogProvider categories={menu}>
        <SearchExperience categories={menu}>
          <ExperienceSections sections={experienceSections} />
        </SearchExperience>
      </RecommendationCatalogProvider>

    </MenuExperienceShell>
  )
}

export default function MenuPage() {
  return (
    <ActiveTableSessionGate>
      <MenuContent />
    </ActiveTableSessionGate>
  )
}
