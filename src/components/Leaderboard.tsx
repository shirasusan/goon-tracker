import { useEffect, useState } from 'react'
import { fetchLeaderboard } from '../lib/cloud'
import { formatMinutes } from '../lib/format'
import { rankFromMinutes } from '../lib/ranks'
import { CATEGORIES, CATEGORY_META, type Category, type FriendSnapshot } from '../types'
import { RankBadge } from './RankBadge'

type LeaderboardProps = {
  highlightId?: string
}

export function Leaderboard({ highlightId }: LeaderboardProps) {
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [rows, setRows] = useState<FriendSnapshot[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setBusy(true)
      const result = await fetchLeaderboard({
        category: category === 'all' ? undefined : category,
        limit: 30,
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
  }, [category])

  return (
    <div className="leaderboard-wrap">
      <div className="friends__board-head">
        <h3>Leaderboard</h3>
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
              className={`leaderboard__row${row.id === highlightId ? ' is-you' : ''}`}
            >
              <span className="leaderboard__rank">{i + 1}</span>
              <div className="leaderboard__main">
                <strong>
                  {row.username ? `@${row.username}` : row.name}
                  {row.id === highlightId ? ' · du' : ''}
                </strong>
                <RankBadge totalMinutes={row.totalMinutes} rank={rank} compact />
                <span>{formatMinutes(row.totalMinutes)}</span>
              </div>
            </li>
          )
        })}
      </ol>
      {!busy && rows.length === 0 && <p className="empty">Noch keine Einträge.</p>}
    </div>
  )
}
