import { useEffect, useState } from 'react'
import {
  acceptFriendRequest,
  getFriendRelation,
  listIncomingFriendRequests,
  sendFriendRequest,
} from '../lib/cloud'
import { formatMinutes } from '../lib/format'
import { rankFromMinutes } from '../lib/ranks'
import { goonDryToSigned } from '../lib/streaks'
import { CATEGORIES, CATEGORY_META, type FriendSnapshot } from '../types'
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
}

export function PublicProfileView({
  profile,
  onBack,
  onViewedOtherProfile,
  meId,
  onFriendsChanged,
}: PublicProfileViewProps) {
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
    setMsg('Anfrage gesendet')
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
    setMsg('Freundschaft akzeptiert')
    onFriendsChanged?.()
  }

  return (
    <div className="profile public-profile page-stack">
      <button type="button" className="btn profile__back" onClick={onBack}>
        ← Zurück
      </button>

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
            <p className="eyebrow">Profil</p>
            <h1 className="panel-hero__name">{profile.name}</h1>
            <p className="profile__user">@{profile.username || profile.name}</p>
          </div>
        </div>

        {meId && relation !== 'self' && (
          <div className="public-profile__actions">
            {relation === 'none' && (
              <button
                type="button"
                className="btn btn--solid"
                disabled={busy}
                onClick={() => void sendRequest()}
              >
                Freundschaftsanfrage
              </button>
            )}
            {relation === 'outgoing' && (
              <p className="friends__status">Anfrage ausstehend…</p>
            )}
            {relation === 'incoming' && (
              <button
                type="button"
                className="btn btn--solid"
                disabled={busy || !incomingId}
                onClick={() => void acceptIncoming()}
              >
                Anfrage akzeptieren
              </button>
            )}
            {relation === 'friends' && (
              <p className="friends__status">Bereits Freunde</p>
            )}
            {msg && <p className="friends__status">{msg}</p>}
          </div>
        )}
      </header>

      <div className="metric-strip" role="group" aria-label="Übersicht">
        <div className="metric-strip__item">
          <span className="metric-strip__label">Rank</span>
          <RankBadge totalMinutes={profile.totalMinutes} rank={rank} compact />
        </div>
        <div className="metric-strip__item">
          <span className="metric-strip__label">Level</span>
          <strong className="metric-strip__value">
            {profile.level}
            <span className="metric-strip__sub">
              {formatMinutes(profile.totalMinutes)}
            </span>
          </strong>
        </div>
        <div className={`metric-strip__item metric-strip__item--${streakTone}`}>
          <span className="metric-strip__label">{streakLabel}</span>
          <strong className="metric-strip__value">{streakValue}</strong>
        </div>
      </div>

      <div className="seg-tabs friends__tabs" role="tablist" aria-label="Profilbereiche">
        <button
          type="button"
          role="tab"
          aria-selected={seg === 'overview'}
          className={`chip${seg === 'overview' ? ' is-active' : ''}`}
          onClick={() => setSeg('overview')}
        >
          Übersicht
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={seg === 'stats'}
          className={`chip${seg === 'stats' ? ' is-active' : ''}`}
          onClick={() => setSeg('stats')}
        >
          Stats
        </button>
      </div>

      {seg === 'overview' && (
        <AchievementsSection categories={profile.categories} embedded />
      )}

      {seg === 'stats' && (
        <section className="profile-panel">
          <div className="block__head">
            <h2>Stats</h2>
            <span>Kategorien</span>
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
