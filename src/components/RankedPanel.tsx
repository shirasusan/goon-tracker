import { useEffect, useMemo, useState } from 'react'
import {
  fetchProfileById,
  pushSeasonStats,
  seasonMinutesFromEntries,
} from '../lib/cloud'
import { formatMinutes } from '../lib/format'
import { rankProgressFromMinutes } from '../lib/ranks'
import { formatCountdown, getSeasonInfo, type SeasonInfo } from '../lib/season'
import type { Entry, FriendSnapshot } from '../types'
import { Leaderboard, type LeaderboardMode } from './Leaderboard'
import { PublicProfileView } from './PublicProfileView'
import { RankBadge } from './RankBadge'
import { RankHelp } from './RankHelp'

type RankedPanelProps = {
  entries: Entry[]
  highlightId?: string
  userId?: string
  onViewedOtherProfile?: () => void
}

export function RankedPanel({
  entries,
  highlightId,
  userId,
  onViewedOtherProfile,
}: RankedPanelProps) {
  const [seasonInfo, setSeasonInfo] = useState<SeasonInfo>(() => getSeasonInfo())
  const [viewing, setViewing] = useState<FriendSnapshot | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [boardKey, setBoardKey] = useState(0)
  const [boardMode, setBoardMode] = useState<LeaderboardMode>('season')
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

  if (viewing) {
    return (
      <PublicProfileView
        profile={viewing}
        onBack={() => setViewing(null)}
        onViewedOtherProfile={onViewedOtherProfile}
      />
    )
  }

  return (
    <div className="ranked">
      <section className="ranked__season">
        <p className="ranked__eyebrow">Competitive</p>
        <h2 className="ranked__title">Season {seasonInfo.season}</h2>
        <p className="ranked__reset">
          Reset in <strong>{formatCountdown(seasonInfo.msUntilReset)}</strong>
        </p>
        <p className="ranked__dates">
          {seasonInfo.startKey} → {seasonInfo.endKeyExclusive}
        </p>
      </section>

      <section className="ranked__progress block">
        <div className="block__head">
          <h2 className="ranked__progress-title">
            Ranked Progression
            <button
              type="button"
              className="help-btn"
              aria-label="Ranks erklären"
              onClick={() => setShowRankHelp(true)}
            >
              ?
            </button>
          </h2>
          <span>{formatMinutes(seasonMinutes)} diese Season</span>
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
            : 'Max Rank erreicht'}
        </p>
        {syncError && <p className="friends__error">{syncError}</p>}
      </section>

      <RankHelp open={showRankHelp} onClose={() => setShowRankHelp(false)} />

      <section className="ranked__board block">
        <div className="block__head">
          <h2>Leaderboard</h2>
          <span>alle Spieler</span>
        </div>
        <div className="friends__tabs ranked__mode">
          <button
            type="button"
            className={`chip${boardMode === 'season' ? ' is-active' : ''}`}
            onClick={() => setBoardMode('season')}
          >
            Season
          </button>
          <button
            type="button"
            className={`chip${boardMode === 'alltime' ? ' is-active' : ''}`}
            onClick={() => setBoardMode('alltime')}
          >
            All Time
          </button>
        </div>
        <Leaderboard
          key={`${boardMode}-${boardKey}`}
          mode={boardMode}
          season={seasonInfo.season}
          highlightId={highlightId}
          onSelectUser={(id) => void openProfile(id)}
        />
      </section>
    </div>
  )
}
