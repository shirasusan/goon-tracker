import { toDateKey } from './dates'
import { buildEntryFromParts, normalizeParts } from './entries'
import { CATEGORIES, type Category, type Entry, type FriendSnapshot, type TrackerData } from '../types'

const LEGACY_KEY = 'goon-tracker-v1'
const KEY_PREFIX = 'goon-tracker-v1:'

function newProfileId() {
  return crypto.randomUUID()
}

function userKey(userId: string) {
  return `${KEY_PREFIX}${userId}`
}

export function emptyData(): TrackerData {
  return {
    entries: [],
    startedOn: toDateKey(),
    focusXpTotal: 0,
    profile: { id: newProfileId(), name: '' },
    friends: [],
  }
}

function normalizeEntry(raw: Partial<Entry> & { id?: string }): Entry | null {
  if (!raw.id || !raw.date || !raw.createdAt) return null
  const g = typeof raw.goonometer === 'number' ? raw.goonometer : 5
  const comment =
    typeof raw.comment === 'string' && raw.comment.trim()
      ? raw.comment.trim().slice(0, 280)
      : undefined

  const rawParts = Array.isArray(raw.parts)
    ? normalizeParts(
        raw.parts
          .filter(
            (p): p is { category: Category; minutes: number } =>
              !!p &&
              typeof p === 'object' &&
              CATEGORIES.includes((p as { category?: Category }).category as Category),
          )
          .map((p) => ({
            category: p.category,
            minutes: Number(p.minutes) || 0,
          })),
      )
    : []

  if (rawParts.length > 0) {
    const built = buildEntryFromParts({
      id: raw.id,
      parts: rawParts,
      goonometer: g,
      date: raw.date,
      createdAt: raw.createdAt,
      comment,
      xp: typeof raw.xp === 'number' ? raw.xp : undefined,
    })
    return built
  }

  if (!raw.category || !CATEGORIES.includes(raw.category)) return null
  return {
    id: raw.id,
    category: raw.category,
    date: raw.date,
    createdAt: raw.createdAt,
    minutes: typeof raw.minutes === 'number' && raw.minutes >= 0 ? raw.minutes : 0,
    goonometer: Math.max(0, Math.min(10, Math.round(g) || 0)),
    ...(typeof raw.xp === 'number' && Number.isFinite(raw.xp)
      ? { xp: Math.max(0, Math.round(raw.xp)) }
      : {}),
    ...(comment ? { comment } : {}),
  }
}

function normalizeFriend(raw: Partial<FriendSnapshot>): FriendSnapshot | null {
  if (!raw.id || !raw.name) return null
  return {
    id: raw.id,
    name: String(raw.name),
    username: raw.username,
    level: Number(raw.level) || 1,
    xp: Number(raw.xp) || 0,
    goonStreak: Number(raw.goonStreak) || 0,
    dryStreak: Number(raw.dryStreak) || 0,
    totalMinutes: Number(raw.totalMinutes) || 0,
    categories: raw.categories ?? {
      porn: 0,
      hentai: 0,
      dojin: 0,
      illustration: 0,
      eroga: 0,
    },
    rankId: raw.rankId,
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  }
}

function parseStored(raw: string | null): TrackerData | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<TrackerData>
    if (!parsed.startedOn || !Array.isArray(parsed.entries)) return null
    return {
      startedOn: parsed.startedOn,
      entries: parsed.entries
        .map((e) => normalizeEntry(e))
        .filter((e): e is Entry => e !== null),
      focusXpTotal:
        typeof parsed.focusXpTotal === 'number' && Number.isFinite(parsed.focusXpTotal)
          ? Math.max(0, Math.round(parsed.focusXpTotal))
          : 0,
      lastFocusXpDate:
        typeof parsed.lastFocusXpDate === 'string' ? parsed.lastFocusXpDate : undefined,
      profile: {
        id: parsed.profile?.id || newProfileId(),
        name: parsed.profile?.name ?? '',
        username: parsed.profile?.username,
        cloudCode: parsed.profile?.cloudCode,
        cloudUserId: parsed.profile?.cloudUserId,
        avatarUrl: parsed.profile?.avatarUrl,
        monkMode: Boolean(parsed.profile?.monkMode),
        rankedAnonymous: Boolean(parsed.profile?.rankedAnonymous),
      },
      friends: Array.isArray(parsed.friends)
        ? parsed.friends
            .map((f) => normalizeFriend(f))
            .filter((f): f is FriendSnapshot => f !== null)
        : [],
    }
  } catch {
    return null
  }
}

/** Offline / no-cloud fallback — shared legacy key. Prefer loadDataForUser when authed. */
export function loadData(): TrackerData {
  return parseStored(localStorage.getItem(LEGACY_KEY)) ?? emptyData()
}

export function loadDataForUser(userId: string): TrackerData {
  return parseStored(localStorage.getItem(userKey(userId))) ?? emptyData()
}

export function saveData(data: TrackerData): void {
  const userId = data.profile.cloudUserId
  if (userId) {
    localStorage.setItem(userKey(userId), JSON.stringify(data))
    return
  }
  localStorage.setItem(LEGACY_KEY, JSON.stringify(data))
}

export function clearLocalTrackerData(): void {
  localStorage.removeItem(LEGACY_KEY)
  localStorage.removeItem('goon-tracker-achievements-seen')
  localStorage.removeItem('goon-tracker-achievement-flags')
  localStorage.removeItem('goon-tracker-season-ranks')
  const toRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith(KEY_PREFIX)) toRemove.push(k)
  }
  for (const k of toRemove) localStorage.removeItem(k)
}

export function clearLegacySharedCache(): void {
  localStorage.removeItem(LEGACY_KEY)
}
