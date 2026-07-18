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
  /** Intensity 1–10 */
  goonometer: number
  date: string
  createdAt: string
}

export type Recommendation = {
  id: string
  userId: string
  authorName: string
  name: string
  link: string
  createdAt: string
}

export type FriendSnapshot = {
  id: string
  name: string
  username?: string
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
    cloudCode?: string
    cloudUserId?: string
  }
  friends: FriendSnapshot[]
}

export const CATEGORY_META: Record<
  Category,
  { label: string; color: string; bg: string; hint: string }
> = {
  porn: {
    label: 'Porn',
    color: '#FF9900',
    bg: '#000000',
    hint: 'Pornhub',
  },
  hentai: {
    label: 'Hentai',
    color: '#FF2D55',
    bg: '#2a0a12',
    hint: 'nhentai red',
  },
  dojin: {
    label: 'Dojin',
    color: '#00E676',
    bg: '#062214',
    hint: 'Comiket green',
  },
  illustration: {
    label: 'Illustration',
    color: '#2979FF',
    bg: '#071428',
    hint: 'Pixiv blue',
  },
  eroga: {
    label: 'Eroga',
    color: '#D500F9',
    bg: '#1a0624',
    hint: 'galgame purple',
  },
}
