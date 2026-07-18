import { useMemo } from 'react'
import { unlockedAchievements } from '../lib/achievements'
import type { Category } from '../types'

type AchievementsSectionProps = {
  categories: Record<Category, number>
  freshKeys?: Set<string>
}

export function AchievementsSection({
  categories,
  freshKeys,
}: AchievementsSectionProps) {
  const unlocked = useMemo(() => unlockedAchievements(categories), [categories])

  if (unlocked.length === 0) {
    return (
      <section className="block">
        <div className="block__head">
          <h2>Achievements</h2>
          <span>ab 10h / Kategorie</span>
        </div>
        <p className="achievements__empty">Noch keine freigeschaltet.</p>
      </section>
    )
  }

  return (
    <section className="block">
      <div className="block__head">
        <h2>Achievements</h2>
        <span>{unlocked.length} freigeschaltet</span>
      </div>

      <ul className="achievements-grid">
        {unlocked.map((a) => {
          const isFresh = freshKeys?.has(a.key) ?? false
          return (
            <li key={a.key} className="achievements-grid__item">
              <div
                className={`ach-badge${isFresh ? ' is-fresh' : ''}`}
                style={{ ['--ach' as string]: a.color }}
                title={`${a.categoryLabel} · ${a.tier.title}`}
              >
                <span className="ach-badge__ring" aria-hidden />
                <span className="ach-badge__core">
                  <span className="ach-badge__hours">{a.tier.short}</span>
                  <span className="ach-badge__cat">{a.categoryLabel}</span>
                </span>
              </div>
              <p className="ach-badge__title">{a.tier.title}</p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
