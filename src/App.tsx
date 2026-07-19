import { useEffect, useState } from 'react'
import { Composer } from './components/Composer'
import { Feed } from './components/Feed'
import { ProfilePanel } from './components/ProfilePanel'
import { StreakPanel } from './components/StreakPanel'
import { createId } from './lib/id'
import { loadData, saveData } from './lib/storage'
import type {
  AppData,
  CheckInKind,
  Profile,
  TabId,
} from './types'
import './App.css'

const TABS: { id: TabId; label: string }[] = [
  { id: 'feed', label: 'Feed' },
  { id: 'log', label: 'Log' },
  { id: 'streak', label: 'Streak' },
  { id: 'profile', label: 'Profile' },
]

function App() {
  const [data, setData] = useState<AppData>(() => loadData())
  const [tab, setTab] = useState<TabId>('feed')

  useEffect(() => {
    saveData(data)
  }, [data])

  function addSession(input: { durationMinutes?: number; note: string }) {
    setData((prev) => ({
      ...prev,
      posts: [
        {
          id: createId(),
          type: 'session',
          createdAt: new Date().toISOString(),
          note: input.note || undefined,
          durationMinutes: input.durationMinutes,
          liked: false,
        },
        ...prev.posts,
      ],
    }))
    setTab('feed')
  }

  function addCheckIn(input: { kind: CheckInKind; note: string }) {
    setData((prev) => ({
      ...prev,
      posts: [
        {
          id: createId(),
          type: 'checkin',
          createdAt: new Date().toISOString(),
          note: input.note || undefined,
          checkInKind: input.kind,
          liked: false,
        },
        ...prev.posts,
      ],
    }))
    setTab('feed')
  }

  function toggleLike(id: string) {
    setData((prev) => ({
      ...prev,
      posts: prev.posts.map((p) =>
        p.id === id ? { ...p, liked: !p.liked } : p,
      ),
    }))
  }

  function saveProfile(profile: Profile) {
    setData((prev) => ({ ...prev, profile }))
  }

  return (
    <div className="app-shell">
      <div className="atmosphere" aria-hidden="true" />

      <header className="topbar">
        <p className="topbar__brand">goon-tracker</p>
        <button
          type="button"
          className="topbar__avatar"
          aria-label="Open profile"
          onClick={() => setTab('profile')}
        >
          {data.profile.displayName.trim().slice(0, 1).toUpperCase() || '?'}
        </button>
      </header>

      <main className="main" key={tab}>
        {tab === 'feed' && (
          <Feed
            posts={data.posts}
            profile={data.profile}
            onToggleLike={toggleLike}
            onGoLog={() => setTab('log')}
          />
        )}
        {tab === 'log' && (
          <Composer onSession={addSession} onCheckIn={addCheckIn} />
        )}
        {tab === 'streak' && <StreakPanel posts={data.posts} />}
        {tab === 'profile' && (
          <ProfilePanel
            profile={data.profile}
            posts={data.posts}
            onSave={saveProfile}
          />
        )}
      </main>

      <nav className="bottom-nav" aria-label="Primary">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? 'is-active' : undefined}
            aria-current={tab === item.id ? 'page' : undefined}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

export default App
