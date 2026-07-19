# goon-tracker v1 Design

## Summary

Private, local-first personal tracker with a social-media-shaped UI: session logs and habit/urge check-ins appear as posts in a personal feed. No multi-user backend in v1.

## Goals

- Replace Vite starter with a branded product UI
- Support session posts (A) and check-in posts (B)
- Feel like a social app (feed, profile, reactions, bottom nav) using only the user’s data
- Persist in `localStorage`

## Non-goals (v1)

- Accounts, cloud sync, real other users, DMs, follows, moderation

## Data model

```ts
type CheckInKind = 'on_track' | 'slipped' | 'urge'
type PostType = 'session' | 'checkin'

interface Profile {
  displayName: string
  bio: string
}

interface Post {
  id: string
  type: PostType
  createdAt: string // ISO
  note?: string
  durationMinutes?: number // session only
  checkInKind?: CheckInKind // checkin only
  liked: boolean
}
```

Storage key: `goon-tracker:v1`

## Screens

| Tab | Purpose |
|-----|---------|
| Feed | Reverse-chronological posts; like toggle |
| Log | Composer: log session or check-in |
| Streak | Current/best streak + week activity strip |
| Profile | Name, bio, stats; editable locally |

## Streak rules

- A day counts as active if any post exists that local calendar day
- Current streak: consecutive active days ending today (or yesterday if today empty)
- Best streak: max consecutive active run in history

## Visual direction

- Dark ink atmosphere (not flat black), amber/copper accent (not purple)
- Display font for brand; clean sans for UI
- Mobile-first column (~420px content), bottom nav
- Brand “goon-tracker” hero-level on profile and empty feed

## Privacy copy

UI should state data stays on this device; no fake other users in the feed.
