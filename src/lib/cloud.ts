import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import type {
  Category,
  Entry,
  FriendSnapshot,
  GoonComment,
  GoonPost,
  RecReaction,
  Recommendation,
} from '../types'
import { CATEGORIES } from '../types'
import { buildEntryFromParts, normalizeParts } from './entries'
import { levelFromXp } from './level'
import { rankFromMinutes } from './ranks'
import { getSeasonInfo } from './season'
import { categoryTotals } from './snapshot'
import {
  entriesMissingFromCloud,
  mergeEntries,
  mergeStartedOn,
} from './entrySync'

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
  ranked_anonymous?: boolean | null
  started_on?: string | null
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
    rankedAnonymous: Boolean(row.ranked_anonymous),
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

/** Deletes the signed-in auth user (cascades profiles, feed, friends, …). */
export async function deleteOwnAccount(): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud nicht konfiguriert.' }
  const { error } = await supabase.rpc('delete_own_account')
  if (error) {
    return {
      error: error.message.includes('function') || error.message.includes('schema cache')
        ? 'Funktion fehlt. SQL aus supabase/delete_account.sql im SQL Editor ausführen.'
        : error.message,
    }
  }
  await supabase.auth.signOut()
  return {}
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
  startedOn?: string,
): Promise<
  | {
      code: string
      name?: string
      username?: string
      avatarUrl?: string | null
      rankedAnonymous?: boolean
      startedOn?: string | null
      focusXpTotal?: number
      lastFocusXpDate?: string
    }
  | { error: string }
> {
  if (!supabase) return { error: 'Cloud nicht konfiguriert.' }

  const { data: existing, error: readError } = await supabase
    .from('profiles')
    .select(
      'code, name, username, avatar_url, ranked_anonymous, started_on, focus_xp_total, last_focus_xp_date',
    )
    .eq('id', userId)
    .maybeSingle()

  if (readError) {
    if (
      readError.message.includes('focus_xp') ||
      readError.message.includes('last_focus')
    ) {
      const fallback = await supabase
        .from('profiles')
        .select('code, name, username, avatar_url, ranked_anonymous, started_on')
        .eq('id', userId)
        .maybeSingle()
      if (fallback.error) {
        return {
          error: fallback.error.message.includes('relation')
            ? 'Tabelle fehlt. SQL aus supabase/schema.sql im SQL Editor ausführen.'
            : fallback.error.message,
        }
      }
      if (fallback.data?.code) {
        if (username && !fallback.data.username) {
          await supabase.from('profiles').update({ username }).eq('id', userId)
        }
        return {
          code: fallback.data.code as string,
          name: (fallback.data.name as string) || undefined,
          username: (fallback.data.username as string) || undefined,
          avatarUrl: (fallback.data.avatar_url as string | null) ?? null,
          rankedAnonymous: Boolean(fallback.data.ranked_anonymous),
          startedOn: (fallback.data.started_on as string | null) ?? null,
        }
      }
    } else {
      return {
        error: readError.message.includes('relation')
          ? 'Tabelle fehlt. SQL aus supabase/schema.sql im SQL Editor ausführen.'
          : readError.message,
      }
    }
  }

  if (existing?.code) {
    // Keep cloud display name; only fill username if missing
    if (username && !existing.username) {
      await supabase.from('profiles').update({ username }).eq('id', userId)
    }
    return {
      code: existing.code as string,
      name: (existing.name as string) || undefined,
      username: (existing.username as string) || undefined,
      avatarUrl: (existing.avatar_url as string | null) ?? null,
      rankedAnonymous: Boolean(existing.ranked_anonymous),
      startedOn: (existing.started_on as string | null) ?? null,
      focusXpTotal:
        typeof existing.focus_xp_total === 'number'
          ? Math.max(0, Math.round(existing.focus_xp_total))
          : 0,
      lastFocusXpDate:
        typeof existing.last_focus_xp_date === 'string'
          ? existing.last_focus_xp_date
          : undefined,
    }
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
      started_on: startedOn ?? null,
    })
    if (!error) {
      return {
        code,
        name: displayName.trim() || username || 'Anon',
        username: username ?? undefined,
        avatarUrl: null,
        rankedAnonymous: false,
        startedOn: startedOn ?? null,
      }
    }
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
  rankedAnonymous?: boolean
  startedOn?: string
  snapshot: FriendSnapshot
  focusXpTotal?: number
  lastFocusXpDate?: string
}): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud nicht konfiguriert.' }
  const rank = rankFromMinutes(input.snapshot.totalMinutes)

  const { data: existing } = await supabase
    .from('profiles')
    .select('xp')
    .eq('id', input.userId)
    .maybeSingle()
  const cloudXp = typeof existing?.xp === 'number' ? existing.xp : 0
  const xp = Math.max(cloudXp, input.snapshot.xp)
  const { level } = levelFromXp(xp)

  const base = {
    id: input.userId,
    code: input.code,
    name: input.name.trim() || 'Anon',
    username: input.username ?? null,
    avatar_url: input.avatarUrl ?? input.snapshot.avatarUrl ?? null,
    level,
    xp,
    goon_streak: input.snapshot.goonStreak,
    dry_streak: input.snapshot.dryStreak,
    total_minutes: input.snapshot.totalMinutes,
    categories: input.snapshot.categories,
    rank_id: rank.id,
    ranked_anonymous: Boolean(input.rankedAnonymous),
    started_on: input.startedOn ?? null,
    updated_at: new Date().toISOString(),
  }

  const withFocus = {
    ...base,
    focus_xp_total: Math.max(0, Math.round(input.focusXpTotal ?? 0)),
    last_focus_xp_date: input.lastFocusXpDate ?? null,
  }

  const first = await supabase.from('profiles').upsert(withFocus)
  if (!first.error) return {}
  if (
    first.error.message.includes('focus_xp') ||
    first.error.message.includes('last_focus')
  ) {
    const retry = await supabase.from('profiles').upsert(base)
    return retry.error ? { error: retry.error.message } : {}
  }
  return { error: first.error.message }
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

