import { useMemo } from 'react'
import {
  achievementProgressFromCategories,
  achievementProgressFromEntries,
  type UnlockedAchievement,
} from '../lib/achievements'
import type { Category, Entry } from '../types'

type AchievementsSectionProps = {
  entries?: Entry[]
  startedOn?: string
  categories?: Record<Category, number>
  freshKeys?: Set<string>
  embedded?: boolean
  /** showcase = progress + recent strip; full = complete grid */
  variant?: 'showcase' | 'full'
  onShowAll?: () => void
}

function AchievementBadge({
  a,
  fresh,
  compact,
}: {
  a: UnlockedAchievement
  fresh?: boolean
  compact?: boolean
}) {
  return (
    <div
      className={`ach-badge${fresh ? ' is-fresh' : ''}${compact ? ' ach-badge--sm' : ''}`}
      style={{ ['--ach' as string]: a.color }}
      title={`${a.subtitle} · ${a.title}`}
    >
      <span className="ach-badge__ring" aria-hidden />
      <span className="ach-badge__core">
        <span className="ach-badge__hours">{a.short}</span>
        <span className="ach-badge__cat">{a.subtitle}</span>
      </span>
    </div>
  )
}

export function AchievementsSection({
  entries,
  startedOn,
  categories,
  freshKeys,
  embedded = false,
  variant = 'full',
  onShowAll,
}: AchievementsSectionProps) {
  const progress = useMemo(() => {
    if (entries && startedOn) return achievementProgressFromEntries(entries, startedOn)
    if (categories) return achievementProgressFromCategories(categories)
    return null
  }, [entries, startedOn, categories])

  const shell = embedded ? 'profile-panel' : 'block'

  if (!progress) {
    return (
      <section className={shell}>
        <p className="achievements__empty">Noch keine freigeschaltet.</p>
      </section>
    )
  }

  const { unlocked, unlockedCount, totalCount, next, recent } = progress
  const pct = totalCount > 0 ? Math.min(100, Math.round((unlockedCount / totalCount) * 100)) : 0

  if (variant === 'showcase') {
    return (
      <section className={`${shell} ach-showcase`}>
        <div className="block__head">
          <h2>Achievements</h2>
          <span>
            {unlockedCount} / {totalCount}
          </span>
        </div>

        <div className="ach-progress" aria-label="Fortschritt">
          <div className="ach-progress__track">
            <div className="ach-progress__fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {next && (
          <div className="ach-next">
            <span className="ach-next__label">Als Nächstes</span>
            <div className="ach-next__row">
              <AchievementBadge a={next} compact />
              <div className="ach-next__text">
                <strong>{next.title}</strong>
                <span>
                  {next.subtitle} · {next.short}
                </span>
              </div>
            </div>
          </div>
        )}

        {recent.length > 0 ? (
          <>
            <p className="ach-showcase__recent-label">Zuletzt freigeschaltet</p>
            <ul className="ach-showcase__strip">
              {recent.map((a) => (
                <li key={a.key}>
                  <AchievementBadge a={a} fresh={freshKeys?.has(a.key)} compact />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="achievements__empty">Noch keine freigeschaltet.</p>
        )}

        {onShowAll && unlockedCount > 0 && (
          <button type="button" className="btn" onClick={onShowAll}>
            Alle Achievements
          </button>
        )}
      </section>
    )
  }

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
          {unlockedCount} Achievement{unlockedCount === 1 ? '' : 's'}
        </h2>
        <span>
          {unlockedCount} / {totalCount}
        </span>
      </div>

      <ul className="achievements-grid">
        {unlocked.map((a) => (
          <li key={a.key} className="achievements-grid__item">
            <AchievementBadge a={a} fresh={freshKeys?.has(a.key)} />
            <p className="ach-badge__title">{a.title}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
