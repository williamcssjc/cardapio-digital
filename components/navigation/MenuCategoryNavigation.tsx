'use client'

import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from 'react'
import type { CategoryNavigationItem } from '@/lib/navigation/category-navigation-model'
import { CATEGORY_READING_OFFSET } from '@/lib/navigation/category-navigation-config'

type MenuCategoryNavigationProps = {
  items: readonly CategoryNavigationItem[]
}

type ObservedSection = {
  ratio: number
  top: number
  isIntersecting: boolean
}

export function MenuCategoryNavigation({
  items,
}: MenuCategoryNavigationProps) {
  const [activeTargetId, setActiveTargetId] = useState<string | null>(null)
  const linkRefs = useRef(new Map<string, HTMLAnchorElement>())
  const navigationScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (items.length < 2) return

    const visibleSections = new Map<string, ObservedSection>()
    const sections = items.flatMap((item) => {
      const element = document.getElementById(item.targetId)
      return element === null ? [] : [element]
    })

    if (sections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          visibleSections.set(entry.target.id, {
            ratio: entry.intersectionRatio,
            top: entry.boundingClientRect.top,
            isIntersecting: entry.isIntersecting,
          })
        })

        const isAtPageEnd =
          window.scrollY + window.innerHeight >=
          document.documentElement.scrollHeight - 2
        const lastItem = items[items.length - 1]

        if (isAtPageEnd && lastItem !== undefined) {
          setActiveTargetId(lastItem.targetId)
          return
        }

        const activeSection = [...visibleSections.entries()]
          .filter(([, section]) => section.isIntersecting)
          .sort((left, right) => {
            if (left[1].ratio !== right[1].ratio) {
              return right[1].ratio - left[1].ratio
            }

            return (
              Math.abs(left[1].top - CATEGORY_READING_OFFSET) -
              Math.abs(right[1].top - CATEGORY_READING_OFFSET)
            )
          })[0]

        if (activeSection !== undefined) {
          setActiveTargetId(activeSection[0])
        }
      },
      {
        rootMargin: `-${CATEGORY_READING_OFFSET}px 0px -55% 0px`,
        threshold: [0, 0.15, 0.35, 0.6],
      }
    )

    sections.forEach((section) => observer.observe(section))

    return () => observer.disconnect()
  }, [items])

  useEffect(() => {
    if (activeTargetId === null) return

    const link = linkRefs.current.get(activeTargetId)
    const container = navigationScrollRef.current

    if (link === undefined || container === null) return

    const linkStart = link.offsetLeft
    const linkEnd = linkStart + link.offsetWidth
    const visibleStart = container.scrollLeft
    const visibleEnd = visibleStart + container.clientWidth

    if (linkStart < visibleStart) {
      container.scrollTo({ left: linkStart, behavior: 'smooth' })
    } else if (linkEnd > visibleEnd) {
      container.scrollTo({
        left: linkEnd - container.clientWidth,
        behavior: 'smooth',
      })
    }
  }, [activeTargetId])

  if (items.length < 2) return null

  function handleCategoryClick(
    event: MouseEvent<HTMLAnchorElement>,
    item: CategoryNavigationItem
  ) {
    const section = document.getElementById(item.targetId)

    if (section === null) return

    event.preventDefault()
    setActiveTargetId(item.targetId)
    section.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  return (
    <nav
      aria-label="Categorias do cardápio"
      style={{
        position: 'sticky',
        top: '64px',
        zIndex: 30,
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-navigation-background)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        style={{
          maxWidth: '672px',
          margin: '0 auto',
          padding: '0 var(--space-4)',
        }}
      >
        <div
          ref={navigationScrollRef}
          className="scrollbar-hide"
          style={{
            display: 'flex',
            gap: 'var(--space-1)',
            padding: 'var(--space-2) 0',
            overflowX: 'auto',
            overscrollBehaviorX: 'contain',
          }}
        >
          {items.map((item) => {
            const isActive = item.targetId === activeTargetId

            return (
              <a
                key={item.categoryId}
                ref={(element) => {
                  if (element === null) {
                    linkRefs.current.delete(item.targetId)
                  } else {
                    linkRefs.current.set(item.targetId, element)
                  }
                }}
                href={`#${item.targetId}`}
                aria-current={isActive ? 'location' : undefined}
                data-active={isActive}
                onClick={(event) => handleCategoryClick(event, item)}
                className="hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  minHeight: '36px',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  border: '1px solid',
                  borderColor: isActive
                    ? 'var(--color-primary)'
                    : 'transparent',
                  borderRadius: 'var(--radius-sm)',
                  color: isActive
                    ? 'var(--color-text-primary)'
                    : 'var(--color-text-muted)',
                  background: isActive
                    ? 'var(--color-primary-subtle)'
                    : 'transparent',
                  fontSize: 'var(--text-compact)',
                  fontWeight: 'var(--font-weight-medium)',
                  textDecoration: 'none',
                  transition:
                    'color var(--motion-fast), border-color var(--motion-fast), background-color var(--motion-fast)',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.emoji && <span aria-hidden="true">{item.emoji}</span>}
                <span>{item.label}</span>
              </a>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
