import { useEffect, useState } from 'react'
import { fetchAllTimeLeaderboard, fetchSeasonLeaderboard } from '../lib/cloud'
import { formatMinutes } from '../lib/format'
import { rankFromMinutes } from '../lib/ranks'
import { getSeasonInfo } from '../lib/season'
import { useLocale } from '../lib/LocaleContext'
import { CATEGORIES, CATEGORY_META, type Category, type FriendSnapshot } from '../types'
import { Avatar } from './Avatar'
import { RankBadge } from './RankBadge'

export type LeaderboardMode = 'season' | 'alltime'

type LeaderboardProps = {
  mode?: LeaderboardMode
  season?: number
  highlightId?: string
  onSelectUser?: (id: string) => void
  /** Controlled category; when set with onCategoryChange, filter UI is omitted here. */
  category?: Category | 'all'
  onCategoryChange?: (value: Category | 'all') => void
  hideCategoryFilter?: boolean
}

function displayRow(
  row: FriendSnapshot,
  highlightId: string | undefined,
  anonymousLabel: string,
) {
  const isYou = row.id === highlightId
  const anon = Boolean(row.rankedAnonymous) && !isYou
  return {
    anon,
    label: anon ? anonymousLabel : row.username ? `@${row.username}` : row.name,
    name: anon ? anonymousLabel : row.name,
    avatarUrl: anon ? undefined : row.avatarUrl,
    goonStreak: anon ? 0 : row.goonStreak,
    dryStreak: anon ? 0 : row.dryStreak,
    clickable: !anon && !isYou,
  }
}

export function CategoryFilterSelect({
  value,
  onChange,
}: {
  value: Category | 'all'
  onChange: (value: Category | 'all') => void
}) {
  const { t } = useLocale()
  return (
    <div className="friends__filters">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Category | 'all')}
        aria-label={t('category')}
      >
        <option value="all">{t('all_categories')}</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {CATEGORY_META[c].label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function Leaderboard({
  mode = 'season',
  season,
  highlightId,
  onSelectUser,
  category: controlledCategory,
  onCategoryChange,
  hideCategoryFilter = false,
}: LeaderboardProps) {
  const { t } = useLocale()
  const activeSeason = season ?? getSeasonInfo().season
  const [internalCategory, setInternalCategory] = useState<Category | 'all'>('all')
  const category = controlledCategory ?? internalCategory
  const setCategory = onCategoryChange ?? setInternalCategory
  const [rows, setRows] = useState<FriendSnapshot[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setBusy(true)
      const result =
        mode === 'alltime'
          ? await fetchAllTimeLeaderboard({
              category: category === 'all' ? undefined : category,
              limit: 50,
            })
          : await fetchSeasonLeaderboard({
              season: activeSeason,
              category: category === 'all' ? undefined : category,
              limit: 50,
            })
      if (cancelled) return
      if ('error' in result) setError(result.error)
      else {
        setRows(result.rows)
        setError(null)
      }
      setBusy(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [category, activeSeason, mode])

  const showFilter = !hideCategoryFilter

  return (
    <div className="leaderboard-wrap">
      {showFilter && (
        <div className="friends__board-head">
          <CategoryFilterSelect value={category} onChange={setCategory} />
        </div>
      )}
      {busy && <p className="empty">{t('loading')}</p>}
      {error && <p className="friends__error">{error}</p>}
      <ol className="leaderboard">
        {rows.map((row, i) => {
          const rank = rankFromMinutes(row.totalMinutes)
          const view = displayRow(row, highlightId, t('anonymous'))
          return (
            <li
              key={row.id}
              className={`leaderboard__row${view.clickable ? ' leaderboard__row--click' : ''}${row.id === highlightId ? ' is-you' : ''}`}
            >
              <span className="leaderboard__rank">{i + 1}</span>
              <Avatar
                src={view.avatarUrl}
                name={view.name}
                goonStreak={view.goonStreak}
                dryStreak={view.dryStreak}
                size="sm"
                onClick={
                  view.clickable && onSelectUser ? () => onSelectUser(row.id) : undefined
                }
              />
              <button
                type="button"
                className="leaderboard__main leaderboard__name-btn"
                disabled={!view.clickable || !onSelectUser}
                onClick={
                  view.clickable && onSelectUser ? () => onSelectUser(row.id) : undefined
                }
              >
                <strong>
                  {view.label}
                  {row.id === highlightId ? t('you_suffix') : ''}
                </strong>
                <RankBadge totalMinutes={row.totalMinutes} rank={rank} compact />
                <span>{formatMinutes(row.totalMinutes)}</span>
              </button>
              <span
                className={`compare-streak${
                  view.goonStreak > 0
                    ? ' compare-streak--goon'
                    : view.dryStreak > 0
                      ? ' compare-streak--focus'
                      : ''
                }`}
                title={
                  view.goonStreak > 0
                    ? `Goon-Streak ${view.goonStreak}`
                    : view.dryStreak > 0
                      ? `Focus-Streak ${view.dryStreak}`
                      : t('no_streak')
                }
              >
                {view.goonStreak > 0
                  ? view.goonStreak
                  : view.dryStreak > 0
                    ? view.dryStreak
                    : 0}
              </span>
            </li>
          )
        })}
      </ol>
      {!busy && rows.length === 0 && (
        <p className="empty">
          {mode === 'alltime' ? t('no_entries') : t('no_season_entries')}
        </p>
      )}
    </div>
  )
}
