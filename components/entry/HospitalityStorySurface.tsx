import Image from 'next/image'
import type { CSSProperties } from 'react'
import type { HospitalitySurfaceVisual } from '@/types/experience'

type HospitalityMediaStyle = CSSProperties & {
  '--hospitality-image-position'?: string
}

export function HospitalityStorySurface({
  visual,
  preload = false,
}: {
  visual: HospitalitySurfaceVisual
  preload?: boolean
}) {
  const mediaStyle: HospitalityMediaStyle = {
    '--hospitality-image-position':
      visual.imagePosition ?? 'center center',
  }

  return (
    <div
      className="hospitality-entry__media"
      data-overlay-strength={visual.overlayStrength ?? 'standard'}
      data-content-alignment={visual.contentAlignment ?? 'left'}
      style={mediaStyle}
    >
      <Image
        fill
        src={visual.imageUrl}
        alt={visual.imageAlt}
        sizes="100vw"
        loading="eager"
        preload={preload}
      />
    </div>
  )
}
