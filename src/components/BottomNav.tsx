export type TabId = 'home' | 'friends' | 'ranked'

const ALL_TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: '◉' },
  { id: 'friends', label: 'Freunde', icon: '☰' },
  { id: 'ranked', label: 'Ranked', icon: '◆' },
]

type BottomNavProps = {
  active: TabId | null
  onChange: (tab: TabId) => void
  hideRanked?: boolean
}

export function BottomNav({ active, onChange, hideRanked }: BottomNavProps) {
  const tabs = hideRanked ? ALL_TABS.filter((t) => t.id !== 'ranked') : ALL_TABS

  return (
    <nav className="bottom-nav" aria-label="Hauptnavigation">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`bottom-nav__btn${active === tab.id ? ' is-active' : ''}`}
          onClick={() => onChange(tab.id)}
          aria-current={active === tab.id ? 'page' : undefined}
        >
          <span className="bottom-nav__icon" aria-hidden>
            {tab.icon}
          </span>
          <span className="bottom-nav__label">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
