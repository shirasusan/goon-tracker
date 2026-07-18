import { toDateKey } from './dates'
import type { Entry, FriendSnapshot, TrackerData } from '../types'

const KEY = 'goon-tracker-v1'

function newProfileId() {
  return crypto.randomUUID()
}

function emptyData(): TrackerData {
  return {
    entries: [],
    startedOn: toDateKey(),
    profile: { id: newProfileId(), name: '' },
    friends: [],
  }
}

function normalizeEntry(raw: Partial<Entry> & { id?: string }): Entry | null {
  if (!raw.id || !raw.category || !raw.date || !raw.createdAt) return null
  const g = typeof raw.goonometer === 'number' ? raw.goonometer : 5
  return {
    id: raw.id,
    category: raw.category,
    date: raw.date,
    createdAt: raw.createdAt,
    minutes: typeof raw.minutes === 'number' && raw.minutes >= 0 ? raw.minutes : 0,
    goonometer: Math.max(1, Math.min(10, Math.round(g) || 5)),
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

export function loadData(): TrackerData {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyData()
    const parsed = JSON.parse(raw) as Partial<TrackerData>
    if (!parsed.startedOn || !Array.isArray(parsed.entries)) return emptyData()
    return {
      startedOn: parsed.startedOn,
      entries: parsed.entries
        .map((e) => normalizeEntry(e))
        .filter((e): e is Entry => e !== null),
      profile: {
        id: parsed.profile?.id || newProfileId(),
        name: parsed.profile?.name ?? '',
        username: parsed.profile?.username,
        cloudCode: parsed.profile?.cloudCode,
        cloudUserId: parsed.profile?.cloudUserId,
        avatarUrl: parsed.profile?.avatarUrl,
      },
      friends: Array.isArray(parsed.friends)
        ? parsed.friends
            .map((f) => normalizeFriend(f))
            .filter((f): f is FriendSnapshot => f !== null)
        : [],
    }
  } catch {
    return emptyData()
  }
}

export function saveData(data: TrackerData): void {
  localStorage.setItem(KEY, JSON.stringify(data))
}
