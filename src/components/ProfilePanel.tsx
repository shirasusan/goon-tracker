import { useEffect, useMemo, useRef, useState } from 'react'
import { uploadAvatar } from '../lib/cloud'
import { entryHasCategory } from '../lib/entries'
import { weeklyGoonometerAverage } from '../lib/goonometer'
import { rankFromMinutes } from '../lib/ranks'
import type { Category, Entry } from '../types'
import { AchievementsSection } from './AchievementsSection'
import { Avatar } from './Avatar'
import { CategoryStats } from './CategoryStats'
import { EntryList } from './EntryList'
import { RankBadge } from './RankBadge'
import { IconSettings } from './NavIcons'

type ProfileSeg = 'overview' | 'stats' | 'settings'

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
  settingsNonce?: number
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
  settingsNonce,
  freshAchievementKeys,
  monkMode,
  onMonkModeChange,
  rankedAnonymous,
  onRankedAnonymousChange,
}: ProfilePanelProps) {
  const weekAvg = useMemo(() => weeklyGoonometerAverage(entries), [entries])
  const rank = rankFromMinutes(totalMinutes)
  const [seg, setSeg] = useState<ProfileSeg>('overview')
  const [historyCategory, setHistoryCategory] = useState<Category | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (settingsNonce != null && settingsNonce > 0) {
      setSeg('settings')
    }
  }, [settingsNonce])

  const recent = useMemo(() => {
    if (!historyCategory) return []
    return [...entries]
      .filter((e) => entryHasCategory(e, historyCategory))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 30)
  }, [entries, historyCategory])

  const streakTone = streak > 0 ? 'goon' : streak < 0 ? 'focus' : 'neutral'
  const streakLabel =
    streak > 0 ? 'Goon' : streak < 0 ? 'Focus' : 'Streak'
  const streakValue = Math.abs(streak)

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

  const activeSeg = monkMode && seg === 'stats' ? 'overview' : seg

  return (
    <div className="profile page-stack">
      {onBack && (
        <button type="button" className="btn profile__back" onClick={onBack}>
          ← Zurück
        </button>
      )}

      <header className="panel-hero">
        <div className="panel-hero__identity">
          <Avatar
            src={avatarUrl}
            name={displayName}
            goonStreak={goonStreak}
            dryStreak={dryStreak}
            size="lg"
          />
          <div className="panel-hero__text">
            <button
              type="button"
              className="panel-hero__gear"
              aria-label="Einstellungen"
              onClick={() => setSeg('settings')}
            >
              <IconSettings />
            </button>
            <h1 className="panel-hero__name">{displayName.trim() || 'Anon'}</h1>
            <p className="profile__user">@{username || '—'}</p>
          </div>
        </div>
      </header>

      <div className="metric-strip" role="group" aria-label="Übersicht">
        {!monkMode && (
          <div className="metric-strip__item">
            <span className="metric-strip__label">Rank</span>
            <RankBadge totalMinutes={totalMinutes} rank={rank} compact />
          </div>
        )}
        {!monkMode && (
          <div className="metric-strip__item metric-strip__item--wide">
            <span className="metric-strip__label">Level</span>
            <strong className="metric-strip__value">
              {level}
              <span className="metric-strip__sub">{totalMinutes} XP</span>
            </strong>
          </div>
        )}
        <div className={`metric-strip__item metric-strip__item--${streakTone}`}>
          <span className="metric-strip__label">{streakLabel}</span>
          <strong className="metric-strip__value">{streakValue}</strong>
        </div>
        {!monkMode && (
          <div className="metric-strip__item">
            <span className="metric-strip__label">Intensität</span>
            <strong className="metric-strip__value">
              {weekAvg == null ? '—' : weekAvg}
              {weekAvg != null && <span className="metric-strip__sub">/ 10</span>}
            </strong>
          </div>
        )}
      </div>

      <div className="seg-tabs friends__tabs" role="tablist" aria-label="Profilbereiche">
        <button
          type="button"
          role="tab"
          aria-selected={activeSeg === 'overview'}
          className={`chip${activeSeg === 'overview' ? ' is-active' : ''}`}
          onClick={() => setSeg('overview')}
        >
          Übersicht
        </button>
        {!monkMode && (
          <button
            type="button"
            role="tab"
            aria-selected={activeSeg === 'stats'}
            className={`chip${activeSeg === 'stats' ? ' is-active' : ''}`}
            onClick={() => setSeg('stats')}
          >
            Statistiken
          </button>
        )}
        <button
          type="button"
          role="tab"
          aria-selected={activeSeg === 'settings'}
          className={`chip${activeSeg === 'settings' ? ' is-active' : ''}`}
          onClick={() => setSeg('settings')}
        >
          Einstellungen
        </button>
      </div>

      {activeSeg === 'overview' && (
        <AchievementsSection
          entries={entries}
          startedOn={startedOn}
          freshKeys={freshAchievementKeys}
          embedded
        />
      )}

      {activeSeg === 'stats' && !monkMode && (
        <section className="profile-panel">
          <div className="block__head">
            <h2>Statistiken</h2>
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
              <EntryList
                entries={recent}
                onRemove={onRemoveEntry}
                focusCategory={historyCategory}
              />
            </>
          )}
        </section>
      )}

      {activeSeg === 'settings' && (
        <section className="profile-panel profile-panel--settings">
          <div className="block__head">
            <h2>Einstellungen</h2>
          </div>

          <div className="settings-group">
            <label htmlFor="display-name">Anzeigename</label>
            <input
              id="display-name"
              value={displayName}
              maxLength={24}
              onChange={(e) => onNameChange(e.target.value)}
            />
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => void onPickAvatar(e.target.files?.[0])}
            />
            <button
              type="button"
              className="btn"
              disabled={uploading || !userId}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? 'Upload…' : 'Bild ändern'}
            </button>
          </div>

          <div className="settings-group settings-group--switches">
            {onMonkModeChange && (
              <label className="profile__switch" htmlFor="monk-mode">
                <span>
                  <strong>Mönchsmodus</strong>
                  <span className="profile__switch-hint">
                    Blendet Eintragen, Rang, Rangliste, Empfehlungen, Statistiken und Intensität aus
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
                  <strong>Rangliste anonym</strong>
                  <span className="profile__switch-hint">
                    In der Rangliste als Anonym erscheinen
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
          </div>

          <div className="settings-group settings-group--danger">
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
                  <p className="friends__error">
                    Wirklich alles löschen? Das geht nicht zurück.
                  </p>
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
          </div>

          {error && <p className="friends__error">{error}</p>}
        </section>
      )}
    </div>
  )
}
