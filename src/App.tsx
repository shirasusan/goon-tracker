import { useEffect, useMemo, useState } from 'react'
import { AuthScreen } from './components/AuthScreen'
import { BottomNav, type TabId } from './components/BottomNav'
import { CategoryPicker } from './components/CategoryPicker'
import { CategoryStats } from './components/CategoryStats'
import { EntryList } from './components/EntryList'
import { FriendsPanel } from './components/FriendsPanel'
import { LevelBar } from './components/LevelBar'
import { ProfilePanel } from './components/ProfilePanel'
import { RankBadge } from './components/RankBadge'
import { StreakRing } from './components/StreakRing'
import {
  cloudEnabled,
  ensureCloudProfile,
  getSessionUser,
  logoutUser,
  pushCloudProfile,
} from './lib/cloud'
import { toDateKey } from './lib/dates'
import { formatMinutes } from './lib/format'
import { levelFromXp, totalXp } from './lib/level'
import { rankFromMinutes } from './lib/ranks'
import { buildSnapshot } from './lib/snapshot'
import { loadData, saveData } from './lib/storage'
import { calcDryStreak, calcGoonStreak } from './lib/streaks'
import {
  CATEGORY_META,
  type Category,
  type Entry,
  type FriendSnapshot,
  type TrackerData,
} from './types'
import './App.css'

const PAGE_META: Record<TabId, { title: string; sub: string }> = {
  home: { title: 'Home', sub: 'Level, Rank, Streaks & Eintragen' },
  stats: { title: 'Stats', sub: 'Kategorien & Verlauf' },
  friends: { title: 'Freunde', sub: 'Vergleich, Recs & Leaderboard' },
  profile: { title: 'Profil', sub: 'Account, Rank & Goonometer' },
}

function newId() {
  return crypto.randomUUID()
}

