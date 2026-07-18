import { useEffect, useMemo, useState } from 'react'
import { AchievementUnlockOverlay } from './components/AchievementUnlockOverlay'
import { AuthScreen } from './components/AuthScreen'
import { Avatar } from './components/Avatar'
import { BottomNav, type TabId } from './components/BottomNav'
import { CategoryPicker } from './components/CategoryPicker'
import { FriendsPanel } from './components/FriendsPanel'
import { LevelBar } from './components/LevelBar'
import { ProfilePanel } from './components/ProfilePanel'
import { RankBadge } from './components/RankBadge'
import { RankedPanel } from './components/RankedPanel'
import { StreakRing } from './components/StreakRing'
import {
  cloudEnabled,
  ensureCloudProfile,
  getSessionUser,
  logoutUser,
  pushCloudProfile,
  pushSeasonStats,
} from './lib/cloud'
import {
  claimNewAchievements,
  type UnlockedAchievement,
} from './lib/achievements'
import { toDateKey } from './lib/dates'
import { formatMinutes } from './lib/format'
import { levelFromXp, totalXp } from './lib/level'
import { rankFromMinutes } from './lib/ranks'
import { buildSnapshot, categoryTotals } from './lib/snapshot'
import { loadData, saveData } from './lib/storage'
import { calcSignedStreak, signedToGoonDry } from './lib/streaks'
import type { Category, Entry, FriendSnapshot, TrackerData } from './types'
import './App.css'

const PAGE_META: Record<TabId, { title: string; sub: string }> = {
  home: { title: 'Home', sub: 'Track & climb' },
  friends: { title: 'Freunde', sub: 'Vergleich & Recs' },
  ranked: { title: 'Ranked', sub: 'Season & Leaderboard' },
}

function newId() {
  return crypto.randomUUID()
}

