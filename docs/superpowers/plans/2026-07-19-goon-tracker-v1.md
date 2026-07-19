# goon-tracker v1 Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** Ship a branded local-first tracker with social-shaped feed, session + check-in posts, streaks, and profile.

**Architecture:** React SPA; state in App with `localStorage` persistence; pure helpers for streaks; tab shell with four screens.

**Tech Stack:** React 19, TypeScript, Vite, CSS (no new deps)

## Global Constraints

- No backend or auth in v1
- No purple Vite aesthetic; amber/copper on ink
- Persist under `goon-tracker:v1`
- Mobile-first social shell with bottom nav

## File map

- `src/types.ts` — models
- `src/lib/storage.ts` — load/save
- `src/lib/streaks.ts` — streak + week helpers
- `src/lib/id.ts` — id helper
- `src/App.tsx` — shell, state, tabs
- `src/components/*.tsx` — Feed, Composer, StreakPanel, ProfilePanel, PostCard
- `src/index.css` / `src/App.css` — theme + layout
- `index.html` — title, fonts, meta

## Tasks

- [ ] Types + storage + streaks
- [ ] Shell + nav + theme
- [ ] Feed + PostCard + likes
- [ ] Log composer
- [ ] Streak + Profile
- [ ] Polish meta/favicon copy; `npm run build`
