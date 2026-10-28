import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../../shared/api'
import { EmptyState, ErrorMessage, Field, Loading, PageHeader } from '../../shared/components'
import { useI18n, type TranslationKey } from '../../shared/i18n'
import { LocationMap, type LocationValue } from '../../shared/location'
import { ReportAttachments } from '../reporting-attachments/ReportAttachments'
import { ReportEvidencePicker } from '../reporting-attachments/ReportEvidencePicker'
import { uploadReportAttachment } from '../reporting-attachments/reporting-attachments-api'
import {
  createReport,
  getReport,
  listReports,
  listReportMissions,
  reportStatuses,
  reportTypes,
  withdrawReport,
  type CreateReportRequest,
  type Report,
  type ReportPage,
  type ReportStatus as ReportStatusValue,
  type ReportType,
  type Mission,
} from './reporting-api'
import './reporting-citizen.css'

const PAGE_SIZE = 20

const reportTypeLabels: Record<ReportType, string> = {
  EARTHQUAKE: 'Động đất',
  FLOOD: 'Lũ lụt',
  TYPHOON: 'Bão',
  WILDFIRE: 'Cháy rừng',
  TSUNAMI: 'Sóng thần',
}

const reportStatusLabels: Record<ReportStatusValue, string> = {
  PENDING: 'Đang chờ xác minh',
  VERIFIED: 'Đã xác minh',
  REJECTED: 'Bị từ chối',
}

const missionStatusLabels: Record<Mission['status'], string> = {
  ASSIGNED: 'Đã phân công',
  IN_PROGRESS: 'Đang cứu hộ',
  COMPLETED: 'Đã hoàn thành',
}

function typeLabel(t: (key: TranslationKey) => string, type: ReportType) { return t(`reporting.type.${type}` as TranslationKey) }
function statusLabel(t: (key: TranslationKey) => string, status: ReportStatusValue) { return t(`reporting.status.${status}` as TranslationKey) }
function missionLabel(t: (key: TranslationKey) => string, status: Mission['status']) { return t(`rescue.status.${status}` as TranslationKey) }

function getErrorMessage(error: unknown, t: (key: TranslationKey) => string) {
  if (error instanceof ApiError) {
    if (error.status === 404) return t('citizen.errorNotFound')
    if (error.status === 409) return t('citizen.errorConflict')
    return error.message
  }
  if (error instanceof DOMException && error.name === 'AbortError') return ''
  return t('citizen.errorConnection')
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN')
}

function ReportStatus({ status }: { status: ReportStatusValue }) {
  const { t, language } = useI18n()
  return <span className={`report-status report-status--${status.toLowerCase()}`}>{language === 'vi' ? reportStatusLabels[status] : statusLabel(t, status)}</span>
}

