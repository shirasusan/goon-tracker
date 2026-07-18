export const CATEGORIES = [
  'porn',
  'hentai',
  'dojin',
  'illustration',
  'eroga',
] as const

export type Category = (typeof CATEGORIES)[number]

export type Entry = {
  id: string
  category: Category
  minutes: number
  /** Intensity 0–10 */
  goonometer: number
  date: string
  createdAt: string
  /** Optional note shown in the friends feed */
  comment?: string
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
}

export type Recommendation = {
  id: string
  userId: string
  authorName: string
  name: string
  link: string
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
  }
  friends: FriendSnapshot[]
}

export const CATEGORY_META: Record<
  Category,
  { label: string; color: string; bg: string; hint: string }
> = {
  porn: {
    label: 'Porn',
    color: '#c9954a',
    bg: '#14110c',
    hint: 'Pornhub',
  },
  hentai: {
    label: 'Hentai',
    color: '#c45b6e',
    bg: '#151014',
    hint: 'nhentai red',
  },
  dojin: {
    label: 'Doujin',
    color: '#4a9e6e',
    bg: '#0e1512',
    hint: 'Comiket green',
  },
  illustration: {
    label: 'Illustration',
    color: '#5a7ec4',
    bg: '#0e1218',
    hint: 'Pixiv blue',
  },
  eroga: {
    label: 'Eroge',
    color: '#9a6bb8',
    bg: '#141018',
    hint: 'galgame purple',
  },
}
