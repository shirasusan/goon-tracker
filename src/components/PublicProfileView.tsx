import { useEffect, useState } from 'react'
import {
  acceptFriendRequest,
  getFriendRelation,
  listIncomingFriendRequests,
  sendFriendRequest,
} from '../lib/cloud'
import { formatMinutes } from '../lib/format'
import { rankFromMinutes } from '../lib/ranks'
import { CATEGORIES, CATEGORY_META, type FriendSnapshot } from '../types'
import { AchievementsSection } from './AchievementsSection'
import { Avatar } from './Avatar'
import { ProfileStreaks } from './ProfileStreaks'
import { RankBadge } from './RankBadge'
import { goonDryToSigned } from '../lib/streaks'

type Relation = 'self' | 'friends' | 'outgoing' | 'incoming' | 'none'

type PublicProfileViewProps = {
  profile: FriendSnapshot
  onBack: () => void
  onViewedOtherProfile?: () => void
  /** Current user id — enables friend request actions */
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
  const [relation, setRelation] = useState<Relation>('none')
  const [incomingId, setIncomingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

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
    <div className="profile public-profile">
      <button type="button" className="btn" onClick={onBack}>
        ← Zurück
      </button>

      <section className="block">
        <div className="block__head">
          <h2>Profil</h2>
        </div>
        <div className="profile__hero">
          <Avatar
            src={profile.avatarUrl}
            name={profile.name}
            goonStreak={profile.goonStreak}
            dryStreak={profile.dryStreak}
            size="lg"
          />
          <div>
            <p className="profile__user">@{profile.username || profile.name}</p>
            <p className="profile__stat">{profile.name}</p>
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
      </section>

      <section className="block">
        <div className="block__head">
          <h2>Rank</h2>
        </div>
        <RankBadge totalMinutes={profile.totalMinutes} rank={rank} />
        <p className="profile__stat">
          Level {profile.level} · {formatMinutes(profile.totalMinutes)}
        </p>
      </section>

      <ProfileStreaks streak={goonDryToSigned(profile.goonStreak, profile.dryStreak)} compact />

      <AchievementsSection categories={profile.categories} />

      <section className="block">
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
    </div>
  )
}