export type FriendRequestRow = {
  id: string
  fromUserId: string
  toUserId: string
  status: 'pending' | 'accepted' | 'declined'
  createdAt: string
  fromProfile?: FriendSnapshot
  toProfile?: FriendSnapshot
}

async function areFriends(userId: string, otherId: string): Promise<boolean> {
  if (!supabase) return false
  const { data } = await supabase
    .from('friendships')
    .select('friend_id')
    .eq('user_id', userId)
    .eq('friend_id', otherId)
    .maybeSingle()
  return Boolean(data)
}

export async function sendFriendRequest(
  fromUserId: string,
  toUserId: string,
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud nicht konfiguriert.' }
  if (fromUserId === toUserId) return { error: 'Das bist du selbst.' }

  if (await areFriends(fromUserId, toUserId)) {
    return { error: 'Ihr seid schon Freunde.' }
  }

  const { data: existing } = await supabase
    .from('friend_requests')
    .select('id, status, from_user, to_user')
    .or(
      `and(from_user.eq.${fromUserId},to_user.eq.${toUserId}),and(from_user.eq.${toUserId},to_user.eq.${fromUserId})`,
    )
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) {
    if (existing.from_user === toUserId) {
      return acceptFriendRequest(existing.id as string, fromUserId)
    }
    return { error: 'Anfrage läuft bereits.' }
  }

  const { error } = await supabase.from('friend_requests').upsert(
    {
      from_user: fromUserId,
      to_user: toUserId,
      status: 'pending',
    },
    { onConflict: 'from_user,to_user' },
  )
  if (error) {
    if (error.code === '23505') return { error: 'Anfrage läuft bereits.' }
    return { error: error.message }
  }
  return {}
}

export async function listIncomingFriendRequests(
  userId: string,
): Promise<{ requests: FriendRequestRow[] } | { error: string }> {
  if (!supabase) return { error: 'Cloud nicht konfiguriert.' }

  const { data, error } = await supabase
    .from('friend_requests')
    .select('id, from_user, to_user, status, created_at')
    .eq('to_user', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }
  const rows = data ?? []
  if (rows.length === 0) return { requests: [] }

  const ids = rows.map((r) => r.from_user as string)
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('*')
    .in('id', ids)
  if (pErr) return { error: pErr.message }
  const byId = new Map((profiles as CloudProfileRow[]).map((p) => [p.id, p]))

  return {
    requests: rows.map((r) => {
      const from = byId.get(r.from_user as string)
      return {
        id: r.id as string,
        fromUserId: r.from_user as string,
        toUserId: r.to_user as string,
        status: r.status as FriendRequestRow['status'],
        createdAt: r.created_at as string,
        fromProfile: from ? rowToSnapshot(from) : undefined,
      }
    }),
  }
}

