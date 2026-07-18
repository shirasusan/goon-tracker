import { CATEGORIES, CATEGORY_META, type Category } from '../types'
import { hoursFromMinutes } from './ranks'

export type AchievementTier = {
  id: string
  title: string
  short: string
  minHours: number
}

export const ACHIEVEMENT_TIERS: AchievementTier[] = [
  { id: 'getting-started', title: 'Getting Started', short: '10h', minHours: 10 },
  { id: 'new-favorite', title: 'New Favorite?', short: '50h', minHours: 50 },
  { id: 'going-further', title: 'Going Further and Beyond', short: '100h', minHours: 100 },
  {
    id: 'just-to-suffer',
    title: 'Why are we still here just to suffer',
    short: '1k',
    minHours: 1000,
  },
  { id: 'question-marks', title: '???', short: '2k', minHours: 2000 },
]

export type UnlockedAchievement = {
  key: string
  category: Category
  color: string
  categoryLabel: string
  tier: AchievementTier
  hours: number
}

const SEEN_KEY = 'goon-tracker-achievements-seen'

export function achievementKey(category: Category, tierId: string): string {
  return `${category}:${tierId}`
}

export function unlockedAchievements(
  categories: Record<Category, number>,
): UnlockedAchievement[] {
  const out: UnlockedAchievement[] = []
  for (const category of CATEGORIES) {
    const hours = hoursFromMinutes(categories[category] || 0)
    for (const tier of ACHIEVEMENT_TIERS) {
      if (hours < tier.minHours) continue
      out.push({
        key: achievementKey(category, tier.id),
        category,
        color: CATEGORY_META[category].color,
        categoryLabel: CATEGORY_META[category].label,
        tier,
        hours,
      })
    }
  }
  return out
}

export function loadSeenAchievements(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((x): x is string => typeof x === 'string'))
  } catch {
    return new Set()
  }
}

export function saveSeenAchievements(keys: Iterable<string>): void {
  localStorage.setItem(SEEN_KEY, JSON.stringify([...keys]))
}
