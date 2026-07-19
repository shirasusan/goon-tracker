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
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [category, setCategory] = useState<Category | null>(null)
  const [minutes, setMinutes] = useState(30)
  const [goonometer, setGoonometer] = useState(5)
  const [comment, setComment] = useState('')

  function resetEntry() {
    setCategory(null)
    setGoonometer(5)
    setMinutes(30)
    setComment('')
    setStep(1)
  }

  function close() {
    resetEntry()
    setOpen(false)
  }

  function toggleCategory(cat: Category) {
    if (category === cat) {
      setCategory(null)
      return
    }
    setCategory(cat)
    setMinutes(30)
  }

  function submit() {
    if (!category) return
    onLog(category, minutes, goonometer, comment.trim() || undefined)
    // Stay open so another category can be logged right away
    resetEntry()
  }

  if (!open) {
    return (
      <button type="button" className="new-entry" onClick={() => setOpen(true)}>
        <span className="new-entry__plus" aria-hidden>
          +
        </span>
        <span className="new-entry__label">New Entry</span>
      </button>
    )
  }

  return (
    <div className="session">
      {step === 1 && (
        <>
          <div className="session__head">
            <p className="session__label">Kategorie</p>
            <button type="button" className="section__close" onClick={close}>
              schließen
            </button>
          </div>
          <div className="cat-grid">
            {CATEGORIES.map((cat) => {
              const meta = CATEGORY_META[cat]
              const selected = category === cat
              return (
                <div
                  key={cat}
                  className={`cat-block${selected ? ' is-open' : ''}`}
                  style={{
                    ['--cat-color' as string]: meta.color,
                    ['--cat-bg' as string]: meta.bg,
                  }}
                >
                  <button
                    type="button"
                    className={`cat-tile${selected ? ' is-active' : ''}`}
                    onClick={() => toggleCategory(cat)}
                  >
                    <span className="cat-tile__swatch" />
                    <span className="cat-tile__label">{meta.label}</span>
                  </button>
                  {selected && (
                    <div className="cat-block__panel">
                      <div className="duration__value">
                        <strong>{minutes}</strong>
                        <span>min</span>
                      </div>
                      <input
                        className="duration__slider"
                        type="range"
                        min={1}
                        max={180}
                        value={Math.min(180, minutes)}
                        onChange={(e) =>
                          setMinutes(clampMinutes(Number(e.target.value)))
                        }
                      />
                      <button
                        type="button"
                        className="btn btn--solid"
                        onClick={() => setStep(2)}
                      >
                        Weiter
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {step === 2 && category && (
        <>
          <div className="session__head">
            <p className="session__label">
              Goonometer · {CATEGORY_META[category].label}
            </p>
            <button type="button" className="section__close" onClick={close}>
              schließen
            </button>
          </div>
          <p className="session__sub">Wie intensiv war die Session? (0–10)</p>
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
            <p className="session__label">Kommentar</p>
            <button type="button" className="section__close" onClick={close}>
              schließen
            </button>
          </div>
          <p className="session__sub">Optional — erscheint im Freunde-Feed</p>
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
            <button type="button" className="btn" onClick={() => setStep(2)}>
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
