import { useMemo, useRef, useState } from 'react'
import { uploadAvatar } from '../lib/cloud'
import { weeklyGoonometerAverage } from '../lib/goonometer'
import { formatMinutes } from '../lib/format'
import { rankFromMinutes } from '../lib/ranks'
import type { Category, Entry } from '../types'
import { AchievementsSection } from './AchievementsSection'
import { Avatar } from './Avatar'
import { CategoryStats } from './CategoryStats'
import { EntryList } from './EntryList'
import { ProfileStreaks } from './ProfileStreaks'
import { RankBadge } from './RankBadge'

type ProfilePanelProps = {
  userId?: string
  username?: string
  displayName: string
  avatarUrl?: string
  entries: Entry[]
  startedOn: string
  totalMinutes: number
  level: number
  goonStreak: number
  dryStreak: number
  streak: number
  onNameChange: (name: string) => void
  onAvatarChange: (url: string) => void
  onLogout: () => void
  onDeleteAccount: () => Promise<void>
  onRemoveEntry: (id: string) => void
  onBack?: () => void
  freshAchievementKeys?: Set<string>
  monkMode?: boolean
  onMonkModeChange?: (on: boolean) => void
  rankedAnonymous?: boolean
  onRankedAnonymousChange?: (on: boolean) => void
}

export function ProfilePanel({
  userId,
  username,
  displayName,
  avatarUrl,
  entries,
  startedOn,
  totalMinutes,
  level,
  goonStreak,
  dryStreak,
  streak,
  onNameChange,
  onAvatarChange,
  onLogout,
  onDeleteAccount,
  onRemoveEntry,
  onBack,
  freshAchievementKeys,
  monkMode,
  onMonkModeChange,
  rankedAnonymous,
  onRankedAnonymousChange,
}: ProfilePanelProps) {
  const weekAvg = useMemo(() => weeklyGoonometerAverage(entries), [entries])
  const rank = rankFromMinutes(totalMinutes)
  const [historyCategory, setHistoryCategory] = useState<Category | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
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

  async function handleDeleteAccount() {
    setDeleting(true)
    setError(null)
    try {
      await onDeleteAccount()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Löschen fehlgeschlagen.')
      setDeleting(false)
      setConfirmDelete(false)
    }
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

        {onMonkModeChange && (
          <label className="profile__switch" htmlFor="monk-mode">
            <span>
              <strong>Monk Mode</strong>
              <span className="profile__switch-hint">
                Blendet Eintragen, Rank, Ranked, Recs, Stats und Goonometer aus
              </span>
            </span>
            <input
              id="monk-mode"
              type="checkbox"
              checked={Boolean(monkMode)}
              onChange={(e) => onMonkModeChange(e.target.checked)}
            />
          </label>
        )}

        {onRankedAnonymousChange && (
          <label className="profile__switch" htmlFor="ranked-anon">
            <span>
              <strong>Ranked anonym</strong>
              <span className="profile__switch-hint">
                Im Ranked-Leaderboard als Anonymous erscheinen
              </span>
            </span>
            <input
              id="ranked-anon"
              type="checkbox"
              checked={Boolean(rankedAnonymous)}
              onChange={(e) => onRankedAnonymousChange(e.target.checked)}
            />
          </label>
        )}
      </section>

      {!monkMode && (
        <section className="block">
          <div className="block__head">
            <h2>Rank</h2>
          </div>
          <RankBadge totalMinutes={totalMinutes} rank={rank} />
          <p className="profile__stat">
            Level {level} · {formatMinutes(totalMinutes)}
          </p>
        </section>
      )}

      <ProfileStreaks streak={streak} compact />

      {!monkMode && (
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
      )}

      <AchievementsSection
        entries={entries}
        startedOn={startedOn}
        freshKeys={freshAchievementKeys}
      />

      {!monkMode && (
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
      )}

      <section className="block block--danger">
        <div className="block__head">
          <h2>Konto</h2>
        </div>
        <p className="profile__stat">
          Logout oder Konto unwiderruflich löschen (inkl. Cloud-Daten).
        </p>
        <div className="profile__account-actions">
          <button type="button" className="btn" onClick={onLogout}>
            Logout
          </button>
          {!confirmDelete ? (
            <button
              type="button"
              className="btn btn--danger"
              disabled={!userId || deleting}
              onClick={() => setConfirmDelete(true)}
            >
              Konto löschen
            </button>
          ) : (
            <div className="profile__delete-confirm">
              <p className="friends__error">Wirklich alles löschen? Das geht nicht zurück.</p>
              <div className="session__actions">
                <button
                  type="button"
                  className="btn"
                  disabled={deleting}
                  onClick={() => setConfirmDelete(false)}
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  className="btn btn--danger"
                  disabled={deleting || !userId}
                  onClick={() => void handleDeleteAccount()}
                >
                  {deleting ? 'Löschen…' : 'Endgültig löschen'}
                </button>
              </div>
            </div>
          )}
        </div>
        {error && <p className="friends__error">{error}</p>}
      </section>
    </div>
  )
}