export async function getFriendRelation(
  meId: string,
  otherId: string,
): Promise<'self' | 'friends' | 'outgoing' | 'incoming' | 'none' | { error: string }> {
  if (!supabase) return { error: 'Cloud nicht konfiguriert.' }
  if (meId === otherId) return 'self'
  if (await areFriends(meId, otherId)) return 'friends'

  const { data, error } = await supabase
    .from('friend_requests')
    .select('from_user, to_user, status')
    .or(
      `and(from_user.eq.${meId},to_user.eq.${otherId}),and(from_user.eq.${otherId},to_user.eq.${meId})`,
    )
    .eq('status', 'pending')
    .maybeSingle()

  if (error) return { error: error.message }
  if (!data) return 'none'
  if (data.from_user === meId) return 'outgoing'
  return 'incoming'
}

export async function acceptFriendRequest(
  requestId: string,
  userId: string,
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud nicht konfiguriert.' }

  const { data, error } = await supabase
    .from('friend_requests')
    .select('id, from_user, to_user, status')
    .eq('id', requestId)
    .maybeSingle()

  if (error) return { error: error.message }
  if (!data) return { error: 'Anfrage nicht gefunden.' }
  if (data.to_user !== userId) return { error: 'Nur der Empfänger kann akzeptieren.' }
  if (data.status !== 'pending') return { error: 'Anfrage ist nicht mehr offen.' }

  const from = data.from_user as string

  // Only own side — reciprocal trigger creates the other row (RLS blocks inserting as the other user)
  const { error: e1 } = await supabase.from('friendships').upsert({
    user_id: userId,
    friend_id: from,
  })
  if (e1) return { error: e1.message }

  const { error: e2 } = await supabase
    .from('friend_requests')
    .update({ status: 'accepted' })
    .eq('id', requestId)
  if (e2) return { error: e2.message }

  return {}
}

export async function declineFriendRequest(
  requestId: string,
  userId: string,
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud nicht konfiguriert.' }

  const { data, error } = await supabase
    .from('friend_requests')
    .select('id, to_user, status')
    .eq('id', requestId)
    .maybeSingle()

  if (error) return { error: error.message }
  if (!data) return { error: 'Anfrage nicht gefunden.' }
  if (data.to_user !== userId) return { error: 'Nur der Empfänger kann ablehnen.' }

  const { error: e2 } = await supabase
    .from('friend_requests')
    .update({ status: 'declined' })
    .eq('id', requestId)
  return e2 ? { error: e2.message } : {}
}

