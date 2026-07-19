# UX Redesign (Nav, Tour, Ember Palette) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship one UX pass: ember color tokens, avatar profile tab with icon bounce, gear→settings, mobile home widget above entry, and a post-signup coach tour replacing Erste Schritte.

**Architecture:** Theme tokens live in `src/index.css`. Navigation becomes four tabs (`home | friends | ranked | profile`) owned by `BottomNav` + `App` state (drop separate `showProfile` chrome buttons). Coach tour is a small pure state module (`src/lib/tour.ts`) plus `CoachTour` UI hosted in `App`. ProfilePanel gains an optional settings-open control via gear + `initialSeg` / `onOpenSettings` pattern.

**Tech Stack:** Vite, React 19, TypeScript, CSS variables (no icon library — inline SVGs). Verification: `npm run build` (no unit-test runner in repo).

## Global Constraints

- German UI copy only for user-facing strings.
- Color tokens must match spec: bg `#100e0d`, surface `#1a1614`, ink `#f2ebe4`, muted `#9a9088`, goon `#e85a4a`, goon-soft `#3a1f1c`, dry `#5a9e8f`, rank `#d4a35c`, danger `#d64545`, border `#2a2420`.
- Only goon + dry as strong signal colors; CTA = `--goon`.
- No new npm dependencies.
- Do not change cloud sync / auth APIs except reading `userId` for tour storage key.
- Commits: use author env `shirasu` / `shirasusan@users.noreply.github.com` (no `git config`).

---

## File map

| File | Responsibility |
| --- | --- |
| `src/index.css` | Ember `:root` tokens + body washes |
| `src/App.css` | Nav icons/bounce, home order, tour modal, gear, remove me-chrome rules as needed |
| `src/components/BottomNav.tsx` | Tabs + icons + avatar + bounce class |
| `src/components/NavIcons.tsx` | Inline SVG icons (home, friends, ranked, settings gear) |
| `src/components/ProfilePanel.tsx` | Gear → settings; accept `initialSeg` / `settingsRequestId` |
| `src/components/CoachTour.tsx` | Tour popup UI |
| `src/lib/tour.ts` | Persist/load tour progress per user |
| `src/App.tsx` | `tab: 'profile'`, wire tour, remove me buttons & checklist |
| `src/components/OnboardingChecklist.tsx` | Delete after unused |

---

### Task 1: Ember color tokens

**Files:**
- Modify: `src/index.css`
- Modify: `src/App.css` only if hardcoded `#ff2d4a` / old goon hex appear (grep and replace with `var(--goon)` / `var(--rank)` where obvious)

**Interfaces:**
- Produces: CSS vars `--bg`, `--bg-elevated`, `--surface`, `--surface-2`, `--ink`, `--muted`, `--line`, `--line-soft`, `--goon`, `--goon-soft`, `--dry`, `--rank`, `--danger`, `--accent` (=goon), `--glow-goon`, `--glow-dry`, `--warm` (=rank)

- [ ] **Step 1: Update `:root` tokens in `src/index.css`**

Replace the color block with:

```css
:root {
  color-scheme: dark;
  --bg: #100e0d;
  --bg-elevated: #1a1614;
  --surface: #1a1614;
  --surface-2: #221e1b;
  --ink: #f2ebe4;
  --muted: #9a9088;
  --line: #2a2420;
  --line-soft: #231f1c;
  --goon: #e85a4a;
  --goon-soft: #3a1f1c;
  --dry: #5a9e8f;
  --rank: #d4a35c;
  --glow-goon: #e85a4a;
  --glow-dry: #5a9e8f;
  --accent: #e85a4a;
  --danger: #d64545;
  --link: #7eb8c9;
  --warm: #d4a35c;
  /* keep existing radius/pad/gap/nav-h/touch/font rules */
}
```

Update `body` background gradients to use the new goon/dry RGB approximations:

```css
body {
  background:
    radial-gradient(120% 80% at 50% -10%, rgba(232, 90, 74, 0.08), transparent 55%),
    radial-gradient(90% 60% at 100% 100%, rgba(90, 158, 143, 0.05), transparent 50%),
    var(--bg);
}
```

- [ ] **Step 2: Grep old accent hexes**

Run: `rg -n "ff2d4a|3dceb8|#090b0e" src`

Replace stray hardcodes that should be tokens (leave category-specific colors in `types.ts` alone).

- [ ] **Step 3: Verify build**

Run: `npm run build`  
Expected: exit 0

- [ ] **Step 4: Commit**

