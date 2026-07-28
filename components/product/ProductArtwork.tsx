'use client'

import Image from 'next/image'
import { useState } from 'react'

type ProductArtworkProps = {
  src?: string | null
  alt: string
  preload?: boolean
  sizes?: string
  variant: 'card' | 'dialog'
  contextLabel?: string
}

const artworkGeometry = {
  card: {
    aspectRatio: '1 / 1',
    height: '80px',
    sizes: '80px',
    width: '80px',
  },
  dialog: {
    aspectRatio: '15 / 8',
    height: 'auto',
    sizes: '(max-width: 512px) calc(100vw - 32px), 480px',
    width: '100%',
  },
} as const

function isSupportedImageSource(src: string): boolean {
  return src.startsWith('/') && !src.startsWith('//')
}

export function ProductArtwork({
  src,
  alt,
  preload = false,
  sizes,
  variant,
  contextLabel,
}: ProductArtworkProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const geometry = artworkGeometry[variant]
  const shouldShowImage =
    typeof src === 'string' &&
    isSupportedImageSource(src) &&
    failedSource !== src

  return (
    <div
      className={[
        'product-artwork',
        `product-artwork--${variant}`,
        shouldShowImage
          ? 'product-artwork--image'
          : 'product-artwork--fallback',
      ].join(' ')}
    >
      {shouldShowImage ? (
        <Image
          fill
          src={src}
          alt={alt}
          sizes={sizes ?? geometry.sizes}
          preload={preload}
          onError={() => setFailedSource(src)}
          style={{ objectFit: 'cover' }}
        />
      ) : (
        <div
          role="img"
          aria-label={`Imagem não disponível para ${alt}`}
          className="product-artwork__fallback"
        >
          <span className="product-artwork__initials" aria-hidden="true">
            {alt
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((word) => word[0]?.toLocaleUpperCase('pt-BR'))
              .join('')}
          </span>
          <span className="product-artwork__context" aria-hidden="true">
            {contextLabel ?? 'Seleção da casa'}
          </span>
        </div>
      )}
    </div>
  )
}
