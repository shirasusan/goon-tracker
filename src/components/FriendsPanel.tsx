import { useEffect, useMemo, useState } from 'react'
import { formatMinutes } from '../lib/format'
import {
  acceptFriendRequest,
  addGoonComment,
  cloudEnabled,
  createRecommendation,
  declineFriendRequest,
  deleteRecommendation,
  ensureCloudProfile,
  ensureCloudUser,
  fetchProfileByCode,
  fetchProfileById,
  listIncomingFriendRequests,
  loadFriendProfiles,
  loadGoonFeed,
  loadRecommendations,
  removeFriendship,
  sendFriendRequest,
  type FriendRequestRow,
} from '../lib/cloud'
import {
  CATEGORIES,
  CATEGORY_META,
  type FriendSnapshot,
  type GoonPost,
  type Recommendation,
} from '../types'
import { Avatar } from './Avatar'
import { GoonFeed } from './GoonFeed'
import { PublicProfileView } from './PublicProfileView'

type FriendsPanelProps = {
  me: FriendSnapshot
  friends: FriendSnapshot[]
  displayName: string
  username?: string
  avatarUrl?: string
  cloudCode?: string
  hideRecs?: boolean
  onCloudReady: (info: {
    cloudUserId: string
    cloudCode: string
    avatarUrl?: string | null
  }) => void
  onFriendsSync: (friends: FriendSnapshot[]) => void
  onRemoveLocal: (id: string) => void
  onViewedOtherProfile?: () => void
}

type FriendsView = 'feed' | 'compare' | 'recs'
type CategoryFilter = 'all' | (typeof CATEGORIES)[number]

const FEED_PREVIEW = 5
const FEED_FULL = 100

