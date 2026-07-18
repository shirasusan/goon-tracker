import { createPortal } from 'react-dom'
import type { UnlockedAchievement } from '../lib/achievements'

type AchievementUnlockOverlayProps = {
  achievement: UnlockedAchievement
  onDone: () => void
}

const BURST = Array.from({ length: 18 }, (_, i) => i)

export function AchievementUnlockOverlay({
  achievement,
  onDone,
}: AchievementUnlockOverlayProps) {
  return createPortal(
    <div
      className="ach-fullscreen"
      style={{ ['--ach' as string]: achievement.color }}
      role="dialog"
      aria-modal="true"
      aria-label="Achievement freigeschaltet"
      onClick={onDone}
    >
      <div className="ach-fullscreen__veil" aria-hidden />
      <div className="ach-fullscreen__rays" aria-hidden />
      <div className="ach-fullscreen__burst" aria-hidden>
        {BURST.map((i) => (
          <span
            key={i}
            className="ach-fullscreen__spark"
            style={{ ['--i' as string]: String(i) }}
          />
        ))}
      </div>

      <div className="ach-fullscreen__content" onClick={(e) => e.stopPropagation()}>
        <p className="ach-fullscreen__eyebrow">Achievement unlocked</p>
        <div className="ach-fullscreen__badge ach-badge is-fresh" aria-hidden>
          <span className="ach-badge__ring" />
          <span className="ach-badge__core">
            <span className="ach-badge__hours">{achievement.short}</span>
            <span className="ach-badge__cat">{achievement.subtitle}</span>
          </span>
        </div>
        <h2 className="ach-fullscreen__title">{achievement.title}</h2>
        <p className="ach-fullscreen__cat">{achievement.subtitle}</p>
        <button type="button" className="btn btn--solid ach-fullscreen__ok" onClick={onDone}>
          Weiter
        </button>
      </div>
    </div>,
    document.body,
  )
}
