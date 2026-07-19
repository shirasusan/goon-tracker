export type Locale = 'de' | 'en'

const STORAGE_KEY = 'goon-tracker-locale'

export const LOCALES: { id: Locale; label: string }[] = [
  { id: 'de', label: 'Deutsch' },
  { id: 'en', label: 'English' },
]

const dict = {
  de: {
    nav_home: 'Start',
    nav_friends: 'Freunde',
    nav_ranked: 'Rangliste',
    nav_profile: 'Profil',
    nav_menu: 'Menü',
    loading: 'Laden…',
    today: 'Heute',
    new_entry: 'Neuer Eintrag',
    close: 'schließen',
    back: 'Zurück',
    next: 'Weiter',
    skip: 'Überspringen',
    save: 'Speichern',
    cancel: 'Abbrechen',
    overview: 'Übersicht',
    stats: 'Statistiken',
    settings: 'Einstellungen',
    display_name: 'Anzeigename',
    change_photo: 'Bild ändern',
    change_photo_hint: 'Bild tippen zum Ändern',
    uploading: 'Upload…',
    language: 'Sprache',
    language_hint: 'Oberfläche auf Deutsch oder Englisch. Kategorien, Ränge, Achievements, Goonometer und Streak-Namen bleiben gleich.',
    preferences: 'Präferenzen',
    account: 'Konto',
    monk_mode: 'Mönchsmodus',
    monk_hint:
      'Blendet Eintragen, Rang, Rangliste, Empfehlungen, Statistiken und Goonometer aus',
    ranked_anon: 'Rangliste anonym',
    ranked_anon_hint: 'In der Rangliste als Anonym erscheinen',
    logout: 'Logout',
    delete_account: 'Konto löschen',
    delete_warn: 'Logout oder Konto unwiderruflich löschen (inkl. Cloud-Daten).',
    delete_confirm: 'Wirklich alles löschen? Das geht nicht zurück.',
    delete_final: 'Endgültig löschen',
    deleting: 'Löschen…',
    compare: 'Vergleich',
    feed: 'Feed',
    tips_short: 'Tipps',
    tips_full: 'Empfehlungen',
    add_friend: 'Freund hinzufügen',
    add_friend_title: 'Freund hinzufügen',
    your_code: 'Dein Code — Anfrage senden; der andere muss noch akzeptieren.',
    copy_code: 'Code kopieren',
    copied: 'Kopiert',
    friend_code: 'Freund-Code',
    send_request: 'Anfrage senden',
    first_friend_title: 'Lade deinen ersten Freund ein',
    first_friend_body:
      'Noch niemand hier außer dir. Teile deinen Code oder füge einen Freund-Code ein — danach könnt ihr vergleichen.',
    category: 'Kategorie',
    minutes: 'Minuten',
    minutes_placeholder: 'Minuten',
    comment: 'Kommentar',
    comment_optional: 'Optional — erscheint im Freunde-Feed',
    comment_placeholder: 'Was ging ab…',
    all_categories: 'Alle Kategorien',
    categories: 'Kategorien',
    season: 'Saison',
    all_time: 'Allzeit',
    level: 'Level',
    rank: 'Rang',
    anonymous: 'Anonym',
    goonometer_hint: 'Wie gut war der Goon? (0–10)',
    auth_value: 'Tracke Sessions, baue Streaks und vergleiche dich mit Freunden.',
  },
  en: {
    nav_home: 'Home',
    nav_friends: 'Friends',
    nav_ranked: 'Ranked',
    nav_profile: 'Profile',
    nav_menu: 'Menu',
    loading: 'Loading…',
    today: 'Today',
    new_entry: 'New entry',
    close: 'close',
    back: 'Back',
    next: 'Next',
    skip: 'Skip',
    save: 'Save',
    cancel: 'Cancel',
    overview: 'Overview',
    stats: 'Stats',
    settings: 'Settings',
    display_name: 'Display name',
    change_photo: 'Change photo',
    change_photo_hint: 'Tap photo to change',
    uploading: 'Upload…',
    language: 'Language',
    language_hint:
      'UI in German or English. Categories, ranks, achievements, Goonometer, and streak names stay the same.',
    preferences: 'Preferences',
    account: 'Account',
    monk_mode: 'Monk mode',
    monk_hint:
      'Hides logging, rank, ranked, recommendations, stats, and Goonometer',
    ranked_anon: 'Ranked anonymous',
    ranked_anon_hint: 'Appear as Anonymous on the ranked board',
    logout: 'Logout',
    delete_account: 'Delete account',
    delete_warn: 'Log out or permanently delete your account (including cloud data).',
    delete_confirm: 'Really delete everything? This cannot be undone.',
    delete_final: 'Delete permanently',
    deleting: 'Deleting…',
    compare: 'Compare',
    feed: 'Feed',
    tips_short: 'Tips',
    tips_full: 'Recommendations',
    add_friend: 'Add friend',
    add_friend_title: 'Add friend',
    your_code: 'Your code — send a request; they still need to accept.',
    copy_code: 'Copy code',
    copied: 'Copied',
    friend_code: 'Friend code',
    send_request: 'Send request',
    first_friend_title: 'Invite your first friend',
    first_friend_body:
      'Nobody here yet but you. Share your code or paste a friend code — then you can compare.',
    category: 'Category',
    minutes: 'Minutes',
    minutes_placeholder: 'Minutes',
    comment: 'Comment',
    comment_optional: 'Optional — shows in the friends feed',
    comment_placeholder: 'What went down…',
    all_categories: 'All categories',
    categories: 'Categories',
    season: 'Season',
    all_time: 'All time',
    level: 'Level',
    rank: 'Rank',
    anonymous: 'Anonymous',
    goonometer_hint: 'How good was the goon? (0–10)',
    auth_value: 'Track sessions, build streaks, and compare with friends.',
  },
} as const

export type MsgId = keyof (typeof dict)['de']

export function loadLocale(): Locale {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'en' || raw === 'de') return raw
  } catch {
    /* ignore */
  }
  return 'de'
}

export function saveLocale(locale: Locale): void {
  localStorage.setItem(STORAGE_KEY, locale)
}

export function translate(locale: Locale, id: MsgId): string {
  return dict[locale][id] ?? dict.de[id] ?? id
}
