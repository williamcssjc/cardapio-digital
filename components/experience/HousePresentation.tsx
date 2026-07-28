'use client'

import type { HousePresentationConfig } from '@/types/experience'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/dialog'

type HousePresentationProps = {
  presentation?: HousePresentationConfig
}

export function HousePresentation({
  presentation,
}: HousePresentationProps) {
  if (
    presentation === undefined ||
    presentation.title.trim() === '' ||
    presentation.description.trim() === ''
  ) {
    return null
  }

  const actionContent = presentation.actionContent
  const hasExpandedContent =
    presentation.actionLabel !== undefined &&
    presentation.actionLabel.trim() !== '' &&
    actionContent !== undefined &&
    actionContent.title.trim() !== '' &&
    actionContent.paragraphs.some((paragraph) => paragraph.trim() !== '')

  return (
    <section
      data-house-presentation
    >
      {presentation.eyebrow !== undefined &&
        presentation.eyebrow.trim() !== '' && (
          <p className="menu-eyebrow">
            {presentation.eyebrow}
          </p>
        )}

      <h2 className="menu-section__title mt-3 max-w-[18ch]">
        {presentation.title}
      </h2>

      <p className="menu-hero__description">
        {presentation.description}
      </p>

      {hasExpandedContent && actionContent !== undefined && (
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              data-house-presentation-action
              style={{
                marginTop: '1.1rem',
                paddingBottom: '0.3rem',
                borderBottom: '1px solid var(--parrilla-ember)',
                color: 'var(--parrilla-ember)',
                fontSize: '0.65rem',
                fontWeight: 500,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              {presentation.actionLabel}
            </button>
          </DialogTrigger>

          <DialogContent
            style={{
              maxWidth: '32rem',
              padding: '2rem',
              border: '1px solid var(--parrilla-border)',
              borderRadius: '2px',
              background: 'var(--parrilla-surface)',
              color: 'var(--parrilla-text)',
            }}
          >
            <DialogHeader>
              <DialogTitle
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '2rem',
                  fontWeight: 400,
                  letterSpacing: '-0.025em',
                  lineHeight: 1,
                }}
              >
                {actionContent.title}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {presentation.description}
              </DialogDescription>
            </DialogHeader>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
                color: 'var(--parrilla-muted)',
                fontSize: '0.85rem',
                lineHeight: 1.7,
              }}
            >
              {actionContent.paragraphs
                .filter((paragraph) => paragraph.trim() !== '')
                .map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
            </div>

            <DialogClose asChild>
              <button
                type="button"
                style={{
                  justifySelf: 'start',
                  marginTop: '0.5rem',
                  paddingBottom: '0.3rem',
                  borderBottom: '1px solid var(--parrilla-border)',
                  color: 'var(--parrilla-text)',
                  fontSize: '0.65rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                Voltar ao cardápio
              </button>
            </DialogClose>
          </DialogContent>
        </Dialog>
      )}
    </section>
  )
}
