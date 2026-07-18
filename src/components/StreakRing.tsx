type StreakRingProps = {
  label: string
  sublabel: string
  value: number
  color: string
  cap?: number
}

export function StreakRing({ label, sublabel, value, color, cap = 30 }: StreakRingProps) {
  const size = 148
  const stroke = 8
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const progress = Math.min(value / cap, 1)
  const offset = c * (1 - progress)

  return (
    <div className="streak-ring">
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
            stroke={color}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div className="streak-ring__center">
          <span className="streak-ring__value" style={{ color }}>
            {value}
          </span>
          <span className="streak-ring__unit">Tage</span>
        </div>
      </div>
      <div className="streak-ring__meta">
        <strong>{label}</strong>
        <span>{sublabel}</span>
      </div>
    </div>
  )
}
