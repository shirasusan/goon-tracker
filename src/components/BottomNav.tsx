export type TabId = 'home' | 'friends' | 'ranked'

const ALL_TABS: { id: TabId; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'friends', label: 'Freunde' },
  { id: 'ranked', label: 'Ranked' },
]

type BottomNavProps = {
  active: TabId | null
  onChange: (tab: TabId) => void
  hideRanked?: boolean
}

export function BottomNav({ active, onChange, hideRanked }: BottomNavProps) {
  const tabs = hideRanked ? ALL_TABS.filter((t) => t.id !== 'ranked') : ALL_TABS

  return (
    <nav
      className="bottom-nav"
      aria-label="Hauptnavigation"
      style={{ ['--nav-cols' as string]: String(tabs.length) }}
    >
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
    </nav>
  )
}
