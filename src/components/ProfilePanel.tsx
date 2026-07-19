import { useMemo, useRef, useState } from 'react'
import {
  cloudEnabled,
  fetchProfileByCode,
  sendFriendRequest,
  uploadAvatar,
} from '../lib/cloud'
import { weeklyGoonometerAverage } from '../lib/goonometer'
import { rankFromMinutes } from '../lib/ranks'
import type { Category, Entry } from '../types'
import { AchievementsSection } from './AchievementsSection'
import { Avatar } from './Avatar'
import { CategoryStats } from './CategoryStats'
import { EntryList } from './EntryList'
import { RankBadge } from './RankBadge'

type ProfileSeg = 'overview' | 'stats' | 'settings'

type ProfilePanelProps = {
  userId?: string
  username?: string
  displayName: string
  avatarUrl?: string
  cloudCode?: string
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
  cloudCode,
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
  const [seg, setSeg] = useState<ProfileSeg>('overview')
  const [historyCategory, setHistoryCategory] = useState<Category | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [friendPaste, setFriendPaste] = useState('')
  const [friendStatus, setFriendStatus] = useState<string | null>(null)
  const [friendBusy, setFriendBusy] = useState(false)
  const [copied, setCopied] = useState(false)
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

  async function copyFriendCode() {
    if (!cloudCode) return
    try {
      await navigator.clipboard.writeText(cloudCode)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setFriendStatus(null)
      setError('Kopieren fehlgeschlagen.')
    }
  }

  async function sendFriendInvite() {
    if (!userId || !cloudEnabled) {
      setError('Cloud nicht konfiguriert.')
      return
    }
    setError(null)
    setFriendStatus(null)
    setFriendBusy(true)
    const found = await fetchProfileByCode(friendPaste)
    if ('error' in found) {
      setFriendBusy(false)
      setError(found.error)
      return
    }
    if (found.profile.id === userId) {
      setFriendBusy(false)
      setError('Das ist dein eigener Code.')
      return
    }
    const sent = await sendFriendRequest(userId, found.profile.id)
    setFriendBusy(false)
    if (sent.error) {
      setError(sent.error)
      return
    }
    setFriendPaste('')
    setFriendStatus('Anfrage gesendet')
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
            <p className="eyebrow">Profil</p>
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
            <span className="metric-strip__label">Goonometer</span>
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
            Stats
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

          <div className="settings-group">
            <h3 className="settings-group__title">Freund hinzufügen</h3>
            <p className="profile__stat">
              Dein Code — Anfrage senden; der andere muss noch akzeptieren.
            </p>
            <input className="friends__code" readOnly value={cloudCode || '…'} />
            <button
              type="button"
              className="btn"
              onClick={() => void copyFriendCode()}
              disabled={!cloudCode}
            >
              {copied ? 'Kopiert' : 'Code kopieren'}
            </button>
            <label htmlFor="profile-friend-code">Freund-Code</label>
            <input
              id="profile-friend-code"
              placeholder="AB12CD"
              value={friendPaste}
              onChange={(e) => {
                setFriendPaste(e.target.value.toUpperCase())
                setError(null)
                setFriendStatus(null)
              }}
            />
            <button
              type="button"
              className="btn btn--solid"
              onClick={() => void sendFriendInvite()}
              disabled={friendBusy || !userId}
            >
              Anfrage senden
            </button>
            {friendStatus && <p className="friends__status">{friendStatus}</p>}
          </div>

          <div className="settings-group settings-group--switches">
            {onMonkModeChange && (
              <label className="profile__switch" htmlFor="monk-mode">
                <span>
                  <strong>Monk Mode</strong>
                  <span className="profile__switch-hint">
                    Blendet Eintragen, Rank, Ranked, Recommendations, Stats und Goonometer aus
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
