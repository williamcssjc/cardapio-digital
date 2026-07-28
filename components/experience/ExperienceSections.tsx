import type { ResolvedExperienceSection } from '@/lib/experience/resolve-experience-sections'
import { FirstGesture } from '@/components/experience/FirstGesture'
import { HousePresentation } from '@/components/experience/HousePresentation'
import { Highlights } from '@/components/experience/Highlights'
import { MenuSection } from '@/components/menu/MenuSection'
import { MenuCategoryNavigation } from '@/components/navigation/MenuCategoryNavigation'
import { createCategoryNavigationModel } from '@/lib/navigation/category-navigation-model'

type ExperienceSectionsProps = {
  sections: readonly ResolvedExperienceSection[]
}

function CategoriesSection({
  categories,
}: Pick<
  Extract<ResolvedExperienceSection, { key: 'categories' }>,
  'categories'
>) {
  if (categories.length === 0) return null

  return (
    <div className="menu-container experience-stack">
      {categories.map((category) => (
        <div className="experience-section" key={category.id}>
          <MenuSection category={category} />
        </div>
      ))}
    </div>
  )
}

export function ExperienceSections({
  sections,
}: ExperienceSectionsProps) {
  const categoriesSection = sections.find(
    (section) => section.key === 'categories'
  )
  const navigationItems = createCategoryNavigationModel(
    categoriesSection?.navigationCategories ?? []
  )

  return (
    <>
      <MenuCategoryNavigation items={navigationItems} />
      {sections.map((section, index) => {
        switch (section.key) {
          case 'first-gesture':
            return (
              <section
                key={`${section.key}-${index}`}
                data-experience-section={section.key}
                className="menu-container experience-section"
              >
                <div className="experience-first-gesture">
                  <FirstGesture gesture={section.gesture} />
                </div>
              </section>
            )
          case 'house-presentation':
            return (
              <section
                key={`${section.key}-${index}`}
                data-experience-section={section.key}
                className="menu-container experience-section"
              >
                <HousePresentation presentation={section.presentation} />
              </section>
            )
          case 'highlights':
            return (
              <section
                key={`${section.key}-${index}`}
                data-experience-section={section.key}
                className="menu-container experience-section"
              >
                <Highlights
                  eyebrow={section.highlights.eyebrow}
                  title={section.highlights.title}
                  description={section.highlights.description}
                  products={section.highlights.products}
                />
              </section>
            )
          case 'categories':
            return (
              <div
                key={`${section.key}-${index}`}
                data-experience-section={section.key}
              >
                <CategoriesSection categories={section.categories} />
              </div>
            )
        }
      })}
    </>
  )
}
