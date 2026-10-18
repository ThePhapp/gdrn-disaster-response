import { useEffect, useRef } from 'react'
import { useI18n } from '../../shared/i18n'

export function DecisionDialog({ title, description, busy, returnFocus, onCancel, onConfirm }: {
  title: string; description: string; busy: boolean; returnFocus: HTMLElement | null; onCancel: () => void; onConfirm: () => void
}) {
  const { t } = useI18n()
  const dialog = useRef<HTMLDialogElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const previous = returnFocus
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.showModal(); cancel.current?.focus()
    return () => { document.body.style.overflow = overflow; requestAnimationFrame(() => { if (previous?.isConnected) previous.focus() }) }
  }, [returnFocus])
  return <dialog ref={dialog} className="report-confirm" aria-labelledby="report-confirm-title" aria-describedby="report-confirm-description"
    onCancel={event => { event.preventDefault(); if (!busy) onCancel() }}
    onKeyDown={event => {
      if (event.key !== 'Tab') return
      const controls = dialog.current?.querySelectorAll<HTMLButtonElement>('button')
      if (!controls?.length) return
      const first = controls[0], last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }}>
    <p className="eyebrow">{t('reporting.decisionNoUndo')}</p><h2 id="report-confirm-title">{title}</h2>
    <p id="report-confirm-description">{description}</p>
    <div className="report-actions"><button ref={cancel} type="button" className="secondary" aria-disabled={busy} onClick={() => { if (!busy) onCancel() }}>{t('disaster.back')}</button>
      <button type="button" aria-disabled={busy} aria-busy={busy} onClick={() => { if (!busy) onConfirm() }}>{busy ? t('reporting.processing') : t('reporting.confirmDecision')}</button></div>
  </dialog>
}
