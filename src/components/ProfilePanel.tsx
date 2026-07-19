import { useState, type FormEvent } from 'react'
import type { Post, Profile } from '../types'
import { currentStreak } from '../lib/streaks'

interface ProfilePanelProps {
  profile: Profile
  posts: Post[]
  onSave: (profile: Profile) => void
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export function ProfilePanel({ profile, posts, onSave }: ProfilePanelProps) {
  const [name, setName] = useState(profile.displayName)
  const [bio, setBio] = useState(profile.bio)
  const sessions = posts.filter((p) => p.type === 'session').length
  const checkins = posts.filter((p) => p.type === 'checkin').length
  const streak = currentStreak(posts)

  function save(event: FormEvent) {
    event.preventDefault()
    onSave({
      displayName: name.trim() || 'You',
      bio: bio.trim(),
    })
  }

  return (
    <section className="panel profile-panel">
      <header className="profile-hero">
        <div className="avatar avatar--lg" aria-hidden="true">
          {initials(profile.displayName)}
        </div>
        <p className="brand-mark">goon-tracker</p>
        <h1>{profile.displayName}</h1>
        <p className="lede">{profile.bio}</p>
        <p className="privacy-note">Private · stored only in this browser</p>
      </header>

      <div className="stat-row">
        <div className="stat-block">
          <p className="stat-block__value">{sessions}</p>
          <p className="stat-block__label">Sessions</p>
        </div>
        <div className="stat-block">
          <p className="stat-block__value">{checkins}</p>
          <p className="stat-block__label">Check-ins</p>
        </div>
        <div className="stat-block">
          <p className="stat-block__value">{streak}</p>
          <p className="stat-block__label">Streak</p>
        </div>
      </div>

      <form className="composer__form" onSubmit={save}>
        <h2 className="form-title">Edit profile</h2>
        <label className="field">
          <span>Display name</span>
          <input
            type="text"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Bio</span>
          <textarea
            rows={3}
            value={bio}
            maxLength={160}
            onChange={(e) => setBio(e.target.value)}
          />
        </label>
        <button type="submit" className="btn btn--primary">
          Save profile
        </button>
      </form>
    </section>
  )
}
