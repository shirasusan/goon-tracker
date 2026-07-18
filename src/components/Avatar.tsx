type AvatarProps = {
  src?: string | null
  name?: string
  goonStreak?: number
  dryStreak?: number
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
}

const DEFAULT_AVATAR =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" fill="none">
      <rect width="80" height="80" fill="#1a1f26"/>
      <circle cx="40" cy="32" r="14" fill="#5f6b78"/>
      <ellipse cx="40" cy="62" rx="22" ry="16" fill="#5f6b78"/>
    </svg>`,
  )

export function Avatar({
  src,
  name,
  goonStreak = 0,
  dryStreak = 0,
  size = 'md',
  onClick,
}: AvatarProps) {
  const glow =
    goonStreak > 0 ? 'goon' : dryStreak > 0 ? 'dry' : 'none'

  const Tag = onClick ? 'button' : 'div'

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={`avatar avatar--${size} avatar--glow-${glow}`}
      onClick={onClick}
      aria-label={name ? `Profil ${name}` : 'Avatar'}
    >
      <img src={src || DEFAULT_AVATAR} alt="" />
    </Tag>
  )
}
