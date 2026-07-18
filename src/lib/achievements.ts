import { CATEGORIES, CATEGORY_META, type Category, type Entry } from '../types'
import { hoursFromMinutes } from './ranks'
import { categoryTotals } from './snapshot'

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

export type SpecialAchievementDef = {
  id: string
  title: string
  short: string
  subtitle: string
  color: string
  unlocked: (ctx: AchievementContext) => boolean
}

export type AchievementContext = {
  entries: Entry[]
  categories: Record<Category, number>
  maxGoonometer: number
  minGoonometer: number | null
  maxSessionsInDay: number
}

export const SPECIAL_ACHIEVEMENTS: SpecialAchievementDef[] = [
  {
    id: 'rudiger-goon',
    title: 'Rüdiger Goon',
    short: '0/10',
    subtitle: 'Goonometer',
    color: '#8b95a3',
    unlocked: (ctx) => ctx.minGoonometer !== null && ctx.minGoonometer <= 0,
  },
  {
    id: 'ascension-to-heaven',
    title: 'Ascension to Heaven',
    short: '10/10',
    subtitle: 'Goonometer',
    color: '#ffd700',
    unlocked: (ctx) => ctx.maxGoonometer >= 10,
  },
  {
    id: 'just-getting-started',
    title: "You're just getting started right?",
    short: '2×',
    subtitle: 'Daily',
    color: '#ff9900',
    unlocked: (ctx) => ctx.maxSessionsInDay >= 2,
  },
  {
    id: 'going-somewhere',
    title: "You're going somewhere",
    short: '3×',
    subtitle: 'Daily',
    color: '#ff6b2d',
    unlocked: (ctx) => ctx.maxSessionsInDay >= 3,
  },
  {
    id: 'arise',
    title: 'Arise',
    short: '5×',
    subtitle: 'Daily',
    color: '#ff2d4a',
    unlocked: (ctx) => ctx.maxSessionsInDay >= 5,
  },
  {
    id: 'call-911',
    title: 'Call 911',
    short: '10×',
    subtitle: 'Daily',
    color: '#ed2553',
    unlocked: (ctx) => ctx.maxSessionsInDay >= 10,
  },
]

export type UnlockedAchievement = {
  key: string
  color: string
  subtitle: string
  title: string
  short: string
}

const SEEN_KEY = 'goon-tracker-achievements-seen'

export function achievementKey(category: Category, tierId: string): string {
  return `${category}:${tierId}`
}

export function buildAchievementContext(entries: Entry[]): AchievementContext {
  const categories = categoryTotals(entries)
  let maxGoonometer = 0
  let minGoonometer: number | null = null
  const byDay = new Map<string, number>()

  for (const e of entries) {
    maxGoonometer = Math.max(maxGoonometer, e.goonometer)
    minGoonometer =
      minGoonometer === null ? e.goonometer : Math.min(minGoonometer, e.goonometer)
    byDay.set(e.date, (byDay.get(e.date) || 0) + 1)
  }

  let maxSessionsInDay = 0
  for (const n of byDay.values()) maxSessionsInDay = Math.max(maxSessionsInDay, n)

  return {
    entries,
    categories,
    maxGoonometer,
    minGoonometer,
    maxSessionsInDay,
  }
}

export function unlockedAchievementsFromEntries(entries: Entry[]): UnlockedAchievement[] {
  const ctx = buildAchievementContext(entries)
  return unlockedAchievementsFromContext(ctx)
}

export function unlockedAchievementsFromCategories(
  categories: Record<Category, number>,
): UnlockedAchievement[] {
  return unlockedCategoryAchievements(categories)
}

function unlockedCategoryAchievements(
  categories: Record<Category, number>,
): UnlockedAchievement[] {
  const out: UnlockedAchievement[] = []
  for (const category of CATEGORIES) {
    const hours = hoursFromMinutes(categories[category] || 0)
    for (const tier of ACHIEVEMENT_TIERS) {
      if (hours < tier.minHours) continue
      out.push({
        key: achievementKey(category, tier.id),
        color: CATEGORY_META[category].color,
        subtitle: CATEGORY_META[category].label,
        title: tier.title,
        short: tier.short,
      })
    }
  }
  return out
}

function unlockedSpecialAchievements(ctx: AchievementContext): UnlockedAchievement[] {
  return SPECIAL_ACHIEVEMENTS.filter((def) => def.unlocked(ctx)).map((def) => ({
    key: `special:${def.id}`,
    color: def.color,
    subtitle: def.subtitle,
    title: def.title,
    short: def.short,
  }))
}

export function unlockedAchievementsFromContext(
  ctx: AchievementContext,
): UnlockedAchievement[] {
  return [...unlockedSpecialAchievements(ctx), ...unlockedCategoryAchievements(ctx.categories)]
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

/** Returns newly unlocked achievements and marks them as seen. First run seeds without returning. */
export function claimNewAchievements(entries: Entry[]): UnlockedAchievement[] {
  const unlocked = unlockedAchievementsFromEntries(entries)
  const keys = unlocked.map((a) => a.key)
  const seen = loadSeenAchievements()

  if (seen.size === 0) {
    if (keys.length > 0) saveSeenAchievements(keys)
    return []
  }

  const newly = unlocked.filter((a) => !seen.has(a.key))
  if (newly.length === 0) return []

  const next = new Set(seen)
  for (const a of newly) next.add(a.key)
  saveSeenAchievements(next)
  return newly
}
