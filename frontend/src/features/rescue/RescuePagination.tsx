import type { Page } from './rescue-api'
import { useI18n } from '../../shared/i18n'

export function RescuePagination<T>({ result, label, disabled, onPageChange }: {
  result: Page<T>
  label: string
  disabled: boolean
  onPageChange: (page: number) => void
}) {
  const { t } = useI18n()
  if (result.totalPages <= 1) return null
  const first = result.page * result.size + 1
  const last = Math.min((result.page + 1) * result.size, result.totalElements)
  return <div className="rescue-pagination">
    <p><span className="rescue-pagination__range">{first}–{last} / </span>{result.totalElements} {label}</p>
    <nav aria-label={`Phân trang ${label}`}>
      <button type="button" className="secondary" disabled={disabled || result.page === 0}
        onClick={() => onPageChange(result.page - 1)}>{t('shared.previous')}</button>
      <span aria-current="page">{result.page + 1} / {result.totalPages}</span>
      <button type="button" className="secondary" disabled={disabled || result.page + 1 >= result.totalPages}
        onClick={() => onPageChange(result.page + 1)}>{t('shared.next')}</button>
    </nav>
  </div>
}
