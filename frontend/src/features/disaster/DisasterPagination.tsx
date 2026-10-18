import type { DisasterPage } from './disaster-api'
import { useI18n } from '../../shared/i18n'

export function DisasterPagination({ result, disabled, onPageChange }: {
  result: DisasterPage
  disabled: boolean
  onPageChange: (page: number) => void
}) {
  const { t } = useI18n()
  if (result.totalPages <= 1) return null
  const first = result.page * result.size + 1
  const last = Math.min((result.page + 1) * result.size, result.totalElements)
  return <div className="disaster-pagination">
    <p><span className="disaster-pagination__range">{first}–{last} / </span>{t('disaster.count', { count: result.totalElements })}</p>
    <nav aria-label={t('disaster.pageLabel')}>
      <button type="button" className="secondary" disabled={result.page === 0 || disabled}
        onClick={() => onPageChange(result.page - 1)}>{t('disaster.previous')}</button>
      <span aria-current="page">{result.page + 1} / {result.totalPages}</span>
      <button type="button" className="secondary" disabled={result.page + 1 >= result.totalPages || disabled}
        onClick={() => onPageChange(result.page + 1)}>{t('disaster.next')}</button>
    </nav>
  </div>
}
