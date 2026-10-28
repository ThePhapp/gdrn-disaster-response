import { useEffect, useState } from 'react'
import { ErrorMessage } from '../../shared/components'
import { useI18n } from '../../shared/i18n'
import { MAX_ATTACHMENT_SIZE, MAX_ATTACHMENTS } from './reporting-attachments-api'
import './reporting-attachments.css'

export function ReportEvidencePicker({ files, uploadedCount, disabled, onChange }: {
  files: File[]
  uploadedCount: number
  disabled: boolean
  onChange: (files: File[]) => void
}) {
  const { t } = useI18n()
  const [error, setError] = useState('')
  const [previews, setPreviews] = useState<string[]>([])
  const count = files.length + uploadedCount

  useEffect(() => {
    const urls = files.map(file => URL.createObjectURL(file))
    setPreviews(urls)
    return () => urls.forEach(url => URL.revokeObjectURL(url))
  }, [files])

  function select(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!selected.length) return
    if (count + selected.length > MAX_ATTACHMENTS) { setError(t('attachments.limitError')); return }
    if (selected.some(file => file.size > MAX_ATTACHMENT_SIZE)) { setError(t('attachments.tooLargeError')); return }
    if (selected.some(file => file.type !== 'image/jpeg' && file.type !== 'image/png')) { setError(t('attachments.formatError')); return }
    setError('')
    onChange([...files, ...selected])
  }

  return <section className="report-attachments report-evidence-picker" aria-labelledby="report-evidence-title">
    <div className="report-attachments__heading">
      <div><h3 id="report-evidence-title">{t('attachments.title')}</h3><p id="report-evidence-policy">{t('attachments.policy')}</p></div>
      <span>{count}/{MAX_ATTACHMENTS}</span>
    </div>
    {count < MAX_ATTACHMENTS && <label className="report-attachments__upload" aria-disabled={disabled}>
      <span>{t('attachments.add')}</span>
      <input type="file" accept="image/jpeg,image/png" multiple disabled={disabled}
        aria-describedby="report-evidence-policy report-evidence-hint" onChange={select} />
    </label>}
    <p id="report-evidence-hint" className="report-attachments__hint">{t('citizen.evidenceHint')}</p>
    {error && <ErrorMessage>{error}</ErrorMessage>}
    {files.length > 0 && <ul className="report-attachments__grid">
      {files.map((file, index) => <li key={index} className="report-attachments__item">
        {previews[index] && <img src={previews[index]} alt={file.name} />}
        <div className="report-attachments__meta"><strong title={file.name}>{file.name}</strong><span>{(file.size / (1024 * 1024)).toFixed(2)} MiB</span></div>
        <div className="report-attachments__actions"><button type="button" className="secondary" disabled={disabled}
          aria-label={t('citizen.removeEvidence', { name: file.name })}
          onClick={() => { setError(''); onChange(files.filter((_, current) => current !== index)) }}>{t('attachments.delete')}</button></div>
      </li>)}
    </ul>}
  </section>
}
