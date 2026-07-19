import type { Post, Profile } from '../types'
import { PostCard } from './PostCard'

interface FeedProps {
  posts: Post[]
  profile: Profile
  onToggleLike: (id: string) => void
  onGoLog: () => void
}

export function Feed({ posts, profile, onToggleLike, onGoLog }: FeedProps) {
  const sorted = [...posts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  if (sorted.length === 0) {
    return (
      <section className="panel empty-feed">
        <p className="brand-mark">goon-tracker</p>
        <h1>Your feed is quiet</h1>
        <p className="lede">
          Log a session or check-in — it shows up here like a post. Everything
          stays on this device.
        </p>
        <button type="button" className="btn btn--primary" onClick={onGoLog}>
          Make your first post
        </button>
      </section>
    )
  }

  return (
    <section className="panel feed">
      <header className="panel__header">
        <p className="eyebrow">Feed</p>
        <h1>Timeline</h1>
      </header>
      <div className="feed__list">
        {sorted.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            profile={profile}
            onToggleLike={onToggleLike}
          />
        ))}
      </div>
    </section>
  )
}
