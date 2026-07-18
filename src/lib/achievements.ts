import { CATEGORIES, CATEGORY_META, type Category, type Entry } from '../types'
import { hoursFromMinutes, RANKS } from './ranks'
import { seasonDisplayName, getSeasonInfo } from './season'
import { categoryTotals } from './snapshot'
import { calcSignedStreak } from './streaks'

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
  maxMinutesInDay: number
  minSessionMinutes: number | null
  streak: number
  viewedOtherProfile: boolean
}

const MINUTE = 1

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
  {
    id: 'cheater',
    title: 'Cheater!!!!!',
    short: '>24h',
    subtitle: 'Daily',
    color: '#ff0033',
    unlocked: (ctx) => ctx.maxMinutesInDay > 24 * 60,
  },
  {
    id: 'cuck',
    title: 'Cuck',
    short: '👀',
    subtitle: 'Social',
    color: '#c77dff',
    unlocked: (ctx) => ctx.viewedOtherProfile,
  },
  {
    id: 'goon-journey',
    title: 'The Journey Begins',
    short: '+2',
    subtitle: 'Goon Streak',
    color: '#ff2d4a',
    unlocked: (ctx) => ctx.streak >= 2,
  },
  {
    id: 'goon-first-week',
    title: 'The First Week!',
    short: '+7',
    subtitle: 'Goon Streak',
    color: '#ff2d4a',
    unlocked: (ctx) => ctx.streak >= 7,
  },
  {
    id: 'gooooner',
    title: 'Gooooner',
    short: '+14',
    subtitle: 'Goon Streak',
    color: '#ff2d4a',
    unlocked: (ctx) => ctx.streak >= 14,
  },
  {
    id: 'goon-baseline',
    title: 'Setting a Base Line',
    short: '+30',
    subtitle: 'Goon Streak',
    color: '#ff2d4a',
    unlocked: (ctx) => ctx.streak >= 30,
  },
  {
    id: 'goon-pinnacle',
    title: 'Pinnacle of Gooning',
    short: '+360',
    subtitle: 'Goon Streak',
    color: '#ff2d4a',
    unlocked: (ctx) => ctx.streak >= 360,
  },
  {
    id: 'dry-journey',
    title: 'The Journey Begins',
    short: '2',
    subtitle: 'Focus Streak',
    color: '#7dffb3',
    unlocked: (ctx) => ctx.streak <= -2,
  },
  {
    id: 'dry-focused',
    title: 'Stay Focused Brother',
    short: '7',
    subtitle: 'Focus Streak',
    color: '#7dffb3',
    unlocked: (ctx) => ctx.streak <= -7,
  },
  {
    id: 'dry-apprentice',
    title: 'The Master Apprentice',
    short: '14',
    subtitle: 'Focus Streak',
    color: '#7dffb3',
    unlocked: (ctx) => ctx.streak <= -14,
  },
  {
    id: 'dry-nnn',
    title: 'NNN',
    short: '30',
    subtitle: 'Focus Streak',
    color: '#7dffb3',
    unlocked: (ctx) => ctx.streak <= -30,
  },
  {
    id: 'dry-monk',
    title: 'True Monk',
    short: '360',
    subtitle: 'Focus Streak',
    color: '#7dffb3',
    unlocked: (ctx) => ctx.streak <= -360,
  },
  {
    id: 'premature',
    title: 'Premature Ejaculation',
    short: '<5m',
    subtitle: 'Session',
    color: '#ff9900',
    unlocked: (ctx) =>
      ctx.minSessionMinutes !== null && ctx.minSessionMinutes < 5 * MINUTE,
  },
  {
    id: 'true-master',
    title: 'True Master Over Here',
    short: '<2m',
    subtitle: 'Session',
    color: '#ff6b2d',
    unlocked: (ctx) =>
      ctx.minSessionMinutes !== null && ctx.minSessionMinutes < 2 * MINUTE,
  },
  {
    id: 'its-ok-bro',
    title: "It's Ok Bro",
    short: '≤1m',
    subtitle: 'Session',
    color: '#ed2553',
    unlocked: (ctx) =>
      ctx.minSessionMinutes !== null && ctx.minSessionMinutes <= 1 * MINUTE,
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
const FLAGS_KEY = 'goon-tracker-achievement-flags'

type AchievementFlags = {
  viewedOtherProfile?: boolean
}

export function achievementKey(category: Category, tierId: string): string {
  return `${category}:${tierId}`
}

function loadFlags(): AchievementFlags {
  try {
    const raw = localStorage.getItem(FLAGS_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as AchievementFlags
  } catch {
    return {}
  }
}

function saveFlags(flags: AchievementFlags): void {
  localStorage.setItem(FLAGS_KEY, JSON.stringify(flags))
}

const SEASON_RANKS_KEY = 'goon-tracker-season-ranks'

export type PastSeasonRank = {
  season: number
  rankId: string
}

export function loadPastSeasonRanks(): PastSeasonRank[] {
  try {
    const raw = localStorage.getItem(SEASON_RANKS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (x): x is PastSeasonRank =>
          typeof x === 'object' &&
          x !== null &&
          typeof (x as PastSeasonRank).season === 'number' &&
          typeof (x as PastSeasonRank).rankId === 'string',
      )
      .filter((x) => x.season >= 1)
  } catch {
    return []
  }
}

/** Merge completed-season ranks from cloud (only seasons before current). */
export function syncPastSeasonRanks(rows: PastSeasonRank[]): PastSeasonRank[] {
  const current = getSeasonInfo().season
  const completed = rows.filter((r) => r.season >= 1 && r.season < current)
  const bySeason = new Map(loadPastSeasonRanks().map((r) => [r.season, r]))
  for (const r of completed) bySeason.set(r.season, r)
  const next = [...bySeason.values()].sort((a, b) => a.season - b.season)
  localStorage.setItem(SEASON_RANKS_KEY, JSON.stringify(next))
  return next
}

export function clearPastSeasonRanks(): void {
  localStorage.removeItem(SEASON_RANKS_KEY)
}

export function markViewedOtherProfile(): void {
  const flags = loadFlags()
  if (flags.viewedOtherProfile) return
  saveFlags({ ...flags, viewedOtherProfile: true })
}

export function buildAchievementContext(
  entries: Entry[],
  startedOn: string,
): AchievementContext {
  const categories = categoryTotals(entries)
  let maxGoonometer = 0
  let minGoonometer: number | null = null
  let minSessionMinutes: number | null = null
  const sessionsByDay = new Map<string, number>()
  const minutesByDay = new Map<string, number>()

  for (const e of entries) {
    maxGoonometer = Math.max(maxGoonometer, e.goonometer)
    minGoonometer =
      minGoonometer === null ? e.goonometer : Math.min(minGoonometer, e.goonometer)
    minSessionMinutes =
      minSessionMinutes === null
        ? e.minutes
        : Math.min(minSessionMinutes, e.minutes)
    sessionsByDay.set(e.date, (sessionsByDay.get(e.date) || 0) + 1)
    minutesByDay.set(e.date, (minutesByDay.get(e.date) || 0) + e.minutes)
  }

  let maxSessionsInDay = 0
  for (const n of sessionsByDay.values()) maxSessionsInDay = Math.max(maxSessionsInDay, n)

  let maxMinutesInDay = 0
  for (const n of minutesByDay.values()) maxMinutesInDay = Math.max(maxMinutesInDay, n)

  const flags = loadFlags()

  return {
    entries,
    categories,
    maxGoonometer,
    minGoonometer,
    maxSessionsInDay,
    maxMinutesInDay,
    minSessionMinutes,
    streak: calcSignedStreak(entries, startedOn),
    viewedOtherProfile: Boolean(flags.viewedOtherProfile),
  }
}

export function unlockedAchievementsFromEntries(
  entries: Entry[],
  startedOn: string,
): UnlockedAchievement[] {
  return unlockedAchievementsFromContext(buildAchievementContext(entries, startedOn))
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

function unlockedSeasonAchievements(
  past: PastSeasonRank[] = loadPastSeasonRanks(),
): UnlockedAchievement[] {
  const current = getSeasonInfo().season
  return past
    .filter((r) => r.season >= 1 && r.season < current)
    .map((r) => {
      const rank = RANKS.find((x) => x.id === r.rankId) ?? RANKS[0]
      return {
        key: `special:season-${r.season}`,
        color: rank.color,
        subtitle: 'Season',
        title: `${seasonDisplayName(r.season)} · ${rank.title}`,
        short: `S${r.season}`,
      }
    })
}

export function unlockedAchievementsFromContext(
  ctx: AchievementContext,
): UnlockedAchievement[] {
  return [
    ...unlockedSpecialAchievements(ctx),
    ...unlockedSeasonAchievements(),
    ...unlockedCategoryAchievements(ctx.categories),
  ]
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
export function claimNewAchievements(
  entries: Entry[],
  startedOn: string,
): UnlockedAchievement[] {
  const unlocked = unlockedAchievementsFromEntries(entries, startedOn)
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

/** After syncing past season ranks from cloud — claim Season N · Rank badges. */
export function claimSeasonAchievementsFromCloud(
  rows: PastSeasonRank[],
  entries: Entry[],
  startedOn: string,
): UnlockedAchievement[] {
  syncPastSeasonRanks(rows)
  return claimNewAchievements(entries, startedOn)
}

/** Call when opening another user's profile — unlocks Cuck if new. */
export function claimCuckAchievement(
  entries: Entry[],
  startedOn: string,
): UnlockedAchievement[] {
  markViewedOtherProfile()
  return claimNewAchievements(entries, startedOn)
}
