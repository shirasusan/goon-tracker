import { StreakRing } from './StreakRing'

type ProfileStreaksProps = {
  goonStreak: number
  dryStreak: number
  compact?: boolean
}

export function ProfileStreaks({
  goonStreak,
  dryStreak,
  compact = false,
}: ProfileStreaksProps) {
  return (
    <section className="block streaks-block">
      <div className="block__head">
        <h2>Streaks</h2>
        <span>Gut vs Böse</span>
      </div>
      <div className="streaks streaks--dual">
        <StreakRing
          label="Goon"
          sublabel="täglich aktiv · Korruption"
          value={goonStreak}
          variant="evil"
          compact={compact}
        />
        <StreakRing
          label="Dry"
          sublabel="ohne Session · Reinheit"
          value={dryStreak}
          variant="good"
          compact={compact}
        />
      </div>
    </section>
  )
}
