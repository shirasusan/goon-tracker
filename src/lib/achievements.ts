import { CATEGORIES, CATEGORY_META, type Category } from '../types'
import { hoursFromMinutes } from './ranks'

export type AchievementTier = {
  id: string
  title: string
  minHours: number
}

export const ACHIEVEMENT_TIERS: AchievementTier[] = [
  { id: 'getting-started', title: 'Getting Started', minHours: 10 },
  { id: 'new-favorite', title: 'New Favorite?', minHours: 50 },
  { id: 'going-further', title: 'Going Further and Beyond', minHours: 100 },
  { id: 'just-to-suffer', title: 'Why are we still here just to suffer', minHours: 1000 },
  { id: 'question-marks', title: '???', minHours: 2000 },
]

export type CategoryAchievement = {
  category: Category
  color: string
  label: string
  hours: number
  tiers: Array<AchievementTier & { unlocked: boolean }>
  highest: AchievementTier | null
}

export function achievementsFromCategoryMinutes(
  categories: Record<Category, number>,
): CategoryAchievement[] {
  return CATEGORIES.map((category) => {
    const hours = hoursFromMinutes(categories[category] || 0)
    const tiers = ACHIEVEMENT_TIERS.map((tier) => ({
      ...tier,
      unlocked: hours >= tier.minHours,
    }))
    const highest =
      [...tiers].reverse().find((t) => t.unlocked) ?? null
    return {
      category,
      color: CATEGORY_META[category].color,
      label: CATEGORY_META[category].label,
      hours,
      tiers,
      highest,
    }
  })
}
