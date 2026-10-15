import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../../shared/api'
import { EmptyState, ErrorMessage, Field, Loading, PageHeader } from '../../shared/components'
import { LocationMap, type LocationValue } from '../../shared/location'
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

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 404) return 'Không tìm thấy dữ liệu báo cáo.'
    if (error.status === 409) return 'Dữ liệu đã thay đổi. Vui lòng tải lại và thử lại.'
    return error.message
  }
  if (error instanceof DOMException && error.name === 'AbortError') return ''
  return 'Không thể kết nối máy chủ. Vui lòng thử lại.'
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN')
}

function ReportStatus({ status }: { status: ReportStatusValue }) {
  return <span className={`report-status report-status--${status.toLowerCase()}`}>{reportStatusLabels[status]}</span>
}

function CreateReportForm({ onCreated }: { onCreated: (report: Report) => void }) {
  const [type, setType] = useState<ReportType>('FLOOD')
  const [description, setDescription] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [requestError, setRequestError] = useState('')
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
    if (!normalizedDescription) nextErrors.description = 'Vui lòng mô tả tình huống.'
    else if ([...normalizedDescription].length > 2000) nextErrors.description = 'Mô tả không được vượt quá 2000 ký tự.'

    const lat = Number(latitude)
    const lon = Number(longitude)
    if (!latitude.trim() || !Number.isFinite(lat) || lat < -90 || lat > 90) nextErrors.latitude = 'Vĩ độ phải là số từ -90 đến 90.'
    if (!longitude.trim() || !Number.isFinite(lon) || lon < -180 || lon > 180) nextErrors.longitude = 'Kinh độ phải là số từ -180 đến 180.'

    setErrors(nextErrors)
    setRequestError('')
    if (Object.keys(nextErrors).length > 0) return

    const request: CreateReportRequest = { type, description: normalizedDescription, latitude: lat, longitude: lon }
    setBusy(true)
    try {
      onCreated(await createReport(request))
    } catch (error) {
      setRequestError(getErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="report-form" onSubmit={submit} noValidate>
      <div className="report-form__field">
        <label htmlFor="report-type">Loại sự cố</label>
        <select id="report-type" value={type} onChange={event => setType(event.target.value as ReportType)}>
          {reportTypes.map(value => <option key={value} value={value}>{reportTypeLabels[value]}</option>)}
        </select>
      </div>

      <div className="report-form__field">
        <label htmlFor="report-description">Mô tả tình huống</label>
        <textarea
          id="report-description"
          value={description}
          onChange={event => setDescription(event.target.value)}
          rows={5}
          maxLength={2000}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? 'report-description-error' : 'report-description-hint'}
        />
        {errors.description
          ? <p id="report-description-error" className="report-field-error">{errors.description}</p>
          : <p id="report-description-hint" className="report-field-hint">Tối đa 2000 ký tự. Không nhập thông tin nhạy cảm.</p>}
      </div>

      <div className="report-form__coordinates">
        <Field id="report-latitude" label="Vĩ độ (latitude)" inputMode="decimal" value={latitude}
          onChange={event => setCoordinate('latitude', event.target.value)} placeholder="Ví dụ: 21.0285" error={errors.latitude} />
        <Field id="report-longitude" label="Kinh độ (longitude)" inputMode="decimal" value={longitude}
          onChange={event => setCoordinate('longitude', event.target.value)} placeholder="Ví dụ: 105.8542" error={errors.longitude} />
      </div>

      <LocationMap value={selectedLocation} onChange={setLocation} disabled={busy}
        label="Chọn vị trí báo cáo" className="report-form__map" />

      {requestError && <ErrorMessage>{requestError}</ErrorMessage>}
      <button type="submit" disabled={busy}>{busy ? 'Đang gửi báo cáo…' : 'Gửi báo cáo'}</button>
    </form>
  )
}

