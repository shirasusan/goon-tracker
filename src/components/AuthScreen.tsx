import { useState, type FormEvent } from 'react'
import { cloudEnabled, loginUser, registerUser } from '../lib/cloud'

type AuthScreenProps = {
  onAuthed: (info: { userId: string; username: string }) => void
}

export function AuthScreen({ onAuthed }: AuthScreenProps) {
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
        <h1>Goon Tracker</h1>
        <p className="empty">Cloud nicht konfiguriert (.env fehlt).</p>
      </div>
    )
  }

  return (
    <div className="auth">
      <p className="auth__brand">Goon Tracker</p>
      <h1>{mode === 'login' ? 'Login' : 'Registrieren'}</h1>
      <p className="auth__sub">Benutzername + Passwort</p>

      <form className="auth__form" onSubmit={(e) => void submit(e)}>
        <label htmlFor="auth-user">Username</label>
        <input
          id="auth-user"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="z.B. shirasu"
          required
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
        {error && <p className="friends__error">{error}</p>}
        <button type="submit" className="btn btn--solid btn--wide btn--lg" disabled={busy}>
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
        {mode === 'login' ? 'Neu hier? Registrieren' : 'Schon Account? Login'}
      </button>
    </div>
  )
}
