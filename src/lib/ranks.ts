export type RankInfo = {
  id: string
  title: string
  /** Playful flavor — shown in tooltips */
  flavor: string
  minHours: number
  maxHours: number
  color: string
}

/** Hours of total goon time → rank (lower inclusive, upper exclusive except last) */
export const RANKS: RankInfo[] = [
  {
    id: 'unranked',
    title: 'Ohne Rang',
    flavor: 'Unranked',
    minHours: 0,
    maxHours: 2,
    color: '#8b95a3',
  },
  {
    id: 'bronze',
    title: 'Bronze',
    flavor: 'Bronze Beater',
    minHours: 2,
    maxHours: 5,
    color: '#cd7f32',
  },
  {
    id: 'silver',
    title: 'Silber',
    flavor: 'Silver Stroker',
    minHours: 5,
    maxHours: 10,
    color: '#c0c0c0',
  },
  {
    id: 'golden',
    title: 'Gold',
    flavor: 'Golden Gooner',
    minHours: 10,
    maxHours: 20,
    color: '#ffd700',
  },
  {
    id: 'emerald',
    title: 'Smaragd',
    flavor: 'Emerald Edger',
    minHours: 20,
    maxHours: 30,
    color: '#50c878',
  },
  {
    id: 'platinum',
    title: 'Platin',
    flavor: 'Platinum Puller',
    minHours: 30,
    maxHours: 40,
    color: '#e5e4e2',
  },
  {
    id: 'grandmaster',
    title: 'Großmeister',
    flavor: 'Grandmaster Gripgod',
    minHours: 40,
    maxHours: 10_000_000,
    color: '#ff4b91',
  },
]

export function hoursFromMinutes(minutes: number): number {
  return Math.max(0, minutes) / 60
}

export function rankFromMinutes(totalMinutes: number): RankInfo {
  const hours = hoursFromMinutes(totalMinutes)
  for (let i = 0; i < RANKS.length; i++) {
    const r = RANKS[i]
    const isLast = i === RANKS.length - 1
    if (isLast) {
      if (hours >= r.minHours) return r
    } else if (hours >= r.minHours && hours < r.maxHours) {
      return r
    }
  }
  return RANKS[0]
}

export function rankProgressFromMinutes(totalMinutes: number): {
  rank: RankInfo
  next: RankInfo | null
  hours: number
  intoBand: number
  bandSize: number
  progress: number
} {
  const hours = hoursFromMinutes(totalMinutes)
  const rank = rankFromMinutes(totalMinutes)
  const idx = RANKS.findIndex((r) => r.id === rank.id)
  const next = idx >= 0 && idx < RANKS.length - 1 ? RANKS[idx + 1] : null
  const intoBand = Math.max(0, hours - rank.minHours)
  const bandSize = next ? next.minHours - rank.minHours : 1
  const progress = next ? Math.min(1, intoBand / bandSize) : 1
  return { rank, next, hours, intoBand, bandSize, progress }
}
