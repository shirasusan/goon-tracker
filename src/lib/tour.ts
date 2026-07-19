import type { MsgId } from './i18n'

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
  title: MsgId
  body: MsgId
  cta: MsgId
  /** CSS selector for the control to highlight; null = centered card */
  anchor: string | null
  /** Tab to open when this step becomes active */
  tab: TourTab
}[] = [
  {
    id: 'welcome',
    title: 'tour_welcome_title',
    body: 'tour_welcome_body',
    cta: 'tour_welcome_cta',
    anchor: '[data-tour="nav-home"]',
    tab: 'home',
  },
  {
    id: 'name',
    title: 'tour_name_title',
    body: 'tour_name_body',
    cta: 'next',
    anchor: '[data-tour="profile-settings"]',
    tab: 'profile',
  },
  {
    id: 'widgets',
    title: 'tour_widgets_title',
    body: 'tour_widgets_body',
    cta: 'next',
    anchor: '[data-tour="home-widgets"]',
    tab: 'home',
  },
  {
    id: 'entry',
    title: 'tour_entry_title',
    body: 'tour_entry_body',
    cta: 'next',
    anchor: '[data-tour="new-entry"]',
    tab: 'home',
  },
  {
    id: 'friends',
    title: 'tour_friends_title',
    body: 'tour_friends_body',
    cta: 'next',
    anchor: '[data-tour="nav-friends"]',
    tab: 'home',
  },
  {
    id: 'feed',
    title: 'tour_feed_title',
    body: 'tour_feed_body',
    cta: 'next',
    anchor: '[data-tour="friends-feed"]',
    tab: 'friends',
  },
  {
    id: 'ranked',
    title: 'tour_ranked_title',
    body: 'tour_ranked_body',
    cta: 'next',
    anchor: '[data-tour="nav-ranked"]',
    tab: 'home',
  },
  {
    id: 'profile',
    title: 'tour_profile_title',
    body: 'tour_profile_body',
    cta: 'tour_done',
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
