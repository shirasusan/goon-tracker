import { useEffect, useMemo, useRef, useState } from 'react'
import { AchievementUnlockOverlay } from './components/AchievementUnlockOverlay'
import { AuthScreen } from './components/AuthScreen'
import { BottomNav, type TabId } from './components/BottomNav'
import { CategoryPicker } from './components/CategoryPicker'
import { CoachTour } from './components/CoachTour'
import { FriendsPanel } from './components/FriendsPanel'
import { LevelBar } from './components/LevelBar'
import { ProfilePanel } from './components/ProfilePanel'
import { RankBadge } from './components/RankBadge'
import { RankedPanel } from './components/RankedPanel'
import { StreakRing } from './components/StreakRing'
import {
  cloudEnabled,
  deleteGoonPost,
  deleteOwnAccount,
  deleteTrackerEntry,
  fetchMySeasonHistory,
  getSessionUser,
  hydrateAccountFromCloud,
  logoutUser,
  pushCloudProfile,
  pushGoonPost,
  pushSeasonStats,
  pushTrackerEntries,
} from './lib/cloud'
import {
  claimCuckAchievement,
  claimNewAchievements,
  claimSeasonAchievementsFromCloud,
  type UnlockedAchievement,
} from './lib/achievements'
import { toDateKey } from './lib/dates'
import { buildEntryFromParts } from './lib/entries'
import { formatMinutes } from './lib/format'
import { levelFromXp, awardXp, FOCUS_DAILY_XP, totalMinutes as sumEntryMinutes, totalXp } from './lib/level'
import { rankFromMinutes } from './lib/ranks'
import { buildSnapshot } from './lib/snapshot'
import {
  clearLegacySharedCache,
  clearLocalTrackerData,
  emptyData,
  loadData,
  loadDataForUser,
  saveData,
} from './lib/storage'
import { calcGoonStreak, calcSignedStreak, signedToGoonDry } from './lib/streaks'
import { loadTour, saveTour, shouldShowTour, TOUR_STEPS, type TourState } from './lib/tour'
import { getSeasonInfo, seasonDisplayName } from './lib/season'
import type { Category, FriendSnapshot, TrackerData } from './types'
import { useLocale } from './lib/LocaleContext'
import type { MsgId } from './lib/i18n'
import './App.css'

const PAGE_MSG: Record<TabId, MsgId> = {
  home: 'nav_home',
  friends: 'nav_friends',
  ranked: 'nav_ranked',
  profile: 'nav_profile',
}

/** Auto-refresh cloud account data */
const CLOUD_REFRESH_MS = 30_000

function newId() {
  return crypto.randomUUID()
}