export async function fetchMySeasonHistory(
  userId: string,
): Promise<{ seasons: { season: number; rankId: string; totalMinutes: number }[] } | { error: string }> {
  if (!supabase) return { error: 'Cloud nicht konfiguriert.' }
  const { data, error } = await supabase
    .from('season_stats')
    .select('season, rank_id, total_minutes')
    .eq('user_id', userId)
    .order('season', { ascending: true })

  if (error) return { error: error.message }
  return {
    seasons: (data ?? []).map((r) => ({
      season: Number(r.season),
      rankId: (r.rank_id as string) || 'unranked',
      totalMinutes: Number(r.total_minutes) || 0,
    })),
  }
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

export async function fetchAllTimeLeaderboard(options?: {
  category?: Category
  limit?: number
}): Promise<{ rows: FriendSnapshot[] } | { error: string }> {
  if (!supabase) return { error: 'Cloud nicht konfiguriert.' }
  const limit = options?.limit ?? 50

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('total_minutes', { ascending: false })
    .limit(200)

  if (error) return { error: error.message }

  let rows = (data as CloudProfileRow[]).map(rowToSnapshot)
  if (options?.category) {
    const cat = options.category
    rows = rows
      .map((r) => ({ ...r, totalMinutes: r.categories[cat] || 0 }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes)
  }
  return { rows: rows.slice(0, limit) }
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
  category: Category
  imageFile?: File | null
  attachFile?: File | null
}): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud nicht konfiguriert.' }
  const name = input.name.trim()
  let link = input.link.trim()
  if (!name) return { error: 'Name nötig.' }
  if (!CATEGORIES.includes(input.category)) {
    return { error: 'Kategorie wählen.' }
  }
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
    category: input.category,
    image_url: imageUrl ?? null,
    file_url: fileUrl ?? null,
    file_name: fileName ?? null,
  })
  if (error) {
    return {
      error: error.message.includes('category')
        ? 'Tabelle fehlt Spalte. SQL aus supabase/rec_category.sql ausführen.'
        : error.message,
    }
  }
  return {}
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
    .select('id, user_id, name, link, category, image_url, file_url, file_name, created_at')
    .in('user_id', ids)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return {
      error: error.message.includes('category')
        ? 'Tabelle fehlt Spalte. SQL aus supabase/rec_category.sql ausführen.'
        : error.message,
    }
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, username')
    .in('id', ids)

  const nameById = new Map(
    (profiles ?? []).map((p) => [p.id as string, (p.username || p.name || 'Anon') as string]),
  )

  const recIds = (data ?? []).map((r) => r.id as string)
  const counts = new Map<string, Record<RecReaction, number>>()
  const mine = new Map<string, RecReaction>()
  for (const id of recIds) {
    counts.set(id, { up: 0, mid: 0, down: 0 })
  }

  if (recIds.length > 0) {
    const { data: reactionRows } = await supabase
      .from('recommendation_reactions')
      .select('recommendation_id, user_id, reaction')
      .in('recommendation_id', recIds)

    for (const row of reactionRows ?? []) {
      const recId = row.recommendation_id as string
      const reaction = row.reaction as RecReaction
      if (reaction !== 'up' && reaction !== 'mid' && reaction !== 'down') continue
      const bucket = counts.get(recId) ?? { up: 0, mid: 0, down: 0 }
      bucket[reaction] += 1
      counts.set(recId, bucket)
      if ((row.user_id as string) === userId) mine.set(recId, reaction)
    }
  }

  return {
    items: (data ?? []).map((r) => {
      const cat = r.category as string | null
      const id = r.id as string
      return {
        id,
        userId: r.user_id as string,
        authorName: nameById.get(r.user_id as string) || 'Anon',
        name: r.name as string,
        link: (r.link as string) || '',
        category:
          cat && CATEGORIES.includes(cat as Category) ? (cat as Category) : undefined,
        imageUrl: (r.image_url as string) || undefined,
        fileUrl: (r.file_url as string) || undefined,
        fileName: (r.file_name as string) || undefined,
        createdAt: r.created_at as string,
        reactions: counts.get(id) ?? { up: 0, mid: 0, down: 0 },
        myReaction: mine.get(id) ?? null,
      }
    }),
  }
}

export async function setRecommendationReaction(input: {
  userId: string
  recommendationId: string
  reaction: RecReaction | null
}): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud nicht konfiguriert.' }

  if (input.reaction === null) {
    const { error } = await supabase
      .from('recommendation_reactions')
      .delete()
      .eq('recommendation_id', input.recommendationId)
      .eq('user_id', input.userId)
    return error ? { error: error.message } : {}
  }

  const { error } = await supabase.from('recommendation_reactions').upsert(
    {
      recommendation_id: input.recommendationId,
      user_id: input.userId,
      reaction: input.reaction,
    },
    { onConflict: 'recommendation_id,user_id' },
  )
  return error ? { error: error.message } : {}
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

