import { useState } from 'react'
import {
  cloudEnabled,
  fetchProfileByCode,
  sendFriendRequest,
} from '../lib/cloud'

type AddFriendControlProps = {
  userId?: string
  cloudCode?: string
  className?: string
  /** Compact FAB that expands; default true */
  collapsible?: boolean
}

export function AddFriendControl({
  userId,
  cloudCode,
  className,
  collapsible = true,
}: AddFriendControlProps) {
  const [open, setOpen] = useState(!collapsible)
  const [paste, setPaste] = useState('')
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  async function copyFriendCode() {
    if (!cloudCode) return
    try {
      await navigator.clipboard.writeText(cloudCode)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setError('Kopieren fehlgeschlagen.')
    }
  }

  async function sendFriendInvite() {
    if (!userId || !cloudEnabled) {
      setError('Cloud nicht konfiguriert.')
      return
    }
    setError(null)
    setStatus(null)
    setBusy(true)
    const found = await fetchProfileByCode(paste)
    if ('error' in found) {
      setBusy(false)
      setError(found.error)
      return
    }
    if (found.profile.id === userId) {
      setBusy(false)
      setError('Das ist dein eigener Code.')
      return
    }
    const sent = await sendFriendRequest(userId, found.profile.id)
    setBusy(false)
    if (sent.error) {
      setError(sent.error)
      return
    }
    setPaste('')
    setStatus('Anfrage gesendet')
    if (collapsible) setOpen(false)
  }

  return (
    <div
      className={`friends__add-dock${open ? ' is-open' : ''}${className ? ` ${className}` : ''}`}
    >
      {open ? (
        <div className="friends__add-panel">
          <div className="block__head">
            <h3>Freund hinzufügen</h3>
            {collapsible && (
              <button
                type="button"
                className="section__close"
                onClick={() => setOpen(false)}
              >
                schließen
              </button>
            )}
          </div>
          <div className="friends__share">
            <p>Dein Code — Anfrage senden; der andere muss noch akzeptieren.</p>
            <input className="friends__code" readOnly value={cloudCode || '…'} />
            <button
              type="button"
              className="btn"
              onClick={() => void copyFriendCode()}
              disabled={!cloudCode}
            >
              {copied ? 'Kopiert' : 'Code kopieren'}
            </button>
          </div>
          <div className="friends__add">
            <label htmlFor="add-friend-code">Freund-Code</label>
            <input
              id="add-friend-code"
              placeholder="AB12CD"
              value={paste}
              onChange={(e) => {
                setPaste(e.target.value.toUpperCase())
                setError(null)
                setStatus(null)
              }}
            />
            <button
              type="button"
              className="btn btn--solid"
              onClick={() => void sendFriendInvite()}
              disabled={busy || !userId}
            >
              Anfrage senden
            </button>
            {status && <p className="friends__status">{status}</p>}
            {error && <p className="friends__error">{error}</p>}
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="friends__add-fab"
          onClick={() => setOpen(true)}
        >
          + Freund
        </button>
      )}
    </div>
  )
}
