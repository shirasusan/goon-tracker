import { useMemo } from 'react'
import {
  unlockedAchievementsFromCategories,
  unlockedAchievementsFromEntries,
} from '../lib/achievements'
import type { Category, Entry } from '../types'

type AchievementsSectionProps = {
  entries?: Entry[]
  startedOn?: string
  /** Fallback when only category totals are known (public profiles) */
  categories?: Record<Category, number>
  freshKeys?: Set<string>
  /** No outer card — for use inside a parent panel */
  embedded?: boolean
}

export function AchievementsSection({
  entries,
  startedOn,
  categories,
  freshKeys,
  embedded = false,
}: AchievementsSectionProps) {
  const unlocked = useMemo(() => {
    if (entries && startedOn) return unlockedAchievementsFromEntries(entries, startedOn)
    if (categories) return unlockedAchievementsFromCategories(categories)
    return []
  }, [entries, startedOn, categories])

  const shell = embedded ? 'profile-panel' : 'block'

  if (unlocked.length === 0) {
    return (
      <section className={shell}>
        <div className="block__head">
          <h2>0 Achievements</h2>
        </div>
        <p className="achievements__empty">Noch keine freigeschaltet.</p>
      </section>
    )
  }

  return (
    <section className={shell}>
      <div className="block__head">
        <h2>
          {unlocked.length} Achievement{unlocked.length === 1 ? '' : 's'}
        </h2>
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