export default function App() {
  const [data, setData] = useState<TrackerData>(() => loadData())
  const [tab, setTab] = useState<TabId>('home')
  const [flash, setFlash] = useState<string | null>(null)
  const [historyCategory, setHistoryCategory] = useState<Category | null>(null)
  const [authed, setAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    saveData(data)
  }, [data])

  useEffect(() => {
    if (!cloudEnabled) {
      setAuthed(true)
      return
    }
    let cancelled = false
    async function check() {
      const user = await getSessionUser()
      if (cancelled) return
      if (user) {
        const username =
          (user.user_metadata?.username as string | undefined) ||
          data.profile.username ||
          user.email?.split('@')[0]
        const profile = await ensureCloudProfile(
          user.id,
          data.profile.name || username || 'User',
          username,
        )
        if (!cancelled && !('error' in profile)) {
          setData((prev) => ({
            ...prev,
            profile: {
              ...prev.profile,
              cloudUserId: user.id,
              cloudCode: profile.code,
              username: username,
              name: prev.profile.name || username || '',
            },
          }))
        }
        setAuthed(true)
      } else {
        setAuthed(false)
      }
    }
    void check()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const goonStreak = useMemo(() => calcGoonStreak(data.entries), [data.entries])
  const dryStreak = useMemo(
    () => calcDryStreak(data.entries, data.startedOn),
    [data.entries, data.startedOn],
  )
  const xp = useMemo(() => totalXp(data.entries), [data.entries])
  const level = useMemo(() => levelFromXp(xp), [xp])
  const totalMinutes = xp
  const rank = useMemo(() => rankFromMinutes(totalMinutes), [totalMinutes])

  const mySnapshot = useMemo(
    () =>
      buildSnapshot({
        id: data.profile.cloudUserId || data.profile.id,
        name: data.profile.name || data.profile.username || 'Du',
        entries: data.entries,
        goonStreak,
        dryStreak,
      }),
    [
      data.profile.cloudUserId,
      data.profile.id,
      data.profile.name,
      data.profile.username,
      data.entries,
      goonStreak,
      dryStreak,
    ],
  )

  useEffect(() => {
    if (!cloudEnabled) return
    if (!data.profile.cloudUserId || !data.profile.cloudCode) return
    if (!authed) return

    const handle = window.setTimeout(() => {
      void pushCloudProfile({
        userId: data.profile.cloudUserId!,
        code: data.profile.cloudCode!,
        name: data.profile.name,
        username: data.profile.username,
        snapshot: { ...mySnapshot, rankId: rank.id },
      })
    }, 400)

    return () => window.clearTimeout(handle)
  }, [
    data.entries,
    data.profile.name,
    data.profile.username,
    data.profile.cloudUserId,
    data.profile.cloudCode,
    mySnapshot,
    rank.id,
    authed,
  ])

  const today = toDateKey()
  const todayEntries = data.entries.filter((e) => e.date === today)
  const todayMinutes = todayEntries.reduce((sum, e) => sum + e.minutes, 0)

  const recent = useMemo(() => {
    if (!historyCategory) return []
    return [...data.entries]
      .filter((e) => e.category === historyCategory)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 30)
  }, [data.entries, historyCategory])

  function changeTab(next: TabId) {
    setTab(next)
    if (next !== 'stats') setHistoryCategory(null)
  }

  function toggleHistory(category: Category) {
    setHistoryCategory((prev) => (prev === category ? null : category))
  }

  function logCategory(category: Category, minutes: number, goonometer: number) {
    const entry: Entry = {
      id: newId(),
      category,
      minutes,
      goonometer,
      date: today,
      createdAt: new Date().toISOString(),
    }
    setData((prev) => ({ ...prev, entries: [...prev.entries, entry] }))
    setFlash(`+${minutes} XP · G${goonometer}`)
    window.setTimeout(() => setFlash(null), 1000)
  }

  function removeEntry(id: string) {
    setData((prev) => ({
      ...prev,
      entries: prev.entries.filter((e) => e.id !== id),
    }))
  }

  function setName(name: string) {
    setData((prev) => ({
      ...prev,
      profile: { ...prev.profile, name },
    }))
  }

  function onCloudReady(info: { cloudUserId: string; cloudCode: string }) {
    setData((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        cloudUserId: info.cloudUserId,
        cloudCode: info.cloudCode,
      },
    }))
  }

  function onFriendsSync(friends: FriendSnapshot[]) {
    setData((prev) => ({ ...prev, friends }))
  }

  function removeFriend(id: string) {
    setData((prev) => ({
      ...prev,
      friends: prev.friends.filter((f) => f.id !== id),
    }))
  }

  async function handleAuthed(info: { userId: string; username: string }) {
    const profile = await ensureCloudProfile(info.userId, info.username, info.username)
    setData((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        cloudUserId: info.userId,
        cloudCode: 'code' in profile ? profile.code : prev.profile.cloudCode,
        username: info.username,
        name: prev.profile.name || info.username,
      },
    }))
    setAuthed(true)
  }

  async function handleLogout() {
    await logoutUser()
    setAuthed(false)
  }

  if (authed === null) {
    return (
      <div className="shell">
        <p className="empty" style={{ padding: '2rem', textAlign: 'center' }}>
          Laden…
        </p>
      </div>
    )
  }

  if (!authed) {
    return (
      <div className="shell">
        <AuthScreen onAuthed={(info) => void handleAuthed(info)} />
      </div>
    )
  }

  const page = PAGE_META[tab]

  return (
    <div className="shell">
      <div className="app">
        <header className="top">
          <p className="top__brand">Goon Tracker</p>
          <div className="top__page">
            <h1>{page.title}</h1>
            <p>{page.sub}</p>
          </div>
        </header>

        <main className="page" key={tab}>
          {tab === 'home' && (
            <>
              <section className="block">
                <div className="block__head">
                  <h2>Rank</h2>
                </div>
                <RankBadge totalMinutes={totalMinutes} rank={rank} />
              </section>

              <section className="block">
                <LevelBar
                  level={level.level}
                  intoLevel={level.intoLevel}
                  toNext={level.toNext}
                  progress={level.progress}
                  totalXp={level.xp}
                />
              </section>

              <section className="block" aria-label="Streaks">
                <div className="block__head">
                  <h2>Streaks</h2>
                </div>
                <div className="streaks">
                  <StreakRing
                    label="Goon"
                    sublabel="täglich aktiv"
                    value={goonStreak}
                    color="#e8ecf2"
                  />
                  <StreakRing
                    label="Dry"
                    sublabel="ohne Session"
                    value={dryStreak}
                    color="#3dceb8"
                  />
                </div>
              </section>

              <section className="block">
                <div className="block__head">
                  <h2>Eintragen</h2>
                  <span>
                    {todayEntries.length === 0
                      ? 'heute leer'
                      : `${todayEntries.length} · ${formatMinutes(todayMinutes)}`}
                  </span>
                </div>
                <CategoryPicker onLog={logCategory} />
                {flash && <p className="flash">{flash}</p>}
              </section>
            </>
          )}

          {tab === 'stats' && (
            <>
              <section className="block">
                <div className="block__head">
                  <h2>Kategorien</h2>
                  <span>tippen für Verlauf</span>
                </div>
                <CategoryStats
                  entries={data.entries}
                  selected={historyCategory}
                  onSelect={toggleHistory}
                />
              </section>

              {historyCategory && (
                <section className="block">
                  <div className="block__head">
                    <h2>Verlauf · {CATEGORY_META[historyCategory].label}</h2>
                    <button
                      type="button"
                      className="section__close"
                      onClick={() => setHistoryCategory(null)}
                    >
                      schließen
                    </button>
                  </div>
                  <EntryList entries={recent} onRemove={removeEntry} />
                </section>
              )}
            </>
          )}

          {tab === 'friends' && (
            <section className="block">
              <FriendsPanel
                me={{ ...mySnapshot, username: data.profile.username, rankId: rank.id }}
                friends={data.friends}
                displayName={data.profile.name}
                username={data.profile.username}
                cloudCode={data.profile.cloudCode}
                onNameChange={setName}
                onCloudReady={onCloudReady}
                onFriendsSync={onFriendsSync}
                onRemoveLocal={removeFriend}
              />
            </section>
          )}

          {tab === 'profile' && (
            <ProfilePanel
              username={data.profile.username}
              displayName={data.profile.name}
              cloudCode={data.profile.cloudCode}
              entries={data.entries}
              totalMinutes={totalMinutes}
              level={level.level}
              onNameChange={setName}
              onLogout={() => void handleLogout()}
            />
          )}
        </main>
      </div>

      <BottomNav active={tab} onChange={changeTab} />
    </div>
  )
}
