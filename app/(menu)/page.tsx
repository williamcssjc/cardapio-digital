import { loadMenuCatalog } from '@/lib/catalog/load-menu-catalog'
import { getActiveImplementation } from '@/lib/platform/active-implementation'
import { requireActiveCapability } from '@/lib/platform/require-capability'
import { resolveExperienceSections } from '@/lib/experience/resolve-experience-sections'
import { ExperienceSections } from '@/components/experience/ExperienceSections'
import { RecommendationCatalogProvider } from '@/components/product/RecommendationCatalogProvider'
import { SearchExperience } from '@/components/search/SearchExperience'
import { MenuHero } from '@/components/brand/MenuHero'
import { ActiveTableSessionGate } from '@/components/session/ActiveTableSessionGate'
import { ServiceSessionIdentityGate } from '@/components/session/ServiceSessionIdentityGate'
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
  requireActiveCapability('catalog')

  const activeImplementation = getActiveImplementation()
  const brand = activeImplementation.brandIdentity
  const experienceProfile = activeImplementation.experienceProfile
  const capabilities = activeImplementation.capabilitiesProfile
  const catalogResult = await loadMenuCatalog()

  if (!catalogResult.ok) {
    return (
      <CatalogState>
        Não foi possível carregar o cardápio agora.
      </CatalogState>
    )
  }

  const menu = catalogResult.catalog
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

  const experienceSections = resolveExperienceSections(experienceProfile, menu)
  const content = (
    <ExperienceSections sections={experienceSections} />
  )

  return (
    <MenuExperienceShell brand={brand}>
      <MenuHero brand={brand} />

      {capabilities.enabled.recommendations ? (
        <RecommendationCatalogProvider categories={menu}>
          <SearchExperience categories={menu}>{content}</SearchExperience>
        </RecommendationCatalogProvider>
      ) : (
        <SearchExperience categories={menu}>{content}</SearchExperience>
      )}

    </MenuExperienceShell>
  )
}

export default function MenuPage() {
  return (
    <ActiveTableSessionGate>
      <ServiceSessionIdentityGate>
        <MenuContent />
      </ServiceSessionIdentityGate>
    </ActiveTableSessionGate>
  )
}
