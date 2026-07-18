export type TabId = 'home' | 'stats' | 'friends'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: '◉' },
  { id: 'stats', label: 'Stats', icon: '▦' },
  { id: 'friends', label: 'Freunde', icon: '☰' },
]

type BottomNavProps = {
  active: TabId
  onChange: (tab: TabId) => void
}

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Hauptnavigation">
      {TABS.map((tab) => (
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
