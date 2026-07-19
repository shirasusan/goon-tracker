type IconProps = { className?: string }

export function IconHome({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="22" height="22" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" strokeLinejoin="round" />
    </svg>
  )
}

export function IconFriends({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="22" height="22" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="9" cy="8" r="3.25" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3.5 19c.6-3 2.8-4.75 5.5-4.75S14 16 14.5 19" strokeLinecap="round" />
      <path d="M14.5 14.5c1.7-.35 3.4.2 4.5 1.9.6.9.9 1.9 1 2.6" strokeLinecap="round" />
    </svg>
  )
}

export function IconRanked({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="22" height="22" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M7 20V11M12 20V4M17 20v-6" strokeLinecap="round" />
    </svg>
  )
}

export function IconSettings({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="22" height="22" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M4.9 7.5l1.9 1.1M17.2 15.4l1.9 1.1M4.9 16.5l1.9-1.1M17.2 8.6l1.9-1.1" strokeLinecap="round" />
    </svg>
  )
}
