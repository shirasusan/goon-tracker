import { useEffect, useState } from 'react'
import { fetchSeasonLeaderboard } from '../lib/cloud'
import { formatMinutes } from '../lib/format'
import { rankFromMinutes } from '../lib/ranks'
import { getSeasonInfo } from '../lib/season'
import { CATEGORIES, CATEGORY_META, type Category, type FriendSnapshot } from '../types'
import { Avatar } from './Avatar'
import { RankBadge } from './RankBadge'

type LeaderboardProps = {
  season?: number
  highlightId?: string
  onSelectUser?: (id: string) => void
}

export function Leaderboard({ season, highlightId, onSelectUser }: LeaderboardProps) {
  const activeSeason = season ?? getSeasonInfo().season
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [rows, setRows] = useState<FriendSnapshot[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setBusy(true)
      const result = await fetchSeasonLeaderboard({
        season: activeSeason,
        category: category === 'all' ? undefined : category,
        limit: 50,
      })
      if (cancelled) return
      if ('error' in result) setError(result.error)
      else {
        setRows(result.rows)
        setError(null)
      }
      setBusy(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [category, activeSeason])

  return (
    <div className="leaderboard-wrap">
      <div className="friends__board-head">
        <h3>Season {activeSeason}</h3>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Category | 'all')}
          aria-label="Kategorie"
        >
          <option value="all">Gesamtzeit</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_META[c].label}
            </option>
          ))}
        </select>
      </div>
      {busy && <p className="empty">Lade…</p>}
      {error && <p className="friends__error">{error}</p>}
      <ol className="leaderboard">
        {rows.map((row, i) => {
          const rank = rankFromMinutes(row.totalMinutes)
          return (
            <li
              key={row.id}
              className={`leaderboard__row leaderboard__row--click${row.id === highlightId ? ' is-you' : ''}`}
            >
              <span className="leaderboard__rank">{i + 1}</span>
              <Avatar
                src={row.avatarUrl}
                name={row.name}
                goonStreak={row.goonStreak}
                dryStreak={row.dryStreak}
                size="sm"
                onClick={
                  row.id === highlightId || !onSelectUser
                    ? undefined
                    : () => onSelectUser(row.id)
                }
              />
              <button
                type="button"
                className="leaderboard__main leaderboard__name-btn"
                onClick={
                  row.id === highlightId || !onSelectUser
                    ? undefined
                    : () => onSelectUser(row.id)
                }
              >
                <strong>
                  {row.username ? `@${row.username}` : row.name}
                  {row.id === highlightId ? ' · du' : ''}
                </strong>
                <RankBadge totalMinutes={row.totalMinutes} rank={rank} compact />
                <span>{formatMinutes(row.totalMinutes)}</span>
              </button>
            </li>
          )
        })}
      </ol>
      {!busy && rows.length === 0 && (
        <p className="empty">Noch keine Season-Einträge. Logge Zeit, um aufzutauchen.</p>
      )}
    </div>
  )
}
