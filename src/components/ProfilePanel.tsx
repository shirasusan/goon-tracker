import { useMemo } from 'react'
import { weeklyGoonometerAverage } from '../lib/goonometer'
import { formatMinutes } from '../lib/format'
import { rankFromMinutes } from '../lib/ranks'
import type { Entry } from '../types'
import { RankBadge } from './RankBadge'

type ProfilePanelProps = {
  username?: string
  displayName: string
  cloudCode?: string
  entries: Entry[]
  totalMinutes: number
  level: number
  onNameChange: (name: string) => void
  onLogout: () => void
}

export function ProfilePanel({
  username,
  displayName,
  cloudCode,
  entries,
  totalMinutes,
  level,
  onNameChange,
  onLogout,
}: ProfilePanelProps) {
  const weekAvg = useMemo(() => weeklyGoonometerAverage(entries), [entries])
  const rank = rankFromMinutes(totalMinutes)

  return (
    <div className="profile">
      <section className="block">
        <div className="block__head">
          <h2>Account</h2>
          <button type="button" className="section__close" onClick={onLogout}>
            Logout
          </button>
        </div>
        <p className="profile__user">@{username || '—'}</p>
        <label htmlFor="display-name">Anzeigename</label>
        <input
          id="display-name"
          value={displayName}
          maxLength={24}
          onChange={(e) => onNameChange(e.target.value)}
        />
        {cloudCode && (
          <p className="profile__code">
            Freundes-Code: <strong>{cloudCode}</strong>
          </p>
        )}
      </section>

      <section className="block">
        <div className="block__head">
          <h2>Rank</h2>
        </div>
        <RankBadge totalMinutes={totalMinutes} rank={rank} />
        <p className="profile__stat">Level {level}</p>
      </section>

      <section className="block">
        <div className="block__head">
          <h2>Goonometer</h2>
        </div>
        <p className="profile__goon">
          {weekAvg == null ? 'Noch keine Werte diese Woche' : (
            <>
              Wochen-Schnitt: <strong>{weekAvg}</strong> / 10
            </>
          )}
        </p>
        <p className="profile__stat">Gesamtzeit: {formatMinutes(totalMinutes)}</p>
      </section>
    </div>
  )
}
