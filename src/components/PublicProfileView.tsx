import { formatMinutes } from '../lib/format'
import { rankFromMinutes } from '../lib/ranks'
import { CATEGORIES, CATEGORY_META, type FriendSnapshot } from '../types'
import { AchievementsSection } from './AchievementsSection'
import { Avatar } from './Avatar'
import { ProfileStreaks } from './ProfileStreaks'
import { RankBadge } from './RankBadge'

type PublicProfileViewProps = {
  profile: FriendSnapshot
  onBack: () => void
}

export function PublicProfileView({ profile, onBack }: PublicProfileViewProps) {
  const rank = rankFromMinutes(profile.totalMinutes)
  const maxCat = Math.max(1, ...CATEGORIES.map((c) => profile.categories[c] || 0))

  return (
    <div className="profile public-profile">
      <button type="button" className="btn" onClick={onBack}>
        ← Zurück
      </button>

      <section className="block">
        <div className="block__head">
          <h2>Profil</h2>
        </div>
        <div className="profile__hero">
          <Avatar
            src={profile.avatarUrl}
            name={profile.name}
            goonStreak={profile.goonStreak}
            dryStreak={profile.dryStreak}
            size="lg"
          />
          <div>
            <p className="profile__user">@{profile.username || profile.name}</p>
            <p className="profile__stat">{profile.name}</p>
          </div>
        </div>
      </section>

      <section className="block">
        <div className="block__head">
          <h2>Rank</h2>
        </div>
        <RankBadge totalMinutes={profile.totalMinutes} rank={rank} />
        <p className="profile__stat">
          Level {profile.level} · {formatMinutes(profile.totalMinutes)}
        </p>
      </section>

      <ProfileStreaks
        streak={
          profile.goonStreak > 0
            ? profile.goonStreak
            : profile.dryStreak > 0
              ? -profile.dryStreak
              : 0
        }
        compact
      />

      <AchievementsSection categories={profile.categories} />

      <section className="block">
        <div className="block__head">
          <h2>Stats</h2>
          <span>Kategorien</span>
        </div>
        <ul className="cat-stats">
          {CATEGORIES.map((cat) => {
            const meta = CATEGORY_META[cat]
            const mins = profile.categories[cat] || 0
            const pct = Math.round((mins / maxCat) * 100)
            return (
              <li key={cat}>
                <div className="cat-stats__label">
                  <span style={{ color: meta.color }}>{meta.label}</span>
                  <span>{formatMinutes(mins)}</span>
                </div>
                <div className="cat-stats__track">
                  <div
                    className="cat-stats__fill"
                    style={{ width: `${pct}%`, background: meta.color }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
