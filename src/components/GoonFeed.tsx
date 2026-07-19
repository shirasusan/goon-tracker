import { useState } from 'react'
import { formatDisplayDate } from '../lib/dates'
import { entryParts } from '../lib/entries'
import { formatMinutes } from '../lib/format'
import { useLocale } from '../lib/LocaleContext'
import { CATEGORY_META, type GoonPost } from '../types'
import { Avatar } from './Avatar'

type GoonFeedProps = {
  posts: GoonPost[]
  expanded: boolean
  busy?: boolean
  error?: string | null
  meId?: string
  onExpand: () => void
  onComment: (postId: string, body: string) => Promise<void>
  onSelectUser?: (userId: string) => void
}

export function GoonFeed({
  posts,
  expanded,
  busy,
  error,
  meId,
  onExpand,
  onComment,
  onSelectUser,
}: GoonFeedProps) {
  const { t } = useLocale()
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [sending, setSending] = useState<string | null>(null)

  function openUser(userId: string) {
    if (!onSelectUser || !userId || userId === meId) return
    onSelectUser(userId)
  }

  async function submit(postId: string) {
    const body = (drafts[postId] || '').trim()
    if (!body || sending) return
    setSending(postId)
    await onComment(postId, body)
    setDrafts((prev) => ({ ...prev, [postId]: '' }))
    setSending(null)
  }

  if (busy && posts.length === 0) {
    return <p className="empty">{t('feed_loading')}</p>
  }

  if (error && posts.length === 0) {
    return <p className="friends__error">{error}</p>
  }

  if (posts.length === 0) {
    return (
      <div className="goon-feed goon-feed--empty">
        <p className="empty">{t('feed_empty')}</p>
        <p className="goon-feed__hint">{t('feed_empty_hint')}</p>
      </div>
    )
  }

  return (
    <div className="goon-feed">
      {error && <p className="friends__error">{error}</p>}
      <ul className="goon-feed__list">
        {posts.map((post) => {
          const parts =
            post.parts && post.parts.length > 0
              ? post.parts
              : entryParts({
                  id: post.id,
                  category: post.category,
                  minutes: post.minutes,
                  goonometer: post.goonometer,
                  date: post.date,
                  createdAt: post.createdAt,
                })
          return (
            <li key={post.id} className="goon-card">
              <div className="goon-card__head">
                <Avatar
                  src={post.authorAvatarUrl}
                  name={post.authorName}
                  size="sm"
                  onClick={
                    onSelectUser && post.userId !== meId
                      ? () => openUser(post.userId)
                      : undefined
                  }
                />
                <div className="goon-card__meta">
                  {onSelectUser && post.userId !== meId ? (
                    <button
                      type="button"
                      className="goon-card__author"
                      onClick={() => openUser(post.userId)}
                    >
                      @{post.authorName}
                    </button>
                  ) : (
                    <strong>@{post.authorName}</strong>
                  )}
                  <span>
                    {formatDisplayDate(post.date)} · {formatMinutes(post.minutes)} · G
                    {post.goonometer}
                  </span>
                </div>
                <div className="goon-card__cats">
                  {parts.map((p) => {
                    const meta = CATEGORY_META[p.category]
                    return (
                      <span
                        key={p.category}
                        className="goon-card__cat"
                        style={{ color: meta.color, borderColor: meta.color }}
                        title={formatMinutes(p.minutes)}
                      >
                        {meta.label}
                        {parts.length > 1 ? ` ${p.minutes}m` : ''}
                      </span>
                    )
                  })}
                </div>
              </div>
              {post.comment ? (
                <p className="goon-card__comment">{post.comment}</p>
              ) : (
                <p className="goon-card__comment goon-card__comment--empty">
                  {t('no_comment')}
                </p>
              )}
              {post.comments.length > 0 && (
                <ul className="goon-card__replies">
                  {post.comments.map((c) => (
                    <li key={c.id}>
                      {onSelectUser && c.userId !== meId ? (
                        <button
                          type="button"
                          className="goon-card__author"
                          onClick={() => openUser(c.userId)}
                        >
                          @{c.authorName}
                        </button>
                      ) : (
                        <strong>@{c.authorName}</strong>
                      )}
                      <span>{c.body}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="goon-card__compose">
                <input
                  value={drafts[post.id] || ''}
                  maxLength={280}
                  placeholder={t('comment_ph')}
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
                  {t('send')}
                </button>
              </div>
            </li>
          )
        })}
      </ul>
      {!expanded && (
        <button type="button" className="btn" onClick={onExpand} disabled={busy}>
          {t('show_more')}
        </button>
      )}
    </div>
  )
}