export async function pushGoonPost(input: {
  userId: string
  entry: Entry
}): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud nicht konfiguriert.' }
  const payload: Record<string, unknown> = {
    id: input.entry.id,
    user_id: input.userId,
    category: input.entry.category,
    minutes: input.entry.minutes,
    goonometer: input.entry.goonometer,
    comment: (input.entry.comment || '').slice(0, 280),
    date: input.entry.date,
    created_at: input.entry.createdAt,
  }
  if (input.entry.parts && input.entry.parts.length > 0) {
    payload.parts = input.entry.parts
  }
  const { error } = await supabase.from('goon_posts').upsert(payload, {
    onConflict: 'id',
  })
  if (error) {
    return {
      error: error.message.includes('relation')
        ? 'Tabelle fehlt. SQL aus supabase/goon_feed.sql im SQL Editor ausführen.'
        : error.message.includes('parts')
          ? 'Spalte fehlt. SQL aus supabase/entry_parts.sql im SQL Editor ausführen.'
          : error.message,
    }
  }
  return {}
}

type TrackerEntryRow = {
  id: string
  user_id: string
  category: string
  minutes: number
  goonometer: number
  comment: string | null
  date: string
  created_at: string
  parts?: unknown
  xp?: number | null
}

function parsePartsColumn(raw: unknown) {
  if (!Array.isArray(raw)) return undefined
  const parts = normalizeParts(
    raw
      .filter(
        (p): p is { category: Category; minutes: number } =>
          !!p &&
          typeof p === 'object' &&
          CATEGORIES.includes((p as { category?: Category }).category as Category),
      )
      .map((p) => ({
        category: (p as { category: Category }).category,
        minutes: Number((p as { minutes: number }).minutes) || 0,
      })),
  )
  return parts.length > 0 ? parts : undefined
}

function trackerRowToEntry(row: TrackerEntryRow): Entry | null {
  const comment =
    typeof row.comment === 'string' && row.comment.trim()
      ? row.comment.trim().slice(0, 280)
      : undefined
  const xp =
    typeof row.xp === 'number' && Number.isFinite(row.xp)
      ? Math.max(0, Math.round(row.xp))
      : undefined
  const parts = parsePartsColumn(row.parts)
  if (parts && parts.length > 0) {
    return buildEntryFromParts({
      id: row.id,
      parts,
      goonometer: Math.max(0, Math.min(10, Math.round(Number(row.goonometer) || 0))),
      date: row.date,
      createdAt: row.created_at,
      comment,
      xp,
    })
  }
  if (!CATEGORIES.includes(row.category as Category)) return null
  return {
    id: row.id,
    category: row.category as Category,
    minutes: Number(row.minutes) || 0,
    goonometer: Math.max(0, Math.min(10, Math.round(Number(row.goonometer) || 0))),
    date: row.date,
    createdAt: row.created_at,
    ...(xp != null ? { xp } : {}),
    ...(comment ? { comment } : {}),
  }
}

function entryToTrackerRow(userId: string, entry: Entry) {
  return {
    id: entry.id,
    user_id: userId,
    category: entry.category,
    minutes: entry.minutes,
    goonometer: entry.goonometer,
    comment: (entry.comment || '').slice(0, 280),
    date: entry.date,
    created_at: entry.createdAt,
    parts: entry.parts && entry.parts.length > 0 ? entry.parts : null,
    xp: typeof entry.xp === 'number' ? entry.xp : null,
  }
}

function entriesTableMissing(message: string): string {
  return message.includes('relation') || message.includes('tracker_entries')
    ? 'Tabelle fehlt. SQL aus supabase/entries_sync.sql im SQL Editor ausführen.'
    : message
}

export async function pullTrackerEntries(
  userId: string,
): Promise<{ entries: Entry[] } | { error: string }> {
  if (!supabase) return { error: 'Cloud nicht konfiguriert.' }

  const selects = [
    'id, user_id, category, minutes, goonometer, comment, date, created_at, parts, xp',
    'id, user_id, category, minutes, goonometer, comment, date, created_at, parts',
    'id, user_id, category, minutes, goonometer, comment, date, created_at',
  ]

  let data: TrackerEntryRow[] | null = null
  let error: { message: string } | null = null

  for (const cols of selects) {
    const res = await supabase
      .from('tracker_entries')
      .select(cols)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    data = (res.data as TrackerEntryRow[] | null) ?? null
    error = res.error
    if (!error) break
    if (
      !error.message.includes('parts') &&
      !error.message.includes('xp') &&
      !error.message.includes('column')
    ) {
      break
    }
  }

  if (error) return { error: entriesTableMissing(error.message) }

  const entries = (data ?? [])
    .map(trackerRowToEntry)
    .filter((e): e is Entry => e !== null)
  return { entries }
}

