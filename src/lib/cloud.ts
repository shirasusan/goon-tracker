import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import type { Category, Entry, FriendSnapshot, Recommendation } from '../types'
import { CATEGORIES } from '../types'
import { rankFromMinutes } from './ranks'
import { getSeasonInfo } from './season'
import { categoryTotals } from './snapshot'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const cloudEnabled = Boolean(url && key)

export const supabase: SupabaseClient | null = cloudEnabled
  ? createClient(url!, key!)
  : null

const EMAIL_DOMAIN = 'goontracker.local'

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${EMAIL_DOMAIN}`
}

export type CloudProfileRow = {
  id: string
  code: string
  name: string
  username: string | null
  avatar_url: string | null
  level: number
  xp: number
  goon_streak: number
  dry_streak: number
  total_minutes: number
  categories: Record<string, number>
  rank_id: string | null
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
    name: row.name || row.username || 'Anon',
    username: row.username ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    level: row.level,
    xp: row.xp,
    goonStreak: row.goon_streak,
    dryStreak: row.dry_streak,
    totalMinutes: row.total_minutes,
    categories,
    rankId: row.rank_id ?? rankFromMinutes(row.total_minutes).id,
    updatedAt: row.updated_at,
  }
}

export async function getSessionUser(): Promise<User | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user ?? null
}

export async function registerUser(
  username: string,
  password: string,
): Promise<{ userId: string } | { error: string }> {
  if (!supabase) return { error: 'Cloud nicht konfiguriert.' }
  const clean = username.trim().toLowerCase()
  if (!/^[a-z0-9_]{3,20}$/.test(clean)) {
    return { error: 'Username: 3–20 Zeichen, nur a-z, 0-9, _' }
  }
  if (password.length < 6) return { error: 'Passwort min. 6 Zeichen.' }

  const email = usernameToEmail(clean)
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username: clean } },
  })
  if (error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('rate limit') || msg.includes('email rate')) {
      return {
        error:
          'E-Mail-Limit von Supabase erreicht. In Supabase: Authentication → Providers → Email → „Confirm email“ AUS. Dann ~30–60 Min warten und nochmal versuchen.',
      }
    }
    return { error: error.message }
  }
  if (!data.user) return { error: 'Registrierung fehlgeschlagen.' }

  const profile = await ensureCloudProfile(data.user.id, clean, clean)
  if ('error' in profile) return { error: profile.error }
  return { userId: data.user.id }
}

export async function loginUser(
  username: string,
  password: string,
): Promise<{ userId: string } | { error: string }> {
  if (!supabase) return { error: 'Cloud nicht konfiguriert.' }
  const email = usernameToEmail(username)
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: error.message }
  if (!data.user) return { error: 'Login fehlgeschlagen.' }
  return { userId: data.user.id }
}

export async function logoutUser(): Promise<void> {
  if (!supabase) return
  await supabase.auth.signOut()
}

/** @deprecated prefer login/register — kept for migration */
export async function ensureCloudUser(): Promise<{ userId: string } | { error: string }> {
  const user = await getSessionUser()
  if (user) return { userId: user.id }
  return { error: 'Bitte einloggen.' }
}

export async function ensureCloudProfile(
  userId: string,
  displayName: string,
  username?: string,
): Promise<{ code: string; avatarUrl?: string | null } | { error: string }> {
  if (!supabase) return { error: 'Cloud nicht konfiguriert.' }

  const { data: existing, error: readError } = await supabase
    .from('profiles')
    .select('code, avatar_url')
    .eq('id', userId)
    .maybeSingle()

  if (readError) {
    return {
      error: readError.message.includes('relation')
        ? 'Tabelle fehlt. SQL aus supabase/schema.sql im SQL Editor ausführen.'
        : readError.message,
    }
  }

  if (existing?.code) {
    if (username) {
      await supabase
        .from('profiles')
        .update({ username, name: displayName.trim() || username })
        .eq('id', userId)
    }
    return { code: existing.code, avatarUrl: existing.avatar_url as string | null }
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeFriendCode()
    const { error } = await supabase.from('profiles').insert({
      id: userId,
      code,
      name: displayName.trim() || username || 'Anon',
      username: username ?? null,
      categories: emptyCategories(),
      rank_id: 'unranked',
    })
    if (!error) return { code, avatarUrl: null }
    if (error.code !== '23505') return { error: error.message }
  }

  return { error: 'Code konnte nicht erstellt werden.' }
}

export async function pushCloudProfile(input: {
  userId: string
  code: string
  name: string
  username?: string
  avatarUrl?: string
  snapshot: FriendSnapshot
}): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud nicht konfiguriert.' }
  const rank = rankFromMinutes(input.snapshot.totalMinutes)

  const { error } = await supabase.from('profiles').upsert({
    id: input.userId,
    code: input.code,
    name: input.name.trim() || 'Anon',
    username: input.username ?? null,
    avatar_url: input.avatarUrl ?? input.snapshot.avatarUrl ?? null,
    level: input.snapshot.level,
    xp: input.snapshot.xp,
    goon_streak: input.snapshot.goonStreak,
    dry_streak: input.snapshot.dryStreak,
    total_minutes: input.snapshot.totalMinutes,
    categories: input.snapshot.categories,
    rank_id: rank.id,
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

  const { error: e1 } = await supabase
    .from('friendships')
    .delete()
    .eq('user_id', userId)
    .eq('friend_id', friendId)
  if (e1) return { error: e1.message }

  await supabase
    .from('friendships')
    .delete()
    .eq('user_id', friendId)
    .eq('friend_id', userId)

  return {}
}

export function seasonMinutesFromEntries(entries: Entry[]): {
  totalMinutes: number
  categories: ReturnType<typeof categoryTotals>
  season: number
} {
  const info = getSeasonInfo()
  const inSeason = entries.filter(
    (e) => e.date >= info.startKey && e.date < info.endKeyExclusive,
  )
  return {
    season: info.season,
    totalMinutes: inSeason.reduce((s, e) => s + e.minutes, 0),
    categories: categoryTotals(inSeason),
  }
}

export async function pushSeasonStats(input: {
  userId: string
  entries: Entry[]
}): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud nicht konfiguriert.' }
  const { season, totalMinutes, categories } = seasonMinutesFromEntries(input.entries)
  const rank = rankFromMinutes(totalMinutes)
  const { error } = await supabase.from('season_stats').upsert(
    {
      user_id: input.userId,
      season,
      total_minutes: totalMinutes,
      categories,
      rank_id: rank.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,season' },
  )
  return error ? { error: error.message } : {}
}

export async function fetchSeasonLeaderboard(options?: {
  season?: number
  category?: Category
  limit?: number
}): Promise<{ rows: FriendSnapshot[]; season: number } | { error: string }> {
  if (!supabase) return { error: 'Cloud nicht konfiguriert.' }
  const season = options?.season ?? getSeasonInfo().season
  const limit = options?.limit ?? 50

  const { data, error } = await supabase
    .from('season_stats')
    .select('user_id, season, total_minutes, categories, rank_id, updated_at')
    .eq('season', season)
    .order('total_minutes', { ascending: false })
    .limit(200)

  if (error) return { error: error.message }

  let rows: FriendSnapshot[] = []

  if ((data ?? []).length > 0) {
    const ids = (data ?? []).map((r) => r.user_id as string)
    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('*')
      .in('id', ids)
    if (pErr) return { error: pErr.message }

    const profileById = new Map(
      (profiles as CloudProfileRow[]).map((p) => [p.id, p]),
    )

    rows = (data ?? []).map((r) => {
      const profile = profileById.get(r.user_id as string)
      const cats = {
        ...emptyCategories(),
        ...((r.categories as Record<string, number>) ?? {}),
      }
      const base = profile
        ? rowToSnapshot(profile)
        : ({
            id: r.user_id as string,
            name: 'Anon',
            level: 1,
            xp: 0,
            goonStreak: 0,
            dryStreak: 0,
            totalMinutes: 0,
            categories: emptyCategories(),
            updatedAt: r.updated_at as string,
          } satisfies FriendSnapshot)
      return {
        ...base,
        totalMinutes: Number(r.total_minutes) || 0,
        categories: cats as FriendSnapshot['categories'],
        rankId:
          (r.rank_id as string) ||
          rankFromMinutes(Number(r.total_minutes) || 0).id,
      }
    })
  } else {
    // Until clients sync season_stats, fall back to all profiles
    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('*')
      .order('total_minutes', { ascending: false })
      .limit(200)
    if (pErr) return { error: pErr.message }
    rows = (profiles as CloudProfileRow[]).map(rowToSnapshot)
  }

  if (options?.category) {
    const cat = options.category
    rows = rows
      .map((r) => ({ ...r, totalMinutes: r.categories[cat] || 0 }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes)
  }

  return { rows: rows.slice(0, limit), season }
}

export async function fetchProfileById(
  id: string,
): Promise<{ profile: FriendSnapshot & { code?: string } } | { error: string }> {
  if (!supabase) return { error: 'Cloud nicht konfiguriert.' }
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()
  if (error) return { error: error.message }
  if (!data) return { error: 'Profil nicht gefunden.' }
  const row = data as CloudProfileRow
  return { profile: { ...rowToSnapshot(row), code: row.code } }
}

export async function uploadAvatar(
  userId: string,
  file: File,
): Promise<{ url: string } | { error: string }> {
  if (!supabase) return { error: 'Cloud nicht konfiguriert.' }
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${userId}/avatar.${ext}`
  const { error } = await supabase.storage.from('avatars').upload(path, file, {
    upsert: true,
    contentType: file.type,
  })
  if (error) return { error: error.message }
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  const url = `${data.publicUrl}?t=${Date.now()}`
  await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId)
  return { url }
}