function CreateReportForm({ onCreated }: { onCreated: (report: Report) => void }) {
  const { t } = useI18n()
  const [type, setType] = useState<ReportType>('FLOOD')
  const [description, setDescription] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [requestError, setRequestError] = useState('')
  const [evidence, setEvidence] = useState<File[]>([])
  const [savedReport, setSavedReport] = useState<Report>()
  const [uploadedCount, setUploadedCount] = useState(0)
  const [uploading, setUploading] = useState(false)
  const fieldsDisabled = busy || Boolean(savedReport)
  const parsedLatitude = latitude.trim() === '' ? undefined : Number(latitude)
  const parsedLongitude = longitude.trim() === '' ? undefined : Number(longitude)
  const selectedLocation = parsedLatitude !== undefined && parsedLongitude !== undefined
    && Number.isFinite(parsedLatitude) && parsedLatitude >= -90 && parsedLatitude <= 90
    && Number.isFinite(parsedLongitude) && parsedLongitude >= -180 && parsedLongitude <= 180
    ? { latitude: parsedLatitude, longitude: parsedLongitude }
    : undefined

  function setCoordinate(field: 'latitude' | 'longitude', value: string) {
    if (field === 'latitude') setLatitude(value)
    else setLongitude(value)
    setErrors(current => ({ ...current, [field]: '' }))
    setRequestError('')
  }

  function setLocation(value: LocationValue) {
    setLatitude(String(value.latitude))
    setLongitude(String(value.longitude))
    setErrors(current => ({ ...current, latitude: '', longitude: '' }))
    setRequestError('')
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return

    const nextErrors: Record<string, string> = {}
    const normalizedDescription = description.trim()
    if (!normalizedDescription) nextErrors.description = t('citizen.errorDescriptionRequired')
    else if ([...normalizedDescription].length > 2000) nextErrors.description = t('citizen.errorDescriptionLength')

    const lat = Number(latitude)
    const lon = Number(longitude)
    if (!latitude.trim() || !Number.isFinite(lat) || lat < -90 || lat > 90) nextErrors.latitude = t('citizen.errorLatitude')
    if (!longitude.trim() || !Number.isFinite(lon) || lon < -180 || lon > 180) nextErrors.longitude = t('citizen.errorLongitude')

    setErrors(nextErrors)
    setRequestError('')
    if (Object.keys(nextErrors).length > 0) return

    const request: CreateReportRequest = { type, description: normalizedDescription, latitude: lat, longitude: lon }
    setBusy(true)
    let created = savedReport
    try {
      if (!created) {
        created = await createReport(request)
        setSavedReport(created)
      }
      setUploading(evidence.length > 0)
      for (const file of evidence) {
        await uploadReportAttachment(created.id, file)
        setEvidence(current => current.filter(item => item !== file))
        setUploadedCount(current => current + 1)
      }
      onCreated(created)
    } catch (error) {
      setRequestError(created ? t('citizen.evidenceUploadError') : getErrorMessage(error, t))
    } finally {
      setBusy(false)
      setUploading(false)
    }
  }

  return (
    <form className="report-form" onSubmit={submit} noValidate>
      <div className="report-form__field">
        <label htmlFor="report-type">{t('citizen.type')}</label>
        <select id="report-type" value={type} disabled={fieldsDisabled} onChange={event => setType(event.target.value as ReportType)}>
          {reportTypes.map(value => <option key={value} value={value}>{typeLabel(t, value)}</option>)}
        </select>
      </div>

      <div className="report-form__field">
        <label htmlFor="report-description">{t('citizen.description')}</label>
        <textarea
          id="report-description"
          value={description}
          disabled={fieldsDisabled}
          onChange={event => setDescription(event.target.value)}
          rows={5}
          maxLength={2000}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? 'report-description-error' : 'report-description-hint'}
        />
        {errors.description
          ? <p id="report-description-error" className="report-field-error">{errors.description}</p>
          : <p id="report-description-hint" className="report-field-hint">{t('citizen.descriptionHint')}</p>}
      </div>

      <div className="report-form__coordinates">
        <Field id="report-latitude" label={`${t('citizen.latitude')} (latitude)`} inputMode="decimal" value={latitude} disabled={fieldsDisabled}
          onChange={event => setCoordinate('latitude', event.target.value)} placeholder={t('citizen.latitudePlaceholder')} error={errors.latitude} />
        <Field id="report-longitude" label={`${t('citizen.longitude')} (longitude)`} inputMode="decimal" value={longitude} disabled={fieldsDisabled}
          onChange={event => setCoordinate('longitude', event.target.value)} placeholder={t('citizen.longitudePlaceholder')} error={errors.longitude} />
      </div>

      <LocationMap value={selectedLocation} onChange={setLocation} disabled={fieldsDisabled}
        label={t('citizen.chooseLocation')} className="report-form__map" />

      <ReportEvidencePicker files={evidence} uploadedCount={uploadedCount} disabled={busy} onChange={setEvidence} />
      {requestError && <ErrorMessage>{requestError}</ErrorMessage>}
      <button type="submit" disabled={busy}>{busy ? t(uploading ? 'attachments.uploading' : 'citizen.sending')
        : savedReport ? t(evidence.length ? 'citizen.retryEvidence' : 'citizen.viewCreatedReport') : t('citizen.send')}</button>
      {savedReport && !busy && evidence.length > 0 && <button type="button" className="secondary"
        onClick={() => onCreated(savedReport)}>{t('citizen.viewCreatedReport')}</button>}
    </form>
  )
}

