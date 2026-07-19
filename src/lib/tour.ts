const PREFIX = 'goon-tracker-tour-v1:'

export type TourStepId =
  | 'welcome'
  | 'name'
  | 'widgets'
  | 'entry'
  | 'friends'
  | 'feed'
  | 'ranked'
  | 'profile'

export type TourState = {
  completed: boolean
  skipped: boolean
  stepIndex: number
}

export const TOUR_STEPS: {
  id: TourStepId
  title: string
  body: string
  cta: string
}[] = [
  {
    id: 'welcome',
    title: 'Willkommen bei Goon Tracker',
    body: 'Kurzer Rundgang — Streaks, Einträge, Freunde und Rangliste.',
    cta: 'Los geht’s',
  },
  {
    id: 'name',
    title: 'Namen setzen',
    body: 'Öffne die Einstellungen und gib deinen Anzeigenamen ein.',
    cta: 'Zu Einstellungen',
  },
  {
    id: 'widgets',
    title: 'Dein Home-Board',
    body: 'Oben siehst du Rang, Level und Streak. Heute füttert den Streak.',
    cta: 'Weiter',
  },
  {
    id: 'entry',
    title: 'Ersten Eintrag loggen',
    body: 'Tippe auf Neuer Eintrag, wähle Kategorien und Minuten.',
    cta: 'Verstanden',
  },
  {
    id: 'friends',
    title: 'Freunde',
    body: 'Vergleiche dich, lade Freunde ein und bleib im Loop.',
    cta: 'Zu Freunden',
  },
  {
    id: 'feed',
    title: 'Feed',
    body: 'Im Freunde-Tab findest du den Feed deiner Sessions.',
    cta: 'Weiter',
  },
  {
    id: 'ranked',
    title: 'Rangliste',
    body: 'Saison zählt fürs Ranking — Allzeit fürs Level.',
    cta: 'Zur Rangliste',
  },
  {
    id: 'profile',
    title: 'Profil & Settings',
    body: 'Über den Avatar-Tab erreichst du Profil, Monk Mode und Logout.',
    cta: 'Fertig',
  },
]

export function loadTour(userId: string): TourState {
  try {
    const raw = localStorage.getItem(PREFIX + userId)
    if (!raw) return { completed: false, skipped: false, stepIndex: 0 }
    const parsed = JSON.parse(raw) as Partial<TourState>
    return {
      completed: Boolean(parsed.completed),
      skipped: Boolean(parsed.skipped),
      stepIndex: Number(parsed.stepIndex) || 0,
    }
  } catch {
    return { completed: false, skipped: false, stepIndex: 0 }
  }
}

export function saveTour(userId: string, state: TourState): void {
  localStorage.setItem(PREFIX + userId, JSON.stringify(state))
}

export function shouldShowTour(state: TourState): boolean {
  return !state.completed && !state.skipped
}
