'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { BrandIdentity } from '@/types/brand'
import type {
  HospitalityEntryConfig,
  HospitalityEntryStep,
} from '@/types/experience'
import { BrandMark } from '@/components/brand/BrandMark'
import { useSession } from '@/lib/stores/useSession'

type HospitalityEntryProps = {
  brand: BrandIdentity
  config: HospitalityEntryConfig
  tableNumber: number
}

export function HospitalityEntry({
  brand,
  config,
  tableNumber,
}: HospitalityEntryProps) {
  const router = useRouter()
  const [step, setStep] = useState<HospitalityEntryStep>('welcome')
  const headingRef = useRef<HTMLHeadingElement>(null)
  const setHospitalityPreference = useSession(
    (state) => state.setHospitalityPreference
  )
  const content = config.content
  const introduction = content.houseIntroduction
  const transitionsEnabled = config.transitions?.enabled ?? true

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [step])

  useEffect(() => {
    if (!config.enabled || config.entryMode !== 'table_qr') {
      router.replace('/')
    }
  }, [config.enabled, config.entryMode, router])

  function completeEntry() {
    setStep('complete')
    router.replace('/')
  }

  function exploreFreely() {
    setHospitalityPreference('explore')
    completeEntry()
  }

  function chooseGuidedExperience() {
    setHospitalityPreference('guided')
    completeEntry()
  }

  function chooseFirstVisit() {
    if (introduction === undefined) {
      completeEntry()
      return
    }

    setStep('house-introduction')
  }

  if (!config.enabled || config.entryMode !== 'table_qr') {
    return null
  }

  const image =
    step === 'house-introduction' &&
    introduction?.specialty.imageUrl
      ? {
          src: introduction.specialty.imageUrl,
          alt: introduction.specialty.imageAlt ?? brand.name,
        }
      : undefined

  return (
    <main
      className="hospitality-entry"
      data-entry-step={step}
      data-transition={
        transitionsEnabled
          ? config.transitions?.intensity ?? 'subtle'
          : 'none'
      }
    >
      {image && (
        <div className="hospitality-entry__media">
          <Image
            fill
            priority
            src={image.src}
            alt={image.alt}
            sizes="(max-width: 767px) 100vw, 52vw"
          />
        </div>
      )}

      <div className="hospitality-entry__surface">
        <header className="hospitality-entry__header">
          <BrandMark brand={brand} compact />
          <p className="hospitality-entry__table">
            {content.tableLabel}{' '}
            {String(tableNumber).padStart(2, '0')}
          </p>
        </header>

        <div
          className="hospitality-entry__content"
          key={step}
          aria-live="polite"
        >
          {step === 'welcome' && (
            <>
              {content.welcomeEyebrow && (
                <p className="hospitality-entry__eyebrow">
                  {content.welcomeEyebrow}
                </p>
              )}
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="hospitality-entry__title"
              >
                {content.welcomeTitle}
              </h1>
              {content.welcomeDescription && (
                <p className="hospitality-entry__description">
                  {content.welcomeDescription}
                </p>
              )}
              <button
                type="button"
                className="hospitality-entry__primary-action"
                onClick={() => setStep('familiarity')}
              >
                {content.welcomeAction}
                <span aria-hidden="true">→</span>
              </button>
            </>
          )}

          {step === 'familiarity' && (
            <>
              <p className="hospitality-entry__eyebrow">
                {brand.shortName}
              </p>
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="hospitality-entry__title"
              >
                {content.firstVisitQuestion}
              </h1>
              {content.firstVisitDescription && (
                <p className="hospitality-entry__description">
                  {content.firstVisitDescription}
                </p>
              )}
              <div className="hospitality-entry__actions">
                <button
                  type="button"
                  className="hospitality-entry__primary-action"
                  onClick={chooseFirstVisit}
                >
                  {content.firstVisitAction}
                  <span aria-hidden="true">→</span>
                </button>
                <button
                  type="button"
                  className="hospitality-entry__text-action"
                  onClick={completeEntry}
                >
                  {content.familiarGuestAction}
                </button>
              </div>
            </>
          )}

          {step === 'house-introduction' && introduction && (
            <>
              {introduction.specialty.eyebrow && (
                <p className="hospitality-entry__eyebrow">
                  {introduction.specialty.eyebrow}
                </p>
              )}
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="hospitality-entry__title"
              >
                {introduction.specialty.title}
              </h1>
              <p className="hospitality-entry__description">
                {introduction.specialty.description}
              </p>

              <div className="hospitality-entry__chapters">
                {[
                  introduction.houseDifferential,
                  introduction.offeringOverview,
                  introduction.orderingGuidance,
                ].map((detail, index) =>
                  detail === undefined ? null : (
                    <section
                      className="hospitality-entry__chapter"
                      key={`${detail.title ?? 'detail'}-${index}`}
                    >
                      {detail.title && <h2>{detail.title}</h2>}
                      <p>{detail.description}</p>
                    </section>
                  )
                )}
              </div>

              <div className="hospitality-entry__actions">
                <button
                  type="button"
                  className="hospitality-entry__primary-action"
                  onClick={() => setStep('guest-choice')}
                >
                  {introduction.introductionAction}
                  <span aria-hidden="true">→</span>
                </button>
                {config.allowSkipIntroduction && (
                  <button
                    type="button"
                    className="hospitality-entry__text-action"
                    onClick={exploreFreely}
                  >
                    {introduction.guestChoice.explore.label}
                  </button>
                )}
              </div>
            </>
          )}

          {step === 'guest-choice' && introduction && (
            <>
              <p className="hospitality-entry__eyebrow">
                {brand.shortName}
              </p>
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="hospitality-entry__title"
              >
                {introduction.guestChoice.title}
              </h1>
              {introduction.guestChoice.description && (
                <p className="hospitality-entry__description">
                  {introduction.guestChoice.description}
                </p>
              )}

              <div className="hospitality-entry__choices">
                <button
                  type="button"
                  className="hospitality-entry__choice"
                  onClick={chooseGuidedExperience}
                >
                  <strong>
                    {introduction.guestChoice.guided.label}
                  </strong>
                  {introduction.guestChoice.guided.description && (
                    <span>
                      {introduction.guestChoice.guided.description}
                    </span>
                  )}
                  <span aria-hidden="true">→</span>
                </button>

                <button
                  type="button"
                  className="hospitality-entry__choice"
                  onClick={exploreFreely}
                >
                  <strong>
                    {introduction.guestChoice.explore.label}
                  </strong>
                  {introduction.guestChoice.explore.description && (
                    <span>
                      {introduction.guestChoice.explore.description}
                    </span>
                  )}
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </main>
  )
}
