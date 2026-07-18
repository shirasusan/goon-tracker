type LevelBarProps = {
  level: number
  intoLevel: number
  toNext: number
  progress: number
  totalXp: number
}

export function LevelBar({ level, intoLevel, toNext, progress, totalXp }: LevelBarProps) {
  const pct = Math.min(100, Math.round(progress * 100))

  return (
    <section className="level" aria-label={`Level ${level}`}>
      <div className="level__head">
        <div>
          <span className="level__label">Level</span>
          <strong className="level__num">{level}</strong>
        </div>
        <div className="level__meta">
          <span>
            {intoLevel} / {toNext} XP
          </span>
          <span className="level__total">{totalXp} gesamt</span>
        </div>
      </div>
      <div
        className="level__track"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="level__fill" style={{ width: `${pct}%` }} />
      </div>
    </section>
  )
}
