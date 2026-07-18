# Goon Tracker

Sessions tracken in 5 Kategorien, mit Level, Streaks und Live-Freundesvergleich (Supabase).

## Für Freunde (lokal starten)

Voraussetzung: **Node.js** installiert ([nodejs.org](https://nodejs.org) — LTS).

```bash
git clone https://github.com/shirasusan/goon-tracker.git
cd goon-tracker
```

**Windows (PowerShell):**

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

**Mac / Linux:**

```bash
cp .env.example .env
npm install
npm run dev
```

Dann im Browser öffnen: **http://127.0.0.1:5173**

### Freunde verbinden

1. Unten auf **Freunde**
2. Namen eintragen
3. Deinen Code kopieren (z.B. `AB12CD`) und an Freunde schicken
4. Deren Code bei dir einfügen → Live-Vergleich

## Features

- Kategorien: Porn, Hentai, Dojin, Illustration, Eroga
- Zeit eintragen, Level / XP
- Goon-Streak & Dry-Streak
- Stats + Verlauf pro Kategorie
- Freundes-Codes über Supabase (geräteübergreifend)

Lokale Einträge bleiben im Browser; der Freundes-Vergleich läuft über die Cloud.