```bash
git add src/index.css src/App.css
git commit -m "Apply ember dark color tokens across the app shell."
```

---

### Task 2: Nav icons module + BottomNav with profile tab

**Files:**
- Create: `src/components/NavIcons.tsx`
- Modify: `src/components/BottomNav.tsx`
- Modify: `src/App.css` (`.bottom-nav__btn`, icon bounce keyframes)

**Interfaces:**
- Produces: `export type TabId = 'home' | 'friends' | 'ranked' | 'profile'`
- Produces: `BottomNavProps` gains `avatarUrl?: string`, `displayName?: string`, `goonStreak?: number`, `dryStreak?: number`
- Consumes: `Avatar` from `./Avatar`

- [ ] **Step 1: Create `src/components/NavIcons.tsx`**

```tsx
type IconProps = { className?: string }

export function IconHome({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="22" height="22" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" strokeLinejoin="round" />
    </svg>
  )
}

export function IconFriends({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="22" height="22" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="9" cy="8" r="3.25" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3.5 19c.6-3 2.8-4.75 5.5-4.75S14 16 14.5 19" strokeLinecap="round" />
      <path d="M14.5 14.5c1.7-.35 3.4.2 4.5 1.9.6.9.9 1.9 1 2.6" strokeLinecap="round" />
    </svg>
  )
}

export function IconRanked({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="22" height="22" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M7 20V11M12 20V4M17 20v-6" strokeLinecap="round" />
    </svg>
  )
}

export function IconSettings({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="22" height="22" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M4.9 7.5l1.9 1.1M17.2 15.4l1.9 1.1M4.9 16.5l1.9-1.1M17.2 8.6l1.9-1.1" strokeLinecap="round" />
    </svg>
  )
}
```

- [ ] **Step 2: Rewrite `BottomNav.tsx` tabs**

```tsx
import { Avatar } from './Avatar'
import { AddFriendControl } from './AddFriendControl'
import { IconFriends, IconHome, IconRanked } from './NavIcons'

export type TabId = 'home' | 'friends' | 'ranked' | 'profile'

const ALL_TABS: { id: TabId; label: string }[] = [
  { id: 'home', label: 'Start' },
  { id: 'friends', label: 'Freunde' },
  { id: 'ranked', label: 'Rangliste' },
  { id: 'profile', label: 'Profil' },
]

type BottomNavProps = {
  active: TabId | null
  onChange: (tab: TabId) => void
  hideRanked?: boolean
  cloudCode?: string
  userId?: string
  avatarUrl?: string
  displayName?: string
  goonStreak?: number
  dryStreak?: number
}

// map: for each tab render icon span.bottom-nav__icon + label
// profile tab: <Avatar src={avatarUrl} name={displayName || 'Profil'} size="sm" goonStreak={...} dryStreak={...} />
// onClick: onChange(tab.id); button gets class is-active + is-bounce when just selected
```

Track bounce with local state:

```tsx
const [bounceId, setBounceId] = useState<TabId | null>(null)

function select(id: TabId) {
  setBounceId(id)
  onChange(id)
  window.setTimeout(() => setBounceId((cur) => (cur === id ? null : cur)), 280)
}
```

Class: `bottom-nav__btn${active === id ? ' is-active' : ''}${bounceId === id ? ' is-bounce' : ''}`

Include `--nav-cols` = tabs.length (now 3 or 4).

- [ ] **Step 3: CSS for icons + bounce + active scale**

Add to `src/App.css`:

```css
.bottom-nav__icon {
  display: grid;
  place-items: center;
  color: var(--muted);
  transition: color 0.15s ease, transform 0.15s ease;
}

.bottom-nav__btn.is-active .bottom-nav__icon {
  color: var(--goon);
  transform: scale(1.06);
}

.bottom-nav__btn.is-active .bottom-nav__avatar {
  transform: scale(1.06);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--goon) 70%, transparent);
}

.bottom-nav__btn.is-bounce .bottom-nav__icon,
.bottom-nav__btn.is-bounce .bottom-nav__avatar {
  animation: nav-tab-bounce 0.28s ease;
}

@keyframes nav-tab-bounce {
  0% { transform: translateY(0) scale(1); }
  40% { transform: translateY(-4px) scale(1.12); }
  100% { transform: translateY(0) scale(1.06); }
}

.bottom-nav__btn {
  display: grid;
  justify-items: center;
  gap: 0.15rem;
}
```

Adjust existing `.bottom-nav__btn` rules so they remain compatible (do not remove desktop sidebar rules).

- [ ] **Step 4: Verify build**

