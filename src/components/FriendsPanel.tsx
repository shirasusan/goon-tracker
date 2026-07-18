import { useEffect, useMemo, useState } from 'react'
import { formatMinutes } from '../lib/format'
import {
  addFriendship,
  cloudEnabled,
  ensureCloudProfile,
  ensureCloudUser,
  fetchProfileByCode,
  loadFriendProfiles,
  pushCloudProfile,
  removeFriendship,
} from '../lib/cloud'
import type { FriendSnapshot } from '../types'

type FriendsPanelProps = {
  me: FriendSnapshot
  friends: FriendSnapshot[]
  displayName: string
  cloudCode?: string
  onNameChange: (name: string) => void
  onCloudReady: (info: { cloudUserId: string; cloudCode: string }) => void
  onFriendsSync: (friends: FriendSnapshot[]) => void
  onRemoveLocal: (id: string) => void
}

type SortKey = 'xp' | 'level' | 'goon' | 'dry' | 'time'

export function FriendsPanel({
  me,
  friends,
  displayName,
  cloudCode,
  onNameChange,
  onCloudReady,
  onFriendsSync,
  onRemoveLocal,
}: FriendsPanelProps) {
  const [paste, setPaste] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [sort, setSort] = useState<SortKey>('xp')
  const [setupHint, setSetupHint] = useState(false)

  const myCode = cloudCode ?? '…'

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
        setSetupHint(true)
        setBusy(false)
        return
      }

      const profile = await ensureCloudProfile(user.userId, displayName)
      if (cancelled) return
      if ('error' in profile) {
        setError(profile.error)
        setSetupHint(true)
        setBusy(false)
        return
      }

      onCloudReady({ cloudUserId: user.userId, cloudCode: profile.code })

      const push = await pushCloudProfile({
        userId: user.userId,
        code: profile.code,
        name: displayName,
        snapshot: me,
      })
      if (cancelled) return
      if (push.error) {
        setError(push.error)
        setBusy(false)
        return
      }

      const loaded = await loadFriendProfiles(user.userId)
      if (cancelled) return
      if ('error' in loaded) {
        setError(loaded.error)
      } else {
        onFriendsSync(loaded.friends)
        setStatus('Online · live Sync')
      }
      setBusy(false)
    }

    void boot()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- boot once per mount / code change
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

  async function refresh() {
    if (!cloudEnabled) return
    setBusy(true)
    setError(null)
    const user = await ensureCloudUser()
    if ('error' in user) {
      setError(user.error)
      setBusy(false)
      return
    }
    const code = cloudCode ?? (await ensureCloudProfile(user.userId, displayName))
    const resolvedCode = typeof code === 'object' && 'code' in code ? code.code : cloudCode
    if (!resolvedCode || (typeof code === 'object' && 'error' in code)) {
      setError(typeof code === 'object' && 'error' in code ? code.error : 'Kein Code')
      setBusy(false)
      return
    }

    await pushCloudProfile({
      userId: user.userId,
      code: resolvedCode,
      name: displayName,
      snapshot: me,
    })
    const loaded = await loadFriendProfiles(user.userId)
    if ('error' in loaded) setError(loaded.error)
    else {
      onFriendsSync(loaded.friends)
      setStatus('Aktualisiert')
    }
    setBusy(false)
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

  if (!cloudEnabled) {
    return (
      <p className="empty">
        Cloud nicht konfiguriert. `.env` mit Supabase URL + Key setzen.
      </p>
    )
  }

  return (
    <div className="friends">
      {setupHint && (
        <div className="friends__setup">
          <p>
            Einmalig in Supabase:
          </p>
          <ol>
            <li>Authentication → Providers → <strong>Anonymous</strong> einschalten</li>
            <li>SQL Editor → Inhalt von <code>supabase/schema.sql</code> ausführen</li>
          </ol>
        </div>
      )}

      <div className="friends__profile">
        <label htmlFor="display-name">Dein Name</label>
        <input
          id="display-name"
          value={displayName}
          maxLength={24}
          placeholder="Name für den Vergleich"
          onChange={(e) => onNameChange(e.target.value)}
        />
      </div>

      <div className="friends__share">
        <p>Dein Live-Code (funktioniert auf jedem Gerät):</p>
        <input className="friends__code" readOnly value={myCode} />
        <div className="friends__share-actions">
          <button type="button" className="btn" onClick={copyCode} disabled={!cloudCode}>
            {copied ? 'Kopiert' : 'Code kopieren'}
          </button>
          <button type="button" className="btn" onClick={() => void refresh()} disabled={busy}>
            {busy ? '…' : 'Sync'}
          </button>
        </div>
        {status && <p className="friends__status">{status}</p>}
      </div>

      <div className="friends__add">
        <label htmlFor="friend-code">Freund-Code</label>
        <input
          id="friend-code"
          placeholder="z.B. AB12CD"
          value={paste}
          autoCapitalize="characters"
          onChange={(e) => {
            setPaste(e.target.value.toUpperCase())
            setError(null)
          }}
        />
        <button type="button" className="btn btn--solid" onClick={() => void addFriend()} disabled={busy}>
          Hinzufügen
        </button>
        {error && <p className="friends__error">{error}</p>}
      </div>

      <div className="friends__board">
        <div className="friends__board-head">
          <h3>Vergleich</h3>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sortierung">
            <option value="xp">XP</option>
            <option value="level">Level</option>
            <option value="goon">Goon Streak</option>
            <option value="dry">Dry Streak</option>
            <option value="time">Zeit</option>
          </select>
        </div>

        {board.length === 1 && (
          <p className="empty">Noch keine Freunde — deren 6-stelligen Code einfügen.</p>
        )}

        <ol className="leaderboard">
          {board.map((row, i) => (
            <li key={row.id} className={`leaderboard__row${row._you ? ' is-you' : ''}`}>
              <span className="leaderboard__rank">{i + 1}</span>
              <div className="leaderboard__main">
                <strong>
                  {row.name}
                  {row._you ? ' · du' : ''}
                </strong>
                <span>
                  Lv {row.level} · {row.xp} XP · {formatMinutes(row.totalMinutes)}
                </span>
                <span>
                  Goon {row.goonStreak}d · Dry {row.dryStreak}d
                </span>
              </div>
              {!row._you && (
                <button
                  type="button"
                  className="leaderboard__remove"
                  aria-label={`${row.name} entfernen`}
                  onClick={() => void removeFriend(row.id)}
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
