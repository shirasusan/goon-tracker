import { useEffect, useMemo, useState } from 'react'
import {
  fetchProfileById,
  loadFriendProfiles,
  pushSeasonStats,
  seasonMinutesFromEntries,
} from '../lib/cloud'
import { formatMinutes } from '../lib/format'
import { rankProgressFromMinutes } from '../lib/ranks'
import { formatCountdown, getSeasonInfo, seasonDisplayName, type SeasonInfo } from '../lib/season'
import type { Category, Entry, FriendSnapshot } from '../types'
import {
  CategoryFilterSelect,
  Leaderboard,
  type LeaderboardMode,
} from './Leaderboard'
import { PublicProfileView } from './PublicProfileView'
import { RankBadge } from './RankBadge'
import { RankHelp } from './RankHelp'

type RankedPanelProps = {
  entries: Entry[]
  highlightId?: string
  userId?: string
  onViewedOtherProfile?: () => void
  onFriendsChanged?: (friends: FriendSnapshot[]) => void
}

export function RankedPanel({
  entries,
  highlightId,
  userId,
  onViewedOtherProfile,
  onFriendsChanged,
}: RankedPanelProps) {
  const [seasonInfo, setSeasonInfo] = useState<SeasonInfo>(() => getSeasonInfo())
  const [viewing, setViewing] = useState<FriendSnapshot | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [boardKey, setBoardKey] = useState(0)
  const [boardMode, setBoardMode] = useState<LeaderboardMode>('season')
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [showRankHelp, setShowRankHelp] = useState(false)

  useEffect(() => {
    const tick = () => setSeasonInfo(getSeasonInfo())
    const id = window.setInterval(tick, 30_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    async function sync() {
      const result = await pushSeasonStats({ userId: userId!, entries })
      if (cancelled) return
      if (result.error) setSyncError(result.error)
      else {
        setSyncError(null)
        setBoardKey((k) => k + 1)
      }
    }
    void sync()
    return () => {
      cancelled = true
    }
  }, [userId, entries])

  const seasonMinutes = useMemo(
    () => seasonMinutesFromEntries(entries).totalMinutes,
    [entries],
  )
  const progress = useMemo(
    () => rankProgressFromMinutes(seasonMinutes),
    [seasonMinutes],
  )

  async function openProfile(id: string) {
    const result = await fetchProfileById(id)
    if ('error' in result) return
    setViewing(result.profile)
  }

  async function refreshFriends() {
    if (!userId || !onFriendsChanged) return
    const loaded = await loadFriendProfiles(userId)
    if (!('error' in loaded)) onFriendsChanged(loaded.friends)
  }

  if (viewing) {
    return (
      <PublicProfileView
        profile={viewing}
        onBack={() => setViewing(null)}
        onViewedOtherProfile={onViewedOtherProfile}
        meId={userId}
        onFriendsChanged={() => void refreshFriends()}
      />
    )
  }

  return (
    <div className="ranked page-stack">
      <header className="ranked__top">
        <div className="ranked__top-main">
          <h2 className="ranked__title">{seasonDisplayName(seasonInfo.season)}</h2>
          <p className="ranked__dates">
            {seasonInfo.startKey} → {seasonInfo.endKeyExclusive}
          </p>
        </div>
        <p className="ranked__reset">
          Zurücksetzen in <strong>{formatCountdown(seasonInfo.msUntilReset)}</strong>
        </p>
      </header>

      <div className="ranked__body">
        <aside className="ranked__progress">
          <div className="block__head">
            <h2 className="ranked__progress-title">
              Dein Rang
              <button
                type="button"
                className="help-btn"
                aria-label="Ränge erklären"
                onClick={() => setShowRankHelp(true)}
              >
                ?
              </button>
            </h2>
            <span>{formatMinutes(seasonMinutes)}</span>
          </div>
          <RankBadge totalMinutes={seasonMinutes} rank={progress.rank} />
          <div className="ranked__bar" aria-hidden>
            <div
              className="ranked__bar-fill"
              style={{
                width: `${Math.round(progress.progress * 100)}%`,
                background: progress.rank.color,
              }}
            />
          </div>
          <p className="ranked__next">
            {progress.next
              ? `${progress.intoBand.toFixed(1)} / ${progress.bandSize} h bis ${progress.next.title}`
              : 'Maximalrang erreicht'}
          </p>
          <p className="ranked__legend">
            Saison-Stunden zählen für Rang · Allzeit für Level auf Start
          </p>
          {syncError && <p className="friends__error">{syncError}</p>}
        </aside>

        <section className="ranked__board">
          <div className="ranked__board-toolbar">
            <div className="friends__tabs ranked__mode">
              <button
                type="button"
                className={`chip${boardMode === 'season' ? ' is-active' : ''}`}
                onClick={() => setBoardMode('season')}
              >
                Saison
              </button>
              <button
                type="button"
                className={`chip${boardMode === 'alltime' ? ' is-active' : ''}`}
                onClick={() => setBoardMode('alltime')}
              >
                Allzeit
              </button>
            </div>
            <CategoryFilterSelect value={category} onChange={setCategory} />
          </div>
          <Leaderboard
            key={`${boardMode}-${boardKey}`}
            mode={boardMode}
            season={seasonInfo.season}
            highlightId={highlightId}
            category={category}
            onCategoryChange={setCategory}
            hideCategoryFilter
            onSelectUser={(id) => void openProfile(id)}
          />
        </section>
      </div>

      <RankHelp open={showRankHelp} onClose={() => setShowRankHelp(false)} />
    </div>
  )
}
