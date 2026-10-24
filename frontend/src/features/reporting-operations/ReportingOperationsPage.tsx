import { Link } from 'react-router-dom'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../../shared/api'
import { EmptyState, ErrorMessage, Loading, PageHeader } from '../../shared/components'
import { useI18n } from '../../shared/i18n'
import { LocationMap } from '../../shared/location'
import { ReportAttachments } from '../reporting-attachments/ReportAttachments'
import type { Disaster } from '../disaster/disaster-api'
import { disasterLabel } from '../disaster/DisasterBadges'
import { DecisionDialog } from './DecisionDialog'
import { DisasterPicker } from './DisasterPicker'
import { ReportFilters } from './ReportFilters'
import { dates, errorText, Pagination, ReportBadge } from './presentation'
import { getReport, listReports, rejectReport, verifyReport, type Report, type ReportFilters as Filters, type ReportPage } from './reporting-api'
import './reporting-operations.css'

export function ReportingOperationsPage() {
  const { t } = useI18n()
  const [filters, setFilters] = useState<Filters>({ page: 0, size: 20 })
  const [result, setResult] = useState<ReportPage>()
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [selectedId, setSelectedId] = useState<string>()
  const [selected, setSelected] = useState<Report>()
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [disaster, setDisaster] = useState<Disaster>()
  const [reason, setReason] = useState('')
  const [decision, setDecision] = useState<'verify' | 'reject'>()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [mutationError, setMutationError] = useState('')
  const [forbidden, setForbidden] = useState(false)
  const [fieldError, setFieldError] = useState('')
  const [success, setSuccess] = useState('')
  const panel = useRef<HTMLElement>(null)
  const confirmationTrigger = useRef<HTMLElement | null>(null)
  // Discard reads invalidated by later requests, filter changes or unmount/logout.
  const listRequest = useRef(0)
  const detailRequest = useRef(0)
  const writing = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; listRequest.current++; detailRequest.current++ }
  }, [])

  const loadList = useCallback(async () => {
    const request = ++listRequest.current
    setLoading(true); setResult(undefined); setListError('')
    try {
      const value = await listReports(filters)
      if (request !== listRequest.current) return
      if (filters.page > 0 && filters.page >= value.totalPages) setFilters(current => ({ ...current, page: Math.max(0, value.totalPages - 1) }))
      else setResult(value)
    } catch (error) { if (request === listRequest.current) setListError(errorText(error)) }
    finally { if (request === listRequest.current) setLoading(false) }
  }, [filters])
  useEffect(() => { void loadList(); return () => { listRequest.current++ } }, [loadList])

  async function loadDetail(id: string) {
    const request = ++detailRequest.current
    setSelected(undefined); setDetailLoading(true); setDetailError('')
    try { const value = await getReport(id); if (request === detailRequest.current) setSelected(value) }
    catch (error) { if (request === detailRequest.current) setDetailError(errorText(error)) }
    finally {
      if (request === detailRequest.current) {
        setDetailLoading(false)
        requestAnimationFrame(() => { if (request === detailRequest.current) panel.current?.focus() })
      }
    }
  }
  function resetDecision() { setDecision(undefined); setConfirming(false); setDisaster(undefined); setReason(''); setFieldError('') }
  function select(id: string) {
    if (writing.current) return
    setSelectedId(id); resetDecision(); setMutationError(''); setForbidden(false); setSuccess(''); void loadDetail(id)
  }
  function apply(next: Filters) {
    if (writing.current) return
    listRequest.current++; detailRequest.current++
    setFilters(next); setSelectedId(undefined); setSelected(undefined); setDetailLoading(false); setDetailError('')
    resetDecision(); setSuccess(''); setMutationError(''); setForbidden(false)
  }
  function reviewDecision() {
    const invalid = decision === 'verify' ? !disaster : !reason.trim() || Array.from(reason.trim()).length > 500
    if (invalid) {
      setFieldError(decision === 'verify' ? 'Chọn một thảm họa ACTIVE.' : 'Nhập lý do từ 1 đến 500 ký tự (không tính khoảng trắng hai đầu).')
      requestAnimationFrame(() => document.getElementById(decision === 'verify' ? 'active-disaster' : 'rejection-reason')?.focus())
      return
    }
    confirmationTrigger.current = document.activeElement as HTMLElement | null
    setFieldError(''); setConfirming(true)
  }
  async function submitDecision() {
    if (writing.current || forbidden || !selected || selected.status !== 'PENDING' || !decision || !confirming) return
    if (decision === 'verify' ? !disaster : !reason.trim() || Array.from(reason.trim()).length > 500) return
    const id = selected.id
    writing.current = true; setBusy(true); setSuccess(''); setMutationError('')
    try {
      await (decision === 'verify' ? verifyReport(id, disaster!.id) : rejectReport(id, reason.trim()))
      if (!mounted.current) return
      resetDecision()
      // Read both resources after commit; do not leave a cached PENDING detail actionable.
      await Promise.all([loadList(), loadDetail(id)])
      if (mounted.current) setSuccess(t('reporting.decisionSaved'))
    } catch (error) {
      if (!mounted.current) return
      setMutationError(errorText(error)); setConfirming(false)
      setForbidden(error instanceof ApiError && error.status === 403)
      if (error instanceof ApiError && [403, 404, 409].includes(error.status)) {
        resetDecision()
        await Promise.all([loadList(), loadDetail(id)])
      }
      if (error instanceof ApiError && error.status === 400 && error.problem?.fieldErrors.length) {
        setFieldError(error.problem.fieldErrors.map(item => `${item.field}: ${item.message}`).join(' '))
      }
    } finally {
      writing.current = false
      if (mounted.current) { setBusy(false); requestAnimationFrame(() => panel.current?.focus()) }
    }
  }
  const locked = busy || confirming
  return <section className="reporting-operations">
    <PageHeader eyebrow={t('reporting.eyebrow')} title={t('reporting.title')} description={t('reporting.description')} />
    <ReportFilters disabled={locked} onApply={apply} />
    <div className="report-workspace">
      <section className="report-master" aria-label={t('reporting.list')}>
        <div className="report-summary"><h2>{t('reporting.list')}</h2>{result && <span>{t('reporting.count', { count: result.totalElements })}</span>}</div>
        {loading ? <Loading>{t('reporting.loading')}</Loading> : listError ? <div className="report-list-error"><ErrorMessage>{listError}</ErrorMessage><button type="button" className="secondary" disabled={locked} onClick={() => void loadList()}>{t('reporting.reloadList')}</button></div>
          : result && <>
            {result.items.length ? <ul className="report-list">{result.items.map(report => <li key={report.id}>
              <button type="button" disabled={locked} className={`report-card status-accent--${report.status.toLowerCase()}${selectedId === report.id ? ' is-selected' : ''}`}
                aria-pressed={selectedId === report.id} onClick={() => select(report.id)}>
                <span className="report-card__top"><strong>{disasterLabel(t, report.type as never)}</strong><ReportBadge status={report.status} /></span>
                <span className="report-card__description">{report.description}</span>
                <span className="report-id">{report.id}</span>
                <span className="report-card__meta"><time dateTime={report.createdAt}>{dates.format(new Date(report.createdAt))}</time><span>{report.latitude}, {report.longitude}</span></span>
              </button></li>)}</ul> : <EmptyState>{t('reporting.empty')}</EmptyState>}
            <Pagination page={result.page} totalPages={result.totalPages} disabled={locked} label={t('reporting.pagination')} onPage={page => apply({ ...filters, page })} />
          </>}
      </section>
      <aside className="report-detail" ref={panel} tabIndex={-1} aria-label={t('reporting.detail')}>
        {mutationError && <ErrorMessage>{mutationError}</ErrorMessage>}{success && <p className="report-success" role="status">{success}</p>}
        {detailLoading ? <Loading>{t('reporting.loadingDetail')}</Loading> : detailError ? <div className="report-list-error"><ErrorMessage>{detailError}</ErrorMessage>
          {selectedId && <button type="button" className="secondary" disabled={locked} onClick={() => void loadDetail(selectedId)}>{t('reporting.reloadDetail')}</button>}</div>
          : !selected ? <EmptyState>{t('reporting.select')}</EmptyState> : <>
            <p className="eyebrow">{t('reporting.detailEyebrow')}</p><div className="report-detail__heading"><h2>{disasterLabel(t, selected.type as never)}</h2><ReportBadge status={selected.status} /></div>
            <p className="report-detail__description">{selected.description}</p>
            <dl className="report-facts">
              <div><dt>{t('reporting.coordinates')}</dt><dd>{selected.latitude}, {selected.longitude}</dd></div>
              <div><dt>{t('reporting.submitted')}</dt><dd><time dateTime={selected.createdAt}>{dates.format(new Date(selected.createdAt))}</time></dd></div>
              <div><dt>{t('reporting.id')}</dt><dd className="report-id">{selected.id}</dd></div>
              <div><dt>{t('reporting.updated')}</dt><dd><time dateTime={selected.updatedAt}>{dates.format(new Date(selected.updatedAt))}</time></dd></div>
              {selected.disasterId && <div><dt>{t('reporting.disasterId')}</dt><dd className="report-id">{selected.disasterId}</dd></div>}
              {selected.verifiedAt && <div><dt>{t('reporting.verifiedAt')}</dt><dd>{dates.format(new Date(selected.verifiedAt))}</dd></div>}
              {selected.rejectionReason && <div><dt>{t('reporting.rejectionReason')}</dt><dd>{selected.rejectionReason}</dd></div>}
              {selected.rejectedAt && <div><dt>{t('reporting.rejectedAt')}</dt><dd>{dates.format(new Date(selected.rejectedAt))}</dd></div>}
            </dl>
            <LocationMap value={{ latitude: selected.latitude, longitude: selected.longitude }} readOnly
              label={`${t('reporting.reportLocation')} ${selected.id}`} className="report-detail__map" />
            <ReportAttachments reportId={selected.id} canManage={false} />
            {selected.status === 'VERIFIED' && !forbidden && <Link to={`/operations/rescue?reportId=${encodeURIComponent(selected.id)}`}>{t('reporting.rescueLink')}</Link>}
            {selected.status === 'PENDING' && !forbidden ? <section className="report-decision" aria-label={t('reporting.decision')}>
              {!decision ? <><h3>{t('reporting.decision')}</h3><div className="report-actions">
                <button type="button" disabled={locked} onClick={() => { setDecision('verify'); setFieldError('') }}>{t('reporting.verify')}</button>
                <button type="button" className="danger-secondary" disabled={locked} onClick={() => { setDecision('reject'); setFieldError('') }}>{t('reporting.reject')}</button>
              </div></> : <>
                <h3>{decision === 'verify' ? t('reporting.linkDisaster') : t('reporting.rejectReason')}</h3>
                {decision === 'verify' ? <DisasterPicker selected={disaster} disabled={locked} invalid={Boolean(fieldError)} onSelect={setDisaster} />
                  : <label className="report-filter-status">{t('reporting.rejectReason')}<textarea id="rejection-reason" rows={4} disabled={locked} value={reason}
                    aria-invalid={Boolean(fieldError)} aria-describedby="rejection-count decision-error" onChange={event => setReason(event.target.value)} /></label>}
                {decision === 'reject' && <p id="rejection-count" className="muted">{Array.from(reason.trim()).length}/500 characters · Required</p>}
                <p id="decision-error" className="field-error" role={fieldError ? 'alert' : undefined}>{fieldError}</p>
                <div className="report-actions"><button type="button" disabled={locked} onClick={reviewDecision}>{t('reporting.checkDecision')}</button>
                  <button type="button" className="secondary" disabled={locked} onClick={() => { resetDecision(); panel.current?.focus() }}>{t('disaster.form.cancel')}</button></div>
              </>}
            </section> : <p className="report-terminal-note">{selected.status === 'PENDING' ? t('reporting.serverForbidden') : t('reporting.alreadyDecided')}</p>}
          </>}
      </aside>
    </div>
    {confirming && selected && <DecisionDialog busy={busy} returnFocus={confirmationTrigger.current} title={decision === 'verify' ? t('reporting.decisionConfirmVerify') : t('reporting.decisionConfirmReject')}
      description={`${t('reporting.id')} ${selected.id}. ${decision === 'verify' ? `${t('reporting.linkDisaster')}: ${disaster?.name} (${disaster?.id}).` : `${t('reporting.rejectReason')}: ${reason.trim()}`} ${t('reporting.decisionNoUndo')}`}
      onCancel={() => setConfirming(false)} onConfirm={() => void submitDecision()} />}
  </section>
}
