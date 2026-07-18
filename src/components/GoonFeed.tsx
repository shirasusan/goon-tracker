import { useState } from 'react'
import { formatDisplayDate } from '../lib/dates'
import { formatMinutes } from '../lib/format'
import { CATEGORY_META, type GoonPost } from '../types'
import { Avatar } from './Avatar'

type GoonFeedProps = {
  posts: GoonPost[]
  expanded: boolean
  busy?: boolean
  error?: string | null
  onExpand: () => void
  onComment: (postId: string, body: string) => Promise<void>
}

export function GoonFeed({
  posts,
  expanded,
  busy,
  error,
  onExpand,
  onComment,
}: GoonFeedProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [sending, setSending] = useState<string | null>(null)

  async function submit(postId: string) {
    const body = (drafts[postId] || '').trim()
    if (!body || sending) return
    setSending(postId)
    await onComment(postId, body)
    setDrafts((prev) => ({ ...prev, [postId]: '' }))
    setSending(null)
  }

  if (busy && posts.length === 0) {
    return <p className="empty">Feed lädt…</p>
  }

  if (error && posts.length === 0) {
    return <p className="friends__error">{error}</p>
  }

  if (posts.length === 0) {
    return <p className="empty">Noch keine Goons im Feed.</p>
  }

  return (
    <div className="goon-feed">
      <div className="block__head">
        <h3>Letzte Goons</h3>
        <span>{expanded ? 'Alle' : 'Top 5'}</span>
      </div>
      {error && <p className="friends__error">{error}</p>}
      <ul className="goon-feed__list">
        {posts.map((post) => {
          const meta = CATEGORY_META[post.category]
          return (
            <li key={post.id} className="goon-card">
              <div className="goon-card__head">
                <Avatar
                  src={post.authorAvatarUrl}
                  name={post.authorName}
                  size="sm"
                />
                <div className="goon-card__meta">
                  <strong>@{post.authorName}</strong>
                  <span>
                    {formatDisplayDate(post.date)} · {formatMinutes(post.minutes)} · G
                    {post.goonometer}
                  </span>
                </div>
                <span
                  className="goon-card__cat"
                  style={{ color: meta.color, borderColor: meta.color }}
                >
                  {meta.label}
                </span>
              </div>
              {post.comment ? (
                <p className="goon-card__comment">{post.comment}</p>
              ) : (
                <p className="goon-card__comment goon-card__comment--empty">
                  Kein Kommentar
                </p>
              )}
              {post.comments.length > 0 && (
                <ul className="goon-card__replies">
                  {post.comments.map((c) => (
                    <li key={c.id}>
                      <strong>@{c.authorName}</strong>
                      <span>{c.body}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="goon-card__compose">
                <input
                  value={drafts[post.id] || ''}
                  maxLength={280}
                  placeholder="Kommentieren…"
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void submit(post.id)
                  }}
                />
                <button
                  type="button"
                  className="btn btn--solid"
                  disabled={sending === post.id || !(drafts[post.id] || '').trim()}
                  onClick={() => void submit(post.id)}
                >
                  Senden
                </button>
              </div>
            </li>
          )
        })}
      </ul>
      {!expanded && (
        <button type="button" className="btn" onClick={onExpand} disabled={busy}>
          Mehr anzeigen
        </button>
      )}
    </div>
  )
}