export default function App() {
  const [data, setData] = useState<TrackerData>(() => loadData())
  const [tab, setTab] = useState<TabId>('home')
  const [showProfile, setShowProfile] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [unlockQueue, setUnlockQueue] = useState<UnlockedAchievement[]>([])
  const [freshKeys, setFreshKeys] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    saveData(data)
  }, [data])

  const categories = useMemo(() => categoryTotals(data.entries), [data.entries])

  useEffect(() => {
    const newly = claimNewAchievements(categories)
    if (newly.length === 0) return
    setUnlockQueue((prev) => [...prev, ...newly])
    setFreshKeys((prev) => {
      const next = new Set(prev)
      for (const a of newly) next.add(a.key)
      return next
    })
    const clear = window.setTimeout(() => setFreshKeys(new Set()), 1800)
    return () => window.clearTimeout(clear)
  }, [categories])

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
              avatarUrl: profile.avatarUrl || prev.profile.avatarUrl,
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

  const streak = useMemo(
    () => calcSignedStreak(data.entries, data.startedOn),
    [data.entries, data.startedOn],
  )
  const { goonStreak, dryStreak } = useMemo(() => signedToGoonDry(streak), [streak])
  const xp = useMemo(() => totalXp(data.entries), [data.entries])
  const level = useMemo(() => levelFromXp(xp), [xp])
  const totalMinutes = xp
  const rank = useMemo(() => rankFromMinutes(totalMinutes), [totalMinutes])

  const mySnapshot = useMemo(
    () => ({
      ...buildSnapshot({
        id: data.profile.cloudUserId || data.profile.id,
        name: data.profile.name || data.profile.username || 'Du',
        entries: data.entries,
        goonStreak,
        dryStreak,
      }),
      username: data.profile.username,
      avatarUrl: data.profile.avatarUrl,
      rankId: rank.id,
    }),
    [
      data.profile.cloudUserId,
      data.profile.id,
      data.profile.name,
      data.profile.username,
      data.profile.avatarUrl,
      data.entries,
      goonStreak,
      dryStreak,
      rank.id,
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
        avatarUrl: data.profile.avatarUrl,
        snapshot: mySnapshot,
      })
      void pushSeasonStats({
        userId: data.profile.cloudUserId!,
        entries: data.entries,
      })
    }, 400)

    return () => window.clearTimeout(handle)
  }, [
    data.entries,
    data.profile.name,
    data.profile.username,
    data.profile.avatarUrl,
    data.profile.cloudUserId,
    data.profile.cloudCode,
    mySnapshot,
    authed,
  ])

  const today = toDateKey()
  const todayEntries = data.entries.filter((e) => e.date === today)
  const todayMinutes = todayEntries.reduce((sum, e) => sum + e.minutes, 0)

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

  function onCloudReady(info: {
    cloudUserId: string
    cloudCode: string
    avatarUrl?: string | null
  }) {
    setData((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        cloudUserId: info.cloudUserId,
        cloudCode: info.cloudCode,
        avatarUrl: info.avatarUrl || prev.profile.avatarUrl,
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

  function openTab(next: TabId) {
    setShowProfile(false)
    setTab(next)
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
        avatarUrl:
          'avatarUrl' in profile && profile.avatarUrl
            ? profile.avatarUrl
            : prev.profile.avatarUrl,
      },
    }))
    setAuthed(true)
  }

  async function handleLogout() {
    await logoutUser()
    setAuthed(false)
    setShowProfile(false)
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

  const page = showProfile
    ? { title: 'Profil', sub: 'Account & Stats' }
    : PAGE_META[tab]
  const displayLabel =
    data.profile.name.trim() || data.profile.username || 'Profil'
  const activeUnlock = unlockQueue[0] ?? null

  return (
    <div className="shell">
      {activeUnlock && (
        <AchievementUnlockOverlay
          achievement={activeUnlock}
          onDone={() => setUnlockQueue((q) => q.slice(1))}
        />
      )}
      <div className="app">
        <header className="top">
          <div className="top__left">
            <p className="top__brand">Goon Tracker</p>
            <h1 className="top__title">{page.title}</h1>
            <p className="top__sub">{page.sub}</p>
          </div>
          <button
            type="button"
            className={`top__me${showProfile ? ' is-active' : ''}`}
            onClick={() => setShowProfile(true)}
            aria-label="Profil öffnen"
          >
            <Avatar
              src={data.profile.avatarUrl}
              name={displayLabel}
              goonStreak={goonStreak}
              dryStreak={dryStreak}
              size="sm"
            />
            <span className="top__me-name">{displayLabel}</span>
          </button>
        </header>

        <main className="page" key={showProfile ? 'profile' : tab}>
          {showProfile ? (
            <ProfilePanel
              userId={data.profile.cloudUserId}
              username={data.profile.username}
              displayName={data.profile.name}
              avatarUrl={data.profile.avatarUrl}
              entries={data.entries}
              totalMinutes={totalMinutes}
              level={level.level}
              goonStreak={goonStreak}
              dryStreak={dryStreak}
              streak={streak}
              onNameChange={setName}
              onAvatarChange={(url) =>
                setData((prev) => ({
                  ...prev,
                  profile: { ...prev.profile, avatarUrl: url },
                }))
              }
              onLogout={() => void handleLogout()}
              onRemoveEntry={removeEntry}
              onBack={() => setShowProfile(false)}
              freshAchievementKeys={freshKeys}
            />
          ) : (
            <>
              {tab === 'home' && (
                <>
                  <section className="block block--hero">
                    <div className="home-hero">
                      <div className="home-hero__rank">
                        <p className="eyebrow">Rank</p>
                        <RankBadge totalMinutes={totalMinutes} rank={rank} />
                      </div>
                      <div className="home-hero__level">
                        <LevelBar
                          level={level.level}
                          intoLevel={level.intoLevel}
                          toNext={level.toNext}
                          progress={level.progress}
                          totalXp={level.xp}
                        />
                      </div>
                    </div>
                  </section>

                  <section className="block block--streak" aria-label="Streak">
                    <div className="block__head">
                      <h2>Streak</h2>
                      <span>+ Korruption · − Gut</span>
                    </div>
                    <div className="streaks streaks--single">
                      <StreakRing value={streak} embedded />
                    </div>
                  </section>

                  <section className="block block--primary">
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

              {tab === 'friends' && (
                <FriendsPanel
                  me={mySnapshot}
                  friends={data.friends}
                  displayName={data.profile.name}
                  username={data.profile.username}
                  avatarUrl={data.profile.avatarUrl}
                  cloudCode={data.profile.cloudCode}
                  onCloudReady={onCloudReady}
                  onFriendsSync={onFriendsSync}
                  onRemoveLocal={removeFriend}
                />
              )}

              {tab === 'ranked' && (
                <RankedPanel
                  entries={data.entries}
                  highlightId={data.profile.cloudUserId || data.profile.id}
                  userId={data.profile.cloudUserId}
                />
              )}
            </>
          )}
        </main>
      </div>

      <BottomNav active={showProfile ? null : tab} onChange={openTab} />
    </div>
  )
}