Run: `npm run build`  
Expected: FAIL until App.tsx updated — if BottomNav props break App, proceed immediately to Task 3 in same session, OR temporarily make new props optional (they are optional) so build passes.

- [ ] **Step 5: Commit**

```bash
git add src/components/NavIcons.tsx src/components/BottomNav.tsx src/App.css
git commit -m "Add nav icons, profile avatar tab, and active bounce."
```

---

### Task 3: App shell — profile as tab, remove top me buttons

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.css` (hide obsolete `.top__me` / `.chrome__me` if unused)

**Interfaces:**
- Consumes: `TabId` including `'profile'`
- Removes: `showProfile` state OR derives `const showProfile = tab === 'profile'`
- Produces: `openTab` never needs separate profile flag; `PAGE_META.profile = { title: 'Profil' }`

- [ ] **Step 1: Extend PAGE_META and drop showProfile**

```tsx
const PAGE_META: Record<TabId, { title: string }> = {
  home: { title: 'Start' },
  friends: { title: 'Freunde' },
  ranked: { title: 'Rangliste' },
  profile: { title: 'Profil' },
}
```

Replace `showProfile` usages:
- `setShowProfile(true)` → `setTab('profile')`
- `setShowProfile(false)` → only when switching away via `openTab`
- `active={tab}` (never null for profile)
- Render: `{tab === 'profile' ? <ProfilePanel ... /> : ...}`
- Remove chrome `__me` and `top__me--mobile` buttons entirely
- Pass avatar props into `BottomNav`

Update `openTab`:

```tsx
function openTab(next: TabId) {
  setTab(next)
}
```

Onboarding checklist CTAs that called `setShowProfile(true)` will be removed in Task 6 — until then update checklist props if still mounted.

- [ ] **Step 2: Verify build**

Run: `npm run build`  
Expected: exit 0

- [ ] **Step 3: Manual check**

Confirm: no avatar button top-right; fourth nav tab opens profile.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/App.css
git commit -m "Move profile into nav and remove header profile buttons."
```

---

### Task 4: Profile gear → settings

**Files:**
- Modify: `src/components/ProfilePanel.tsx`
- Modify: `src/App.css` (`.panel-hero__gear` button)
- Modify: `src/App.tsx` only if needed for remount key

**Interfaces:**
- Produces: optional prop `settingsNonce?: number` — when it changes, `setSeg('settings')`
- Gear button calls `setSeg('settings')`

- [ ] **Step 1: Replace eyebrow with gear**

In `ProfilePanel.tsx` header:

```tsx
import { IconSettings } from './NavIcons'

// inside panel-hero__text, replace <p className="eyebrow">Profil</p> with:
<button
  type="button"
  className="panel-hero__gear"
  aria-label="Einstellungen"
  onClick={() => setSeg('settings')}
>
  <IconSettings />
</button>
```

- [ ] **Step 2: Style gear**

```css
.panel-hero__gear {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--muted);
  padding: 0.25rem;
  margin: 0 0 0.15rem;
  cursor: pointer;
  display: inline-grid;
  place-items: center;
}
.panel-hero__gear:hover { color: var(--ink); }
.panel-hero__gear:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--goon) 45%, transparent);
  outline-offset: 2px;
}
```

- [ ] **Step 3: Verify build + manual**

Run: `npm run build`  
Manual: open Profil → gear → Einstellungen segment active.

- [ ] **Step 4: Commit**

```bash
git add src/components/ProfilePanel.tsx src/App.css
git commit -m "Open profile settings from a gear control."
```

---

### Task 5: Mobile home — overview above entry

**Files:**
- Modify: `src/App.css` (`.home-compose__overview`, `.home-compose__primary` order)

**Interfaces:** none (CSS only)

- [ ] **Step 1: Flip mobile order**

In base (mobile-first) rules currently:

```css
.home-compose__overview { order: 2; }
.home-compose__primary { order: 0; }
```

Change to:

```css
.home-compose__overview {
  order: 0;
  /* keep grid; change border: use border-bottom instead of border-top if it was separating from entry above */
  border-top: none;
  border-bottom: 1px solid var(--line-soft);
  padding: 0 0 1rem;
}
.home-compose__primary {
  order: 1;
}
```

Remove `.onboarding { order: 1; }` dependency once checklist gone (Task 6); until then set `.onboarding { order: 2; }`.

Ensure `@media (min-width: 900px)` `.home-compose` grid still places overview in column 1 / primary in column 2 (existing rules) — do not break desktop.

