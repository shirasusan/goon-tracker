import { useEffect, useMemo, useState } from 'react'
import {
  loadSeenAchievements,
  saveSeenAchievements,
  unlockedAchievements,
  type UnlockedAchievement,
} from '../lib/achievements'
import type { Category } from '../types'

type AchievementsSectionProps = {
  categories: Record<Category, number>
  /** Celebrate newly unlocked badges (own profile only) */
  celebrate?: boolean
}

export function AchievementsSection({
  categories,
  celebrate = false,
}: AchievementsSectionProps) {
  const unlocked = useMemo(() => unlockedAchievements(categories), [categories])
  const [freshKeys, setFreshKeys] = useState<Set<string>>(() => new Set())
  const [toast, setToast] = useState<UnlockedAchievement | null>(null)

  useEffect(() => {
    if (!celebrate) return

    const currentKeys = unlocked.map((a) => a.key)
    const seen = loadSeenAchievements()

    if (seen.size === 0 && currentKeys.length > 0) {
      saveSeenAchievements(currentKeys)
      setFreshKeys(new Set())
      return
    }

    const newly = unlocked.filter((a) => !seen.has(a.key))
    if (newly.length === 0) {
      setFreshKeys(new Set())
      return
    }

    const nextSeen = new Set(seen)
    for (const a of newly) nextSeen.add(a.key)
    saveSeenAchievements(nextSeen)

    setFreshKeys(new Set(newly.map((a) => a.key)))
    setToast(newly[newly.length - 1] ?? null)

    const clearToast = window.setTimeout(() => setToast(null), 2800)
    const clearFresh = window.setTimeout(() => setFreshKeys(new Set()), 1600)
    return () => {
      window.clearTimeout(clearToast)
      window.clearTimeout(clearFresh)
    }
  }, [celebrate, unlocked])

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
          const isFresh = freshKeys.has(a.key)
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

      {toast && (
        <div className="ach-toast" style={{ ['--ach' as string]: toast.color }} role="status">
          <div className="ach-toast__badge" aria-hidden>
            <span className="ach-badge__ring" />
            <span className="ach-badge__core">
              <span className="ach-badge__hours">{toast.tier.short}</span>
            </span>
          </div>
          <div>
            <p className="ach-toast__label">Achievement unlocked</p>
            <strong>{toast.tier.title}</strong>
            <span>{toast.categoryLabel}</span>
          </div>
        </div>
      )}
    </section>
  )
}
