
import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../../shared/api'
import { EmptyState, ErrorMessage, Field, Loading, PageHeader } from '../../shared/components'
import {
  createReport,
  listReports,
  reportTypes,
  withdrawReport,
  type CreateReportRequest,
  type Report,
  type ReportPage,
  type ReportType,
} from './reporting-api'
import './reporting-citizen.css'

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

function ReportStatus({ status }: { status: Report['status'] }) {
  const labels: Record<Report['status'], string> = {
    PENDING: 'Đang chờ xác minh',
    VERIFIED: 'Đã xác minh',
    REJECTED: 'Bị từ chối',
  }
  return <span className={`report-status report-status--${status.toLowerCase()}`}>{labels[status]}</span>
}

function CreateReportForm({ onCreated }: { onCreated: (report: Report) => void }) {
  const [type, setType] = useState<ReportType>('FLOOD')
  const [description, setDescription] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [requestError, setRequestError] = useState('')

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return

    const nextErrors: Record<string, string> = {}
    if (!description.trim()) nextErrors.description = 'Vui lòng mô tả tình huống.'
    else if (description.trim().length > 2000) nextErrors.description = 'Mô tả không được vượt quá 2000 ký tự.'

    const lat = Number(latitude)
    const lon = Number(longitude)
    if (!latitude.trim() || !Number.isFinite(lat) || lat < -90 || lat > 90) {
      nextErrors.latitude = 'Vĩ độ phải là số từ -90 đến 90.'
    }
    if (!longitude.trim() || !Number.isFinite(lon) || lon < -180 || lon > 180) {
      nextErrors.longitude = 'Kinh độ phải là số từ -180 đến 180.'
    }

    setErrors(nextErrors)
    setRequestError('')
    if (Object.keys(nextErrors).length > 0) return

    const request: CreateReportRequest = {
      type,
      description: description.trim(),
      latitude: lat,
      longitude: lon,
    }

    setBusy(true)
    try {
      const report = await createReport(request)
      onCreated(report)
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
          {reportTypes.map(value => (
            <option key={value} value={value}>{value}</option>
          ))}
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
        <Field
          id="report-latitude"
          label="Vĩ độ (latitude)"
          inputMode="decimal"
          value={latitude}
          onChange={event => setLatitude(event.target.value)}
          placeholder="Ví dụ: 21.0285"
          error={errors.latitude}
        />
        <Field
          id="report-longitude"
          label="Kinh độ (longitude)"
          inputMode="decimal"
          value={longitude}
          onChange={event => setLongitude(event.target.value)}
          placeholder="Ví dụ: 105.8542"
          error={errors.longitude}
        />
      </div>

      {requestError && <ErrorMessage>{requestError}</ErrorMessage>}

      <button type="submit" disabled={busy}>
        {busy ? 'Đang gửi báo cáo…' : 'Gửi báo cáo'}
      </button>
    </form>
  )
}


