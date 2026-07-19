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
import { useLocale } from '../lib/LocaleContext'
import { LOCALES, type Locale } from '../lib/i18n'

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
  settingsNonce?: number
  freshAchievementKeys?: Set<string>
  monkMode?: boolean
  onMonkModeChange?: (on: boolean) => void
  rankedAnonymous?: boolean
  onRankedAnonymousChange?: (on: boolean) => void
  locale: Locale
  onLocaleChange: (locale: Locale) => void
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
  settingsNonce,
  freshAchievementKeys,
  monkMode,
  onMonkModeChange,
  rankedAnonymous,
  onRankedAnonymousChange,
  locale,
  onLocaleChange,
}: ProfilePanelProps) {
  const { t } = useLocale()
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
            <h1 className="panel-hero__name">{displayName.trim() || 'Anon'}</h1>
            <p className="profile__user">@{username || '—'}</p>
          </div>
        </div>
      </header>

      <div className="metric-strip" role="group" aria-label={t('overview')}>
        {!monkMode && (
          <div className="metric-strip__item">
            <span className="metric-strip__label">{t('rank')}</span>
            <RankBadge totalMinutes={totalMinutes} rank={rank} compact />
          </div>
        )}
        {!monkMode && (
          <div className="metric-strip__item metric-strip__item--wide">
            <span className="metric-strip__label">{t('level')}</span>
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

      <div className="seg-tabs friends__tabs" role="tablist" aria-label={t('settings')}>
        <button
          type="button"
          role="tab"
          aria-selected={activeSeg === 'overview'}
          className={`chip${activeSeg === 'overview' ? ' is-active' : ''}`}
          onClick={() => setSeg('overview')}
        >
          {t('overview')}
        </button>
        {!monkMode && (
          <button
            type="button"
            role="tab"
            aria-selected={activeSeg === 'stats'}
            className={`chip${activeSeg === 'stats' ? ' is-active' : ''}`}
            onClick={() => setSeg('stats')}
          >
            {t('stats')}
          </button>
        )}
        <button
          type="button"
          role="tab"
          aria-selected={activeSeg === 'settings'}
          className={`chip${activeSeg === 'settings' ? ' is-active' : ''}`}
          data-tour="profile-settings"
          onClick={() => setSeg('settings')}
        >
          {t('settings')}
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
            <h2>{t('stats')}</h2>
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
                <h2>{t('stats')}</h2>
                <button
                  type="button"
                  className="section__close"
                  onClick={() => setHistoryCategory(null)}
                >
                  {t('close')}
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
            <h2>{t('settings')}</h2>
          </div>

          <div className="settings-group">
            <h3 className="settings-group__title">{t('nav_profile')}</h3>
            <div className="settings-profile">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => void onPickAvatar(e.target.files?.[0])}
              />
              <button
                type="button"
                className="settings-profile__avatar"
                disabled={uploading || !userId}
                onClick={() => fileRef.current?.click()}
                aria-label={uploading ? t('uploading') : t('change_photo')}
              >
                <Avatar
                  src={avatarUrl}
                  name={displayName}
                  goonStreak={goonStreak}
                  dryStreak={dryStreak}
                  size="lg"
                />
              </button>
              <div className="settings-profile__fields">
                <label htmlFor="display-name">{t('display_name')}</label>
                <input
                  id="display-name"
                  value={displayName}
                  maxLength={24}
                  onChange={(e) => onNameChange(e.target.value)}
                />
                <p className="profile__switch-hint">
                  {uploading ? t('uploading') : t('change_photo_hint')}
                </p>
              </div>
            </div>
          </div>

          <div className="settings-group">
            <h3 className="settings-group__title">{t('language')}</h3>
            <p className="profile__switch-hint">{t('language_hint')}</p>
            <div
              className="settings-lang friends__tabs"
              role="group"
              aria-label={t('language')}
            >
              {LOCALES.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`chip${locale === opt.id ? ' is-active' : ''}`}
                  aria-pressed={locale === opt.id}
                  onClick={() => onLocaleChange(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-group settings-group--switches">
            <h3 className="settings-group__title">{t('preferences')}</h3>
            {onMonkModeChange && (
              <label className="profile__switch" htmlFor="monk-mode">
                <span>
                  <strong>{t('monk_mode')}</strong>
                  <span className="profile__switch-hint">{t('monk_hint')}</span>
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
                  <strong>{t('ranked_anon')}</strong>
                  <span className="profile__switch-hint">
                    {t('ranked_anon_hint')}
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
            <h3 className="settings-group__title">{t('account')}</h3>
            <p className="profile__stat">{t('delete_warn')}</p>
            <div className="profile__account-actions">
              <button type="button" className="btn" onClick={onLogout}>
                {t('logout')}
              </button>
              {!confirmDelete ? (
                <button
                  type="button"
                  className="btn btn--danger"
                  disabled={!userId || deleting}
                  onClick={() => setConfirmDelete(true)}
                >
                  {t('delete_account')}
                </button>
              ) : (
                <div className="profile__delete-confirm">
                  <p className="friends__error">{t('delete_confirm')}</p>
                  <div className="session__actions">
                    <button
                      type="button"
                      className="btn"
                      disabled={deleting}
                      onClick={() => setConfirmDelete(false)}
                    >
                      {t('cancel')}
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger"
                      disabled={deleting || !userId}
                      onClick={() => void handleDeleteAccount()}
                    >
                      {deleting ? t('deleting') : t('delete_final')}
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
