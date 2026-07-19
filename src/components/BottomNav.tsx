import { useState } from 'react'
import { Avatar } from './Avatar'
import { AddFriendControl } from './AddFriendControl'
import { IconFriends, IconHome, IconRanked } from './NavIcons'
import { useLocale } from '../lib/LocaleContext'
import type { MsgId } from '../lib/i18n'

export type TabId = 'home' | 'friends' | 'ranked' | 'profile'

const TAB_MSG: Record<TabId, MsgId> = {
  home: 'nav_home',
  friends: 'nav_friends',
  ranked: 'nav_ranked',
  profile: 'nav_profile',
}

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
  const { t } = useLocale()
  const tabIds = (
    hideRanked
      ? (['home', 'friends', 'profile'] as TabId[])
      : (['home', 'friends', 'ranked', 'profile'] as TabId[])
  )
  const [bounceId, setBounceId] = useState<TabId | null>(null)

  function select(id: TabId) {
    setBounceId(id)
    onChange(id)
    window.setTimeout(() => setBounceId((cur) => (cur === id ? null : cur)), 280)
  }

  function renderIcon(tabId: TabId) {
    if (tabId === 'profile') {
      return (
        <span className="bottom-nav__avatar">
          <Avatar
            src={avatarUrl}
            name={displayName || t('nav_profile')}
            size="sm"
            goonStreak={goonStreak}
            dryStreak={dryStreak}
          />
        </span>
      )
    }

    const iconClass = 'bottom-nav__icon'
    switch (tabId) {
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
      aria-label={t('nav_menu')}
      style={{ ['--nav-cols' as string]: String(tabIds.length) }}
    >
      <p className="bottom-nav__overview">{t('nav_menu')}</p>
      {tabIds.map((tabId) => (
        <button
          key={tabId}
          type="button"
          data-tour={`nav-${tabId}`}
          className={`bottom-nav__btn${active === tabId ? ' is-active' : ''}${bounceId === tabId ? ' is-bounce' : ''}`}
          onClick={() => select(tabId)}
          aria-current={active === tabId ? 'page' : undefined}
        >
          {renderIcon(tabId)}
          <span className="bottom-nav__label">{t(TAB_MSG[tabId])}</span>
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
