import { useEffect, useMemo, useState } from 'react'
import { BottomNav, type TabId } from './components/BottomNav'
import { CategoryPicker } from './components/CategoryPicker'
import { CategoryStats } from './components/CategoryStats'
import { EntryList } from './components/EntryList'
import { FriendsPanel } from './components/FriendsPanel'
import { LevelBar } from './components/LevelBar'
import { StreakRing } from './components/StreakRing'
import {
  cloudEnabled,
  ensureCloudProfile,
  ensureCloudUser,
  pushCloudProfile,
} from './lib/cloud'
import { toDateKey } from './lib/dates'
import { formatMinutes } from './lib/format'
import { levelFromXp, totalXp } from './lib/level'
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
  home: { title: 'Home', sub: 'Level, Streaks & Eintragen' },
  stats: { title: 'Stats', sub: 'Kategorien & Verlauf' },
  friends: { title: 'Freunde', sub: 'Live-Code teilen & vergleichen' },
}

function newId() {
  return crypto.randomUUID()
}

export default function App() {
  const [data, setData] = useState<TrackerData>(() => loadData())
  const [tab, setTab] = useState<TabId>('home')
  const [flash, setFlash] = useState<string | null>(null)
  const [historyCategory, setHistoryCategory] = useState<Category | null>(null)

  useEffect(() => {
    saveData(data)
  }, [data])

  const goonStreak = useMemo(() => calcGoonStreak(data.entries), [data.entries])
  const dryStreak = useMemo(
    () => calcDryStreak(data.entries, data.startedOn),
    [data.entries, data.startedOn],
  )
  const xp = useMemo(() => totalXp(data.entries), [data.entries])
  const level = useMemo(() => levelFromXp(xp), [xp])

  const mySnapshot = useMemo(
    () =>
      buildSnapshot({
        id: data.profile.cloudUserId || data.profile.id,
        name: data.profile.name || 'Du',
        entries: data.entries,
        goonStreak,
        dryStreak,
      }),
    [data.profile.cloudUserId, data.profile.id, data.profile.name, data.entries, goonStreak, dryStreak],
  )

  // Push stats to Supabase whenever local progress changes
  useEffect(() => {
    if (!cloudEnabled) return
    if (!data.profile.cloudUserId || !data.profile.cloudCode) return

    const handle = window.setTimeout(() => {
      void pushCloudProfile({
        userId: data.profile.cloudUserId!,
        code: data.profile.cloudCode!,
        name: data.profile.name,
        snapshot: mySnapshot,
      })
    }, 400)

    return () => window.clearTimeout(handle)
  }, [data.entries, data.profile.name, data.profile.cloudUserId, data.profile.cloudCode, mySnapshot])

  // Ensure cloud identity early so logging syncs soon
  useEffect(() => {
    if (!cloudEnabled) return
    let cancelled = false

    async function init() {
      const user = await ensureCloudUser()
      if (cancelled || 'error' in user) return
      const profile = await ensureCloudProfile(user.userId, data.profile.name)
      if (cancelled || 'error' in profile) return
      setData((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          cloudUserId: user.userId,
          cloudCode: profile.code,
        },
      }))
    }

    void init()
    return () => {
      cancelled = true
    }
    // only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  function logCategory(category: Category, minutes: number) {
    const entry: Entry = {
      id: newId(),
      category,
      minutes,
      date: today,
      createdAt: new Date().toISOString(),
    }
    setData((prev) => ({ ...prev, entries: [...prev.entries, entry] }))
    setFlash(`+${minutes} XP`)
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
                me={mySnapshot}
                friends={data.friends}
                displayName={data.profile.name}
                cloudCode={data.profile.cloudCode}
                onNameChange={setName}
                onCloudReady={onCloudReady}
                onFriendsSync={onFriendsSync}
                onRemoveLocal={removeFriend}
              />
            </section>
          )}
        </main>
      </div>

      <BottomNav active={tab} onChange={changeTab} />
    </div>
  )
}
