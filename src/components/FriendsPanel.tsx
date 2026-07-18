import { useEffect, useMemo, useState } from 'react'
import { formatMinutes } from '../lib/format'
import {
  addFriendship,
  cloudEnabled,
  createRecommendation,
  deleteRecommendation,
  ensureCloudProfile,
  ensureCloudUser,
  fetchProfileByCode,
  loadFriendProfiles,
  loadRecommendations,
  pushCloudProfile,
  removeFriendship,
} from '../lib/cloud'
import { rankFromMinutes } from '../lib/ranks'
import type { FriendSnapshot, Recommendation } from '../types'
import { Leaderboard } from './Leaderboard'
import { RankBadge } from './RankBadge'

type FriendsPanelProps = {
  me: FriendSnapshot
  friends: FriendSnapshot[]
  displayName: string
  username?: string
  cloudCode?: string
  onNameChange: (name: string) => void
  onCloudReady: (info: { cloudUserId: string; cloudCode: string }) => void
  onFriendsSync: (friends: FriendSnapshot[]) => void
  onRemoveLocal: (id: string) => void
}

type SortKey = 'xp' | 'level' | 'goon' | 'dry' | 'time'
type FriendsView = 'compare' | 'recs' | 'board'

export function FriendsPanel({
  me,
  friends,
  displayName,
  username,
  cloudCode,
  onNameChange,
  onCloudReady,
  onFriendsSync,
  onRemoveLocal,
}: FriendsPanelProps) {
  const [view, setView] = useState<FriendsView>('compare')
  const [paste, setPaste] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [sort, setSort] = useState<SortKey>('xp')
  const [recs, setRecs] = useState<Recommendation[]>([])
  const [recName, setRecName] = useState('')
  const [recLink, setRecLink] = useState('')

  const myCode = cloudCode ?? '…'
  const myRank = rankFromMinutes(me.totalMinutes)

  const board = useMemo(() => {
    const rows = [
      { ...me, name: displayName.trim() || 'Du', _you: true as const },
      ...friends.map((f) => ({ ...f, _you: false as const })),
    ]
    return rows.sort((a, b) => {
      if (sort === 'level') return b.level - a.level || b.xp - a.xp
      if (sort === 'goon') return b.goonStreak - a.goonStreak
      if (sort === 'dry') return b.dryStreak - a.dryStreak
      if (sort === 'time') return b.totalMinutes - a.totalMinutes
      return b.xp - a.xp
    })
  }, [me, friends, displayName, sort])

  useEffect(() => {
    if (!cloudEnabled) return
    let cancelled = false

    async function boot() {
      setBusy(true)
      setError(null)
      const user = await ensureCloudUser()
      if (cancelled) return
      if ('error' in user) {
        setError(user.error)
        setBusy(false)
        return
      }

      const profile = await ensureCloudProfile(user.userId, displayName, username)
      if (cancelled) return
      if ('error' in profile) {
        setError(profile.error)
        setBusy(false)
        return
      }

      onCloudReady({ cloudUserId: user.userId, cloudCode: profile.code })

      await pushCloudProfile({
        userId: user.userId,
        code: profile.code,
        name: displayName,
        username,
        snapshot: me,
      })

      const loaded = await loadFriendProfiles(user.userId)
      if (cancelled) return
      if ('error' in loaded) setError(loaded.error)
      else {
        onFriendsSync(loaded.friends)
        setStatus('Online')
      }

      const r = await loadRecommendations(user.userId)
      if (!cancelled && !('error' in r)) setRecs(r.items)

      setBusy(false)
    }

    void boot()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudCode])

  async function copyCode() {
    if (!cloudCode) return
    try {
      await navigator.clipboard.writeText(cloudCode)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setError('Kopieren fehlgeschlagen.')
    }
  }

  async function addFriend() {
    setError(null)
    const user = await ensureCloudUser()
    if ('error' in user) {
      setError(user.error)
      return
    }
    const found = await fetchProfileByCode(paste)
    if ('error' in found) {
      setError(found.error)
      return
    }
    if (found.profile.id === user.userId) {
      setError('Das ist dein eigener Code.')
      return
    }
    const linked = await addFriendship(user.userId, found.profile.id)
    if (linked.error) {
      setError(linked.error)
      return
    }
    const loaded = await loadFriendProfiles(user.userId)
    if ('error' in loaded) setError(loaded.error)
    else {
      onFriendsSync(loaded.friends)
      setPaste('')
      setStatus(`${found.profile.name} hinzugefügt`)
    }
    const r = await loadRecommendations(user.userId)
    if (!('error' in r)) setRecs(r.items)
  }

  async function removeFriend(id: string) {
    const user = await ensureCloudUser()
    if ('error' in user) {
      onRemoveLocal(id)
      return
    }
    await removeFriendship(user.userId, id)
    onRemoveLocal(id)
    const loaded = await loadFriendProfiles(user.userId)
    if (!('error' in loaded)) onFriendsSync(loaded.friends)
  }

  async function addRec() {
    setError(null)
    const user = await ensureCloudUser()
    if ('error' in user) {
      setError(user.error)
      return
    }
    const result = await createRecommendation({
      userId: user.userId,
      authorName: displayName,
      name: recName,
      link: recLink,
    })
    if (result.error) {
      setError(result.error)
      return
    }
    setRecName('')
    setRecLink('')
    const r = await loadRecommendations(user.userId)
    if (!('error' in r)) setRecs(r.items)
  }

  async function removeRec(id: string) {
    const user = await ensureCloudUser()
    if ('error' in user) return
    await deleteRecommendation(user.userId, id)
    const r = await loadRecommendations(user.userId)
    if (!('error' in r)) setRecs(r.items)
  }

  if (!cloudEnabled) {
    return <p className="empty">Cloud nicht konfiguriert.</p>
  }

  return (
    <div className="friends">
      <div className="friends__tabs">
        <button
          type="button"
          className={`chip${view === 'compare' ? ' is-active' : ''}`}
          onClick={() => setView('compare')}
        >
          Vergleich
        </button>
        <button
          type="button"
          className={`chip${view === 'recs' ? ' is-active' : ''}`}
          onClick={() => setView('recs')}
        >
          Recs
        </button>
        <button
          type="button"
          className={`chip${view === 'board' ? ' is-active' : ''}`}
          onClick={() => setView('board')}
        >
          Leaderboard
        </button>
      </div>

      {view === 'compare' && (
        <>
          <div className="friends__profile">
            <label htmlFor="display-name">Anzeigename</label>
            <input
              id="display-name"
              value={displayName}
              maxLength={24}
              onChange={(e) => onNameChange(e.target.value)}
            />
            <RankBadge totalMinutes={me.totalMinutes} rank={myRank} compact />
          </div>

          <div className="friends__share">
            <p>Dein Live-Code:</p>
            <input className="friends__code" readOnly value={myCode} />
            <button type="button" className="btn" onClick={copyCode} disabled={!cloudCode}>
              {copied ? 'Kopiert' : 'Code kopieren'}
            </button>
            {status && <p className="friends__status">{status}</p>}
          </div>

          <div className="friends__add">
            <label htmlFor="friend-code">Freund-Code</label>
            <input
              id="friend-code"
              placeholder="AB12CD"
              value={paste}
              onChange={(e) => {
                setPaste(e.target.value.toUpperCase())
                setError(null)
              }}
            />
            <button
              type="button"
              className="btn btn--solid"
              onClick={() => void addFriend()}
              disabled={busy}
            >
              Hinzufügen
            </button>
            {error && <p className="friends__error">{error}</p>}
          </div>

          <div className="friends__board">
            <div className="friends__board-head">
              <h3>Vergleich</h3>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                aria-label="Sortierung"
              >
                <option value="xp">XP</option>
                <option value="level">Level</option>
                <option value="goon">Goon Streak</option>
                <option value="dry">Dry Streak</option>
                <option value="time">Zeit</option>
              </select>
            </div>
            <ol className="leaderboard">
              {board.map((row, i) => (
                <li key={row.id} className={`leaderboard__row${row._you ? ' is-you' : ''}`}>
                  <span className="leaderboard__rank">{i + 1}</span>
                  <div className="leaderboard__main">
                    <strong>
                      {row.name}
                      {row._you ? ' · du' : ''}
                    </strong>
                    <RankBadge
                      totalMinutes={row.totalMinutes}
                      rank={rankFromMinutes(row.totalMinutes)}
                      compact
                    />
                    <span>
                      Lv {row.level} · {formatMinutes(row.totalMinutes)}
                    </span>
                  </div>
                  {!row._you && (
                    <button
                      type="button"
                      className="leaderboard__remove"
                      onClick={() => void removeFriend(row.id)}
                    >
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </>
      )}

      {view === 'recs' && (
        <div className="recs">
          <div className="friends__add">
            <label htmlFor="rec-name">Empfehlung · Name</label>
            <input
              id="rec-name"
              value={recName}
              placeholder="Titel"
              onChange={(e) => setRecName(e.target.value)}
            />
            <label htmlFor="rec-link">Link</label>
            <input
              id="rec-link"
              value={recLink}
              placeholder="https://…"
              onChange={(e) => setRecLink(e.target.value)}
            />
            <button type="button" className="btn btn--solid" onClick={() => void addRec()}>
              Teilen
            </button>
            {error && <p className="friends__error">{error}</p>}
          </div>
          <ul className="rec-list">
            {recs.map((r) => (
              <li key={r.id} className="rec-row">
                <div>
                  <strong>{r.name}</strong>
                  <span className="rec-row__meta">von @{r.authorName}</span>
                  <a href={r.link} target="_blank" rel="noreferrer">
                    {r.link}
                  </a>
                </div>
                {r.userId === me.id && (
                  <button
                    type="button"
                    className="leaderboard__remove"
                    onClick={() => void removeRec(r.id)}
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
          {recs.length === 0 && <p className="empty">Noch keine Recommendations.</p>}
        </div>
      )}

      {view === 'board' && <Leaderboard highlightId={me.id} />}
    </div>
  )
}
