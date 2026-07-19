import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  cloudEnabled,
  fetchProfileByCode,
  sendFriendRequest,
} from '../lib/cloud'
import { useLocale } from '../lib/LocaleContext'

type AddFriendControlProps = {
  userId?: string
  cloudCode?: string
  className?: string
  /** Compact FAB that opens a modal; default true */
  collapsible?: boolean
}

export function AddFriendControl({
  userId,
  cloudCode,
  className,
  collapsible = true,
}: AddFriendControlProps) {
  const { t } = useLocale()
  const titleId = useId()
  const [open, setOpen] = useState(!collapsible)
  const [paste, setPaste] = useState('')
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !collapsible) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, collapsible])

  async function copyFriendCode() {
    if (!cloudCode) return
    try {
      await navigator.clipboard.writeText(cloudCode)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setError(t('copy_failed'))
    }
  }

  async function sendFriendInvite() {
    if (!userId || !cloudEnabled) {
      setError(t('cloud_not_configured'))
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
      setError(t('own_code_error'))
      return
    }
    const sent = await sendFriendRequest(userId, found.profile.id)
    setBusy(false)
    if (sent.error) {
      setError(sent.error)
      return
    }
    setPaste('')
    setStatus('OK')
    if (collapsible) setOpen(false)
  }

  function close() {
    setOpen(false)
  }

  const panel = (
    <div className="friends__add-modal-card">
      <div className="block__head">
        <h3 id={titleId}>{t('add_friend_title')}</h3>
        {collapsible && (
          <button type="button" className="friends__add-modal-close" onClick={close}>
            {t('close')}
          </button>
        )}
      </div>
      <div className="friends__share">
        <p>{t('your_code')}</p>
        <div className="friends__share-row">
          <input className="friends__code" readOnly value={cloudCode || '…'} />
          <button
            type="button"
            className="btn"
            onClick={() => void copyFriendCode()}
            disabled={!cloudCode}
          >
            {copied ? t('copied') : t('copy_code')}
          </button>
        </div>
      </div>
      <div className="friends__add">
        <label htmlFor="add-friend-code">{t('friend_code')}</label>
        <div className="friends__add-row">
          <input
            id="add-friend-code"
            placeholder="AB12CD"
            value={paste}
            autoComplete="off"
            spellCheck={false}
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
            disabled={busy || !userId || !paste.trim()}
          >
            {t('send_request')}
          </button>
        </div>
        {status && <p className="friends__status">{status}</p>}
        {error && <p className="friends__error">{error}</p>}
      </div>
    </div>
  )

  return (
    <div
      className={`friends__add-dock${open ? ' is-open' : ''}${className ? ` ${className}` : ''}`}
    >
      {collapsible ? (
        <>
          <button
            type="button"
            className="friends__add-fab"
            onClick={() => setOpen(true)}
          >
            {t('add_friend')}
          </button>
          {open &&
            createPortal(
              <div
                className="friends__add-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
              >
                <button
                  type="button"
                  className="friends__add-modal-backdrop"
                  aria-label={t('close')}
                  onClick={close}
                />
                {panel}
              </div>,
              document.body,
            )}
        </>
      ) : (
        panel
      )}
    </div>
  )
}
