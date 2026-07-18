type StreakRingProps = {
  /** + = Korruption (goon), − = Gut (dry) */
  value: number
  cap?: number
  compact?: boolean
}

export function StreakRing({ value, cap = 30, compact = false }: StreakRingProps) {
  const size = compact ? 148 : 168
  const stroke = compact ? 8 : 9
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const abs = Math.abs(value)
  const progress = Math.min(abs / cap, 1)
  const offset = c * (1 - progress)
  const isEvil = value > 0
  const isGood = value < 0
  const variant = isEvil ? 'evil' : isGood ? 'good' : 'neutral'
  const color = isEvil ? '#ff2d4a' : isGood ? '#7dffb3' : '#8b95a3'
  const label = isEvil ? 'Korruption' : isGood ? 'Gut' : 'Neutral'
  const sublabel = isEvil
    ? 'Goon-Streak'
    : isGood
      ? 'Dry-Streak'
      : 'keine aktive Streak'
  const display = value > 0 ? `+${value}` : value < 0 ? `${value}` : '0'

  return (
    <div className={`streak-ring streak-ring--${variant}${compact ? ' streak-ring--compact' : ''}`}>
      <span className="streak-ring__tag">{label}</span>
      <div className="streak-ring__visual" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
          <circle
            className="streak-ring__track"
            cx={size / 2}
            cy={size / 2}
            r={r}
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            className="streak-ring__progress"
            cx={size / 2}
            cy={size / 2}
            r={r}
            strokeWidth={stroke}
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div className="streak-ring__center">
          <span className="streak-ring__value" style={{ color }}>
            {display}
          </span>
          <span className="streak-ring__unit">Tage</span>
        </div>
      </div>
      <div className="streak-ring__meta">
        <strong style={{ color }}>{label}</strong>
        <span>{sublabel}</span>
      </div>
    </div>
  )
}
