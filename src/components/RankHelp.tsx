import { RANKS } from '../lib/ranks'

type RankHelpProps = {
  open: boolean
  onClose: () => void
}

export function RankHelp({ open, onClose }: RankHelpProps) {
  if (!open) return null

  return (
    <div className="rank-help" role="dialog" aria-modal="true" aria-label="Rank Übersicht">
      <div className="rank-help__card">
        <div className="block__head">
          <h2>Ranks</h2>
          <button type="button" className="section__close" onClick={onClose}>
            schließen
          </button>
        </div>
        <p className="rank-help__hint">Stunden in der aktuellen Season</p>
        <ul className="rank-help__list">
          {RANKS.map((rank, i) => {
            const next = RANKS[i + 1]
            const range = next
              ? `${rank.minHours}–${next.minHours} h`
              : `${rank.minHours}+ h`
            return (
              <li key={rank.id}>
                <span className="rank-help__swatch" style={{ background: rank.color }} />
                <div>
                  <strong style={{ color: rank.color }}>{rank.title}</strong>
                  <span>{range}</span>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
      <button type="button" className="rank-help__backdrop" aria-label="Schließen" onClick={onClose} />
    </div>
  )
}