export async function pushTrackerEntries(
  userId: string,
  entries: Entry[],
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud nicht konfiguriert.' }
  if (entries.length === 0) return {}

  const rows = entries.map((e) => entryToTrackerRow(userId, e))
  const chunkSize = 200
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    let { error } = await supabase
      .from('tracker_entries')
      .upsert(chunk, { onConflict: 'id' })
    if (error && (error.message.includes('xp') || error.message.includes('column'))) {
      const withoutXp = chunk.map(({ xp: _xp, ...rest }) => rest)
      const retry = await supabase
        .from('tracker_entries')
        .upsert(withoutXp, { onConflict: 'id' })
      error = retry.error
    }
    if (error) {
      if (error.message.includes('parts')) {
        return {
          error:
            'Spalte fehlt. SQL aus supabase/entry_parts.sql im SQL Editor ausführen.',
        }
      }
      return { error: entriesTableMissing(error.message) }
    }
  }
  return {}
}

export async function deleteTrackerEntry(
  userId: string,
  entryId: string,
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud nicht konfiguriert.' }
  const { error } = await supabase
    .from('tracker_entries')
    .delete()
    .eq('id', entryId)
    .eq('user_id', userId)
  return error ? { error: entriesTableMissing(error.message) } : {}
}

async function pullOwnGoonPostsAsEntries(
  userId: string,
): Promise<{ entries: Entry[] } | { error: string }> {
  if (!supabase) return { error: 'Cloud nicht konfiguriert.' }

  const withParts =
    'id, user_id, category, minutes, goonometer, comment, date, created_at, parts'
  const withoutParts =
    'id, user_id, category, minutes, goonometer, comment, date, created_at'

  let data: TrackerEntryRow[] | null = null
  let error: { message: string } | null = null

  {
    const res = await supabase
      .from('goon_posts')
      .select(withParts)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    data = (res.data as TrackerEntryRow[] | null) ?? null
    error = res.error
  }

  if (error && error.message.includes('parts')) {
    const fallback = await supabase
      .from('goon_posts')
      .select(withoutParts)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    data = (fallback.data as TrackerEntryRow[] | null) ?? null
    error = fallback.error
  }

  if (error) {
    return {
      error: error.message.includes('relation')
        ? 'Tabelle fehlt. SQL aus supabase/goon_feed.sql im SQL Editor ausführen.'
        : error.message,
    }
  }

  const entries = (data ?? [])
    .map(trackerRowToEntry)
    .filter((e): e is Entry => e !== null)
  return { entries }
}

/**
 * Pull cloud entries only (no local merge). Backfills from goon_posts if needed.
 */
export async function pullCloudEntriesOnly(
  userId: string,
  cloudStartedOn?: string | null,
): Promise<{ entries: Entry[]; startedOn: string } | { error: string }> {
  const pulled = await pullTrackerEntries(userId)
  if ('error' in pulled) return pulled

  let cloudEntries = pulled.entries

  if (cloudEntries.length === 0) {
    const fromPosts = await pullOwnGoonPostsAsEntries(userId)
    if ('error' in fromPosts) {
      if (!fromPosts.error.includes('Tabelle fehlt')) return fromPosts
    } else if (fromPosts.entries.length > 0) {
      const backfill = await pushTrackerEntries(userId, fromPosts.entries)
      if (backfill.error) return { error: backfill.error }
      cloudEntries = fromPosts.entries
    }
  }

  const startedOn =
    cloudStartedOn && /^\d{4}-\d{2}-\d{2}$/.test(cloudStartedOn)
      ? cloudStartedOn
      : cloudEntries.length > 0
        ? cloudEntries
            .map((e) => e.date)
            .sort()[0]
        : toDateKeyFallback()

  return { entries: cloudEntries, startedOn }
}

