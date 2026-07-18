import { rankFromMinutes, type RankInfo } from '../lib/ranks'
import { formatMinutes } from '../lib/format'

type RankBadgeProps = {
  totalMinutes: number
  rank?: RankInfo
  compact?: boolean
}

export function RankBadge({ totalMinutes, rank, compact }: RankBadgeProps) {
  const r = rank ?? rankFromMinutes(totalMinutes)
  const hours = (totalMinutes / 60).toFixed(1)

  return (
    <div className={`rank-badge${compact ? ' rank-badge--compact' : ''}`}>
      <span className="rank-badge__title" style={{ color: r.color }}>
        {r.title}
      </span>
      {!compact && (
        <span className="rank-badge__meta">
          {formatMinutes(totalMinutes)} · {hours}h gesamt
        </span>
      )}
    </div>
  )
}