function ReportList({
  onSelect,
  onWithdrawn,
}: {
  onSelect: (report: Report) => void
  onWithdrawn: (reportId: string) => void
}) {
  const [result, setResult] = useState<ReportPage>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [withdrawingId, setWithdrawingId] = useState<string>()
  const [confirmingReport, setConfirmingReport] = useState<Report>()
  const [page, setPage] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setResult(await listReports({ page, size: 10, sort: 'createdAt,desc' }))
    } catch (cause) {
      setError(getErrorMessage(cause))
    } finally {
      setLoading(false)
    }
  }, [page, refreshKey])

  useEffect(() => {
    void load()
  }, [load])

  async function handleWithdraw() {
    if (!confirmingReport || withdrawingId) return

    const report = confirmingReport
    if (report.status !== 'PENDING') return

    setWithdrawingId(report.id)
    setActionError('')

    try {
      await withdrawReport(report.id)
      setConfirmingReport(undefined)
      onWithdrawn(report.id)
      setRefreshKey(value => value + 1)
    } catch (cause) {
      setActionError(getErrorMessage(cause))

      if (cause instanceof ApiError && (cause.status === 404 || cause.status === 409)) {
        setConfirmingReport(undefined)
        setRefreshKey(value => value + 1)
      }
    } finally {
      setWithdrawingId(undefined)
    }
  }

  return (
    <section className="report-list" aria-labelledby="report-list-title">
      <div className="report-list__heading">
        <h2 id="report-list-title">Báo cáo của tôi</h2>
        <button
          type="button"
          className="secondary"
          onClick={() => setRefreshKey(value => value + 1)}
          disabled={loading || Boolean(withdrawingId)}
        >
          Làm mới
        </button>
      </div>

      {actionError && <ErrorMessage>{actionError}</ErrorMessage>}
      {loading && <Loading>Đang tải danh sách báo cáo…</Loading>}
      {error && <ErrorMessage>{error}</ErrorMessage>}

      {!loading && !error && result?.items.length === 0 && (
        <EmptyState>Bạn chưa có báo cáo nào.</EmptyState>
      )}

      {!loading && !error && result && result.items.length > 0 && (
        <>
          <ul className="report-list__items">
            {result.items.map(report => (
              <li key={report.id}>
                <div className="report-list__item-row">
                  <button
                    type="button"
                    className="report-list__item"
                    onClick={() => onSelect(report)}
                  >
                    <span className="report-list__item-main">
                      <strong>{report.type}</strong>
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
                      onClick={() => {
                        setActionError('')
                        setConfirmingReport(report)
                      }}
                    >
                      Rút báo cáo
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className="report-list__pagination">
            <button
              type="button"
              className="secondary"
              disabled={page === 0 || loading || Boolean(withdrawingId)}
              onClick={() => setPage(value => value - 1)}
            >
              Trang trước
            </button>
            <span>Trang {page + 1} / {Math.max(result.totalPages, 1)}</span>
            <button
              type="button"
              className="secondary"
              disabled={page + 1 >= result.totalPages || loading || Boolean(withdrawingId)}
              onClick={() => setPage(value => value + 1)}
            >
              Trang sau
            </button>
          </div>
        </>
      )}

      {confirmingReport && (
        <div className="report-withdraw-confirm" role="alertdialog" aria-modal="true" aria-labelledby="withdraw-title" aria-describedby="withdraw-description">
          <h3 id="withdraw-title">Xác nhận rút báo cáo</h3>
          <p id="withdraw-description">
            Bạn có chắc muốn rút báo cáo này không? Thao tác này không thể hoàn tác.
          </p>
          <div className="report-withdraw-confirm__actions">
            <button
              type="button"
              className="secondary"
              disabled={Boolean(withdrawingId)}
              onClick={() => setConfirmingReport(undefined)}
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={Boolean(withdrawingId)}
              onClick={() => void handleWithdraw()}
            >
              {withdrawingId ? 'Đang rút…' : 'Xác nhận rút'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

export function ReportingCitizenPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const isCreatePage = location.pathname === '/reports/new'
  const [selected, setSelected] = useState<Report>()

    const handleCreated = (report: Report) => {
    setSelected(report)
    navigate('/my-reports')
  }

  return (
    <main className="reporting-citizen-page">
      <PageHeader
        eyebrow="GDRN · NGƯỜI DÂN"
        title={isCreatePage ? 'Tạo báo cáo mới' : 'Báo cáo sự cố'}
        description={
          isCreatePage
            ? 'Cung cấp mô tả và tọa độ để đội xử lý xác định vị trí.'
            : 'Theo dõi trạng thái và quản lý các báo cáo sự cố của bạn.'
        }
      />

      {isCreatePage ? (
        <section
          className="reporting-citizen-card"
          aria-labelledby="create-report-title"
        >
          <h2 id="create-report-title">Tạo báo cáo mới</h2>
          <CreateReportForm onCreated={handleCreated} />
        </section>
      ) : (
        <div className="reporting-citizen-layout">
          <section className="reporting-citizen-card">
            <ReportList
              onSelect={report => setSelected(report)}
              onWithdrawn={reportId => {
                setSelected(current =>
                  current?.id === reportId ? undefined : current,
                )
              }}
            />
          </section>

          <section className="reporting-citizen-card">
            {selected ? (
              <aside
                className="reporting-citizen-detail"
                aria-live="polite"
              >
                <h2>Chi tiết báo cáo</h2>
                <p>
                  <strong>Mã báo cáo:</strong> {selected.id}
                </p>
                <p>
                  <strong>Loại:</strong> {selected.type}
                </p>
                <p>
                  <strong>Trạng thái:</strong>{' '}
                  <ReportStatus status={selected.status} />
                </p>
                <p>{selected.description}</p>
                <p>
                  <strong>Tọa độ:</strong> {selected.latitude},{' '}
                  {selected.longitude}
                </p>
              </aside>
            ) : (
              <EmptyState>
                Chọn một báo cáo để xem chi tiết.
              </EmptyState>
            )}

            <button
              type="button"
              className="secondary"
              onClick={() => navigate('/reports/new')}
            >
              Tạo báo cáo mới
            </button>
          </section>
        </div>
      )}
    </main>
  )
}