import type { Post } from '../types'

export function toDayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function activeDayKeys(posts: Post[]): Set<string> {
  return new Set(posts.map((p) => toDayKey(new Date(p.createdAt))))
}

function startOfLocalDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, delta: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + delta)
  return d
}

export function currentStreak(posts: Post[]): number {
  const days = activeDayKeys(posts)
  if (days.size === 0) return 0

  let cursor = startOfLocalDay(new Date())
  if (!days.has(toDayKey(cursor))) {
    cursor = addDays(cursor, -1)
    if (!days.has(toDayKey(cursor))) return 0
  }

  let streak = 0
  while (days.has(toDayKey(cursor))) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}

export function bestStreak(posts: Post[]): number {
  const keys = [...activeDayKeys(posts)].sort()
  if (keys.length === 0) return 0

  let best = 1
  let run = 1
  for (let i = 1; i < keys.length; i += 1) {
    const prev = new Date(`${keys[i - 1]}T12:00:00`)
    const curr = new Date(`${keys[i]}T12:00:00`)
    const diffDays = Math.round(
      (curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000),
    )
    if (diffDays === 1) {
      run += 1
      best = Math.max(best, run)
    } else {
      run = 1
    }
  }
  return best
}

export interface WeekDay {
  key: string
  label: string
  active: boolean
  isToday: boolean
}

export function weekActivity(posts: Post[], now = new Date()): WeekDay[] {
  const days = activeDayKeys(posts)
  const today = startOfLocalDay(now)
  // Monday-start week containing today
  const day = today.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = addDays(today, mondayOffset)

  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i)
    const key = toDayKey(date)
    return {
      key,
      label: date.toLocaleDateString(undefined, { weekday: 'narrow' }),
      active: days.has(key),
      isToday: key === toDayKey(today),
    }
  })
}
