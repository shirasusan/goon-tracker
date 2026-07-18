import { useState } from 'react'
import { CATEGORIES, CATEGORY_META, type Category } from '../types'

type CategoryPickerProps = {
  onLog: (category: Category, minutes: number) => void
}

function clampMinutes(n: number) {
  return Math.max(1, Math.min(24 * 60, Math.round(n) || 1))
}

export function CategoryPicker({ onLog }: CategoryPickerProps) {
  const [category, setCategory] = useState<Category | null>(null)
  const [minutes, setMinutes] = useState(30)

  function submit() {
    if (!category) return
    onLog(category, minutes)
    setCategory(null)
  }

  return (
    <div className="session">
      <div className="session__head">
        <p className="session__label">1 · Kategorie</p>
      </div>
      <div className="cat-grid">
        {CATEGORIES.map((cat) => {
          const meta = CATEGORY_META[cat]
          const active = category === cat
          return (
            <button
              key={cat}
              type="button"
              className={`cat-tile${active ? ' is-active' : ''}`}
              style={{
                ['--cat-color' as string]: meta.color,
                ['--cat-bg' as string]: meta.bg,
              }}
              onClick={() => setCategory(cat)}
            >
              <span className="cat-tile__swatch" />
              <span className="cat-tile__label">{meta.label}</span>
            </button>
          )
        })}
      </div>

      <div className="session__head">
        <p className="session__label">2 · Zeit</p>
      </div>

      <div className="duration">
        <button
          type="button"
          className="duration__btn"
          aria-label="weniger"
          onClick={() => setMinutes((m) => clampMinutes(m - 5))}
        >
          −5
        </button>
        <div className="duration__value">
          <strong>{minutes}</strong>
          <span>min</span>
        </div>
        <button
          type="button"
          className="duration__btn"
          aria-label="mehr"
          onClick={() => setMinutes((m) => clampMinutes(m + 5))}
        >
          +5
        </button>
      </div>

      <input
        className="duration__slider"
        type="range"
        min={1}
        max={180}
        value={Math.min(180, minutes)}
        onChange={(e) => setMinutes(clampMinutes(Number(e.target.value)))}
      />

      <button
        type="button"
        className="btn btn--solid btn--wide btn--lg"
        disabled={!category}
        onClick={submit}
      >
        {category
          ? `${CATEGORY_META[category].label} · ${minutes} min eintragen`
          : 'Kategorie wählen'}
      </button>
    </div>
  )
}
