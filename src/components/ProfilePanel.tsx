import { useMemo, useRef, useState } from 'react'
import { uploadAvatar } from '../lib/cloud'
import { weeklyGoonometerAverage } from '../lib/goonometer'
import { formatMinutes } from '../lib/format'
import { rankFromMinutes } from '../lib/ranks'
import { categoryTotals } from '../lib/snapshot'
import type { Category, Entry } from '../types'
import { AchievementsSection } from './AchievementsSection'
import { Avatar } from './Avatar'
import { CategoryStats } from './CategoryStats'
import { EntryList } from './EntryList'
import { RankBadge } from './RankBadge'

type ProfilePanelProps = {
  userId?: string
  username?: string
  displayName: string
  avatarUrl?: string
  entries: Entry[]
  totalMinutes: number
  level: number
  goonStreak: number
  dryStreak: number
  onNameChange: (name: string) => void
  onAvatarChange: (url: string) => void
  onLogout: () => void
  onRemoveEntry: (id: string) => void
  onBack?: () => void
  freshAchievementKeys?: Set<string>
}

export function ProfilePanel({
  userId,
  username,
  displayName,
  avatarUrl,
  entries,
  totalMinutes,
  level,
  goonStreak,
  dryStreak,
  onNameChange,
  onAvatarChange,
  onLogout,
  onRemoveEntry,
  onBack,
  freshAchievementKeys,
}: ProfilePanelProps) {
  const weekAvg = useMemo(() => weeklyGoonometerAverage(entries), [entries])
  const rank = rankFromMinutes(totalMinutes)
  const categories = useMemo(() => categoryTotals(entries), [entries])
  const [historyCategory, setHistoryCategory] = useState<Category | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const recent = useMemo(() => {
    if (!historyCategory) return []
    return [...entries]
      .filter((e) => e.category === historyCategory)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 30)
  }, [entries, historyCategory])

  async function onPickAvatar(file: File | undefined) {
    if (!file || !userId) return
    setUploading(true)
    setError(null)
    const result = await uploadAvatar(userId, file)
    setUploading(false)
    if ('error' in result) {
      setError(result.error)
      return
    }
    onAvatarChange(result.url)
  }

  return (
    <div className="profile">
      {onBack && (
        <button type="button" className="btn" onClick={onBack}>
          ← Zurück
        </button>
      )}
      <section className="block">
        <div className="block__head">
          <h2>Profil</h2>
          <button type="button" className="section__close" onClick={onLogout}>
            Logout
          </button>
        </div>

        <div className="profile__hero">
          <Avatar
            src={avatarUrl}
            name={displayName}
            goonStreak={goonStreak}
            dryStreak={dryStreak}
            size="lg"
            onClick={() => fileRef.current?.click()}
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => void onPickAvatar(e.target.files?.[0])}
          />
          <div>
            <p className="profile__user">@{username || '—'}</p>
            <button
              type="button"
              className="btn"
              disabled={uploading || !userId}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? 'Upload…' : 'Bild ändern'}
            </button>
            {error && <p className="friends__error">{error}</p>}
          </div>
        </div>

        <label htmlFor="display-name">Anzeigename</label>
        <input
          id="display-name"
          value={displayName}
          maxLength={24}
          onChange={(e) => onNameChange(e.target.value)}
        />
      </section>

      <section className="block">
        <div className="block__head">
          <h2>Rank</h2>
        </div>
        <RankBadge totalMinutes={totalMinutes} rank={rank} />
        <p className="profile__stat">
          Level {level} · {formatMinutes(totalMinutes)}
        </p>
        <p className="profile__stat">
          Goon {goonStreak}d · Dry {dryStreak}d
        </p>
      </section>

      <section className="block">
        <div className="block__head">
          <h2>Goonometer</h2>
        </div>
        <p className="profile__goon">
          {weekAvg == null ? (
            'Noch keine Werte diese Woche'
          ) : (
            <>
              Wochen-Schnitt: <strong>{weekAvg}</strong> / 10
            </>
          )}
        </p>
        <p className="profile__stat">Gesamtzeit: {formatMinutes(totalMinutes)}</p>
      </section>

      <AchievementsSection categories={categories} freshKeys={freshAchievementKeys} />

      <section className="block">
        <div className="block__head">
          <h2>Stats</h2>
          <span>tippen für Verlauf</span>
        </div>
        <CategoryStats
          entries={entries}
          selected={historyCategory}
          onSelect={(cat) =>
            setHistoryCategory((prev) => (prev === cat ? null : cat))
          }
        />
        {historyCategory && (
          <>
            <div className="block__head">
              <h2>Verlauf</h2>
              <button
                type="button"
                className="section__close"
                onClick={() => setHistoryCategory(null)}
              >
                schließen
              </button>
            </div>
            <EntryList entries={recent} onRemove={onRemoveEntry} />
          </>
        )}
      </section>
    </div>
  )
}
