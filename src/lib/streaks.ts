import { addDays, toDateKey } from './dates'
import type { Entry } from '../types'

export function goonDates(entries: Entry[]): Set<string> {
  return new Set(entries.map((e) => e.date))
}

/**
 * Consecutive days with at least one goon.
 * If today has no entry yet, yesterday still counts (streak not broken until day ends).
 */
export function calcGoonStreak(entries: Entry[]): number {
  const dates = goonDates(entries)
  if (dates.size === 0) return 0

  const today = toDateKey()
  let cursor = dates.has(today) ? today : addDays(today, -1)
  if (!dates.has(cursor)) return 0

  let streak = 0
  while (dates.has(cursor)) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}

/**
 * Consecutive days without gooning, counting back from today.
 * Logging today resets this to 0.
 * Bounded by the day the tracker was first opened.
 */
export function calcDryStreak(entries: Entry[], startedOn: string): number {
  const dates = goonDates(entries)
  const today = toDateKey()

  if (dates.has(today)) return 0

  let streak = 0
  let cursor = today

  while (!dates.has(cursor)) {
    streak += 1
    if (cursor <= startedOn) break
    cursor = addDays(cursor, -1)
  }

  return streak
}
