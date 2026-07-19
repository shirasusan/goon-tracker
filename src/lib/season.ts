/**
 * Seasons are 0-indexed from the epoch; each lasts 30 days, then season number +1.
 */
const SEASON_EPOCH_UTC = Date.UTC(2026, 6, 1) // 2026-07-01
const SEASON_MS = 30 * 24 * 60 * 60 * 1000

export function seasonDisplayName(season: number): string {
  return `Season ${Math.max(0, season)}`
}

export type SeasonInfo = {
  season: number
  start: Date
  end: Date
  /** ISO date keys YYYY-MM-DD for local filtering approx */
  startKey: string
  endKeyExclusive: string
  msUntilReset: number
}

function toKey(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function getSeasonInfo(now = new Date()): SeasonInfo {
  const elapsed = Math.max(0, now.getTime() - SEASON_EPOCH_UTC)
  const index = Math.floor(elapsed / SEASON_MS)
  const season = index
  const start = new Date(SEASON_EPOCH_UTC + index * SEASON_MS)
  const end = new Date(start.getTime() + SEASON_MS)
  return {
    season,
    start,
    end,
    startKey: toKey(start),
    endKeyExclusive: toKey(end),
    msUntilReset: Math.max(0, end.getTime() - now.getTime()),
  }
}

export function formatCountdown(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const d = Math.floor(totalSec / 86400)
  const h = Math.floor((totalSec % 86400) / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  if (d > 0) return `${d}d ${h}h ${m}m`
  return `${h}h ${m}m`
}
