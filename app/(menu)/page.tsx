import { loadMenuCatalog } from '@/lib/catalog/load-menu-catalog'
import { MenuDrawers } from '@/components/menu/MenuDrawers'
import { defaultExperienceProfile } from '@/lib/config/experience'
import { resolveExperienceSections } from '@/lib/experience/resolve-experience-sections'
import { ExperienceSections } from '@/components/experience/ExperienceSections'
import { RecommendationCatalogProvider } from '@/components/product/RecommendationCatalogProvider'
import { SearchExperience } from '@/components/search/SearchExperience'
import { BrandMark } from '@/components/brand/BrandMark'
import { MenuHero } from '@/components/brand/MenuHero'
import { ActiveTableSessionGate } from '@/components/session/ActiveTableSessionGate'

export const revalidate = 60

function CatalogState({ children }: { children: string }) {
  return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--parrilla-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <p style={{
        color: 'var(--parrilla-muted)',
        fontSize: '13px',
      }}>
        {children}
      </p>
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
    <main style={{ minHeight: '100vh', background: 'var(--parrilla-bg)' }}>
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: 'rgba(14,14,14,0.92)',
        borderBottom: '1px solid var(--parrilla-border)',
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{
          maxWidth: '672px',
          margin: '0 auto',
          padding: '0 16px',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <BrandMark brand={brand} compact />
        </div>
      </header>

      <MenuHero brand={brand} />

      <RecommendationCatalogProvider categories={menu}>
        <SearchExperience categories={menu}>
          <ExperienceSections sections={experienceSections} />
        </SearchExperience>
      </RecommendationCatalogProvider>

      <MenuDrawers />
    </main>
  )
}

export default function MenuPage() {
  return (
    <ActiveTableSessionGate>
      <MenuContent />
    </ActiveTableSessionGate>
  )
}
