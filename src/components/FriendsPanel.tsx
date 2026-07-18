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
  fetchProfileById,
  loadFriendProfiles,
  loadRecommendations,
  pushCloudProfile,
  removeFriendship,
} from '../lib/cloud'
import { CATEGORIES, CATEGORY_META, type FriendSnapshot, type Recommendation } from '../types'
import { Avatar } from './Avatar'
import { PublicProfileView } from './PublicProfileView'

type FriendsPanelProps = {
  me: FriendSnapshot
  friends: FriendSnapshot[]
  displayName: string
  username?: string
  avatarUrl?: string
  cloudCode?: string
  onCloudReady: (info: { cloudUserId: string; cloudCode: string; avatarUrl?: string | null }) => void
  onFriendsSync: (friends: FriendSnapshot[]) => void
  onRemoveLocal: (id: string) => void
}

type SortKey = 'level' | 'time'
type FriendsView = 'compare' | 'recs'

export function FriendsPanel({
  me,
  friends,
  displayName,
  username,
  avatarUrl,
  cloudCode,
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
  const [sort, setSort] = useState<SortKey>('time')
  const [recs, setRecs] = useState<Recommendation[]>([])
  const [recName, setRecName] = useState('')
  const [recLink, setRecLink] = useState('')
  const [recImage, setRecImage] = useState<File | null>(null)
  const [recFile, setRecFile] = useState<File | null>(null)
  const [viewing, setViewing] = useState<FriendSnapshot | null>(null)

  const myCode = cloudCode ?? '…'

  const board = useMemo(() => {
    const rows = [
      { ...me, name: displayName.trim() || 'Du', _you: true as const },
      ...friends.map((f) => ({ ...f, _you: false as const })),
    ]
    return rows.sort((a, b) => {
      if (sort === 'level') return b.level - a.level || b.totalMinutes - a.totalMinutes
      return b.totalMinutes - a.totalMinutes || b.level - a.level
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

      onCloudReady({
        cloudUserId: user.userId,
        cloudCode: profile.code,
        avatarUrl: profile.avatarUrl,
      })

      await pushCloudProfile({
        userId: user.userId,
        code: profile.code,
        name: displayName,
        username,
        avatarUrl: avatarUrl || profile.avatarUrl || undefined,
        snapshot: me,
      })

      const loaded = await loadFriendProfiles(user.userId)
      if (cancelled) return
      if ('error' in loaded) setError(loaded.error)
      else {
        onFriendsSync(loaded.friends)
        setStatus('Online · 1 Code reicht (gegenseitig)')
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

  async function openProfile(id: string) {
    const result = await fetchProfileById(id)
    if ('error' in result) {
      setError(result.error)
      return
    }
    setViewing(result.profile)
  }

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
      setStatus(`${found.profile.name} hinzugefügt (beide Seiten)`)
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
      imageFile: recImage,
      attachFile: recFile,
    })
    if (result.error) {
      setError(result.error)
      return
    }
    setRecName('')
    setRecLink('')
    setRecImage(null)
    setRecFile(null)
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

  if (viewing) {
    return <PublicProfileView profile={viewing} onBack={() => setViewing(null)} />
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
      </div>

      {view === 'compare' && (
        <>
          <div className="friends__share">
            <p>Dein Code — einmal teilen reicht (Freundschaft ist gegenseitig):</p>
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
                <option value="level">Level</option>
                <option value="time">Zeit</option>
              </select>
            </div>
            <ol className="leaderboard compare-list">
              {board.map((row, i) => (
                <li
                  key={row.id}
                  className={`leaderboard__row compare-row${row._you ? ' is-you' : ''}`}
                >
                  <span className="leaderboard__rank">{i + 1}</span>
                  <Avatar
                    src={row.avatarUrl}
                    name={row.name}
                    goonStreak={row.goonStreak}
                    dryStreak={row.dryStreak}
                    size="sm"
                    onClick={row._you ? undefined : () => void openProfile(row.id)}
                  />
                  <div className="leaderboard__main compare-row__main">
                    <button
                      type="button"
                      className="leaderboard__name-btn"
                      onClick={row._you ? undefined : () => void openProfile(row.id)}
                    >
                      <strong>
                        {row.name}
                        {row._you ? ' · du' : ''}
                      </strong>
                    </button>
                    <span>
                      Lv {row.level} · {formatMinutes(row.totalMinutes)}
                    </span>
                    <ul className="compare-cats">
                      {CATEGORIES.map((cat) => (
                        <li key={cat}>
                          <span style={{ color: CATEGORY_META[cat].color }}>
                            {CATEGORY_META[cat].label}
                          </span>
                          <span>{formatMinutes(row.categories[cat] || 0)}</span>
                        </li>
                      ))}
                    </ul>
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
            <label htmlFor="rec-link">Link (optional)</label>
            <input
              id="rec-link"
              value={recLink}
              placeholder="https://…"
              onChange={(e) => setRecLink(e.target.value)}
            />
            <label htmlFor="rec-image">Foto</label>
            <input
              id="rec-image"
              type="file"
              accept="image/*"
              onChange={(e) => setRecImage(e.target.files?.[0] ?? null)}
            />
            <label htmlFor="rec-file">Datei</label>
            <input
              id="rec-file"
              type="file"
              onChange={(e) => setRecFile(e.target.files?.[0] ?? null)}
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
                  {r.link && (
                    <a href={r.link} target="_blank" rel="noreferrer">
                      {r.link}
                    </a>
                  )}
                  {r.imageUrl && (
                    <img className="rec-row__img" src={r.imageUrl} alt="" />
                  )}
                  {r.fileUrl && (
                    <a href={r.fileUrl} target="_blank" rel="noreferrer">
                      📎 {r.fileName || 'Datei'}
                    </a>
                  )}
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

    </div>
  )
}
