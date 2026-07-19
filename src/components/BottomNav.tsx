import { useState } from 'react'
import { Avatar } from './Avatar'
import { AddFriendControl } from './AddFriendControl'
import { IconFriends, IconHome, IconRanked } from './NavIcons'

export type TabId = 'home' | 'friends' | 'ranked' | 'profile'

const ALL_TABS: { id: TabId; label: string }[] = [
  { id: 'home', label: 'Start' },
  { id: 'friends', label: 'Freunde' },
  { id: 'ranked', label: 'Rangliste' },
  { id: 'profile', label: 'Profil' },
]

type BottomNavProps = {
  active: TabId | null
  onChange: (tab: TabId) => void
  hideRanked?: boolean
  cloudCode?: string
  userId?: string
  avatarUrl?: string
  displayName?: string
  goonStreak?: number
  dryStreak?: number
}

export function BottomNav({
  active,
  onChange,
  hideRanked,
  cloudCode,
  userId,
  avatarUrl,
  displayName,
  goonStreak,
  dryStreak,
}: BottomNavProps) {
  const tabs = hideRanked ? ALL_TABS.filter((t) => t.id !== 'ranked') : ALL_TABS
  const [bounceId, setBounceId] = useState<TabId | null>(null)

  function select(id: TabId) {
    setBounceId(id)
    onChange(id)
    window.setTimeout(() => setBounceId((cur) => (cur === id ? null : cur)), 280)
  }

  function renderIcon(tab: { id: TabId; label: string }) {
    if (tab.id === 'profile') {
      return (
        <span className="bottom-nav__avatar">
          <Avatar
            src={avatarUrl}
            name={displayName || 'Profil'}
            size="sm"
            goonStreak={goonStreak}
            dryStreak={dryStreak}
          />
        </span>
      )
    }

    const iconClass = 'bottom-nav__icon'
    switch (tab.id) {
      case 'home':
        return (
          <span className={iconClass}>
            <IconHome />
          </span>
        )
      case 'friends':
        return (
          <span className={iconClass}>
            <IconFriends />
          </span>
        )
      case 'ranked':
        return (
          <span className={iconClass}>
            <IconRanked />
          </span>
        )
      default:
        return null
    }
  }

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
          data-tour={`nav-${tab.id}`}
          className={`bottom-nav__btn${active === tab.id ? ' is-active' : ''}${bounceId === tab.id ? ' is-bounce' : ''}`}
          onClick={() => select(tab.id)}
          aria-current={active === tab.id ? 'page' : undefined}
        >
          {renderIcon(tab)}
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
