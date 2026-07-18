import { CATEGORIES, CATEGORY_META, type Category, type Entry } from '../types'
import { formatMinutes } from '../lib/format'

type CategoryStatsProps = {
  entries: Entry[]
  selected: Category | null
  onSelect: (category: Category) => void
}

export function CategoryStats({ entries, selected, onSelect }: CategoryStatsProps) {
  const totals = CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat] = entries
        .filter((e) => e.category === cat)
        .reduce((sum, e) => sum + e.minutes, 0)
      return acc
    },
    {} as Record<Category, number>,
  )

  const max = Math.max(1, ...Object.values(totals))

  return (
    <ul className="cat-stats">
      {CATEGORIES.map((cat) => {
        const meta = CATEGORY_META[cat]
        const mins = totals[cat]
        const pct = Math.round((mins / max) * 100)
        const active = selected === cat
        return (
          <li key={cat}>
            <button
              type="button"
              className={`cat-stats__row${active ? ' is-active' : ''}`}
              style={{ ['--cat-color' as string]: meta.color }}
              onClick={() => onSelect(cat)}
              aria-pressed={active}
            >
              <div className="cat-stats__label">
                <span style={{ color: meta.color }}>{meta.label}</span>
                <span>{formatMinutes(mins)}</span>
              </div>
              <div className="cat-stats__track">
                <div
                  className="cat-stats__fill"
                  style={{ width: `${pct}%`, background: meta.color }}
                />
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