function WithdrawDialog({ report, busy, onCancel, onConfirm }: {
  report: Report
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
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
        <h3 id="withdraw-title">Xác nhận rút báo cáo</h3>
        <p id="withdraw-description">Bạn có chắc muốn rút báo cáo {report.id} không? Thao tác này không thể hoàn tác.</p>
        <div className="report-withdraw-confirm__actions">
          <button ref={cancelRef} type="button" className="secondary" disabled={busy} onClick={onCancel}>Hủy</button>
          <button type="button" disabled={busy} onClick={onConfirm}>{busy ? 'Đang rút…' : 'Xác nhận rút'}</button>
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
      if (requestId === loadSequenceRef.current) setError(getErrorMessage(cause))
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
      setActionError(getErrorMessage(cause))
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
        <h2 ref={listTitleRef} id="report-list-title" tabIndex={-1}>Báo cáo của tôi</h2>
        <button type="button" className="secondary" onClick={() => setRefreshKey(value => value + 1)} disabled={loading || Boolean(withdrawingId)}>Làm mới</button>
      </div>

      <div className="report-list__filters" aria-label="Lọc báo cáo">
        <label htmlFor="report-status-filter">Trạng thái</label>
        <select id="report-status-filter" value={status} onChange={event => { setStatus(event.target.value as ReportStatusValue | ''); setPage(0) }}>
          <option value="">Tất cả</option>
          {reportStatuses.map(value => <option key={value} value={value}>{reportStatusLabels[value]}</option>)}
        </select>
        <label htmlFor="report-type-filter">Loại sự cố</label>
        <select id="report-type-filter" value={type} onChange={event => { setType(event.target.value as ReportType | ''); setPage(0) }}>
          <option value="">Tất cả</option>
          {reportTypes.map(value => <option key={value} value={value}>{reportTypeLabels[value]}</option>)}
        </select>
      </div>

      {actionError && <ErrorMessage>{actionError}</ErrorMessage>}
      {loading && <Loading>Đang tải danh sách báo cáo…</Loading>}
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {!loading && !error && result?.items.length === 0 && (
        <EmptyState>{status || type ? 'Không có báo cáo phù hợp với bộ lọc.' : 'Bạn chưa có báo cáo nào.'}</EmptyState>
      )}

      {!loading && !error && result && result.items.length > 0 && (
        <>
          <ul className="report-list__items">
            {result.items.map(report => (
              <li key={report.id}>
                <div className="report-list__item-row">
                  <button type="button" className="report-list__item" aria-pressed={selectedId === report.id} onClick={() => onSelect(report.id)}>
                    <span className="report-list__item-main">
                      <strong>{reportTypeLabels[report.type]}</strong>
                      <span>{report.description}</span>
                      <small>{formatDate(report.createdAt)}</small>
                    </span>
                    <ReportStatus status={report.status} />
                  </button>
                  {report.status === 'PENDING' && (
                    <button
                      type="button"
                      className="secondary"
                      disabled={Boolean(withdrawingId)}
                      onClick={event => {
                        withdrawTriggerRef.current = event.currentTarget
                        setActionError('')
                        setConfirmingReport(report)
                      }}
                    >Rút báo cáo</button>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className="report-list__pagination">
            <button type="button" className="secondary" disabled={page === 0 || loading || Boolean(withdrawingId)} onClick={() => setPage(value => value - 1)}>Trang trước</button>
            <span>Trang {result.page + 1} / {Math.max(result.totalPages, 1)}</span>
            <button type="button" className="secondary" disabled={page + 1 >= result.totalPages || loading || Boolean(withdrawingId)} onClick={() => setPage(value => value + 1)}>Trang sau</button>
          </div>
        </>
      )}

      {confirmingReport && <WithdrawDialog report={confirmingReport} busy={Boolean(withdrawingId)} onCancel={() => closeDialog()} onConfirm={() => void handleWithdraw()} />}
    </section>
  )
}

function MissionProgress({ report }: { report: Report }) {
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
      .catch(cause => { if (active) setError(getErrorMessage(cause)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [report.id, report.status, refreshKey])

  return (
    <section className="mission-progress" aria-labelledby="mission-progress-title">
      <div className="mission-progress__heading">
        <h3 id="mission-progress-title">Tiến độ cứu hộ</h3>
        {report.status === 'VERIFIED' && (
          <button type="button" className="secondary" disabled={loading} onClick={() => setRefreshKey(value => value + 1)}>Làm mới tiến độ</button>
        )}
      </div>
      {report.status !== 'VERIFIED' && (
        <EmptyState>Báo cáo cần được xác minh trước khi có thể phân công cứu hộ.</EmptyState>
      )}
      {report.status === 'VERIFIED' && loading && <Loading>Đang tải tiến độ cứu hộ…</Loading>}
      {report.status === 'VERIFIED' && error && (
        <ErrorMessage>{error}</ErrorMessage>
      )}
      {report.status === 'VERIFIED' && !loading && !error && !mission && (
        <EmptyState>Chưa có nhiệm vụ cứu hộ cho báo cáo này.</EmptyState>
      )}
      {report.status === 'VERIFIED' && !loading && !error && mission && (
        <dl className="mission-progress__facts">
          <div><dt>Trạng thái</dt><dd><span className={`mission-status mission-status--${mission.status.toLowerCase()}`}>{missionStatusLabels[mission.status]}</span></dd></div>
          <div><dt>Mã nhiệm vụ</dt><dd>{mission.id}</dd></div>
          <div><dt>Thời gian phân công</dt><dd>{formatDate(mission.assignedAt)}</dd></div>
          {mission.startedAt && <div><dt>Bắt đầu cứu hộ</dt><dd>{formatDate(mission.startedAt)}</dd></div>}
          {mission.completedAt && <div><dt>Hoàn thành</dt><dd>{formatDate(mission.completedAt)}</dd></div>}
          <div><dt>Cập nhật gần nhất</dt><dd>{formatDate(mission.updatedAt)}</dd></div>
        </dl>
      )}
    </section>
  )
}

function ReportDetail({ reportId }: { reportId?: string }) {
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
      .catch(cause => { if (active) setError(getErrorMessage(cause)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [reportId, refreshKey])

  if (!reportId) return <EmptyState>Chọn một báo cáo để xem chi tiết.</EmptyState>
  if (loading) return <Loading>Đang tải chi tiết báo cáo…</Loading>
  if (error) return <ErrorMessage>{error}</ErrorMessage>
  if (!report) return null

  return (
    <div className="reporting-citizen-detail" aria-live="polite">
      <div className="reporting-citizen-detail__heading">
        <h2>Chi tiết báo cáo</h2>
        <button type="button" className="secondary" onClick={() => setRefreshKey(value => value + 1)}>
          Làm mới chi tiết
        </button>
      </div>
      <dl className="report-detail-list">
        <div><dt>Mã báo cáo</dt><dd>{report.id}</dd></div>
        <div><dt>Loại</dt><dd>{reportTypeLabels[report.type]}</dd></div>
        <div><dt>Trạng thái</dt><dd><ReportStatus status={report.status} /></dd></div>
        <div><dt>Mô tả</dt><dd>{report.description}</dd></div>
        <div><dt>Tọa độ</dt><dd>{report.latitude}, {report.longitude}</dd></div>
        <div><dt>Thời gian gửi</dt><dd>{formatDate(report.createdAt)}</dd></div>
        <div><dt>Cập nhật</dt><dd>{formatDate(report.updatedAt)}</dd></div>
        {report.rejectionReason && <div><dt>Lý do từ chối</dt><dd>{report.rejectionReason}</dd></div>}
      </dl>
      <LocationMap value={{ latitude: report.latitude, longitude: report.longitude }} readOnly
        label={`Vị trí báo cáo ${report.id}`} className="reporting-citizen-detail__map" />
      <MissionProgress report={report} />
    </div>
  )
}

export function ReportingCitizenPage() {
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
        eyebrow="GDRN · NGƯỜI DÂN"
        title={isCreatePage ? 'Tạo báo cáo mới' : 'Báo cáo sự cố'}
        description={isCreatePage ? 'Cung cấp mô tả và tọa độ để đội xử lý xác định vị trí.' : 'Theo dõi trạng thái và quản lý các báo cáo sự cố của bạn.'}
      />

      {isCreatePage ? (
        <section className="reporting-citizen-card" aria-labelledby="create-report-title">
          <h2 id="create-report-title">Tạo báo cáo mới</h2>
          <CreateReportForm onCreated={handleCreated} />
        </section>
      ) : (
        <div className="reporting-citizen-layout">
          <section className="reporting-citizen-card">
            <ReportList selectedId={selectedId} onSelect={setSelectedId} onWithdrawn={reportId => setSelectedId(current => current === reportId ? undefined : current)} />
          </section>
          <section className="reporting-citizen-card" aria-label="Chi tiết báo cáo">
            <ReportDetail reportId={selectedId} />
            <button type="button" className="secondary" onClick={() => navigate('/reports/new')}>Tạo báo cáo mới</button>
          </section>
        </div>
      )}
    </div>
  )
}
