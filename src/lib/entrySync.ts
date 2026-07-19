import type { Entry } from '../types'

/** Union by id — local wins when both sides have the same id. */
export function mergeEntries(local: Entry[], cloud: Entry[]): Entry[] {
  const byId = new Map<string, Entry>()
  for (const e of cloud) byId.set(e.id, e)
  for (const e of local) byId.set(e.id, e)
  return Array.from(byId.values()).sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  )
}

export function mergeStartedOn(
  local: string,
  cloud: string | null | undefined,
): string {
  if (!cloud || !/^\d{4}-\d{2}-\d{2}$/.test(cloud)) return local
  return local < cloud ? local : cloud
}

export function entriesMissingFromCloud(
  local: Entry[],
  cloud: Entry[],
): Entry[] {
  const cloudIds = new Set(cloud.map((e) => e.id))
  return local.filter((e) => !cloudIds.has(e.id))
}
