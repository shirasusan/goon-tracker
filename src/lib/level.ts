/** 1 minute logged = 1 XP */
export function totalXp(entries: { minutes: number }[]): number {
  return entries.reduce((sum, e) => sum + Math.max(0, e.minutes || 0), 0)
}

export type LevelInfo = {
  level: number
  xp: number
  intoLevel: number
  toNext: number
  progress: number
}

/** Rising XP curve: L1→L2 needs 30, then ~+35% each level */
export function xpNeededForLevel(level: number): number {
  if (level <= 1) return 0
  let need = 30
  for (let l = 2; l < level; l++) {
    need = Math.floor(need * 1.35) + 15
  }
  return need
}

export function levelFromXp(xp: number): LevelInfo {
  let level = 1
  let remaining = Math.max(0, xp)
  let need = xpNeededForLevel(2)

  while (remaining >= need) {
    remaining -= need
    level += 1
    need = Math.floor(need * 1.35) + 15
  }

  return {
    level,
    xp,
    intoLevel: remaining,
    toNext: need,
    progress: need === 0 ? 1 : remaining / need,
  }
}
