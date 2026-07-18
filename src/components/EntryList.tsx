import { formatDisplayDate } from '../lib/dates'
import { formatMinutes } from '../lib/format'
import { CATEGORY_META, type Entry } from '../types'

type EntryListProps = {
  entries: Entry[]
  onRemove: (id: string) => void
}

export function EntryList({ entries, onRemove }: EntryListProps) {
  if (entries.length === 0) {
    return <p className="empty">Noch keine Einträge.</p>
  }

  return (
    <ul className="entry-list">
      {entries.map((entry) => {
        const meta = CATEGORY_META[entry.category]
        return (
          <li key={entry.id} className="entry-row entry-row--g">
            <span
              className="entry-row__chip"
              style={{
                color: meta.color,
                background: meta.bg,
                borderColor: meta.color,
              }}
            >
              {meta.label}
            </span>
            <span className="entry-row__date">{formatDisplayDate(entry.date)}</span>
            <span className="entry-row__time">{formatMinutes(entry.minutes)}</span>
            <span className="entry-row__goon">G{entry.goonometer}</span>
            <button
              type="button"
              className="entry-row__remove"
              aria-label="Eintrag löschen"
              onClick={() => onRemove(entry.id)}
            >
              ×
            </button>
            {entry.comment ? (
              <span className="entry-row__comment" title={entry.comment}>
                {entry.comment}
              </span>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
