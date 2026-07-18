type StreakRingProps = {
  label: string
  sublabel: string
  value: number
  /** evil = Goon, good = Dry */
  variant: 'evil' | 'good'
  cap?: number
  compact?: boolean
}

const VARIANT = {
  evil: {
    color: '#ff2d4a',
    tag: 'Böse',
  },
  good: {
    color: '#7dffb3',
    tag: 'Gut',
  },
} as const

export function StreakRing({
  label,
  sublabel,
  value,
  variant,
  cap = 30,
  compact = false,
}: StreakRingProps) {
  const size = compact ? 118 : 148
  const stroke = compact ? 7 : 8
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const progress = Math.min(value / cap, 1)
  const offset = c * (1 - progress)
  const meta = VARIANT[variant]

  return (
    <div className={`streak-ring streak-ring--${variant}${compact ? ' streak-ring--compact' : ''}`}>
      <span className="streak-ring__tag">{meta.tag}</span>
      <div className="streak-ring__visual">
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
            stroke={meta.color}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div className="streak-ring__center">
          <span className="streak-ring__value" style={{ color: meta.color }}>
            {value}
          </span>
          <span className="streak-ring__unit">Tage</span>
        </div>
      </div>
      <div className="streak-ring__meta">
        <strong style={{ color: meta.color }}>{label}</strong>
        <span>{sublabel}</span>
      </div>
    </div>
  )
}
