import { formatDisplayDate } from '../lib/dates'
import { entryParts } from '../lib/entries'
import { formatMinutes } from '../lib/format'
import { CATEGORY_META, type Category, type Entry } from '../types'

type EntryListProps = {
  entries: Entry[]
  onRemove: (id: string) => void
  /** When set, show only this category's minutes for multi-part entries */
  focusCategory?: Category
}

export function EntryList({ entries, onRemove, focusCategory }: EntryListProps) {
  if (entries.length === 0) {
    return <p className="empty">Noch keine Einträge.</p>
  }

  return (
    <ul className="entry-list">
      {entries.map((entry) => {
        const parts = focusCategory
          ? entryParts(entry).filter((p) => p.category === focusCategory)
          : entryParts(entry)
        const displayMinutes = parts.reduce((sum, p) => sum + p.minutes, 0)
        return (
          <li key={entry.id} className="entry-row entry-row--g">
            <div className="entry-row__cats">
              {parts.map((p) => {
                const meta = CATEGORY_META[p.category]
                const showPartMins = Boolean(focusCategory) || parts.length > 1
                return (
                  <span
                    key={p.category}
                    className="entry-row__chip"
                    style={{
                      color: meta.color,
                      background: meta.bg,
                      borderColor: meta.color,
                    }}
                  >
                    {meta.label}
                    {showPartMins ? ` · ${formatMinutes(p.minutes)}` : ''}
                  </span>
                )
              })}
            </div>
            <span className="entry-row__date">{formatDisplayDate(entry.date)}</span>
            <span className="entry-row__time">{formatMinutes(displayMinutes)}</span>
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
