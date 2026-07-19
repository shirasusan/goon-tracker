import type { Post } from '../types'
import { bestStreak, currentStreak, weekActivity } from '../lib/streaks'

interface StreakPanelProps {
  posts: Post[]
}

export function StreakPanel({ posts }: StreakPanelProps) {
  const current = currentStreak(posts)
  const best = bestStreak(posts)
  const week = weekActivity(posts)

  return (
    <section className="panel streak-panel">
      <header className="panel__header">
        <p className="eyebrow">Streak</p>
        <h1>Keep the chain</h1>
        <p className="lede">
          Any session or check-in counts for the day. Miss a day and the current
          streak resets.
        </p>
      </header>

      <div className="stat-row">
        <div className="stat-block">
          <p className="stat-block__value">{current}</p>
          <p className="stat-block__label">Current</p>
        </div>
        <div className="stat-block">
          <p className="stat-block__value">{best}</p>
          <p className="stat-block__label">Best</p>
        </div>
        <div className="stat-block">
          <p className="stat-block__value">{posts.length}</p>
          <p className="stat-block__label">Posts</p>
        </div>
      </div>

      <div className="week-strip" aria-label="This week">
        {week.map((day) => (
          <div
            key={day.key}
            className={[
              'week-strip__day',
              day.active ? 'is-active' : '',
              day.isToday ? 'is-today' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span>{day.label}</span>
            <span className="week-strip__dot" aria-hidden="true" />
          </div>
        ))}
      </div>
    </section>
  )
}