function WithdrawDialog({ report, busy, onCancel, onConfirm }: {
  report: Report
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const { t } = useI18n()
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelRef.current?.focus()
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) {
        event.preventDefault()
        onCancel()
        return
      }
      if (event.key !== 'Tab') return
      const buttons = [...(dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])]
      if (buttons.length === 0) return
      const first = buttons[0]
      const last = buttons[buttons.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [busy, onCancel])

  return (
    <div className="report-dialog-backdrop">
      <div ref={dialogRef} className="report-withdraw-confirm" role="alertdialog" aria-modal="true" aria-labelledby="withdraw-title" aria-describedby="withdraw-description">
        <h3 id="withdraw-title">{t('citizen.withdrawTitle')}</h3>
        <p id="withdraw-description">{t('citizen.withdrawDescription', { id: report.id })}</p>
        <div className="report-withdraw-confirm__actions">
          <button ref={cancelRef} type="button" className="secondary" disabled={busy} onClick={onCancel}>{t('disaster.form.cancel')}</button>
          <button type="button" disabled={busy} onClick={onConfirm}>{busy ? t('citizen.withdrawing') : t('citizen.confirmWithdraw')}</button>
        </div>
      </div>
    </div>
  )
}

function ReportList({ selectedId, onSelect, onWithdrawn }: {
  selectedId?: string
  onSelect: (reportId: string) => void
  onWithdrawn: (reportId: string) => void
}) {
  const { t, language } = useI18n()
  const [result, setResult] = useState<ReportPage>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [withdrawingId, setWithdrawingId] = useState<string>()
  const [confirmingReport, setConfirmingReport] = useState<Report>()
  const [page, setPage] = useState(0)
  const [status, setStatus] = useState<ReportStatusValue | ''>('')
  const [type, setType] = useState<ReportType | ''>('')
  const [refreshKey, setRefreshKey] = useState(0)
  const withdrawTriggerRef = useRef<HTMLButtonElement | null>(null)
  const listTitleRef = useRef<HTMLHeadingElement>(null)
  const loadSequenceRef = useRef(0)

  const load = useCallback(async () => {
    const requestId = ++loadSequenceRef.current
    setLoading(true)
    setError('')
    try {
      const next = await listReports({ page, size: PAGE_SIZE, sort: 'createdAt,desc', status: status || undefined, type: type || undefined })
      if (requestId !== loadSequenceRef.current) return
      setResult(next)
      if (next.items.length === 0 && page > 0 && next.totalPages <= page) setPage(Math.max(next.totalPages - 1, 0))
    } catch (cause) {
      if (requestId === loadSequenceRef.current) setError(getErrorMessage(cause, t))
    } finally {
      if (requestId === loadSequenceRef.current) setLoading(false)
    }
  }, [page, refreshKey, status, type])

  useEffect(() => {
    void load()
    return () => { loadSequenceRef.current += 1 }
  }, [load])

  function closeDialog(restoreFocus = true) {
    setConfirmingReport(undefined)
    if (restoreFocus) withdrawTriggerRef.current?.focus()
  }

  async function handleWithdraw() {
    if (!confirmingReport || withdrawingId || confirmingReport.status !== 'PENDING') return
    const report = confirmingReport
    setWithdrawingId(report.id)
    setActionError('')
    try {
      await withdrawReport(report.id)
      closeDialog(false)
      onWithdrawn(report.id)
      if (result?.items.length === 1 && page > 0) setPage(value => value - 1)
      else setRefreshKey(value => value + 1)
      listTitleRef.current?.focus()
    } catch (cause) {
      setActionError(getErrorMessage(cause, t))
      if (cause instanceof ApiError && (cause.status === 404 || cause.status === 409)) {
        closeDialog()
        setRefreshKey(value => value + 1)
      }
    } finally {
      setWithdrawingId(undefined)
    }
  }

  return (
    <section className="report-list" aria-labelledby="report-list-title">
      <div className="report-list__heading">
        <h2 ref={listTitleRef} id="report-list-title" tabIndex={-1}>{t('citizen.myReports')}</h2>
        <button type="button" className="secondary" onClick={() => setRefreshKey(value => value + 1)} disabled={loading || Boolean(withdrawingId)}>{t('citizen.refresh')}</button>
      </div>

      <div className="report-list__filters" aria-label={t('citizen.filterLabel')}>
        <label htmlFor="report-status-filter">{t('reporting.status')}</label>
        <select id="report-status-filter" value={status} onChange={event => { setStatus(event.target.value as ReportStatusValue | ''); setPage(0) }}>
          <option value="">{t('citizen.all')}</option>
          {reportStatuses.map(value => <option key={value} value={value}>{language === 'vi' ? reportStatusLabels[value] : statusLabel(t, value)}</option>)}
        </select>
        <label htmlFor="report-type-filter">{t('citizen.type')}</label>
        <select id="report-type-filter" value={type} onChange={event => { setType(event.target.value as ReportType | ''); setPage(0) }}>
          <option value="">{t('citizen.all')}</option>
          {reportTypes.map(value => <option key={value} value={value}>{typeLabel(t, value)}</option>)}
        </select>
      </div>

      <div className="report-list__content">
        {actionError && <ErrorMessage>{actionError}</ErrorMessage>}
        {loading && <Loading>{t('reporting.loading')}</Loading>}
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {!loading && !error && result?.items.length === 0 && (
          <EmptyState>{status || type ? t('citizen.noFilteredReports') : t('citizen.noReports')}</EmptyState>
        )}

        {!loading && !error && result && result.items.length > 0 && (
          <ul className="report-list__items">
            {result.items.map(report => (
              <li key={report.id}>
                <div className="report-list__item-row" data-selected={selectedId === report.id}>
                  <button type="button" className="report-list__item" aria-pressed={selectedId === report.id} onClick={() => onSelect(report.id)}>
                    <span className="report-list__item-heading">
                      <strong>{typeLabel(t, report.type)}</strong>
                      <ReportStatus status={report.status} />
                    </span>
                    <span className="report-list__item-main">
                      <span>{report.description}</span>
                    </span>
                  </button>
                  <div className="report-list__item-footer">
                    <small>{formatDate(report.createdAt)}</small>
                    {report.status === 'PENDING' && (
                      <button
                        type="button"
                        className="report-withdraw-btn"
                        disabled={Boolean(withdrawingId)}
                        onClick={event => {
                          withdrawTriggerRef.current = event.currentTarget
                          setActionError('')
                          setConfirmingReport(report)
                        }}
                      >{t('citizen.withdraw')}</button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {confirmingReport && <WithdrawDialog report={confirmingReport} busy={Boolean(withdrawingId)} onCancel={() => closeDialog()} onConfirm={() => void handleWithdraw()} />}

      {!loading && !error && result && result.items.length > 0 && (
        <nav className="report-list__pagination" aria-label={t('reporting.pagination')}>
          <button type="button" className="secondary" disabled={page === 0 || loading || Boolean(withdrawingId)} onClick={() => setPage(value => value - 1)}>{t('shared.previous')}</button>
          <span aria-current="page">Trang {result.page + 1} / {Math.max(result.totalPages, 1)}</span>
          <button type="button" className="secondary" disabled={page + 1 >= result.totalPages || loading || Boolean(withdrawingId)} onClick={() => setPage(value => value + 1)}>{t('shared.next')}</button>
        </nav>
      )}
    </section>
  )
}

function MissionProgress({ report }: { report: Report }) {
  const { t, language } = useI18n()
  const [mission, setMission] = useState<Mission>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let active = true
    setMission(undefined)
    setError('')
    if (report.status !== 'VERIFIED') return () => { active = false }

    setLoading(true)
    void listReportMissions(report.id)
      .then(result => { if (active) setMission(result.items[0]) })
      .catch(cause => { if (active) setError(getErrorMessage(cause, t)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [report.id, report.status, refreshKey])

  return (
    <section className="mission-progress" aria-labelledby="mission-progress-title">
      <div className="mission-progress__heading">
        <h3 id="mission-progress-title">{t('citizen.rescueProgress')}</h3>
        {report.status === 'VERIFIED' && (
          <button type="button" className="secondary" disabled={loading} onClick={() => setRefreshKey(value => value + 1)}>{t('citizen.refreshProgress')}</button>
        )}
      </div>
      {report.status !== 'VERIFIED' && (
        <EmptyState>{t('citizen.verifyBeforeRescue')}</EmptyState>
      )}
      {report.status === 'VERIFIED' && loading && <Loading>{t('citizen.loadingProgress')}</Loading>}
      {report.status === 'VERIFIED' && error && (
        <ErrorMessage>{error}</ErrorMessage>
      )}
      {report.status === 'VERIFIED' && !loading && !error && !mission && (
        <EmptyState>{t('citizen.noMission')}</EmptyState>
      )}
      {report.status === 'VERIFIED' && !loading && !error && mission && (
        <dl className="mission-progress__facts">
          <div><dt>{t('reporting.status')}</dt><dd><span className={`mission-status mission-status--${mission.status.toLowerCase()}`}>{language === 'vi' ? missionStatusLabels[mission.status] : missionLabel(t, mission.status)}</span></dd></div>
          <div><dt>{t('citizen.missionId')}</dt><dd>{mission.id}</dd></div>
          <div><dt>{t('citizen.assignedAt')}</dt><dd>{formatDate(mission.assignedAt)}</dd></div>
          {mission.startedAt && <div><dt>{t('citizen.startedAt')}</dt><dd>{formatDate(mission.startedAt)}</dd></div>}
          {mission.completedAt && <div><dt>{t('citizen.completedAt')}</dt><dd>{formatDate(mission.completedAt)}</dd></div>}
          <div><dt>{t('citizen.lastUpdated')}</dt><dd>{formatDate(mission.updatedAt)}</dd></div>
        </dl>
      )}
    </section>
  )
}

function ReportDetail({ reportId }: { reportId?: string }) {
  const { t } = useI18n()
  const [report, setReport] = useState<Report>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let active = true
    setReport(undefined)
    setError('')
    if (!reportId) return () => { active = false }
    setLoading(true)
    void getReport(reportId)
      .then(value => { if (active) setReport(value) })
      .catch(cause => { if (active) setError(getErrorMessage(cause, t)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [reportId, refreshKey])

  if (!reportId) return <EmptyState>{t('citizen.selectReport')}</EmptyState>
  if (loading) return <Loading>{t('reporting.loadingDetail')}</Loading>
  if (error) return <ErrorMessage>{error}</ErrorMessage>
  if (!report) return null

  return (
    <div className="reporting-citizen-detail" aria-live="polite">
      <div className="reporting-citizen-detail__heading">
        <h2>{t('citizen.reportDetail')}</h2>
        <button type="button" className="secondary" onClick={() => setRefreshKey(value => value + 1)}>
          {t('citizen.refreshDetail')}
        </button>
      </div>
      <dl className="report-detail-list">
        <div><dt>{t('reporting.id')}</dt><dd>{report.id}</dd></div>
        <div><dt>{t('citizen.typeLabel')}</dt><dd>{typeLabel(t, report.type)}</dd></div>
        <div><dt>{t('reporting.status')}</dt><dd><ReportStatus status={report.status} /></dd></div>
        <div><dt>{t('citizen.descriptionLabel')}</dt><dd>{report.description}</dd></div>
        <div><dt>{t('reporting.coordinates')}</dt><dd>{report.latitude}, {report.longitude}</dd></div>
        <div><dt>{t('citizen.submittedAt')}</dt><dd>{formatDate(report.createdAt)}</dd></div>
        <div><dt>{t('citizen.updatedAt')}</dt><dd>{formatDate(report.updatedAt)}</dd></div>
        {report.rejectionReason && <div><dt>{t('reporting.rejectionReason')}</dt><dd>{report.rejectionReason}</dd></div>}
      </dl>
      <LocationMap value={{ latitude: report.latitude, longitude: report.longitude }} readOnly
        label={`${t('citizen.location')} ${report.id}`} className="reporting-citizen-detail__map" />
      <ReportAttachments reportId={report.id} canManage={report.status === 'PENDING'} />
      <MissionProgress report={report} />
    </div>
  )
}

export function ReportingCitizenPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const isCreatePage = location.pathname === '/reports/new'
  const navigationState = location.state as { selectedReportId?: string } | null
  const [selectedId, setSelectedId] = useState<string | undefined>(navigationState?.selectedReportId)

  function handleCreated(report: Report) {
    setSelectedId(report.id)
    navigate('/my-reports', { state: { selectedReportId: report.id } })
  }

  return (
    <div className="reporting-citizen-page">
      <PageHeader
        eyebrow={t('citizen.eyebrow')}
        title={isCreatePage ? t('citizen.createTitle') : t('citizen.trackingTitle')}
        description={isCreatePage ? t('citizen.createDescription') : t('citizen.trackingDescription')}
      />

      {isCreatePage ? (
        <section className="reporting-citizen-card" aria-labelledby="create-report-title">
          <h2 id="create-report-title">{t('citizen.createHeading')}</h2>
          <CreateReportForm onCreated={handleCreated} />
        </section>
      ) : (
        <div className="reporting-citizen-layout">
          <section className="reporting-citizen-card">
            <ReportList selectedId={selectedId} onSelect={setSelectedId} onWithdrawn={reportId => setSelectedId(current => current === reportId ? undefined : current)} />
          </section>
          <section className="reporting-citizen-card" aria-label={t('citizen.reportDetail')}>
            <ReportDetail reportId={selectedId} />
            <button type="button" className="secondary" onClick={() => navigate('/reports/new')}>{t('citizen.newReport')}</button>
          </section>
        </div>
      )}
    </div>
  )
}
