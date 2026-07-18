import { addDays, toDateKey } from './dates'
import type { Entry } from '../types'

/** Average goonometer for entries in the last 7 local calendar days (incl. today). */
export function weeklyGoonometerAverage(entries: Entry[]): number | null {
  const today = toDateKey()
  const start = addDays(today, -6)
  const week = entries.filter(
    (e) => e.date >= start && e.date <= today && typeof e.goonometer === 'number',
  )
  if (week.length === 0) return null
  const sum = week.reduce((s, e) => s + e.goonometer, 0)
  return Math.round((sum / week.length) * 10) / 10
}
