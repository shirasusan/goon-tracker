import { CATEGORIES, type Category, type Entry, type FriendSnapshot } from '../types'
import { entryParts } from './entries'
import { levelFromXp, totalMinutes, totalXp } from './level'

export function categoryTotals(entries: Entry[]): Record<Category, number> {
  const totals = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<
    Category,
    number
  >
  for (const e of entries) {
    for (const part of entryParts(e)) {
      totals[part.category] += part.minutes
    }
  }
  return totals
}

export function shortId(id: string): string {
  return id.replace(/-/g, '').slice(0, 8)
}

export function buildSnapshot(input: {
  id: string
  name: string
  entries: Entry[]
  goonStreak: number
  dryStreak: number
  focusXpTotal?: number
}): FriendSnapshot {
  const xp = totalXp(input.entries, input.focusXpTotal ?? 0)
  const minutes = totalMinutes(input.entries)
  const { level } = levelFromXp(xp)
  return {
    id: input.id,
    name: input.name.trim() || 'Anon',
    level,
    xp,
    goonStreak: input.goonStreak,
    dryStreak: input.dryStreak,
    totalMinutes: minutes,
    categories: categoryTotals(input.entries),
    updatedAt: new Date().toISOString(),
  }
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = ''
  bytes.forEach((b) => {
    bin += String.fromCharCode(b)
  })
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(text: string): Uint8Array {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
  const bin = atob(padded + pad)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

const PREFIX = 'g'

/** Compact: id|name|lv|xp|gs|ds|tm|p.h.d.i.e */
function pack(snapshot: FriendSnapshot): string {
  const name = snapshot.name.replace(/\|/g, '').slice(0, 12)
  const cats = CATEGORIES.map((c) => Math.round(snapshot.categories[c] || 0)).join('.')
  return [
    shortId(snapshot.id),
    name,
    snapshot.level,
    snapshot.xp,
    snapshot.goonStreak,
    snapshot.dryStreak,
    snapshot.totalMinutes,
    cats,
  ].join('|')
}

function unpack(raw: string): FriendSnapshot | null {
  const parts = raw.split('|')
  if (parts.length !== 8) return null
  const [id, name, lv, xp, gs, ds, tm, catsRaw] = parts
  const catVals = catsRaw.split('.').map(Number)
  if (catVals.length !== 5 || catVals.some((n) => !Number.isFinite(n))) return null
  const categories = Object.fromEntries(
    CATEGORIES.map((c, i) => [c, catVals[i]]),
  ) as Record<Category, number>
  return {
    id,
    name: name || 'Anon',
    level: Number(lv) || 1,
    xp: Number(xp) || 0,
    goonStreak: Number(gs) || 0,
    dryStreak: Number(ds) || 0,
    totalMinutes: Number(tm) || 0,
    categories,
    updatedAt: new Date().toISOString(),
  }
}

export function encodeFriendCode(snapshot: FriendSnapshot): string {
  const bytes = new TextEncoder().encode(pack(snapshot))
  return PREFIX + toBase64Url(bytes)
}

function decodeLegacyGt1(code: string): FriendSnapshot | null {
  try {
    if (!code.startsWith('GT1.')) return null
    const bytes = fromBase64Url(code.slice(4))
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as FriendSnapshot
    if (!parsed.id || !parsed.name) return null
    return {
      ...parsed,
      id: shortId(parsed.id),
      categories: parsed.categories ?? {
        porn: 0,
        hentai: 0,
        dojin: 0,
        illustration: 0,
        eroga: 0,
      },
    }
  } catch {
    return null
  }
}

export function decodeFriendCode(raw: string): FriendSnapshot | null {
  const code = raw.trim()
  if (!code) return null

  const legacy = decodeLegacyGt1(code)
  if (legacy) return legacy

  try {
    if (!code.startsWith(PREFIX)) return null
    const bytes = fromBase64Url(code.slice(PREFIX.length))
    return unpack(new TextDecoder().decode(bytes))
  } catch {
    return null
  }
}
