type StreakRingProps = {
  /** Signed streak: + goon days, − dry days (internal) */
  value: number
  cap?: number
  compact?: boolean
  /** Inside a parent card — no extra border/background */
  embedded?: boolean
}

export function StreakRing({
  value,
  cap = 30,
  compact = false,
  embedded = false,
}: StreakRingProps) {
  const size = compact ? 140 : 160
  const stroke = compact ? 8 : 9
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const abs = Math.abs(value)
  const progress = Math.min(abs / cap, 1)
  const offset = c * (1 - progress)
  const variant = value > 0 ? 'evil' : value < 0 ? 'good' : 'neutral'
  const color = value > 0 ? '#ff4b91' : value < 0 ? '#3dceb8' : '#8a93a0'
  const label = value > 0 ? 'Goon Streak' : value < 0 ? 'Dry Streak' : 'Streak'

  return (
    <div
      className={`streak-ring streak-ring--${variant}${compact ? ' streak-ring--compact' : ''}${embedded ? ' streak-ring--embedded' : ''}`}
    >
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
            {abs}
          </span>
        </div>
      </div>
      <p className="streak-ring__label" style={{ color }}>
        {label}
      </p>
    </div>
  )
}
