import { CATEGORIES, type Category, type Entry, type EntryPart } from '../types'

export function entryParts(entry: Entry): EntryPart[] {
  if (entry.parts && entry.parts.length > 0) {
    return entry.parts.filter(
      (p) =>
        CATEGORIES.includes(p.category) &&
        typeof p.minutes === 'number' &&
        p.minutes > 0,
    )
  }
  if (CATEGORIES.includes(entry.category) && entry.minutes > 0) {
    return [{ category: entry.category, minutes: entry.minutes }]
  }
  return []
}

export function entryHasCategory(entry: Entry, category: Category): boolean {
  return entryParts(entry).some((p) => p.category === category)
}

export function entryMinutesForCategory(
  entry: Entry,
  category: Category,
): number {
  return entryParts(entry)
    .filter((p) => p.category === category)
    .reduce((sum, p) => sum + p.minutes, 0)
}

export function normalizeParts(
  parts: { category: Category; minutes: number }[],
): EntryPart[] {
  const byCat = new Map<Category, number>()
  for (const p of parts) {
    if (!CATEGORIES.includes(p.category)) continue
    const mins = Math.max(0, Math.round(p.minutes) || 0)
    if (mins <= 0) continue
    byCat.set(p.category, (byCat.get(p.category) || 0) + mins)
  }
  return CATEGORIES.filter((c) => byCat.has(c)).map((category) => ({
    category,
    minutes: byCat.get(category)!,
  }))
}

export function buildEntryFromParts(input: {
  id: string
  parts: { category: Category; minutes: number }[]
  goonometer: number
  date: string
  createdAt: string
  comment?: string
}): Entry | null {
  const parts = normalizeParts(input.parts)
  if (parts.length === 0) return null
  const minutes = parts.reduce((sum, p) => sum + p.minutes, 0)
  const comment =
    typeof input.comment === 'string' && input.comment.trim()
      ? input.comment.trim().slice(0, 280)
      : undefined
  return {
    id: input.id,
    category: parts[0].category,
    minutes,
    goonometer: Math.max(0, Math.min(10, Math.round(input.goonometer) || 0)),
    date: input.date,
    createdAt: input.createdAt,
    parts,
    ...(comment ? { comment } : {}),
  }
}
