import { DEFAULT_DATA, type AppData, type Post, type Profile } from '../types'

const STORAGE_KEY = 'goon-tracker:v1'

function isPost(value: unknown): value is Post {
  if (!value || typeof value !== 'object') return false
  const p = value as Record<string, unknown>
  return (
    typeof p.id === 'string' &&
    (p.type === 'session' || p.type === 'checkin') &&
    typeof p.createdAt === 'string' &&
    typeof p.liked === 'boolean'
  )
}

function isProfile(value: unknown): value is Profile {
  if (!value || typeof value !== 'object') return false
  const p = value as Record<string, unknown>
  return typeof p.displayName === 'string' && typeof p.bio === 'string'
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(DEFAULT_DATA)
    const parsed = JSON.parse(raw) as Partial<AppData>
    const profile = isProfile(parsed.profile)
      ? parsed.profile
      : DEFAULT_DATA.profile
    const posts = Array.isArray(parsed.posts)
      ? parsed.posts.filter(isPost)
      : []
    return { profile, posts }
  } catch {
    return structuredClone(DEFAULT_DATA)
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}
