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

export type TourTab = 'home' | 'friends' | 'ranked' | 'profile'

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
  /** CSS selector for the control to highlight; null = centered card */
  anchor: string | null
  /** Tab to open when this step becomes active */
  tab: TourTab
}[] = [
  {
    id: 'welcome',
    title: 'Willkommen bei Goon Tracker',
    body: 'Kurzer Rundgang — wir zeigen dir die wichtigsten Buttons direkt am Ort.',
    cta: 'Los geht’s',
    anchor: '[data-tour="nav-home"]',
    tab: 'home',
  },
  {
    id: 'name',
    title: 'Namen setzen',
    body: 'Öffne Einstellungen und gib deinen Anzeigenamen ein.',
    cta: 'Weiter',
    anchor: '[data-tour="profile-settings"]',
    tab: 'profile',
  },
  {
    id: 'widgets',
    title: 'Dein Home-Board',
    body: 'Hier siehst du Rang, Level und Streak. Heute füttert den Streak.',
    cta: 'Weiter',
    anchor: '[data-tour="home-widgets"]',
    tab: 'home',
  },
  {
    id: 'entry',
    title: 'Ersten Eintrag loggen',
    body: 'Tippe auf Neuer Eintrag, wähle Kategorien und Minuten.',
    cta: 'Weiter',
    anchor: '[data-tour="new-entry"]',
    tab: 'home',
  },
  {
    id: 'friends',
    title: 'Freunde',
    body: 'Hier vergleichst du dich und lädst Freunde ein.',
    cta: 'Weiter',
    anchor: '[data-tour="nav-friends"]',
    tab: 'home',
  },
  {
    id: 'feed',
    title: 'Feed',
    body: 'Im Freunde-Tab öffnest du den Feed über diesen Reiter.',
    cta: 'Weiter',
    anchor: '[data-tour="friends-feed"]',
    tab: 'friends',
  },
  {
    id: 'ranked',
    title: 'Rangliste',
    body: 'Saison zählt fürs Ranking — Allzeit fürs Level.',
    cta: 'Weiter',
    anchor: '[data-tour="nav-ranked"]',
    tab: 'home',
  },
  {
    id: 'profile',
    title: 'Profil & Settings',
    body: 'Über deinen Avatar erreichst du Profil, Monk Mode und Logout.',
    cta: 'Fertig',
    anchor: '[data-tour="nav-profile"]',
    tab: 'home',
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
