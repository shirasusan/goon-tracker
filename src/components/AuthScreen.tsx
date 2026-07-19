import { useState, type FormEvent } from 'react'
import { cloudEnabled, loginUser, registerUser } from '../lib/cloud'
import { useLocale } from '../lib/LocaleContext'

type AuthScreenProps = {
  onAuthed: (info: { userId: string; username: string }) => void
}

export function AuthScreen({ onAuthed }: AuthScreenProps) {
  const { t } = useLocale()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const result =
      mode === 'login'
        ? await loginUser(username, password)
        : await registerUser(username, password)
    setBusy(false)
    if ('error' in result) {
      setError(result.error)
      return
    }
    onAuthed({ userId: result.userId, username: username.trim().toLowerCase() })
  }

  if (!cloudEnabled) {
    return (
      <div className="auth">
        <h1 className="auth__hero-brand">Goon Tracker</h1>
        <p className="empty">Cloud nicht konfiguriert (.env fehlt).</p>
      </div>
    )
  }

  return (
    <div className="auth">
      <h1 className="auth__hero-brand">Goon Tracker</h1>
      <p className="auth__value">{t('auth_value')}</p>

      <p className="auth__mode">{mode === 'login' ? 'Anmelden' : 'Registrieren'}</p>

      <form className="auth__form" onSubmit={(e) => void submit(e)}>
        <label htmlFor="auth-user">Benutzername</label>
        <input
          id="auth-user"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="z.B. shirasu"
          required
          minLength={3}
          maxLength={20}
        />
        <label htmlFor="auth-pass">Passwort</label>
        <input
          id="auth-pass"
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        {mode === 'register' && (
          <p className="auth__hint">
            Mindestens 6 Zeichen. Benutzername: 3–20 Zeichen, a–z, 0–9, _.
          </p>
        )}
        {error && <p className="friends__error">{error}</p>}
        <button
          type="submit"
          className="btn btn--accent btn--wide btn--lg"
          disabled={busy}
        >
          {busy ? '…' : mode === 'login' ? 'Einloggen' : 'Account erstellen'}
        </button>
      </form>

      <button
        type="button"
        className="auth__switch"
        onClick={() => {
          setMode((m) => (m === 'login' ? 'register' : 'login'))
          setError(null)
        }}
      >
        {mode === 'login' ? 'Neu hier? Registrieren' : 'Schon Account? Anmelden'}
      </button>
    </div>
  )
}
