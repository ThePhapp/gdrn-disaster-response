import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../../shared/api'
import { ErrorMessage, Loading } from '../../shared/components'
import { useI18n } from '../../shared/i18n'
import {
  deleteReportAttachment,
  getReportAttachmentContent,
  listReportAttachments,
  MAX_ATTACHMENT_SIZE,
  MAX_ATTACHMENTS,
  uploadReportAttachment,
  type ReportAttachment,
} from './reporting-attachments-api'
import './reporting-attachments.css'

function formatSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`
}

function errorKey(error: unknown) {
  if (error instanceof ApiError) {
    if (error.problem?.code === 'ATTACHMENT_LIMIT_REACHED') return 'attachments.limitError'
    if (error.problem?.code === 'ATTACHMENT_REPORT_NOT_PENDING') return 'attachments.notPendingError'
    if (error.status === 413) return 'attachments.tooLargeError'
    if (error.status === 415) return 'attachments.formatError'
    if (error.status === 403) return 'attachments.forbiddenError'
  }
  return 'attachments.error'
}

export function ReportAttachments({ reportId, canManage }: { reportId: string; canManage: boolean }) {
  const { t } = useI18n()
  const [attachments, setAttachments] = useState<ReportAttachment[]>([])
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmingId, setConfirmingId] = useState<string>()
  const requestId = useRef(0)
  const objectUrls = useRef<string[]>([])

  const releasePreviews = useCallback(() => {
    objectUrls.current.forEach(url => URL.revokeObjectURL(url))
    objectUrls.current = []
    setPreviews({})
  }, [])

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current
    setLoading(true)
    setError('')
    releasePreviews()
    try {
      const next = await listReportAttachments(reportId)
      if (currentRequest !== requestId.current) return
      setAttachments(next)
      const entries = await Promise.all(next.map(async attachment => {
        const blob = await getReportAttachmentContent(reportId, attachment.id)
        return [attachment.id, URL.createObjectURL(blob)] as const
      }))
      if (currentRequest !== requestId.current) {
        entries.forEach(([, url]) => URL.revokeObjectURL(url))
        return
      }
      objectUrls.current = entries.map(([, url]) => url)
      setPreviews(Object.fromEntries(entries))
    } catch (cause) {
      if (currentRequest === requestId.current) setError(t(errorKey(cause) as never))
    } finally {
      if (currentRequest === requestId.current) setLoading(false)
    }
  }, [reportId, releasePreviews, t])

  useEffect(() => {
    void load()
    return () => { requestId.current++; releasePreviews() }
  }, [load, releasePreviews])

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > MAX_ATTACHMENT_SIZE) { setError(t('attachments.tooLargeError')); return }
    if (file.type !== 'image/jpeg' && file.type !== 'image/png') { setError(t('attachments.formatError')); return }
    setBusy(true); setError('')
    try { await uploadReportAttachment(reportId, file); await load() }
    catch (cause) { setError(t(errorKey(cause) as never)) }
    finally { setBusy(false) }
  }

  async function remove(attachmentId: string) {
    if (confirmingId !== attachmentId) { setConfirmingId(attachmentId); return }
    setBusy(true); setError('')
    try { await deleteReportAttachment(reportId, attachmentId); setConfirmingId(undefined); await load() }
    catch (cause) { setError(t(errorKey(cause) as never)); setConfirmingId(undefined) }
    finally { setBusy(false) }
  }

  async function download(attachment: ReportAttachment) {
    setError('')
    try {
      const blob = previews[attachment.id] ? undefined : await getReportAttachmentContent(reportId, attachment.id)
      const url = previews[attachment.id] ?? URL.createObjectURL(blob!)
      const link = document.createElement('a')
      link.href = url; link.download = attachment.originalFilename; link.click()
      if (!previews[attachment.id]) URL.revokeObjectURL(url)
    } catch (cause) { setError(t(errorKey(cause) as never)) }
  }

  return <section className="report-attachments" aria-labelledby={`attachments-${reportId}`}>
    <div className="report-attachments__heading">
      <div><h3 id={`attachments-${reportId}`}>{t('attachments.title')}</h3><p>{t('attachments.policy')}</p></div>
      <span>{attachments.length}/{MAX_ATTACHMENTS}</span>
    </div>
    {canManage && attachments.length < MAX_ATTACHMENTS && <label className="report-attachments__upload">
      <span>{busy ? t('attachments.uploading') : t('attachments.add')}</span>
      <input type="file" accept="image/jpeg,image/png" disabled={busy} onChange={event => void upload(event)} />
    </label>}
    {!canManage && <p className="report-attachments__hint">{t('attachments.readOnly')}</p>}
    {error && <ErrorMessage>{error}</ErrorMessage>}
    {loading && <Loading>{t('attachments.loading')}</Loading>}
    {!loading && !error && attachments.length === 0 && <p className="report-attachments__empty">{t('attachments.empty')}</p>}
    {!loading && attachments.length > 0 && <ul className="report-attachments__grid">
      {attachments.map(attachment => <li key={attachment.id} className="report-attachments__item">
        {previews[attachment.id] ? <img src={previews[attachment.id]} alt={attachment.originalFilename} /> : <div className="report-attachments__placeholder">{attachment.mediaType}</div>}
        <div className="report-attachments__meta"><strong title={attachment.originalFilename}>{attachment.originalFilename}</strong><span>{formatSize(attachment.sizeBytes)}</span></div>
        <div className="report-attachments__actions">
          <button type="button" className="secondary" disabled={busy} onClick={() => void download(attachment)}>{t('attachments.download')}</button>
          {canManage && (confirmingId === attachment.id
            ? <><button type="button" className="danger-secondary" disabled={busy} onClick={() => void remove(attachment.id)}>{t('attachments.confirmDelete')}</button><button type="button" className="secondary" disabled={busy} onClick={() => setConfirmingId(undefined)}>{t('disaster.form.cancel')}</button></>
            : <button type="button" className="danger-secondary" disabled={busy} onClick={() => void remove(attachment.id)}>{t('attachments.delete')}</button>)}
        </div>
      </li>)}
    </ul>}
  </section>
}
