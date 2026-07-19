import { formatDisplayDate } from '../lib/dates'
import { entryParts } from '../lib/entries'
import { formatMinutes } from '../lib/format'
import { useLocale } from '../lib/LocaleContext'
import { CATEGORY_META, type Category, type Entry } from '../types'

type EntryListProps = {
  entries: Entry[]
  onRemove: (id: string) => void
  /** When set, time column uses this category's minutes; all parts still show as chips */
  focusCategory?: Category
}

export function EntryList({ entries, onRemove, focusCategory }: EntryListProps) {
  const { t } = useLocale()
  if (entries.length === 0) {
    return <p className="empty">{t('no_entries')}</p>
  }

  return (
    <ul className="entry-list">
      {entries.map((entry) => {
        const parts = entryParts(entry)
        const focusPart = focusCategory
          ? parts.find((p) => p.category === focusCategory)
          : undefined
        const displayMinutes = focusPart
          ? focusPart.minutes
          : parts.reduce((sum, p) => sum + p.minutes, 0)
        const multi = parts.length > 1
        return (
          <li key={entry.id} className="entry-row entry-row--g">
            <div className="entry-row__cats">
              {parts.map((p) => {
                const meta = CATEGORY_META[p.category]
                const isFocus = !focusCategory || p.category === focusCategory
                const showPartMins = multi
                return (
                  <span
                    key={p.category}
                    className={`entry-row__chip${multi && !isFocus ? ' entry-row__chip--side' : ''}`}
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
              aria-label={t('delete_entry')}
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