- [ ] **Step 2: Verify build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/App.css
git commit -m "Show home streak/rank widget above entry on mobile."
```

---

### Task 6: Coach tour library + UI + wire-up; remove checklist

**Files:**
- Create: `src/lib/tour.ts`
- Create: `src/components/CoachTour.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.css` (`.coach-tour*` styles)
- Delete: `src/components/OnboardingChecklist.tsx`

**Interfaces:**
- Produces:

```ts
export type TourStepId =
  | 'welcome'
  | 'name'
  | 'widgets'
  | 'entry'
  | 'friends'
  | 'feed'
  | 'ranked'
  | 'profile'

export type TourState = {
  completed: boolean
  skipped: boolean
  stepIndex: number
}

export const TOUR_STEPS: { id: TourStepId; title: string; body: string; cta: string }[]

export function loadTour(userId: string): TourState
export function saveTour(userId: string, state: TourState): void
export function shouldShowTour(state: TourState): boolean
```

- Produces: `CoachTour` props:

```ts
type CoachTourProps = {
  stepIndex: number
  onNext: () => void
  onSkip: () => void
  onAction: (stepId: TourStepId) => void
}
```

- [ ] **Step 1: Implement `src/lib/tour.ts`**

```ts
const PREFIX = 'goon-tracker-tour-v1:'

export type TourStepId =
  | 'welcome'
  | 'name'
  | 'widgets'
  | 'entry'
  | 'friends'
  | 'feed'
  | 'ranked'
  | 'profile'

export type TourState = {
  completed: boolean
  skipped: boolean
  stepIndex: number
}

export const TOUR_STEPS: {
  id: TourStepId
  title: string
  body: string
  cta: string
}[] = [
  {
    id: 'welcome',
    title: 'Willkommen bei Goon Tracker',
    body: 'Kurzer Rundgang — Streaks, Einträge, Freunde und Rangliste.',
    cta: 'Los geht’s',
  },
  {
    id: 'name',
    title: 'Namen setzen',
    body: 'Öffne die Einstellungen und gib deinen Anzeigenamen ein.',
    cta: 'Zu Einstellungen',
  },
  {
    id: 'widgets',
    title: 'Dein Home-Board',
    body: 'Oben siehst du Rang, Level und Streak. Heute füttert den Streak.',
    cta: 'Weiter',
  },
  {
    id: 'entry',
    title: 'Ersten Eintrag loggen',
    body: 'Tippe auf Neuer Eintrag, wähle Kategorien und Minuten.',
    cta: 'Verstanden',
  },
  {
    id: 'friends',
    title: 'Freunde',
    body: 'Vergleiche dich, lade Freunde ein und bleib im Loop.',
    cta: 'Zu Freunden',
  },
  {
    id: 'feed',
    title: 'Feed',
    body: 'Im Freunde-Tab findest du den Feed deiner Sessions.',
    cta: 'Weiter',
  },
  {
    id: 'ranked',
    title: 'Rangliste',
    body: 'Saison zählt fürs Ranking — Allzeit fürs Level.',
    cta: 'Zur Rangliste',
  },
  {
    id: 'profile',
    title: 'Profil & Settings',
    body: 'Über den Avatar-Tab erreichst du Profil, Monk Mode und Logout.',
    cta: 'Fertig',
  },
]

export function loadTour(userId: string): TourState {
  try {
    const raw = localStorage.getItem(PREFIX + userId)
    if (!raw) return { completed: false, skipped: false, stepIndex: 0 }
    const parsed = JSON.parse(raw) as Partial<TourState>
    return {
      completed: Boolean(parsed.completed),
      skipped: Boolean(parsed.skipped),
      stepIndex: Number(parsed.stepIndex) || 0,
    }
  } catch {
    return { completed: false, skipped: false, stepIndex: 0 }
  }
}

export function saveTour(userId: string, state: TourState): void {
  localStorage.setItem(PREFIX + userId, JSON.stringify(state))
}

export function shouldShowTour(state: TourState): boolean {
  return !state.completed && !state.skipped
}
```

- [ ] **Step 2: Implement `CoachTour.tsx`**

Modal with title/body, primary button calling `onAction(current.id)` then parent advances, secondary Skip.

```tsx
import { TOUR_STEPS, type TourStepId } from '../lib/tour'

type CoachTourProps = {
  stepIndex: number
  onNext: () => void
  onSkip: () => void
  onAction: (stepId: TourStepId) => void
}

