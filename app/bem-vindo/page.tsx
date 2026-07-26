'use client'

import Image from 'next/image'
import { useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/stores/useSession'
import { useExperienceProfile } from '@/components/experience/ExperienceProvider'

export default function BemVindoPage() {
  const isMounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  )

  const tableNum = useSession((state) => state.context.tableNum)
  const router = useRouter()
  const { house } = useExperienceProfile()

  if (!isMounted) {
    return (
      <div
        className="min-h-dvh"
        style={{ background: 'var(--color-background)' }}
      />
    )
  }

  return (
    <main
      className="relative min-h-dvh overflow-hidden"
      style={{ background: '#08282d', color: '#eee7d9' }}
    >
      <style>{`
        @keyframes welcome-arrival {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .welcome-arrival {
          animation: welcome-arrival 900ms ease-out both;
        }

        .welcome-photo {
          object-fit: cover;
          object-position: 50% 50%;
        }

        .welcome-layer {
          position: absolute;
          inset: 0;
          z-index: 10;
        }

        .welcome-content {
          position: absolute;
          top: 18%;
          right: 1.5rem;
          left: 48%;
        }

        .welcome-cta {
          position: absolute;
          bottom: 2rem;
          left: 1.75rem;
        }

        .welcome-invitation {
          background: #c89a4b;
          color: #17120b;
          box-shadow: 0 8px 24px rgba(10, 8, 5, 0.16);
          display: inline-flex;
          align-items: center;
          gap: 1.25rem;
          padding: 1rem 1.75rem;
          border-radius: 2px;
          transition: background-color 250ms ease-out, transform 250ms ease-out;
        }

        .welcome-invitation:hover {
          background: #d2aa63;
          transform: translateY(-1px);
        }

        .welcome-invitation:focus-visible {
          outline: 1px solid rgba(238, 231, 217, 0.9);
          outline-offset: 4px;
        }

        @media (min-width: 640px) {
          .welcome-photo { object-position: 50% 33%; }

          .welcome-content {
            top: 16%;
            right: 3rem;
            left: 56%;
          }

          .welcome-cta {
            bottom: 3rem;
            left: 56%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .welcome-arrival { animation: none; }
          .welcome-invitation { transition: none; }
        }
      `}</style>

      <Image
        src={house.media.welcomeImage}
        alt={house.media.welcomeImageAlt}
        fill
        preload
        sizes="100vw"
        className="welcome-photo"
      />

      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(4, 23, 27, 0.2) 0%, rgba(4, 23, 27, 0.04) 42%, rgba(4, 23, 27, 0.5) 100%)',
        }}
      />

      <div className="welcome-arrival welcome-layer">
        <div className="welcome-content">
          <p
            className="uppercase"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'clamp(0.52rem, 1.3vw, 0.66rem)',
              fontWeight: 500,
              letterSpacing: '0.3em',
              color: 'rgba(238, 231, 217, 0.76)',
            }}
          >
            {house.name}
          </p>

          <h1
            className="mt-5 sm:mt-7"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.9rem, 7vw, 6.8rem)',
              fontWeight: 400,
              lineHeight: 0.84,
              letterSpacing: '-0.045em',
              textShadow: '0 2px 24px rgba(0, 0, 0, 0.18)',
            }}
          >
            {house.welcome.title.replace(/\.$/, '')}
            <span style={{ color: '#c89a4b' }}>.</span>
          </h1>

          <p
            className="mt-5 max-w-[18rem] sm:mt-7"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'clamp(0.72rem, 1.4vw, 0.9rem)',
              lineHeight: 1.65,
              color: 'rgba(238, 231, 217, 0.72)',
            }}
          >
            {house.welcome.message}
          </p>
        </div>

        <div className="welcome-cta">
          <p
            className="mb-3 uppercase"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.5rem',
              letterSpacing: '0.22em',
              color: 'rgba(238, 231, 217, 0.58)',
            }}
          >
            {tableNum
              ? `Mesa ${String(tableNum).padStart(2, '0')}`
              : house.welcome.tableUnavailableMessage}
          </p>

          <button
            type="button"
            className="welcome-invitation"
            onClick={() => router.push('/identificacao')}
          >
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.62rem',
                fontWeight: 600,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
              }}
            >
              {house.welcome.invitationLabel}
            </span>
            <span aria-hidden="true" style={{ fontSize: '1rem', lineHeight: 1 }}>
              →
            </span>
          </button>
        </div>
      </div>
    </main>
  )
}
