import { EmptyState, Loading } from '../../shared/components'
import { useI18n } from '../../shared/i18n'
import type { Disaster, DisasterPage } from './disaster-api'
import { disasterLabel, SeverityBadge, StatusBadge } from './DisasterBadges'

const date = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })

export function DisasterList({ result, loading, selectedId, onSelect }: {
  result?: DisasterPage
  loading: boolean
  selectedId?: string
  onSelect: (disaster: Disaster) => void
}) {
  const { t } = useI18n()
  if (loading && !result) return <Loading>{t('disaster.loadingList')}</Loading>
  if (!result?.items.length) return <EmptyState>{t('disaster.empty')}</EmptyState>
  return <div className="disaster-list" aria-busy={loading} aria-label={t('disaster.listLabel')}>
    {result.items.map(disaster => <button type="button" key={disaster.id}
      className={`disaster-list__item${selectedId === disaster.id ? ' is-selected' : ''}`}
      aria-pressed={selectedId === disaster.id} onClick={() => onSelect(disaster)}>
      <span className="disaster-list__identity"><strong title={disaster.name}>{disaster.name}</strong>
        <small>{disasterLabel(t, disaster.type)} · <time dateTime={disaster.createdAt}>{date.format(new Date(disaster.createdAt))}</time></small></span>
      <span className="disaster-list__badges"><SeverityBadge severity={disaster.severity} /><StatusBadge status={disaster.status} /></span>
    </button>)}
  </div>
}
