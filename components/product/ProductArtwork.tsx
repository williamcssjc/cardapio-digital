'use client'

import Image from 'next/image'
import { useState } from 'react'

type ProductArtworkProps = {
  src?: string | null
  alt: string
  preload?: boolean
  sizes?: string
  variant: 'card' | 'dialog'
}

const artworkGeometry = {
  card: {
    aspectRatio: '1 / 1',
    fallbackSize: '28px',
    height: '80px',
    sizes: '80px',
    width: '80px',
  },
  dialog: {
    aspectRatio: '15 / 8',
    fallbackSize: '48px',
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
}: ProductArtworkProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const geometry = artworkGeometry[variant]
  const shouldShowImage =
    typeof src === 'string' &&
    isSupportedImageSource(src) &&
    failedSource !== src

  return (
    <div
      style={{
        position: 'relative',
        flexShrink: 0,
        width: geometry.width,
        height: geometry.height,
        aspectRatio: geometry.aspectRatio,
        overflow: 'hidden',
        background: 'var(--parrilla-surface)',
      }}
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
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--parrilla-muted)',
            fontSize: geometry.fallbackSize,
            opacity: variant === 'dialog' ? 0.35 : 0.4,
          }}
        >
          🥩
        </div>
      )}
    </div>
  )
}
