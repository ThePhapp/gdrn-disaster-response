import { useEffect, useRef, type KeyboardEvent } from 'react'
import type { TransitionStatus } from './rescue-api'
import { missionStatusLabels } from './RescueBadges'

export function MissionTransitionDialog({ nextStatus, busy, returnFocus, onConfirm, onCancel }: {
  nextStatus: TransitionStatus
  busy: boolean
  returnFocus?: HTMLElement | null
  onConfirm: () => void
  onCancel: () => void
}) {
  const dialog = useRef<HTMLDivElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const title = nextStatus === 'COMPLETED' ? 'Hoàn tất nhiệm vụ?' : 'Bắt đầu nhiệm vụ?'
  const description = nextStatus === 'COMPLETED'
    ? 'Nhiệm vụ sẽ chuyển sang Đã hoàn tất. Hãy xác nhận khi đội đã hoàn thành công việc.'
    : 'Nhiệm vụ sẽ chuyển sang Đang thực hiện để ghi nhận đội đã bắt đầu triển khai.'

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
      <p className="eyebrow">CẬP NHẬT TIẾN ĐỘ</p>
      <h2 id="mission-transition-title">{title}</h2>
      <p id="mission-transition-description">{description}</p>
      <div className="rescue-dialog__actions">
        <button ref={cancel} type="button" className="secondary" onClick={close} aria-disabled={busy}>Quay lại</button>
        <button type="button" onClick={() => { if (!busy) onConfirm() }} aria-busy={busy} aria-disabled={busy}>
          {busy ? 'Đang cập nhật…' : `Xác nhận ${missionStatusLabels[nextStatus].toLowerCase()}`}
        </button>
      </div>
    </div>
  </div>
}
