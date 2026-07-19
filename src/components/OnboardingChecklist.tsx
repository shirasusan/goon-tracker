import { useState } from 'react'

const KEY = 'goon-tracker-onboarding-v1'

type OnboardingChecklistProps = {
  hasProfileName: boolean
  hasEntry: boolean
  hasFriends: boolean
  onGoProfile: () => void
  onGoFriends: () => void
}

export function OnboardingChecklist({
  hasProfileName,
  hasEntry,
  hasFriends,
  onGoProfile,
  onGoFriends,
}: OnboardingChecklistProps) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(KEY) === '1'
    } catch {
      return false
    }
  })

  if (dismissed) return null
  if (hasProfileName && hasEntry && hasFriends) return null

  function dismiss() {
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      /* ignore */
    }
    setDismissed(true)
  }

  const steps = [
    {
      done: hasProfileName,
      label: 'Profilnamen setzen',
      action: onGoProfile,
      cta: 'Zum Profil',
    },
    {
      done: hasEntry,
      label: 'Ersten Entry speichern',
      action: undefined as (() => void) | undefined,
      cta: undefined as string | undefined,
    },
    {
      done: hasFriends,
      label: 'Freund einladen',
      action: onGoFriends,
      cta: 'Zu Freunden',
    },
  ]

  return (
    <section className="onboarding" aria-label="Erste Schritte">
      <div className="onboarding__head">
        <h2>Erste Schritte</h2>
        <button type="button" className="section__close" onClick={dismiss}>
          ausblenden
        </button>
      </div>
      <ol className="onboarding__list">
        {steps.map((step) => (
          <li
            key={step.label}
            className={`onboarding__item${step.done ? ' is-done' : ''}`}
          >
            <span className="onboarding__check" aria-hidden>
              {step.done ? '✓' : '○'}
            </span>
            <span className="onboarding__label">{step.label}</span>
            {!step.done && step.action && step.cta && (
              <button type="button" className="btn" onClick={step.action}>
                {step.cta}
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
