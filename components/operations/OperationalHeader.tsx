import Link from 'next/link'

import { BrandMark } from '@/components/brand/BrandMark'
import { OperationalClock } from '@/components/operations/OperationalClock'
import type { BrandIdentity } from '@/types/brand'

import styles from './operational-header.module.css'

type OperationalLink = {
  href: string
  label: string
}

type OperationalHeaderProps = {
  brand: BrandIdentity
  panelLabel: string
  contentId: string
  links: readonly OperationalLink[]
}

export function OperationalHeader({
  brand,
  panelLabel,
  contentId,
  links,
}: OperationalHeaderProps) {
  return (
    <>
      <a className={styles.skipLink} href={`#${contentId}`}>
        Ir para a operação
      </a>

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.identity}>
            <BrandMark brand={brand} compact />
            <span className={styles.divider} aria-hidden />
            <span className={styles.panelLabel}>{panelLabel}</span>
          </div>

          <div className={styles.utilities}>
            <OperationalClock />
            <nav aria-label={`Navegação do ${panelLabel}`}>
              {links.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>
    </>
  )
}
