import { useEffect, useRef, type KeyboardEvent } from 'react'
import { useI18n } from '../../shared/i18n'

export function ResolveDisasterDialog({ disasterName, busy, returnFocus, onResolve, onCancel }: {
  disasterName: string
  busy: boolean
  returnFocus?: HTMLElement | null
  onResolve: () => void
  onCancel: () => void
}) {
  const { t } = useI18n()
  const dialog = useRef<HTMLDivElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    cancel.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  function close() {
    if (busy) return
    onCancel()
    if (returnFocus?.isConnected) returnFocus.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && !busy) {
      event.preventDefault()
      close()
      return
    }
    if (event.key !== 'Tab') return
    const controls = dialog.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])')
    if (!controls?.length) return
    const first = controls[0]
    const last = controls[controls.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return <div className="resolve-dialog-layer">
    <div ref={dialog} className="resolve-dialog" role="alertdialog" aria-modal="true"
      aria-labelledby="resolve-title" aria-describedby="resolve-description" onKeyDown={handleKeyDown}>
      <p className="eyebrow">{t('disaster.confirmEyebrow')}</p>
      <h2 id="resolve-title">{t('disaster.confirmTitle')}</h2>
      <p id="resolve-description">{t('disaster.confirmDescription', { name: disasterName })}</p>
      <div className="resolve-dialog__actions">
        <button ref={cancel} type="button" className="secondary" onClick={close}
          aria-disabled={busy}>{t('disaster.back')}</button>
        <button type="button" className="danger" onClick={() => { if (!busy) onResolve() }}
          aria-busy={busy} aria-disabled={busy}>
          {busy ? t('disaster.resolving') : t('disaster.confirmResolve')}
        </button>
      </div>
    </div>
  </div>
}
