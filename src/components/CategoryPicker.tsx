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

type Drafts = Partial<Record<Category, number>>

function clampMinutes(n: number) {
  return Math.max(1, Math.min(24 * 60, Math.round(n) || 1))
}

export function CategoryPicker({ onLog }: CategoryPickerProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [drafts, setDrafts] = useState<Drafts>({})
  const [active, setActive] = useState<Category | null>(null)
  const [goonometer, setGoonometer] = useState(5)
  const [comment, setComment] = useState('')

  const selected = CATEGORIES.filter((c) => drafts[c] != null)
  const totalMinutes = selected.reduce((sum, c) => sum + (drafts[c] || 0), 0)
  const activeMinutes = active ? (drafts[active] ?? 30) : 30

  function resetEntry() {
    setDrafts({})
    setActive(null)
    setGoonometer(5)
    setComment('')
    setStep(1)
  }

  function close() {
    resetEntry()
    setOpen(false)
  }

  function selectCategory(cat: Category) {
    if (active === cat) {
      // Collapse slider; keep the minutes
      setActive(null)
      return
    }
    setDrafts((prev) => ({
      ...prev,
      [cat]: prev[cat] ?? 30,
    }))
    setActive(cat)
  }

  function setActiveMinutes(n: number) {
    if (!active) return
    const minutes = clampMinutes(n)
    setDrafts((prev) => ({ ...prev, [active]: minutes }))
  }

  function clearCategory(cat: Category) {
    setDrafts((prev) => {
      const next = { ...prev }
      delete next[cat]
      return next
    })
    if (active === cat) setActive(null)
  }

  function submit() {
    if (selected.length === 0) return
    const note = comment.trim() || undefined
    selected.forEach((cat, i) => {
      const minutes = drafts[cat]
      if (!minutes) return
      onLog(cat, minutes, goonometer, i === 0 ? note : undefined)
    })
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

  const summaryLabel =
    selected.length === 0
      ? null
      : selected.map((c) => `${drafts[c]}m ${CATEGORY_META[c].label}`).join(' · ')

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
          <p className="session__sub">
            Mehrere Kategorien möglich — Minuten bleiben gespeichert.
          </p>
          <div className="cat-grid">
            {CATEGORIES.map((cat) => {
              const meta = CATEGORY_META[cat]
              const mins = drafts[cat]
              const hasValue = mins != null
              const isOpen = active === cat
              return (
                <div
                  key={cat}
                  className={`cat-block${hasValue ? ' is-picked' : ''}${isOpen ? ' is-open' : ''}`}
                  style={{
                    ['--cat-color' as string]: meta.color,
                    ['--cat-bg' as string]: meta.bg,
                  }}
                >
                  <button
                    type="button"
                    className={`cat-tile${hasValue ? ' is-active' : ''}`}
                    onClick={() => selectCategory(cat)}
                  >
                    <span className="cat-tile__swatch" />
                    <span className="cat-tile__label">{meta.label}</span>
                    {hasValue && !isOpen && (
                      <span className="cat-tile__mins">{mins}m</span>
                    )}
                  </button>
                  {hasValue && (
                    <button
                      type="button"
                      className="cat-tile__clear"
                      aria-label={`${meta.label} entfernen`}
                      onClick={() => clearCategory(cat)}
                    >
                      ×
                    </button>
                  )}
                  {isOpen && (
                    <div className="cat-block__panel">
                      <div className="duration__value">
                        <strong>{activeMinutes}</strong>
                        <span>min</span>
                      </div>
                      <input
                        className="duration__slider"
                        type="range"
                        min={1}
                        max={180}
                        value={Math.min(180, activeMinutes)}
                        onChange={(e) =>
                          setActiveMinutes(Number(e.target.value))
                        }
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {selected.length > 0 && (
            <button
              type="button"
              className="btn btn--solid"
              onClick={() => setStep(2)}
            >
              Weiter · {totalMinutes}m
            </button>
          )}
        </>
      )}

      {step === 2 && selected.length > 0 && (
        <>
          <div className="session__head">
            <p className="session__label">Goonometer</p>
            <button type="button" className="section__close" onClick={close}>
              schließen
            </button>
          </div>
          {summaryLabel && <p className="session__sub">{summaryLabel}</p>}
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

      {step === 3 && selected.length > 0 && (
        <>
          <div className="session__head">
            <p className="session__label">Kommentar</p>
            <button type="button" className="section__close" onClick={close}>
              schließen
            </button>
          </div>
          <p className="session__sub">Optional — erscheint im Freunde-Feed</p>
          {summaryLabel && <p className="session__sub">{summaryLabel}</p>}
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
              Speichern · {totalMinutes}m · G{goonometer}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
