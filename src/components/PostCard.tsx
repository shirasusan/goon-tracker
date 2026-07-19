import type { CheckInKind, Post, Profile } from '../types'

const CHECKIN_LABEL: Record<CheckInKind, string> = {
  on_track: 'On track',
  slipped: 'Slipped',
  urge: 'Urge noted',
}

function formatWhen(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

interface PostCardProps {
  post: Post
  profile: Profile
  onToggleLike: (id: string) => void
}

export function PostCard({ post, profile, onToggleLike }: PostCardProps) {
  const typeLabel =
    post.type === 'session'
      ? 'Session'
      : CHECKIN_LABEL[post.checkInKind ?? 'on_track']

  return (
    <article className="post-card">
      <header className="post-card__head">
        <div className="avatar" aria-hidden="true">
          {initials(profile.displayName)}
        </div>
        <div className="post-card__meta">
          <div className="post-card__name-row">
            <span className="post-card__name">{profile.displayName}</span>
            <span className="post-card__chip">{typeLabel}</span>
          </div>
          <time dateTime={post.createdAt}>{formatWhen(post.createdAt)}</time>
        </div>
      </header>

      <div className="post-card__body">
        {post.type === 'session' && post.durationMinutes != null && (
          <p className="post-card__stat">{post.durationMinutes} min</p>
        )}
        {post.note ? (
          <p className="post-card__note">{post.note}</p>
        ) : (
          <p className="post-card__note post-card__note--muted">No note</p>
        )}
      </div>

      <footer className="post-card__actions">
        <button
          type="button"
          className={post.liked ? 'like-btn like-btn--on' : 'like-btn'}
          aria-pressed={post.liked}
          onClick={() => onToggleLike(post.id)}
        >
          <svg
            className="like-btn__icon"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            aria-hidden="true"
          >
            <path
              d="M12 20s-7-4.35-7-9.2C5 7.4 7.2 5.5 9.4 5.5c1.3 0 2.4.6 3.1 1.6.7-1 1.8-1.6 3.1-1.6 2.2 0 4.4 1.9 4.4 5.3C20 15.65 12 20 12 20z"
              fill={post.liked ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="1.6"
            />
          </svg>
          {post.liked ? 'Liked' : 'Like'}
        </button>
      </footer>
    </article>
  )
}
