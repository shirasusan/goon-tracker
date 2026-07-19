/** Base XP for each completed focus-streak day (from day 2), before multiplier. */
export const FOCUS_DAILY_XP = 25

/**
 * Streak XP multiplier.
 * M(x) = 1 + 9*(x/30)^3, capped at 10×.
 * Active from day 2; x steps every 3 days (3, 6, …, 30).
 */
export function streakXpMultiplier(streakDays: number): number {
  if (streakDays < 2) return 1
  const tier = Math.max(1, Math.floor(streakDays / 3))
  const x = Math.min(30, tier * 3)
  return 1 + 9 * (x / 30) ** 3
}

export function awardXp(base: number, streakDays: number): number {
  return Math.round(Math.max(0, base) * streakXpMultiplier(streakDays))
}

export function entryXp(entry: { minutes: number; xp?: number }): number {
  if (typeof entry.xp === 'number' && Number.isFinite(entry.xp)) {
    return Math.max(0, entry.xp)
  }
  return Math.max(0, entry.minutes || 0)
}

/** Level XP from entries (+ optional focus grants). Minutes alone are for ranked. */
export function totalXp(
  entries: { minutes: number; xp?: number }[],
  focusXp = 0,
): number {
  return (
    entries.reduce((sum, e) => sum + entryXp(e), 0) + Math.max(0, focusXp || 0)
  )
}

export function totalMinutes(entries: { minutes: number }[]): number {
  return entries.reduce((sum, e) => sum + Math.max(0, e.minutes || 0), 0)
}

export type LevelInfo = {
  level: number
  xp: number
  intoLevel: number
  toNext: number
  progress: number
}

/** Rising XP curve: L1→L2 needs 30, then ~+35% each level */
export function xpNeededForLevel(level: number): number {
  if (level <= 1) return 0
  let need = 30
  for (let l = 2; l < level; l++) {
    need = Math.floor(need * 1.35) + 15
  }
  return need
}

export function levelFromXp(xp: number): LevelInfo {
  let level = 1
  let remaining = Math.max(0, xp)
  let need = xpNeededForLevel(2)

  while (remaining >= need) {
    remaining -= need
    level += 1
    need = Math.floor(need * 1.35) + 15
  }

  return {
    level,
    xp,
    intoLevel: remaining,
    toNext: need,
    progress: need === 0 ? 1 : remaining / need,
  }
}