function toDateKeyFallback(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Load full account state from cloud — source of truth for multi-account.
 */
export async function hydrateAccountFromCloud(input: {
  userId: string
  username?: string
}): Promise<
  | {
      entries: Entry[]
      startedOn: string
      friends: FriendSnapshot[]
      focusXpTotal?: number
      lastFocusXpDate?: string
      profile: {
        cloudUserId: string
        cloudCode: string
        name: string
        username?: string
        avatarUrl?: string
        rankedAnonymous?: boolean
      }
    }
  | { error: string }
> {
  const username = input.username?.trim().toLowerCase()
  const profile = await ensureCloudProfile(
    input.userId,
    username || 'User',
    username,
  )
  if ('error' in profile) return profile

  const entriesResult = await pullCloudEntriesOnly(
    input.userId,
    profile.startedOn,
  )
  if ('error' in entriesResult) return entriesResult

  const friendsResult = await loadFriendProfiles(input.userId)
  const friends =
    'error' in friendsResult
      ? []
      : friendsResult.friends.map(({ code: _c, ...f }) => f)

  return {
    entries: entriesResult.entries,
    startedOn: entriesResult.startedOn,
    friends,
    focusXpTotal: profile.focusXpTotal ?? 0,
    lastFocusXpDate: profile.lastFocusXpDate,
    profile: {
      cloudUserId: input.userId,
      cloudCode: profile.code,
      name: profile.name || username || '',
      username: profile.username || username,
      avatarUrl: profile.avatarUrl || undefined,
      rankedAnonymous: profile.rankedAnonymous,
    },
  }
}

/**
 * Pull cloud entries, backfill from goon_posts if needed, merge with local,
 * push local-only rows, sync started_on. Does not push profile aggregates.
 * @deprecated Prefer hydrateAccountFromCloud / pullCloudEntriesOnly for multi-account.
 */
export async function syncEntriesWithCloud(input: {
  userId: string
  localEntries: Entry[]
  localStartedOn: string
  cloudStartedOn?: string | null
}): Promise<{ entries: Entry[]; startedOn: string } | { error: string }> {
  const pulled = await pullTrackerEntries(input.userId)
  if ('error' in pulled) return pulled

  let cloudEntries = pulled.entries

  if (cloudEntries.length === 0) {
    const fromPosts = await pullOwnGoonPostsAsEntries(input.userId)
    if ('error' in fromPosts) {
      // Feed table optional for sync — ignore if missing
      if (!fromPosts.error.includes('Tabelle fehlt')) return fromPosts
    } else if (fromPosts.entries.length > 0) {
      const backfill = await pushTrackerEntries(input.userId, fromPosts.entries)
      if (backfill.error) return { error: backfill.error }
      cloudEntries = fromPosts.entries
    }
  }

  const merged = mergeEntries(input.localEntries, cloudEntries)
  const missing = entriesMissingFromCloud(merged, cloudEntries)
  if (missing.length > 0) {
    const push = await pushTrackerEntries(input.userId, missing)
    if (push.error) return { error: push.error }
  }

  const startedOn = mergeStartedOn(input.localStartedOn, input.cloudStartedOn)
  if (supabase) {
    const { error } = await supabase
      .from('profiles')
      .update({ started_on: startedOn })
      .eq('id', input.userId)
    if (error && !error.message.includes('started_on')) {
      // Column may be missing until entries_sync.sql is run — non-fatal for entries
      if (!error.message.includes('column')) {
        return { error: error.message }
      }
    }
  }

  return { entries: merged, startedOn }
}

export async function deleteGoonPost(
  userId: string,
  postId: string,
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud nicht konfiguriert.' }
  const { error } = await supabase
    .from('goon_posts')
    .delete()
    .eq('id', postId)
    .eq('user_id', userId)
  return error ? { error: error.message } : {}
}

export async function loadGoonFeed(
  userId: string,
  options?: { limit?: number },
): Promise<{ posts: GoonPost[] } | { error: string }> {
  if (!supabase) return { error: 'Cloud nicht konfiguriert.' }
  const limit = options?.limit ?? 5

  const { data: links } = await supabase
    .from('friendships')
    .select('friend_id')
    .eq('user_id', userId)

  const friendIds = (links ?? []).map((l) => l.friend_id)
  const ids = [userId, ...friendIds]

  let postsRaw: Array<Record<string, unknown>> | null = null
  let error: { message: string } | null = null

  {
    const res = await supabase
      .from('goon_posts')
      .select('id, user_id, category, minutes, goonometer, comment, date, created_at, parts')
      .in('user_id', ids)
      .order('created_at', { ascending: false })
      .limit(limit)
    error = res.error
    postsRaw = (res.data as Array<Record<string, unknown>> | null) ?? null
    if (error && error.message.includes('parts')) {
      const fallback = await supabase
        .from('goon_posts')
        .select('id, user_id, category, minutes, goonometer, comment, date, created_at')
        .in('user_id', ids)
        .order('created_at', { ascending: false })
        .limit(limit)
      error = fallback.error
      postsRaw = (fallback.data as Array<Record<string, unknown>> | null) ?? null
    }
  }

  if (error) {
    return {
      error: error.message.includes('relation')
        ? 'Tabelle fehlt. SQL aus supabase/goon_feed.sql im SQL Editor ausführen.'
        : error.message,
    }
  }

  const posts = postsRaw ?? []
  if (posts.length === 0) return { posts: [] }

  const postIds = posts.map((p) => p.id as string)
  const authorIds = [...new Set(posts.map((p) => p.user_id as string))]

  const [{ data: profiles }, { data: comments }] = await Promise.all([
    supabase.from('profiles').select('id, name, username, avatar_url').in('id', authorIds),
    supabase
      .from('goon_comments')
      .select('id, post_id, user_id, body, created_at')
      .in('post_id', postIds)
      .order('created_at', { ascending: true }),
  ])

  const profileById = new Map(
    (profiles ?? []).map((p) => [
      p.id as string,
      {
        name: ((p.username || p.name || 'Anon') as string),
        avatarUrl: (p.avatar_url as string | null) || undefined,
      },
    ]),
  )

  const commenterIds = [
    ...new Set((comments ?? []).map((c) => c.user_id as string)),
  ]
  let commenterById = new Map<string, { name: string; avatarUrl?: string }>()
  if (commenterIds.length > 0) {
    const { data: commenters } = await supabase
      .from('profiles')
      .select('id, name, username, avatar_url')
      .in('id', commenterIds)
    commenterById = new Map(
      (commenters ?? []).map((p) => [
        p.id as string,
        {
          name: ((p.username || p.name || 'Anon') as string),
          avatarUrl: (p.avatar_url as string | null) || undefined,
        },
      ]),
    )
  }

  const commentsByPost = new Map<string, GoonComment[]>()
  for (const c of comments ?? []) {
    const postId = c.post_id as string
    const author = commenterById.get(c.user_id as string)
    const item: GoonComment = {
      id: c.id as string,
      postId,
      userId: c.user_id as string,
      authorName: author?.name || 'Anon',
      authorAvatarUrl: author?.avatarUrl,
      body: c.body as string,
      createdAt: c.created_at as string,
    }
    const list = commentsByPost.get(postId) ?? []
    list.push(item)
    commentsByPost.set(postId, list)
  }

  return {
    posts: posts.map((p) => {
      const author = profileById.get(p.user_id as string)
      const parts = parsePartsColumn(p.parts)
      return {
        id: p.id as string,
        userId: p.user_id as string,
        authorName: author?.name || 'Anon',
        authorAvatarUrl: author?.avatarUrl,
        category: p.category as Category,
        minutes: Number(p.minutes) || 0,
        goonometer: Number(p.goonometer) || 0,
        comment: (p.comment as string) || '',
        date: p.date as string,
        createdAt: p.created_at as string,
        comments: commentsByPost.get(p.id as string) ?? [],
        ...(parts && parts.length > 0 ? { parts } : {}),
      }
    }),
  }
}

export async function addGoonComment(input: {
  userId: string
  postId: string
  body: string
}): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud nicht konfiguriert.' }
  const body = input.body.trim().slice(0, 280)
  if (!body) return { error: 'Kommentar leer.' }

  const { error } = await supabase.from('goon_comments').insert({
    post_id: input.postId,
    user_id: input.userId,
    body,
  })
  return error ? { error: error.message } : {}
}
