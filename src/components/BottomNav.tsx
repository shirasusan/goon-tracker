import { AddFriendControl } from './AddFriendControl'

export type TabId = 'home' | 'friends' | 'ranked'

const ALL_TABS: { id: TabId; label: string }[] = [
  { id: 'home', label: 'Start' },
  { id: 'friends', label: 'Freunde' },
  { id: 'ranked', label: 'Rangliste' },
]

type BottomNavProps = {
  active: TabId | null
  onChange: (tab: TabId) => void
  hideRanked?: boolean
  cloudCode?: string
  userId?: string
}

export function BottomNav({
  active,
  onChange,
  hideRanked,
  cloudCode,
  userId,
}: BottomNavProps) {
  const tabs = hideRanked ? ALL_TABS.filter((t) => t.id !== 'ranked') : ALL_TABS

  return (
    <nav
      className="bottom-nav"
      aria-label="Hauptnavigation"
      style={{ ['--nav-cols' as string]: String(tabs.length) }}
    >
      <p className="bottom-nav__overview">Menü</p>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`bottom-nav__btn${active === tab.id ? ' is-active' : ''}`}
          onClick={() => onChange(tab.id)}
          aria-current={active === tab.id ? 'page' : undefined}
        >
          <span className="bottom-nav__label">{tab.label}</span>
        </button>
      ))}
      <AddFriendControl
        className="bottom-nav__add-friend"
        cloudCode={cloudCode}
        userId={userId}
      />
    </nav>
  )
}
