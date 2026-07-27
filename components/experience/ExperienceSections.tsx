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
    <div
      style={{
        maxWidth: '672px',
        margin: '0 auto',
        padding: '24px 16px 144px',
        display: 'flex',
        flexDirection: 'column',
        gap: '40px',
      }}
    >
      {categories.map((category) => (
        <MenuSection key={category.id} category={category} />
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
              <div
                key={`${section.key}-${index}`}
                data-experience-section={section.key}
                style={{
                  maxWidth: '672px',
                  margin: '0 auto',
                  padding: '24px 16px 0',
                }}
              >
                <FirstGesture gesture={section.gesture} />
              </div>
            )
          case 'house-presentation':
            return (
              <div
                key={`${section.key}-${index}`}
                data-experience-section={section.key}
                style={{
                  maxWidth: '672px',
                  margin: '0 auto',
                  padding: '40px 16px',
                }}
              >
                <HousePresentation presentation={section.presentation} />
              </div>
            )
          case 'highlights':
            return (
              <div
                key={`${section.key}-${index}`}
                data-experience-section={section.key}
                style={{
                  maxWidth: '672px',
                  margin: '0 auto',
                  padding: '8px 16px 40px',
                }}
              >
                <Highlights
                  eyebrow={section.highlights.eyebrow}
                  title={section.highlights.title}
                  description={section.highlights.description}
                  products={section.highlights.products}
                />
              </div>
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