async function uploadRecFile(
  userId: string,
  file: File,
  kind: 'image' | 'file',
): Promise<{ url: string; name: string } | { error: string }> {
  if (!supabase) return { error: 'Cloud nicht konfiguriert.' }
  const safe = file.name.replace(/[^\w.\-]+/g, '_')
  const path = `${userId}/${kind}-${Date.now()}-${safe}`
  const { error } = await supabase.storage.from('rec-media').upload(path, file, {
    contentType: file.type,
  })
  if (error) return { error: error.message }
  const { data } = supabase.storage.from('rec-media').getPublicUrl(path)
  return { url: data.publicUrl, name: file.name }
}

export async function createRecommendation(input: {
  userId: string
  authorName: string
  name: string
  link: string
  imageFile?: File | null
  attachFile?: File | null
}): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud nicht konfiguriert.' }
  const name = input.name.trim()
  let link = input.link.trim()
  if (!name) return { error: 'Name nötig.' }
  if (!link && !input.imageFile && !input.attachFile) {
    return { error: 'Link, Foto oder Datei nötig.' }
  }

  if (link) {
    try {
      // eslint-disable-next-line no-new
      new URL(link.startsWith('http') ? link : `https://${link}`)
      link = link.startsWith('http') ? link : `https://${link}`
    } catch {
      return { error: 'Ungültiger Link.' }
    }
  }

  let imageUrl: string | undefined
  let fileUrl: string | undefined
  let fileName: string | undefined

  if (input.imageFile) {
    const up = await uploadRecFile(input.userId, input.imageFile, 'image')
    if ('error' in up) return { error: up.error }
    imageUrl = up.url
  }
  if (input.attachFile) {
    const up = await uploadRecFile(input.userId, input.attachFile, 'file')
    if ('error' in up) return { error: up.error }
    fileUrl = up.url
    fileName = up.name
  }

  const { error } = await supabase.from('recommendations').insert({
    user_id: input.userId,
    name,
    link: link || '',
    image_url: imageUrl ?? null,
    file_url: fileUrl ?? null,
    file_name: fileName ?? null,
  })
  return error ? { error: error.message } : {}
}

