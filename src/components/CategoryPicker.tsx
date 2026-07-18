import { useState } from 'react'
import { CATEGORIES, CATEGORY_META, type Category } from '../types'

type CategoryPickerProps = {
  onLog: (
    category: Category,
    minutes: number,
    goonometer: number,
    comment?: string,
  ) => void
}

function clampMinutes(n: number) {
  return Math.max(1, Math.min(24 * 60, Math.round(n) || 1))
}

export function CategoryPicker({ onLog }: CategoryPickerProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [category, setCategory] = useState<Category | null>(null)
  const [minutes, setMinutes] = useState(30)
  const [goonometer, setGoonometer] = useState(5)
  const [comment, setComment] = useState('')

  function pickCategory(cat: Category) {
    setCategory(cat)
    setStep(2)
  }

  function submit() {
    if (!category) return
    onLog(category, minutes, goonometer, comment.trim() || undefined)
    setCategory(null)
    setGoonometer(5)
    setMinutes(30)
    setComment('')
    setStep(1)
  }

  return (
    <div className="session">
      {step === 1 && (
        <>
          <div className="session__head">
            <p className="session__label">1 · Kategorie</p>
          </div>
          <div className="cat-grid">
            {CATEGORIES.map((cat) => {
              const meta = CATEGORY_META[cat]
              return (
                <button
                  key={cat}
                  type="button"
                  className="cat-tile"
                  style={{
                    ['--cat-color' as string]: meta.color,
                    ['--cat-bg' as string]: meta.bg,
                  }}
                  onClick={() => pickCategory(cat)}
                >
                  <span className="cat-tile__swatch" />
                  <span className="cat-tile__label">{meta.label}</span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {step === 2 && category && (
        <>
          <div className="session__head">
            <p className="session__label">2 · Zeit · {CATEGORY_META[category].label}</p>
          </div>
          <div className="duration">
            <button
              type="button"
              className="duration__btn"
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
          <div className="session__actions">
            <button type="button" className="btn" onClick={() => setStep(1)}>
              Zurück
            </button>
            <button type="button" className="btn btn--solid" onClick={() => setStep(3)}>
              Weiter
            </button>
          </div>
        </>
      )}

      {step === 3 && category && (
        <>
          <div className="session__head">
            <p className="session__label">3 · Goonometer</p>
            <p className="session__sub">Wie intensiv war die Session? (0–10)</p>
          </div>
          <div className="duration__value">
            <strong>{goonometer}</strong>
            <span>/ 10</span>
          </div>
          <input
            className="duration__slider"
            type="range"
            min={0}
            max={10}
            value={goonometer}
            onChange={(e) => setGoonometer(Number(e.target.value))}
          />
          <div className="session__actions">
            <button type="button" className="btn" onClick={() => setStep(2)}>
              Zurück
            </button>
            <button type="button" className="btn btn--solid" onClick={() => setStep(4)}>
              Weiter
            </button>
          </div>
        </>
      )}

      {step === 4 && category && (
        <>
          <div className="session__head">
            <p className="session__label">4 · Kommentar</p>
            <p className="session__sub">Optional — erscheint im Freunde-Feed</p>
          </div>
          <textarea
            className="session__comment"
            value={comment}
            maxLength={280}
            rows={3}
            placeholder="Was ging ab…"
            onChange={(e) => setComment(e.target.value)}
          />
          <p className="session__sub">{comment.length}/280</p>
          <div className="session__actions">
            <button type="button" className="btn" onClick={() => setStep(3)}>
              Zurück
            </button>
            <button type="button" className="btn btn--solid" onClick={submit}>
              Speichern · {minutes}m · G{goonometer}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
