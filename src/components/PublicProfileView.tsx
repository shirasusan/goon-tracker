import { useEffect, useState } from 'react'
import {
  acceptFriendRequest,
  getFriendRelation,
  listIncomingFriendRequests,
  removeFriendship,
  sendFriendRequest,
} from '../lib/cloud'
import { formatMinutes } from '../lib/format'
import { rankFromMinutes } from '../lib/ranks'
import { goonDryToSigned } from '../lib/streaks'
import { CATEGORIES, CATEGORY_META, type FriendSnapshot } from '../types'
import { useLocale } from '../lib/LocaleContext'
import { AchievementsSection } from './AchievementsSection'
import { Avatar } from './Avatar'
import { RankBadge } from './RankBadge'

type Relation = 'self' | 'friends' | 'outgoing' | 'incoming' | 'none'
type PublicSeg = 'overview' | 'stats'

type PublicProfileViewProps = {
  profile: FriendSnapshot
  onBack: () => void
  onViewedOtherProfile?: () => void
  meId?: string
  onFriendsChanged?: () => void
  onRemoveFriend?: (id: string) => void
}

export function PublicProfileView({
  profile,
  onBack,
  onViewedOtherProfile,
  meId,
  onFriendsChanged,
  onRemoveFriend,
}: PublicProfileViewProps) {
  const { t } = useLocale()
  const rank = rankFromMinutes(profile.totalMinutes)
  const maxCat = Math.max(1, ...CATEGORIES.map((c) => profile.categories[c] || 0))
  const streak = goonDryToSigned(profile.goonStreak, profile.dryStreak)
  const [seg, setSeg] = useState<PublicSeg>('overview')
  const [relation, setRelation] = useState<Relation>('none')
  const [incomingId, setIncomingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const streakTone = streak > 0 ? 'goon' : streak < 0 ? 'focus' : 'neutral'
  const streakLabel = streak > 0 ? 'Goon' : streak < 0 ? 'Focus' : 'Streak'
  const streakValue = Math.abs(streak)

  useEffect(() => {
    onViewedOtherProfile?.()
  }, [onViewedOtherProfile, profile.id])

  useEffect(() => {
    if (!meId) return
    let cancelled = false
    async function load() {
      const rel = await getFriendRelation(meId!, profile.id)
      if (cancelled || typeof rel === 'object') return
      setRelation(rel)
      if (rel === 'incoming') {
        const list = await listIncomingFriendRequests(meId!)
        if (cancelled || 'error' in list) return
        const hit = list.requests.find((r) => r.fromUserId === profile.id)
        setIncomingId(hit?.id ?? null)
      } else {
        setIncomingId(null)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [meId, profile.id])

  async function sendRequest() {
    if (!meId) return
    setBusy(true)
    setMsg(null)
    const result = await sendFriendRequest(meId, profile.id)
    setBusy(false)
    if (result.error) {
      setMsg(result.error)
      return
    }
    setRelation('outgoing')
    setMsg(t('request_sent'))
    onFriendsChanged?.()
  }

  async function acceptIncoming() {
    if (!meId || !incomingId) return
    setBusy(true)
    setMsg(null)
    const result = await acceptFriendRequest(incomingId, meId)
    setBusy(false)
    if (result.error) {
      setMsg(result.error)
      return
    }
    setRelation('friends')
    setIncomingId(null)
    setMsg(t('friend_accepted'))
    onFriendsChanged?.()
  }

  async function unfriend() {
    if (!meId) return
    setBusy(true)
    setMsg(null)
    const result = await removeFriendship(meId, profile.id)
    setBusy(false)
    if (result.error) {
      setMsg(result.error)
      return
    }
    onRemoveFriend?.(profile.id)
    onFriendsChanged?.()
    setRelation('none')
    onBack()
  }

  return (
    <div className="profile public-profile page-stack">
      <header className="panel-hero">
        <div className="panel-hero__identity">
          <Avatar
            src={profile.avatarUrl}
            name={profile.name}
            goonStreak={profile.goonStreak}
            dryStreak={profile.dryStreak}
            size="lg"
          />
          <div className="panel-hero__text">
            <h1 className="panel-hero__name">{profile.name}</h1>
            <p className="profile__user">@{profile.username || profile.name}</p>
          </div>
        </div>

        <button
          type="button"
          className="public-profile__close"
          onClick={onBack}
          aria-label={t('close')}
        >
          ×
        </button>

        {meId && relation !== 'self' && (
          <div className="public-profile__actions">
            {relation === 'none' && (
              <button
                type="button"
                className="btn btn--solid"
                disabled={busy}
                onClick={() => void sendRequest()}
              >
                {t('send_friend_request')}
              </button>
            )}
            {relation === 'outgoing' && (
              <p className="friends__status">{t('request_pending')}</p>
            )}
            {relation === 'incoming' && (
              <button
                type="button"
                className="btn btn--solid"
                disabled={busy || !incomingId}
                onClick={() => void acceptIncoming()}
              >
                {t('accept_request')}
              </button>
            )}
            {relation === 'friends' && (
              <div className="public-profile__friend-row">
                <p className="friends__status">{t('friends_status')}</p>
                <button
                  type="button"
                  className="public-profile__unfriend"
                  disabled={busy}
                  onClick={() => void unfriend()}
                  aria-label={t('remove_friend')}
                  title={t('remove_friend')}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="17" y1="8" x2="22" y2="13" />
                    <line x1="22" y1="8" x2="17" y2="13" />
                  </svg>
                </button>
              </div>
            )}
            {msg && <p className="friends__status">{msg}</p>}
          </div>
        )}
      </header>

      <div className="metric-strip" role="group" aria-label={t('overview')}>
        <div className="metric-strip__item">
          <span className="metric-strip__label">{t('rank')}</span>
          <RankBadge totalMinutes={profile.totalMinutes} rank={rank} compact />
        </div>
        <div className="metric-strip__item metric-strip__item--wide">
          <span className="metric-strip__label">{t('level')}</span>
          <strong className="metric-strip__value">
            {profile.level}
            <span className="metric-strip__sub">{profile.xp} XP</span>
          </strong>
        </div>
        <div className={`metric-strip__item metric-strip__item--${streakTone}`}>
          <span className="metric-strip__label">{streakLabel}</span>
          <strong className="metric-strip__value">{streakValue}</strong>
        </div>
      </div>

      <div className="seg-tabs friends__tabs" role="tablist" aria-label={t('profile_sections')}>
        <button
          type="button"
          role="tab"
          aria-selected={seg === 'overview'}
          className={`chip${seg === 'overview' ? ' is-active' : ''}`}
          onClick={() => setSeg('overview')}
        >
          {t('overview')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={seg === 'stats'}
          className={`chip${seg === 'stats' ? ' is-active' : ''}`}
          onClick={() => setSeg('stats')}
        >
          {t('stats')}
        </button>
      </div>

      {seg === 'overview' && (
        <AchievementsSection categories={profile.categories} embedded />
      )}

      {seg === 'stats' && (
        <section className="profile-panel">
          <div className="block__head">
            <h2>{t('stats')}</h2>
            <span>{t('categories')}</span>
          </div>
          <ul className="cat-stats">
            {CATEGORIES.map((cat) => {
              const meta = CATEGORY_META[cat]
              const mins = profile.categories[cat] || 0
              const pct = Math.round((mins / maxCat) * 100)
              return (
                <li key={cat}>
                  <div className="cat-stats__label">
                    <span style={{ color: meta.color }}>{meta.label}</span>
                    <span>{formatMinutes(mins)}</span>
                  </div>
                  <div className="cat-stats__track">
                    <div
                      className="cat-stats__fill"
                      style={{ width: `${pct}%`, background: meta.color }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