export async function loadRecommendations(
  userId: string,
): Promise<{ items: Recommendation[] } | { error: string }> {
  if (!supabase) return { error: 'Cloud nicht konfiguriert.' }

  const { data: links } = await supabase
    .from('friendships')
    .select('friend_id')
    .eq('user_id', userId)

  const friendIds = (links ?? []).map((l) => l.friend_id)
  const ids = [userId, ...friendIds]

  const { data, error } = await supabase
    .from('recommendations')
    .select('id, user_id, name, link, image_url, file_url, file_name, created_at')
    .in('user_id', ids)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return { error: error.message }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, username')
    .in('id', ids)

  const nameById = new Map(
    (profiles ?? []).map((p) => [p.id as string, (p.username || p.name || 'Anon') as string]),
  )

  return {
    items: (data ?? []).map((r) => ({
      id: r.id as string,
      userId: r.user_id as string,
      authorName: nameById.get(r.user_id as string) || 'Anon',
      name: r.name as string,
      link: (r.link as string) || '',
      imageUrl: (r.image_url as string) || undefined,
      fileUrl: (r.file_url as string) || undefined,
      fileName: (r.file_name as string) || undefined,
      createdAt: r.created_at as string,
    })),
  }
}

export async function deleteRecommendation(
  userId: string,
  id: string,
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud nicht konfiguriert.' }
  const { error } = await supabase
    .from('recommendations')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  return error ? { error: error.message } : {}
}