export function FriendsPanel({
  me,
  friends,
  displayName,
  username,
  cloudCode,
  hideRecs,
  onCloudReady,
  onFriendsSync,
  onRemoveLocal,
  onViewedOtherProfile,
}: FriendsPanelProps) {
  const [view, setView] = useState<FriendsView>('compare')
  const [paste, setPaste] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [showAddFriend, setShowAddFriend] = useState(false)
  const [incoming, setIncoming] = useState<FriendRequestRow[]>([])
  const [recs, setRecs] = useState<Recommendation[]>([])
  const [recQuery, setRecQuery] = useState('')
  const [showRecCreate, setShowRecCreate] = useState(false)
  const [recName, setRecName] = useState('')
  const [recLink, setRecLink] = useState('')
  const [recImage, setRecImage] = useState<File | null>(null)
  const [recImagePreview, setRecImagePreview] = useState<string | null>(null)
  const [recFile, setRecFile] = useState<File | null>(null)
  const [viewing, setViewing] = useState<FriendSnapshot | null>(null)
  const [meId, setMeId] = useState<string | undefined>()
  const [feed, setFeed] = useState<GoonPost[]>([])
  const [feedExpanded, setFeedExpanded] = useState(false)
  const [feedError, setFeedError] = useState<string | null>(null)
  const [feedBusy, setFeedBusy] = useState(false)

  const myCode = cloudCode ?? '…'

  const filteredRecs = useMemo(() => {
    const q = recQuery.trim().toLowerCase()
    if (!q) return recs
    return recs.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.authorName.toLowerCase().includes(q) ||
        r.link.toLowerCase().includes(q),
    )
  }, [recs, recQuery])

  useEffect(() => {
    if (hideRecs && view === 'recs') setView('compare')
  }, [hideRecs, view])

  useEffect(() => {
    if (!recImage) {
      setRecImagePreview(null)
      return
    }
    const url = URL.createObjectURL(recImage)
    setRecImagePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [recImage])

  const board = useMemo(() => {
    const metric = (row: FriendSnapshot) =>
      categoryFilter === 'all'
        ? row.totalMinutes
        : row.categories[categoryFilter] || 0

    const rows = [
      { ...me, name: displayName.trim() || 'Du', _you: true as const },
      ...friends.map((f) => ({ ...f, _you: false as const })),
    ]
    return rows
      .map((row) => ({ ...row, _metric: metric(row) }))
      .sort((a, b) => b._metric - a._metric || b.level - a.level)
  }, [me, friends, displayName, categoryFilter])

  async function refreshFeed(userId: string, expanded = feedExpanded) {
    setFeedBusy(true)
    const result = await loadGoonFeed(userId, {
      limit: expanded ? FEED_FULL : FEED_PREVIEW,
    })
    setFeedBusy(false)
    if ('error' in result) {
      setFeedError(result.error)
      return
    }
    setFeedError(null)
    setFeed(result.posts)
  }

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

      setMeId(user.userId)
      onCloudReady({
        cloudUserId: user.userId,
        cloudCode: profile.code,
        avatarUrl: profile.avatarUrl,
      })

      const loaded = await loadFriendProfiles(user.userId)
      if (cancelled) return
      if ('error' in loaded) setError(loaded.error)
      else onFriendsSync(loaded.friends)

      const reqs = await listIncomingFriendRequests(user.userId)
      if (!cancelled && !('error' in reqs)) setIncoming(reqs.requests)

      const r = await loadRecommendations(user.userId)
      if (!cancelled && !('error' in r)) setRecs(r.items)

      if (!cancelled) await refreshFeed(user.userId, false)

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

  async function refreshIncoming(userId: string) {
    const reqs = await listIncomingFriendRequests(userId)
    if (!('error' in reqs)) setIncoming(reqs.requests)
  }

  async function addFriend() {
    setError(null)
    setStatus(null)
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
    const sent = await sendFriendRequest(user.userId, found.profile.id)
    if (sent.error) {
      setError(sent.error)
      return
    }
    setPaste('')
    setStatus(null)
    setShowAddFriend(false)
    const loaded = await loadFriendProfiles(user.userId)
    if (!('error' in loaded)) onFriendsSync(loaded.friends)
    await refreshIncoming(user.userId)
    await refreshFeed(user.userId)
  }

  async function acceptRequest(id: string) {
    const user = await ensureCloudUser()
    if ('error' in user) {
      setError(user.error)
      return
    }
    const result = await acceptFriendRequest(id, user.userId)
    if (result.error) {
      setError(result.error)
      return
    }
    const loaded = await loadFriendProfiles(user.userId)
    if (!('error' in loaded)) onFriendsSync(loaded.friends)
    await refreshIncoming(user.userId)
    await refreshFeed(user.userId)
    setStatus('Freundschaft akzeptiert')
  }

  async function declineRequest(id: string) {
    const user = await ensureCloudUser()
    if ('error' in user) {
      setError(user.error)
      return
    }
    await declineFriendRequest(id, user.userId)
    await refreshIncoming(user.userId)
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
    await refreshFeed(user.userId)
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
    setShowRecCreate(false)
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

  async function expandFeed() {
    const user = await ensureCloudUser()
    if ('error' in user) {
      setFeedError(user.error)
      return
    }
    setFeedExpanded(true)
    await refreshFeed(user.userId, true)
  }

  async function commentOnPost(postId: string, body: string) {
    const user = await ensureCloudUser()
    if ('error' in user) {
      setFeedError(user.error)
      return
    }
    const result = await addGoonComment({
      userId: user.userId,
      postId,
      body,
    })
    if (result.error) {
      setFeedError(result.error)
      return
    }
    await refreshFeed(user.userId)
  }

  if (!cloudEnabled) {
    return <p className="empty">Cloud nicht konfiguriert.</p>
  }

  if (viewing) {
    return (
      <PublicProfileView
        profile={viewing}
        onBack={() => setViewing(null)}
        onViewedOtherProfile={onViewedOtherProfile}
        meId={meId}
        onFriendsChanged={() => {
          if (!meId) return
          void loadFriendProfiles(meId).then((loaded) => {
            if (!('error' in loaded)) onFriendsSync(loaded.friends)
          })
          void refreshIncoming(meId)
          void refreshFeed(meId)
        }}
      />
    )
  }

  return (
    <div className="friends page-stack">
      <header className="friends__header">
        <div className="friends__header-text">
          <h2 className="friends__title">Freunde</h2>
        </div>
      </header>

      {incoming.length > 0 && (
        <div className="friends__requests">
          <h3>Anfragen</h3>
          <ul className="friends__request-list">
            {incoming.map((req) => (
              <li key={req.id} className="friends__request-row">
                <Avatar
                  src={req.fromProfile?.avatarUrl}
                  name={req.fromProfile?.name || 'User'}
                  goonStreak={req.fromProfile?.goonStreak || 0}
                  dryStreak={req.fromProfile?.dryStreak || 0}
                  size="sm"
                  onClick={
                    req.fromProfile
                      ? () => void openProfile(req.fromProfile!.id)
                      : undefined
                  }
                />
                <div className="friends__request-meta">
                  <strong>
                    {req.fromProfile?.username
                      ? `@${req.fromProfile.username}`
                      : req.fromProfile?.name || 'User'}
                  </strong>
                  <span>möchte befreundet sein</span>
                </div>
                <div className="friends__request-actions">
                  <button
                    type="button"
                    className="btn btn--solid"
                    onClick={() => void acceptRequest(req.id)}
                  >
                    Annehmen
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => void declineRequest(req.id)}
                  >
                    Ablehnen
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

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
          className={`chip${view === 'feed' ? ' is-active' : ''}`}
          onClick={() => setView('feed')}
        >
          Feed
        </button>
        {!hideRecs && (
          <button
            type="button"
            className={`chip${view === 'recs' ? ' is-active' : ''}`}
            onClick={() => setView('recs')}
          >
            Recs
          </button>
        )}
        <button
          type="button"
          className="friends__invite-btn"
          onClick={() => setShowAddFriend(true)}
        >
          <span className="friends__invite-short">+ Freund</span>
          <span className="friends__invite-full">Freund hinzufügen</span>
        </button>
      </div>

      {view === 'feed' && (
        <GoonFeed
          posts={feed}
          expanded={feedExpanded}
          busy={feedBusy || busy}
          error={feedError}
          onExpand={() => void expandFeed()}
          onComment={commentOnPost}
        />
      )}

      {view === 'compare' && (
        <div className="friends__board">
          <div className="friends__board-head">
            <h3>Vergleich</h3>
            <div className="friends__filters">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
                aria-label="Kategorie"
              >
                <option value="all">Alle Kategorien</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_META[c].label}
                  </option>
                ))}
              </select>
            </div>
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
                    Lv {row.level} · {formatMinutes(row._metric)}
                    {categoryFilter !== 'all' ? (
                      <span
                        className="compare-cat-tag"
                        style={{ color: CATEGORY_META[categoryFilter].color }}
                      >
                        {' '}
                        · {CATEGORY_META[categoryFilter].label}
                      </span>
                    ) : null}
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
      )}

      {view === 'recs' && !hideRecs && (
        <div className="recs">
          <div className="recs__toolbar">
            <input
              className="recs__search"
              type="search"
              placeholder="Suche…"
              value={recQuery}
              onChange={(e) => setRecQuery(e.target.value)}
              aria-label="Recs suchen"
            />
            <button
              type="button"
              className="recs__add-btn"
              aria-label="Empfehlung erstellen"
              onClick={() => setShowRecCreate(true)}
            >
              +
            </button>
          </div>

          {showRecCreate && (
            <div className="recs__modal" role="dialog" aria-modal="true">
              <div className="recs__modal-card">
                <div className="block__head">
                  <h3>Neue Rec</h3>
                  <button
                    type="button"
                    className="section__close"
                    onClick={() => setShowRecCreate(false)}
                  >
                    schließen
                  </button>
                </div>
                <div className="friends__add">
                  <label htmlFor="rec-name">Name</label>
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
                  {recImagePreview && (
                    <div className="rec-preview">
                      <img src={recImagePreview} alt="Vorschau" />
                      <button
                        type="button"
                        className="section__close"
                        onClick={() => setRecImage(null)}
                      >
                        entfernen
                      </button>
                    </div>
                  )}
                  <label htmlFor="rec-file">Datei</label>
                  <input
                    id="rec-file"
                    type="file"
                    onChange={(e) => setRecFile(e.target.files?.[0] ?? null)}
                  />
                  <button
                    type="button"
                    className="btn btn--solid"
                    onClick={() => void addRec()}
                  >
                    Teilen
                  </button>
                  {error && <p className="friends__error">{error}</p>}
                </div>
              </div>
            </div>
          )}

          <ul className="rec-list">
            {filteredRecs.map((r) => (
              <li key={r.id} className="rec-row">
                <div>
                  <strong>{r.name}</strong>
                  <span className="rec-row__meta">von @{r.authorName}</span>
                  {r.link && (
                    <a href={r.link} target="_blank" rel="noreferrer">
                      {r.link}
                    </a>
                  )}
                  {r.imageUrl && <img className="rec-row__img" src={r.imageUrl} alt="" />}
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
          {filteredRecs.length === 0 && (
            <p className="empty">
              {recs.length === 0 ? 'Noch keine Recommendations.' : 'Keine Treffer.'}
            </p>
          )}
        </div>
      )}

      {showAddFriend && (
        <div className="recs__modal" role="dialog" aria-modal="true">
          <div className="recs__modal-card friends__add-modal">
            <div className="block__head">
              <h3>Freund hinzufügen</h3>
              <button
                type="button"
                className="section__close"
                onClick={() => setShowAddFriend(false)}
              >
                schließen
              </button>
            </div>
            <div className="friends__share">
              <p>Dein Code — Anfrage senden; der andere muss noch akzeptieren:</p>
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
                Anfrage senden
              </button>
              {error && <p className="friends__error">{error}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