export function CoachTour({ stepIndex, onNext, onSkip, onAction }: CoachTourProps) {
  const step = TOUR_STEPS[Math.min(stepIndex, TOUR_STEPS.length - 1)]
  return (
    <div className="coach-tour" role="dialog" aria-modal="true" aria-labelledby="coach-tour-title">
      <div className="coach-tour__card">
        <p className="coach-tour__progress">
          {stepIndex + 1} / {TOUR_STEPS.length}
        </p>
        <h2 id="coach-tour-title">{step.title}</h2>
        <p>{step.body}</p>
        <div className="coach-tour__actions">
          <button type="button" className="btn" onClick={onSkip}>
            Überspringen
          </button>
          <button
            type="button"
            className="btn btn--solid"
            onClick={() => {
              onAction(step.id)
              onNext()
            }}
          >
            {step.cta}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: CSS for tour**

Mobile: fixed inset overlay, card bottom-sheet-ish. Desktop ≥900px: centered card.

```css
.coach-tour {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  align-items: end;
  background: color-mix(in srgb, var(--bg) 55%, transparent);
  padding: 1rem;
}
.coach-tour__card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 1.1rem 1.15rem 1.25rem;
  display: grid;
  gap: 0.65rem;
}
@media (min-width: 900px) {
  .coach-tour { place-items: center; align-items: center; }
  .coach-tour__card { width: min(420px, 100%); }
}
```

- [ ] **Step 4: Wire in `App.tsx`**

```tsx
const [tour, setTour] = useState<TourState | null>(null)

// after cloud user id known:
useEffect(() => {
  const id = data.profile.cloudUserId
  if (!id || !authed) return
  setTour(loadTour(id))
}, [data.profile.cloudUserId, authed])

function persistTour(next: TourState) {
  const id = data.profile.cloudUserId
  if (!id) return
  saveTour(id, next)
  setTour(next)
}

// render when tour && shouldShowTour(tour):
<CoachTour
  stepIndex={tour.stepIndex}
  onSkip={() => persistTour({ ...tour, skipped: true })}
  onNext={() => {
    const nextIndex = tour.stepIndex + 1
    if (nextIndex >= TOUR_STEPS.length) {
      persistTour({ ...tour, completed: true, stepIndex: nextIndex })
    } else {
      persistTour({ ...tour, stepIndex: nextIndex })
    }
  }}
  onAction={(stepId) => {
    if (stepId === 'name' || stepId === 'profile') setTab('profile')
    if (stepId === 'friends' || stepId === 'feed') setTab('friends')
    if (stepId === 'ranked') setTab('ranked')
    if (stepId === 'widgets' || stepId === 'entry' || stepId === 'welcome') setTab('home')
  }}
/>
```

For name step: after navigating to profile, also force settings — pass `settingsNonce` increment when step is `name`.

Remove `OnboardingChecklist` import/usage. Delete `OnboardingChecklist.tsx`. Remove obsolete `.onboarding*` CSS optional cleanup.

- [ ] **Step 5: Verify build**

Run: `npm run build`  
Expected: exit 0

- [ ] **Step 6: Commit**

```bash
git add src/lib/tour.ts src/components/CoachTour.tsx src/App.tsx src/App.css
git add -u src/components/OnboardingChecklist.tsx
git commit -m "Replace onboarding checklist with a guided coach tour."
```

---

### Task 7: Desktop vs mobile polish pass

**Files:**
- Modify: `src/App.css`

**Interfaces:** none

- [ ] **Step 1: Tighten differences**

- Mobile bottom nav: ensure 4 columns fit (`font-size` on labels ~0.68–0.72rem if needed).
- Desktop sidebar: profile avatar tab aligned with other items; keep AddFriendControl.
- Chrome: only brand; no me button (already removed).
- Home desktop: confirm overview sticky left unchanged.
- Optional: increase desktop `--nav-side` slightly if avatar needs room.

- [ ] **Step 2: Build + acceptance from spec**

Run: `npm run build`  
Walk checklist in `docs/superpowers/specs/2026-07-19-ux-redesign-design.md` §8.

- [ ] **Step 3: Commit**

```bash
git add src/App.css
git commit -m "Polish mobile and desktop nav density after redesign."
```

---

## Spec coverage self-check

| Spec item | Task |
| --- | --- |
| Ember tokens | 1 |
| Icons + bounce + avatar tab | 2 |
| Remove top-right profile | 3 |
| Gear → settings | 4 |
| Mobile widget above entry | 5 |
| Tour 7+ / remove checklist | 6 |
| Larger mobile/desktop split | 7 |

## Placeholder scan

No TBD/TODO left in tasks. Verification uses `npm run build` (no Jest/Vitest in repo).
