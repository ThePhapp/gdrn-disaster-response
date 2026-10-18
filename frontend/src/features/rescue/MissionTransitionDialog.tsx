import { useEffect, useRef, type KeyboardEvent } from 'react'
import { useI18n } from '../../shared/i18n'
import type { TransitionStatus } from './rescue-api'

export function MissionTransitionDialog({ nextStatus, busy, returnFocus, onConfirm, onCancel }: {
  nextStatus: TransitionStatus
  busy: boolean
  returnFocus?: HTMLElement | null
  onConfirm: () => void
  onCancel: () => void
}) {
  const { t } = useI18n()
  const dialog = useRef<HTMLDivElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const title = nextStatus === 'COMPLETED' ? t('rescue.confirmCompleted') : t('rescue.confirmStarted')
  const description = nextStatus === 'COMPLETED'
    ? `${t('rescue.completeAction')}. ${t('rescue.confirm')}.`
    : `${t('rescue.startAction')}. ${t('rescue.confirm')}.`

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    cancel.current?.focus()
    return () => { document.body.style.overflow = previousOverflow }
  }, [])

  function close() {
    if (busy) return
    onCancel()
    if (returnFocus?.isConnected) returnFocus.focus()
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
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
      event.preventDefault(); last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus()
    }
  }

  return <div className="rescue-dialog-layer">
    <div ref={dialog} className="rescue-dialog" role="alertdialog" aria-modal="true"
      aria-labelledby="mission-transition-title" aria-describedby="mission-transition-description" onKeyDown={onKeyDown}>
      <p className="eyebrow">{t('rescue.updateStatus')}</p>
      <h2 id="mission-transition-title">{title}</h2>
      <p id="mission-transition-description">{description}</p>
      <div className="rescue-dialog__actions">
        <button ref={cancel} type="button" className="secondary" onClick={close} disabled={busy}>{t('rescue.goBack')}</button>
        <button type="button" onClick={onConfirm} aria-busy={busy} disabled={busy}>
          {busy ? t('shared.loading') : nextStatus === 'COMPLETED' ? t('rescue.confirmCompletedButton') : t('rescue.confirmStartedButton')}
        </button>
      </div>
    </div>
  </div>
}
