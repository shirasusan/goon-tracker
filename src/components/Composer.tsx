import { useState, type FormEvent } from 'react'
import type { CheckInKind } from '../types'

interface ComposerProps {
  onSession: (input: { durationMinutes?: number; note: string }) => void
  onCheckIn: (input: { kind: CheckInKind; note: string }) => void
}

export function Composer({ onSession, onCheckIn }: ComposerProps) {
  const [mode, setMode] = useState<'session' | 'checkin'>('session')
  const [note, setNote] = useState('')
  const [duration, setDuration] = useState('')
  const [kind, setKind] = useState<CheckInKind>('on_track')

  function submit(event: FormEvent) {
    event.preventDefault()
    const trimmed = note.trim()
    if (mode === 'session') {
      const mins = duration.trim() === '' ? undefined : Number(duration)
      onSession({
        durationMinutes:
          mins != null && Number.isFinite(mins) && mins > 0
            ? Math.round(mins)
            : undefined,
        note: trimmed,
      })
    } else {
      onCheckIn({ kind, note: trimmed })
    }
    setNote('')
    setDuration('')
  }

  return (
    <section className="panel composer">
      <header className="panel__header">
        <p className="eyebrow">Log</p>
        <h1>New post</h1>
        <p className="lede">Quick capture — lands in your feed instantly.</p>
      </header>

      <div className="segmented" role="tablist" aria-label="Post type">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'session'}
          className={mode === 'session' ? 'is-active' : undefined}
          onClick={() => setMode('session')}
        >
          Session
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'checkin'}
          className={mode === 'checkin' ? 'is-active' : undefined}
          onClick={() => setMode('checkin')}
        >
          Check-in
        </button>
      </div>

      <form className="composer__form" onSubmit={submit}>
        {mode === 'session' ? (
          <label className="field">
            <span>Duration (minutes, optional)</span>
            <input
              type="number"
              min={1}
              inputMode="numeric"
              placeholder="e.g. 25"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </label>
        ) : (
          <fieldset className="field field--choices">
            <legend>How are you?</legend>
            {(
              [
                ['on_track', 'On track'],
                ['urge', 'Urge noted'],
                ['slipped', 'Slipped'],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="choice">
                <input
                  type="radio"
                  name="checkin-kind"
                  value={value}
                  checked={kind === value}
                  onChange={() => setKind(value)}
                />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
        )}

        <label className="field">
          <span>Note (optional)</span>
          <textarea
            rows={3}
            placeholder="What do you want to remember?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>

        <button type="submit" className="btn btn--primary">
          Post to feed
        </button>
      </form>
    </section>
  )
}
