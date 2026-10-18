import { ApiError } from '../../shared/api'
import { useI18n, type TranslationKey } from '../../shared/i18n'
import type { ReportStatus } from './reporting-api'

export const reportStatuses: ReportStatus[] = ['PENDING', 'VERIFIED', 'REJECTED']
export const statusLabels: Record<ReportStatus, string> = { PENDING: 'Chờ xử lý', VERIFIED: 'Đã xác minh', REJECTED: 'Đã từ chối' }
export const dates = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })
export function reportStatusLabel(t: (key: TranslationKey) => string, status: ReportStatus) { return t(`reporting.status.${status}` as TranslationKey) }
export function ReportBadge({ status }: { status: ReportStatus }) {
  const { t, language } = useI18n()
  return <span className={`report-status report-status--${status.toLowerCase()}`}>{language === 'vi' ? statusLabels[status] : reportStatusLabel(t, status)} · {status}</span>
}
export function errorText(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 409) return error.problem?.code === 'DISASTER_NOT_ACTIVE'
      ? '409: Thảm họa không còn ACTIVE. Hãy kiểm tra lại và chọn thảm họa đang hoạt động.'
      : '409: Báo cáo đã được xử lý hoặc rút. Hãy kiểm tra dữ liệu mới trước khi tiếp tục.'
    if (error.status === 404) return '404: Không tìm thấy dữ liệu hoặc không còn quyền truy cập. Báo cáo có thể đã được rút.'
    if (error.status === 400) return 'Thông tin không hợp lệ. Kiểm tra dữ liệu trước khi thử lại.'
    return `${error.status}: ${error.message}`
  }
  return 'Không thể kết nối máy chủ. Vui lòng thử lại.'
}
export function Pagination({ page, totalPages, disabled, label, onPage }: {
  page: number; totalPages: number; disabled: boolean; label: string; onPage: (page: number) => void
}) {
  const { t } = useI18n()
  if (totalPages <= 1 && page === 0) return null
  return <nav className="report-pagination" aria-label={label}>
    <button type="button" className="secondary" disabled={disabled || page === 0} onClick={() => onPage(page - 1)}>{t('shared.previous')}</button>
    <span aria-current="page">{page + 1} / {Math.max(totalPages, 1)}</span>
    <button type="button" className="secondary" disabled={disabled || page + 1 >= totalPages || page >= 1000000} onClick={() => onPage(page + 1)}>{t('shared.next')}</button>
  </nav>
}