export default function App() {
  const { t, locale, setLocale } = useLocale()
  const [data, setData] = useState<TrackerData>(() =>
    cloudEnabled ? emptyData() : loadData(),
  )
  const [tab, setTab] = useState<TabId>('home')
  const [flash, setFlash] = useState<string | null>(null)
  const [authed, setAuthed] = useState<boolean | null>(null)
  /** False until cloud entry sync finishes — blocks empty profile overwrite. */
  const [entriesSynced, setEntriesSynced] = useState(!cloudEnabled)
  const [unlockQueue, setUnlockQueue] = useState<UnlockedAchievement[]>([])
  const [freshKeys, setFreshKeys] = useState<Set<string>>(() => new Set())
  const [tour, setTour] = useState<TourState | null>(null)
  const [viewingForeignProfile, setViewingForeignProfile] = useState(false)

  useEffect(() => {
    if (!data.profile.cloudUserId && cloudEnabled) return
    saveData(data)
  }, [data])

  useEffect(() => {
    setViewingForeignProfile(false)
  }, [tab])

  const todayKey = toDateKey()

  useEffect(() => {
    enqueueUnlocks(claimNewAchievements(data.entries, data.startedOn))
  }, [data.entries, data.startedOn, todayKey])

  const focusAwardDay = useRef<string | null>(null)

  /** Focus streak: 25 XP/day from day 2, times streak multiplier (once per calendar day). */
  useEffect(() => {
    const dry = signedToGoonDry(
      calcSignedStreak(data.entries, data.startedOn),
    ).dryStreak
    if (dry < 2) return
    const today = toDateKey()
    if (data.lastFocusXpDate === today || focusAwardDay.current === today) return
    focusAwardDay.current = today
    const gained = awardXp(FOCUS_DAILY_XP, dry)
    setData((prev) => {
      if (prev.lastFocusXpDate === today) return prev
      return {
        ...prev,
        focusXpTotal: (prev.focusXpTotal ?? 0) + gained,
        lastFocusXpDate: today,
      }
    })
    setFlash(`+${gained} XP · Focus`)
    window.setTimeout(() => setFlash(null), 1600)
  }, [data.entries, data.startedOn, data.lastFocusXpDate, todayKey])

  function enqueueUnlocks(newly: UnlockedAchievement[]) {
    if (newly.length === 0) return
    setUnlockQueue((prev) => [...prev, ...newly])
    setFreshKeys((prev) => {
      const next = new Set(prev)
      for (const a of newly) next.add(a.key)
      return next
    })
    window.setTimeout(() => setFreshKeys(new Set()), 1800)
  }

  function handleViewedOtherProfile() {
    enqueueUnlocks(claimCuckAchievement(data.entries, data.startedOn))
  }

  function applyHydrated(
    hydrated: Exclude<
      Awaited<ReturnType<typeof hydrateAccountFromCloud>>,
      { error: string }
    >,
    preserveLocal?: {
      monkMode?: boolean
      focusXpTotal?: number
      lastFocusXpDate?: string
      entries?: TrackerData['entries']
    },
  ) {
    const localEntries = preserveLocal?.entries ?? []
    const byId = new Map(hydrated.entries.map((e) => [e.id, e]))
    for (const e of localEntries) {
      const cloud = byId.get(e.id)
      if (cloud && e.xp != null && cloud.xp == null) {
        byId.set(e.id, { ...cloud, xp: e.xp })
      } else if (!cloud) {
        byId.set(e.id, e)
      } else {
        byId.set(e.id, e.xp != null ? { ...cloud, xp: e.xp } : cloud)
      }
    }
    const entries = Array.from(byId.values()).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    )

    setData({
      entries,
      startedOn: hydrated.startedOn,
      friends: hydrated.friends,
      focusXpTotal: preserveLocal?.focusXpTotal ?? 0,
      lastFocusXpDate: preserveLocal?.lastFocusXpDate,
      profile: {
        id: hydrated.profile.cloudUserId,
        cloudUserId: hydrated.profile.cloudUserId,
        cloudCode: hydrated.profile.cloudCode,
        name: hydrated.profile.name,
        username: hydrated.profile.username,
        avatarUrl: hydrated.profile.avatarUrl,
        rankedAnonymous: hydrated.profile.rankedAnonymous,
        monkMode: Boolean(preserveLocal?.monkMode),
      },
    })
    setEntriesSynced(true)
  }

  async function loadCloudAccount(userId: string, username?: string) {
    clearLegacySharedCache()
    const cached = loadDataForUser(userId)
    const hydrated = await hydrateAccountFromCloud({ userId, username })
    if ('error' in hydrated) {
      console.warn('Account hydrate failed:', hydrated.error)
      setEntriesSynced(false)
      return false
    }
    applyHydrated(hydrated, {
      monkMode: cached.profile.monkMode,
      focusXpTotal: cached.focusXpTotal ?? 0,
      lastFocusXpDate: cached.lastFocusXpDate,
      entries: cached.entries,
    })
    const hist = await fetchMySeasonHistory(userId)
    if (!('error' in hist)) {
      enqueueUnlocks(
        claimSeasonAchievementsFromCloud(
          hist.seasons.map((s) => ({ season: s.season, rankId: s.rankId })),
          hydrated.entries,
          hydrated.startedOn,
        ),
      )
    }
    return true
  }

  useEffect(() => {
    if (!cloudEnabled) {
      setAuthed(true)
      setEntriesSynced(true)
      return
    }
    let cancelled = false
    async function check() {
      const user = await getSessionUser()
      if (cancelled) return
      if (user) {
        setEntriesSynced(false)
        const username =
          (user.user_metadata?.username as string | undefined) ||
          user.email?.split('@')[0]
        const ok = await loadCloudAccount(user.id, username)
        if (cancelled) return
        if (!ok) {
          setData((prev) => ({
            ...emptyData(),
            profile: {
              ...prev.profile,
              id: user.id,
              cloudUserId: user.id,
              username,
            },
          }))
        }
        setAuthed(true)
      } else {
        setData(emptyData())
        setAuthed(false)
        setEntriesSynced(true)
      }
    }
    void check()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Periodic cloud refresh while logged in
  useEffect(() => {
    if (!cloudEnabled || !authed || !data.profile.cloudUserId) return
    const userId = data.profile.cloudUserId
    const username = data.profile.username

    const tick = () => {
      if (document.visibilityState === 'hidden') return
      void (async () => {
        const hydrated = await hydrateAccountFromCloud({ userId, username })
        if ('error' in hydrated) return
        setData((prev) => {
          // Keep entries that exist only locally (push may still be in flight)
          const cloudIds = new Set(hydrated.entries.map((e) => e.id))
          const pending = prev.entries.filter((e) => !cloudIds.has(e.id))
          return {
            entries: [...hydrated.entries, ...pending],
            startedOn: hydrated.startedOn,
            friends: hydrated.friends,
            profile: {
              ...prev.profile,
              cloudUserId: hydrated.profile.cloudUserId,
              cloudCode: hydrated.profile.cloudCode,
              name: hydrated.profile.name || prev.profile.name,
              username: hydrated.profile.username || prev.profile.username,
              avatarUrl: hydrated.profile.avatarUrl || prev.profile.avatarUrl,
              rankedAnonymous:
                typeof hydrated.profile.rankedAnonymous === 'boolean'
                  ? hydrated.profile.rankedAnonymous
                  : prev.profile.rankedAnonymous,
              monkMode: prev.profile.monkMode,
            },
          }
        })
      })()
    }

    const id = window.setInterval(tick, CLOUD_REFRESH_MS)
    return () => window.clearInterval(id)
  }, [authed, data.profile.cloudUserId, data.profile.username])

  useEffect(() => {
    const id = data.profile.cloudUserId
    if (!id || !authed) return
    setTour(loadTour(id))
  }, [data.profile.cloudUserId, authed])

  // Open the right screen so the step's target button is visible
  useEffect(() => {
    if (!tour || !shouldShowTour(tour)) return
    const step = TOUR_STEPS[Math.min(tour.stepIndex, TOUR_STEPS.length - 1)]
    if (!step) return
    setTab(step.tab)
  }, [tour?.stepIndex, tour?.completed, tour?.skipped, Boolean(tour && shouldShowTour(tour))])

  function persistTour(next: TourState) {
    const id = data.profile.cloudUserId
    if (!id) return
    saveTour(id, next)
    setTour(next)
  }

  const streak = useMemo(
    () => calcSignedStreak(data.entries, data.startedOn),
    [data.entries, data.startedOn],
  )
  const { goonStreak, dryStreak } = useMemo(() => signedToGoonDry(streak), [streak])
  const totalMinutes = useMemo(() => sumEntryMinutes(data.entries), [data.entries])
  const xp = useMemo(
    () => totalXp(data.entries, data.focusXpTotal ?? 0),
    [data.entries, data.focusXpTotal],
  )
  const level = useMemo(() => levelFromXp(xp), [xp])
  const rank = useMemo(() => rankFromMinutes(totalMinutes), [totalMinutes])

  const mySnapshot = useMemo(
    () => ({
      ...buildSnapshot({
        id: data.profile.cloudUserId || data.profile.id,
        name: data.profile.name || data.profile.username || t('you'),
        entries: data.entries,
        goonStreak,
        dryStreak,
        focusXpTotal: data.focusXpTotal ?? 0,
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
      data.focusXpTotal,
      goonStreak,
      dryStreak,
      rank.id,
      t,
    ],
  )

  useEffect(() => {
    if (!cloudEnabled) return
    if (!data.profile.cloudUserId || !data.profile.cloudCode) return
    if (!authed || !entriesSynced) return

    const handle = window.setTimeout(() => {
      void pushCloudProfile({
        userId: data.profile.cloudUserId!,
        code: data.profile.cloudCode!,
        name: data.profile.name,
        username: data.profile.username,
        avatarUrl: data.profile.avatarUrl,
        rankedAnonymous: data.profile.rankedAnonymous,
        startedOn: data.startedOn,
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
    data.startedOn,
    data.profile.name,
    data.profile.username,
    data.profile.avatarUrl,
    data.profile.cloudUserId,
    data.profile.cloudCode,
    data.profile.rankedAnonymous,
    mySnapshot,
    authed,
    entriesSynced,
  ])

  const today = toDateKey()
  const todayEntries = data.entries.filter((e) => e.date === today)
  const todayMinutes = todayEntries.reduce((sum, e) => sum + e.minutes, 0)

  function logCategory(
    parts: { category: Category; minutes: number }[],
    goonometer: number,
    comment?: string,
  ) {
    const draft = buildEntryFromParts({
      id: newId(),
      parts,
      goonometer,
      date: today,
      createdAt: new Date().toISOString(),
      comment,
    })
    if (!draft) return
    const streakDays = calcGoonStreak([...data.entries, draft])
    const awarded = awardXp(draft.minutes, streakDays)
    const entry = { ...draft, xp: awarded }
    setData((prev) => ({ ...prev, entries: [...prev.entries, entry] }))
    const mult = awarded !== draft.minutes ? ` · ×${(awarded / draft.minutes).toFixed(2)}` : ''
    setFlash(`+${awarded} XP${mult} · G${goonometer}`)
    window.setTimeout(() => setFlash(null), 1600)

    const userId = data.profile.cloudUserId
    if (userId && cloudEnabled) {
      void pushTrackerEntries(userId, [entry])
      void pushGoonPost({ userId, entry })
    }
  }

  function removeEntry(id: string) {
    setData((prev) => ({
      ...prev,
      entries: prev.entries.filter((e) => e.id !== id),
    }))
    const userId = data.profile.cloudUserId
    if (userId && cloudEnabled) {
      void deleteTrackerEntry(userId, id)
      void deleteGoonPost(userId, id)
    }
  }

  function setMonkMode(on: boolean) {
    setData((prev) => ({
      ...prev,
      profile: { ...prev.profile, monkMode: on },
    }))
    if (on && tab === 'ranked') setTab('home')
  }

  function setRankedAnonymous(on: boolean) {
    setData((prev) => ({
      ...prev,
      profile: { ...prev.profile, rankedAnonymous: on },
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
    setTab(next)
  }

  async function handleAuthed(info: { userId: string; username: string }) {
    setEntriesSynced(false)
    setData(emptyData())
    await loadCloudAccount(info.userId, info.username)
    setAuthed(true)
  }

  async function handleLogout() {
    await logoutUser()
    setData(emptyData())
    setEntriesSynced(true)
    setUnlockQueue([])
    setFreshKeys(new Set())
    setAuthed(false)
    setTab('home')
  }

  async function handleDeleteAccount() {
    const result = await deleteOwnAccount()
    if (result.error) throw new Error(result.error)
    clearLocalTrackerData()
    setData(emptyData())
    setUnlockQueue([])
    setFreshKeys(new Set())
    setTab('home')
    setAuthed(false)
  }

  if (authed === null) {
    return (
      <div className="shell shell--auth">
        <p className="empty" style={{ padding: '2rem', textAlign: 'center' }}>
          {t('loading')}
        </p>
      </div>
    )
  }

  if (!authed) {
    return (
      <div className="shell shell--auth">
        <AuthScreen onAuthed={(info) => void handleAuthed(info)} />
      </div>
    )
  }

  const page = {
    title:
      tab === 'ranked'
        ? `${t('nav_ranked')} · ${seasonDisplayName(getSeasonInfo().season)}`
        : t(PAGE_MSG[tab]),
  }
  const displayLabel =
    data.profile.name.trim() || data.profile.username || t('nav_profile')
  const activeUnlock = unlockQueue[0] ?? null
  const monkMode = Boolean(data.profile.monkMode)
  const rankedAnonymous = Boolean(data.profile.rankedAnonymous)
  const hidePageChrome = tab === 'profile' || viewingForeignProfile

  return (
    <div className={`shell${hidePageChrome ? ' shell--immersive' : ''}`}>
      {activeUnlock && (
        <AchievementUnlockOverlay
          achievement={activeUnlock}
          onDone={() => setUnlockQueue((q) => q.slice(1))}
        />
      )}

      {tour && shouldShowTour(tour) && (
        <CoachTour
          stepIndex={tour.stepIndex}
          onSkip={() => persistTour({ ...tour, skipped: true })}
          onNext={() => {
            const nextIndex = tour.stepIndex + 1
            if (nextIndex >= TOUR_STEPS.length) {
              persistTour({ ...tour, completed: true, stepIndex: nextIndex })
            } else {
              persistTour({ ...tour, stepIndex: nextIndex })
            }
          }}
        />
      )}

      <header className="chrome">
        <p className="chrome__brand">Goon Tracker</p>
      </header>

      <BottomNav
        active={tab}
        onChange={openTab}
        hideRanked={monkMode}
        cloudCode={data.profile.cloudCode}
        userId={data.profile.cloudUserId}
        avatarUrl={data.profile.avatarUrl}
        displayName={displayLabel}
        goonStreak={goonStreak}
        dryStreak={dryStreak}
      />

      <div className="app">
        {!hidePageChrome && (
          <header className="top">
            <div className="top__left">
              <p className="top__brand">Goon Tracker</p>
              <h1 className="top__title">{page.title}</h1>
            </div>
          </header>
        )}

        <main className="page" id="main" key={tab}>
          {tab === 'profile' ? (
            <ProfilePanel
              userId={data.profile.cloudUserId}
              username={data.profile.username}
              displayName={data.profile.name}
              avatarUrl={data.profile.avatarUrl}
              entries={data.entries}
              startedOn={data.startedOn}
              totalMinutes={totalMinutes}
              xp={xp}
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
              onDeleteAccount={handleDeleteAccount}
              onRemoveEntry={removeEntry}
              freshAchievementKeys={freshKeys}
              monkMode={monkMode}
              onMonkModeChange={setMonkMode}
              rankedAnonymous={rankedAnonymous}
              onRankedAnonymousChange={setRankedAnonymous}
              locale={locale}
              onLocaleChange={setLocale}
            />
          ) : (
            <>
              {tab === 'home' && (
                <div className="home-compose">
                  <aside className="home-compose__overview" data-tour="home-widgets">
                    {!monkMode ? (
                      <>
                        <div className="home-hero__rank">
                          <p className="eyebrow">{t('rank')}</p>
                          <RankBadge totalMinutes={totalMinutes} rank={rank} />
                        </div>
                        <div className="home-compose__streak" aria-label="Streak">
                          <p className="eyebrow">Streak</p>
                          <div className="streaks streaks--single">
                            <StreakRing
                              key={streak}
                              value={streak}
                              embedded
                            />
                          </div>
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
                      </>
                    ) : (
                      <div className="home-compose__streak" aria-label="Streak">
                        <p className="eyebrow">Streak</p>
                        <div className="streaks streaks--single">
                          <StreakRing key={streak} value={streak} embedded />
                        </div>
                      </div>
                    )}
                  </aside>

                  {!monkMode && (
                    <section className="home-compose__primary">
                      <div className="block__head">
                        <h2>{t('today')}</h2>
                        {todayEntries.length > 0 && (
                          <span>{formatMinutes(todayMinutes)}</span>
                        )}
                      </div>
                      <CategoryPicker onLog={logCategory} />
                      {flash && <p className="flash flash--pop">{flash}</p>}
                    </section>
                  )}
                </div>
              )}

              {tab === 'friends' && (
                <FriendsPanel
                  me={mySnapshot}
                  friends={data.friends}
                  displayName={data.profile.name}
                  username={data.profile.username}
                  avatarUrl={data.profile.avatarUrl}
                  cloudCode={data.profile.cloudCode}
                  hideRecs={monkMode}
                  onCloudReady={onCloudReady}
                  onFriendsSync={onFriendsSync}
                  onRemoveLocal={removeFriend}
                  onViewedOtherProfile={handleViewedOtherProfile}
                  onViewingChange={setViewingForeignProfile}
                />
              )}

              {tab === 'ranked' && !monkMode && (
                <RankedPanel
                  entries={data.entries}
                  highlightId={data.profile.cloudUserId || data.profile.id}
                  userId={data.profile.cloudUserId}
                  onFriendsChanged={(friends) => onFriendsSync(friends)}
                  onViewedOtherProfile={handleViewedOtherProfile}
                  onViewingChange={setViewingForeignProfile}
                />
              )}
            </>
          )}
        </main>
      </div>

      <p className="app-version" aria-label="Version">
        Beta 1.0
      </p>
    </div>
  )
}
