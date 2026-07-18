import { addDays, toDateKey } from './dates'
import type { Entry } from '../types'

export function goonDates(entries: Entry[]): Set<string> {
  return new Set(entries.map((e) => e.date))
}

/**
 * Consecutive days with at least one goon.
 * Grace: no entry yet today still counts yesterday (day isn't over).
 * After a full day without a goon, the streak breaks.
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
 * Consecutive completed days without gooning.
 * Today is not counted until it ends (same grace as goon).
 * Logging today resets this to 0.
 */
export function calcDryStreak(entries: Entry[], startedOn: string): number {
  const dates = goonDates(entries)
  const today = toDateKey()

  if (dates.has(today)) return 0

  // Only finished days — start at yesterday
  let cursor = addDays(today, -1)
  if (cursor < startedOn) return 0
  if (dates.has(cursor)) return 0

  let streak = 0
  while (!dates.has(cursor)) {
    streak += 1
    if (cursor <= startedOn) break
    cursor = addDays(cursor, -1)
  }

  return streak
}

/**
 * Signed streak (+/− only):
 * +N = consecutive goon days
 * −N = consecutive focus days
 *  0 = neutral
 */
export function calcSignedStreak(entries: Entry[], startedOn: string): number {
  const goon = calcGoonStreak(entries)
  if (goon > 0) return goon
  const dry = calcDryStreak(entries, startedOn)
  if (dry > 0) return -dry
  return 0
}

export function signedToGoonDry(signed: number): {
  goonStreak: number
  dryStreak: number
} {
  if (signed > 0) return { goonStreak: signed, dryStreak: 0 }
  if (signed < 0) return { goonStreak: 0, dryStreak: Math.abs(signed) }
  return { goonStreak: 0, dryStreak: 0 }
}

export function goonDryToSigned(goonStreak: number, dryStreak: number): number {
  if (goonStreak > 0) return goonStreak
  if (dryStreak > 0) return -dryStreak
  return 0
}
