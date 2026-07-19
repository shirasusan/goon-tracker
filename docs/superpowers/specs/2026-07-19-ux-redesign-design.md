# Goon Tracker UX Redesign — Design Spec

**Date:** 2026-07-19  
**Status:** Approved (chat) — pending file review  
**Approach:** Single UX pass (nav + home order + ember palette + coach tour + clearer mobile/desktop split)

## Goals

1. Move profile into the nav bar (avatar tab); remove top-right profile chrome.
2. Add tab icons with bounce-on-select + persistent tinted/scaled active state.
3. Profile header: gear (top-left) opens Settings segment; drop “Profil” eyebrow label.
4. Mobile home only: rank/level/streak widget above “Neuer Eintrag”.
5. Replace “Erste Schritte” checklist with post-signup coach-mark tour (7+ steps).
6. Apply warm ember color system (intimate, dark, mature — not neon/purple/Pornhub).
7. Widen mobile vs desktop behavioral/visual differences.

## Non-goals

- Changing auth/backend/cloud sync logic.
- Redesigning friends compare/feed content beyond tour targeting and theme tokens.
- New achievement or ranked algorithms.

---

## 1. Color system

Replace `:root` tokens in `src/index.css` (and any hardcoded accents that fight the palette).

| Token | Hex | Usage |
| --- | --- | --- |
| `--bg` | `#100e0d` | App background |
| `--bg-elevated` / `--surface` | `#1a1614` | Cards, inputs, panels |
| `--surface-2` | slightly lighter than surface (~`#221e1b`) | Nested surfaces |
| `--ink` | `#f2ebe4` | Primary text |
| `--muted` | `#9a9088` | Labels, meta |
| `--goon` / `--accent` | `#e85a4a` | Sessions, primary CTA, active tab |
| `--goon-soft` | `#3a1f1c` | Soft goon washes / selected chips |
| `--dry` | `#5a9e8f` | Dry streak, pause contrast |
| `--rank` | `#d4a35c` | Rank / XP / level accent |
| `--danger` | `#d64545` | Errors, delete |
| `--line` / `--border` | `#2a2420` | Borders, dividers |
| `--line-soft` | softer mix of border | Subtle separators |

**Rules:** Only goon + dry as strong signal colors; no constant glow (glow only for streak/rank feedback); one CTA color (`--goon`).

Auth screen and main shell both consume the same tokens.

---

## 2. Navigation

### Structure

- Tabs: `home` (Start), `friends` (Freunde), `ranked` (Rangliste), `profile` (Profil).
- Profile is a real tab (not overlay-only). Opening profile sets active tab to profile; existing `showProfile` can collapse into `tab === 'profile'` or stay as derived state — prefer one source of truth: `tab: 'profile'`.
- Remove `.top__me--mobile` and `.chrome__me` profile buttons.
- Desktop chrome keeps brand only (no me button). Sidebar includes the same four tabs; avatar tab at bottom or end of list.

### Icons

- Start / Freunde / Rangliste: outline SVG icons (inline or small icon module; no emoji).
- Profil: user avatar (`Avatar` component), fallback initial.
- Labels remain under/ beside icons (mobile bottom bar; desktop sidebar).

### Active animation

1. On tab press: short bounce (translateY + scale keyframes, ~200–280ms).
2. While active: icon/avatar tinted with `--goon` (avatar ring), scale ~1.06, optional underline / left border (existing patterns adapted).

Monk mode: ranked tab still hidden; profile remains.

---

## 3. Profile header & settings entry

- Replace eyebrow “Profil” with a gear button (top-left of profile hero / page header).
- Gear sets segment to `settings` (existing `ProfileSeg`).
- Overview / Stats / Settings chips can remain; gear is a shortcut into settings.
- Page title in chrome/top can stay “Profil” or show display name — prefer display name when available.

---

## 4. Mobile home order

CSS/`order` (or DOM order) for `.home-compose` under `<900px`:

1. Overview widget (rank, level, streak) — top  
2. Primary entry (`CategoryPicker`)  
3. Onboarding removed (tour replaces it)

Desktop `≥900px`: keep two-column sticky overview left + entry right.

---

## 5. Coach tour (replaces Erste Schritte)

### Behavior

- Trigger once after account creation / first authenticated session when tour not completed/skipped.
- Storage key: `goon-tracker-tour-v1:${userId}` (or global if offline) with `{ completed, skipped, step }`.
- Remove `OnboardingChecklist` from home (delete or leave unused and unused-import cleanup).
- UI: modal/coach popup with title, short copy, primary CTA (“Weiter” / contextual action), secondary “Überspringen”.
- Mobile: near-fullscreen sheet; desktop: centered modal.
- CTA may navigate (`setTab`, open entry, open settings) before advancing step on success or on “Weiter”.

### Suggested steps (7+)

1. Welcome — what the app is  
2. Set display name → gear/settings  
3. Home widgets — streak / rank / level meaning  
4. Log first entry — open CategoryPicker / highlight Heute  
5. Friends tab — invite / compare  
6. Feed — social posts  
7. Ranked — season vs all-time  
8. Profile / settings — monk mode, logout  

Skip anywhere marks tour done. Completing last step marks done.

---

## 6. Mobile vs desktop differentiation

| Area | Mobile | Desktop |
| --- | --- | --- |
| Nav | Fixed bottom bar, 4 equal cols, icon+label | Left sidebar, larger hit targets, brand in chrome |
| Profile access | Avatar tab only | Avatar tab only (no chrome me) |
| Home | Widget stack above entry | Two-column sticky rail |
| Tour | Bottom sheet / full bleed | Centered modal |
| Density | Tighter padding, type ~100% | More padding, existing ~106%+ type |

---

## 7. Files likely touched

- `src/index.css` — tokens  
- `src/App.css` — nav, home order, tour, profile gear, remove me buttons  
- `src/App.tsx` — tab=`profile`, remove me handlers, tour host  
- `src/components/BottomNav.tsx` — icons, avatar tab, bounce class  
- `src/components/ProfilePanel.tsx` — gear → settings  
- `src/components/OnboardingChecklist.tsx` — remove usage; delete if unused  
- New: `src/components/CoachTour.tsx` (+ optional `src/lib/tour.ts`)

---

## 8. Acceptance checklist

- [ ] No profile button top-right (mobile or desktop chrome)
- [ ] Four nav items; profile is avatar; bounce + active tint work
- [ ] Gear opens settings segment
- [ ] Mobile home: overview above entry
- [ ] Checklist gone; tour runs once for new accounts; skip/complete persists
- [ ] Ember palette applied; goon CTA / dry streaks / amber rank readable
- [ ] Desktop layout still usable; differences clearly larger than before

## Out of scope follow-ups

- Custom illustrated icons beyond outline set  
- Tour analytics  
- Light theme
