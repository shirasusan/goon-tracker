export const CATEGORIES = [
  'porn',
  'hentai',
  'dojin',
  'illustration',
  'eroga',
] as const

export type Category = (typeof CATEGORIES)[number]

export type EntryPart = {
  category: Category
  minutes: number
}

export type Entry = {
  id: string
  /** Primary category (first part); kept for legacy / DB column */
  category: Category
  /** Total minutes across all parts */
  minutes: number
  /** Intensity 0–10 */
  goonometer: number
  date: string
  createdAt: string
  /** Optional note shown in the friends feed */
  comment?: string
  /** Multi-category session breakdown; omit for single-category entries */
  parts?: EntryPart[]
}

export type GoonComment = {
  id: string
  postId: string
  userId: string
  authorName: string
  authorAvatarUrl?: string
  body: string
  createdAt: string
}

export type GoonPost = {
  id: string
  userId: string
  authorName: string
  authorAvatarUrl?: string
  category: Category
  minutes: number
  goonometer: number
  comment: string
  date: string
  createdAt: string
  comments: GoonComment[]
  /** Multi-category breakdown when present */
  parts?: EntryPart[]
}

export type Recommendation = {
  id: string
  userId: string
  authorName: string
  name: string
  link: string
  category?: Category
  imageUrl?: string
  fileUrl?: string
  fileName?: string
  createdAt: string
}

export type FriendSnapshot = {
  id: string
  name: string
  username?: string
  avatarUrl?: string
  level: number
  xp: number
  goonStreak: number
  dryStreak: number
  totalMinutes: number
  categories: Record<Category, number>
  rankId?: string
  /** Hide identity on ranked leaderboards */
  rankedAnonymous?: boolean
  updatedAt: string
}

export type TrackerData = {
  entries: Entry[]
  startedOn: string
  profile: {
    id: string
    name: string
    username?: string
    avatarUrl?: string
    cloudCode?: string
    cloudUserId?: string
    /** Hide Eintragen, Rank, Ranked, Recs, Stats */
    monkMode?: boolean
    /** Appear as Anonymous on ranked leaderboards */
    rankedAnonymous?: boolean
  }
  friends: FriendSnapshot[]
}

export const CATEGORY_META: Record<
  Category,
  { label: string; color: string; bg: string; hint: string }
> = {
  porn: {
    label: 'Porn',
    color: '#c47e22',
    bg: '#0a0800',
    hint: 'Pornhub',
  },
  hentai: {
    label: 'Hentai',
    color: '#c24a5c',
    bg: '#180910',
    hint: 'nhentai red',
  },
  dojin: {
    label: 'Doujin',
    color: '#2aa868',
    bg: '#051610',
    hint: 'Comiket green',
  },
  illustration: {
    label: 'Illustration',
    color: '#4a6cc4',
    bg: '#060d1a',
    hint: 'Pixiv blue',
  },
  eroga: {
    label: 'Eroge',
    color: '#a032b8',
    bg: '#110518',
    hint: 'galgame purple',
  },
}
