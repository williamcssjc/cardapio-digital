import Image from 'next/image'
import type { BrandIdentity } from '@/types/brand'

type BrandMarkProps = {
  brand: BrandIdentity
  compact?: boolean
}

export function BrandMark({
  brand,
  compact = false,
}: BrandMarkProps) {
  const logoSource = brand.logo?.src

  return (
    <div className="brand-mark">
      {logoSource ? (
        <Image
          src={logoSource}
          alt={brand.logo?.alt ?? brand.name}
          width={compact ? 42 : 56}
          height={compact ? 42 : 56}
          sizes={compact ? '42px' : '56px'}
          className="brand-mark__image"
        />
      ) : (
        <span className="brand-mark__fallback">
          {brand.logo?.textFallback ?? brand.shortName}
        </span>
      )}

      <span className="brand-mark__copy">
        <strong>{brand.name}</strong>
        {brand.unitName && <small>{brand.unitName}</small>}
      </span>
    </div>
  )
}
