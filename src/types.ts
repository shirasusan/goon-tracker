export type CheckInKind = 'on_track' | 'slipped' | 'urge'
export type PostType = 'session' | 'checkin'
export type TabId = 'feed' | 'log' | 'streak' | 'profile'

export interface Profile {
  displayName: string
  bio: string
}

export interface Post {
  id: string
  type: PostType
  createdAt: string
  note?: string
  durationMinutes?: number
  checkInKind?: CheckInKind
  liked: boolean
}

export interface AppData {
  profile: Profile
  posts: Post[]
}

export const DEFAULT_PROFILE: Profile = {
  displayName: 'You',
  bio: 'Private tracker. Data stays on this device.',
}

export const DEFAULT_DATA: AppData = {
  profile: DEFAULT_PROFILE,
  posts: [],
}
