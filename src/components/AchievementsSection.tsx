import { achievementsFromCategoryMinutes } from '../lib/achievements'
import type { Category } from '../types'

type AchievementsSectionProps = {
  categories: Record<Category, number>
}

export function AchievementsSection({ categories }: AchievementsSectionProps) {
  const rows = achievementsFromCategoryMinutes(categories)

  return (
    <section className="block">
      <div className="block__head">
        <h2>Achievements</h2>
        <span>auto freigeschaltet</span>
      </div>
      <ul className="achievements">
        {rows.map((row) => (
          <li key={row.category} className="achievements__cat">
            <div className="achievements__cat-head">
              <strong style={{ color: row.color }}>{row.label}</strong>
              <span>{row.hours.toFixed(1)} h</span>
            </div>
            <ul className="achievements__tiers">
              {row.tiers.map((tier) => (
                <li
                  key={tier.id}
                  className={`achievements__tier${tier.unlocked ? ' is-unlocked' : ''}`}
                  style={
                    tier.unlocked
                      ? {
                          borderColor: row.color,
                          boxShadow: `0 0 0 1px ${row.color}33`,
                        }
                      : undefined
                  }
                >
                  <span
                    className="achievements__dot"
                    style={{
                      background: tier.unlocked ? row.color : '#2a313b',
                    }}
                  />
                  <div>
                    <strong style={{ color: tier.unlocked ? row.color : undefined }}>
                      {tier.title}
                    </strong>
                    <span>{tier.minHours} h</span>
                  </div>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  )
}
