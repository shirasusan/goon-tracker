import { useMemo } from 'react'
import {
  unlockedAchievementsFromCategories,
  unlockedAchievementsFromEntries,
} from '../lib/achievements'
import type { Category, Entry } from '../types'

type AchievementsSectionProps = {
  entries?: Entry[]
  /** Fallback when only category totals are known (public profiles) */
  categories?: Record<Category, number>
  freshKeys?: Set<string>
}

export function AchievementsSection({
  entries,
  categories,
  freshKeys,
}: AchievementsSectionProps) {
  const unlocked = useMemo(() => {
    if (entries) return unlockedAchievementsFromEntries(entries)
    if (categories) return unlockedAchievementsFromCategories(categories)
    return []
  }, [entries, categories])

  if (unlocked.length === 0) {
    return (
      <section className="block">
        <div className="block__head">
          <h2>Achievements</h2>
          <span>Sessions & Stunden</span>
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
                title={`${a.subtitle} · ${a.title}`}
              >
                <span className="ach-badge__ring" aria-hidden />
                <span className="ach-badge__core">
                  <span className="ach-badge__hours">{a.short}</span>
                  <span className="ach-badge__cat">{a.subtitle}</span>
                </span>
              </div>
              <p className="ach-badge__title">{a.title}</p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
