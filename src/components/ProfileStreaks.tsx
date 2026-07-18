import { StreakRing } from './StreakRing'

type ProfileStreaksProps = {
  /** + Korruption / − Gut */
  streak: number
  compact?: boolean
}

export function ProfileStreaks({ streak, compact = false }: ProfileStreaksProps) {
  return (
    <section className="block streaks-block">
      <div className="block__head">
        <h2>Streak</h2>
        <span>+ Korruption · − Gut</span>
      </div>
      <div className="streaks streaks--single">
        <StreakRing value={streak} compact={compact} />
      </div>
    </section>
  )
}
