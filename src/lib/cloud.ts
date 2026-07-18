import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Category, FriendSnapshot } from '../types'
import { CATEGORIES } from '../types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const cloudEnabled = Boolean(url && key)

export const supabase: SupabaseClient | null = cloudEnabled
  ? createClient(url!, key!)
  : null

export type CloudProfileRow = {
  id: string
  code: string
  name: string
  level: number
  xp: number
  goon_streak: number
  dry_streak: number
  total_minutes: number
  categories: Record<string, number>
  updated_at: string
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function makeFriendCode(length = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('')
}

function emptyCategories(): Record<Category, number> {
  return Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>
}

export function rowToSnapshot(row: CloudProfileRow): FriendSnapshot {
  const categories = { ...emptyCategories(), ...(row.categories ?? {}) }
  return {
    id: row.id,
    name: row.name || 'Anon',
    level: row.level,
    xp: row.xp,
    goonStreak: row.goon_streak,
    dryStreak: row.dry_streak,
    totalMinutes: row.total_minutes,
    categories,
    updatedAt: row.updated_at,
  }
}

export async function ensureCloudUser(): Promise<{ userId: string } | { error: string }> {
  if (!supabase) return { error: 'Cloud nicht konfiguriert.' }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) return { error: sessionError.message }

  if (sessionData.session?.user) {
    return { userId: sessionData.session.user.id }
  }

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) {
    return {
      error:
        error.message.includes('Anonymous')
          ? 'Anonymous Login ist aus. In Supabase: Authentication → Providers → Anonymous → Enable.'
          : error.message,
    }
  }
  if (!data.user) return { error: 'Login fehlgeschlagen.' }
  return { userId: data.user.id }
}

export async function ensureCloudProfile(
  userId: string,
  displayName: string,
): Promise<{ code: string } | { error: string }> {
  if (!supabase) return { error: 'Cloud nicht konfiguriert.' }

  const { data: existing, error: readError } = await supabase
    .from('profiles')
    .select('code')
    .eq('id', userId)
    .maybeSingle()

  if (readError) {
    return {
      error: readError.message.includes('relation')
        ? 'Tabelle fehlt. SQL aus supabase/schema.sql im SQL Editor ausführen.'
        : readError.message,
    }
  }

  if (existing?.code) return { code: existing.code }

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeFriendCode()
    const { error } = await supabase.from('profiles').insert({
      id: userId,
      code,
      name: displayName.trim() || 'Anon',
      categories: emptyCategories(),
    })
    if (!error) return { code }
    if (error.code !== '23505') return { error: error.message }
  }

  return { error: 'Code konnte nicht erstellt werden.' }
}

export async function pushCloudProfile(input: {
  userId: string
  code: string
  name: string
  snapshot: FriendSnapshot
}): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud nicht konfiguriert.' }

  const { error } = await supabase.from('profiles').upsert({
    id: input.userId,
    code: input.code,
    name: input.name.trim() || 'Anon',
    level: input.snapshot.level,
    xp: input.snapshot.xp,
    goon_streak: input.snapshot.goonStreak,
    dry_streak: input.snapshot.dryStreak,
    total_minutes: input.snapshot.totalMinutes,
    categories: input.snapshot.categories,
    updated_at: new Date().toISOString(),
  })

  return error ? { error: error.message } : {}
}

export async function fetchProfileByCode(
  code: string,
): Promise<{ profile: FriendSnapshot & { code: string } } | { error: string }> {
  if (!supabase) return { error: 'Cloud nicht konfiguriert.' }

  const normalized = code.trim().toUpperCase()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('code', normalized)
    .maybeSingle()

  if (error) return { error: error.message }
  if (!data) return { error: 'Kein Profil mit diesem Code.' }

  const row = data as CloudProfileRow
  return { profile: { ...rowToSnapshot(row), code: row.code } }
}

export async function loadFriendProfiles(
  userId: string,
): Promise<{ friends: (FriendSnapshot & { code: string })[] } | { error: string }> {
  if (!supabase) return { error: 'Cloud nicht konfiguriert.' }

  const { data: links, error: linkError } = await supabase
    .from('friendships')
    .select('friend_id')
    .eq('user_id', userId)

  if (linkError) return { error: linkError.message }
  const ids = (links ?? []).map((l) => l.friend_id)
  if (ids.length === 0) return { friends: [] }

  const { data: rows, error } = await supabase.from('profiles').select('*').in('id', ids)
  if (error) return { error: error.message }

  return {
    friends: (rows as CloudProfileRow[]).map((row) => ({
      ...rowToSnapshot(row),
      code: row.code,
    })),
  }
}

export async function addFriendship(
  userId: string,
  friendId: string,
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud nicht konfiguriert.' }
  if (userId === friendId) return { error: 'Das bist du selbst.' }

  const { error } = await supabase.from('friendships').upsert({
    user_id: userId,
    friend_id: friendId,
  })
  return error ? { error: error.message } : {}
}

export async function removeFriendship(
  userId: string,
  friendId: string,
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud nicht konfiguriert.' }

  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('user_id', userId)
    .eq('friend_id', friendId)

  return error ? { error: error.message } : {}
}
