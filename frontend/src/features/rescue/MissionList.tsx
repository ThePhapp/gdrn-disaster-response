import { EmptyState, Loading } from '../../shared/components'
import { useI18n } from '../../shared/i18n'
import type { Mission, Page } from './rescue-api'
import { MissionStatusBadge } from './RescueBadges'

const dateTime = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })

function compactId(id: string) {
  return id.length > 12 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id
}

export function MissionList({ result, loading, selectedId, onSelect }: {
  result?: Page<Mission>
  loading: boolean
  selectedId?: string
  onSelect: (mission: Mission) => void
}) {
  const { t } = useI18n()
  if (loading && !result) return <Loading>{t('rescue.loading')}</Loading>
  if (!result?.items.length) return <EmptyState>{t('rescue.empty')}</EmptyState>
  return <div className="rescue-list" aria-busy={loading} aria-label={t('rescue.missions')}>
    {result.items.map(mission => <button type="button" key={mission.id}
      className={`rescue-list__item${selectedId === mission.id ? ' is-selected' : ''}`}
      aria-pressed={selectedId === mission.id} onClick={() => onSelect(mission)}>
      <span className="rescue-list__identity">
        <strong>{t('rescue.missions')} {compactId(mission.id)}</strong>
        <small>{t('rescue.teamId')} {compactId(mission.teamId)} · {dateTime.format(new Date(mission.assignedAt))}</small>
        <small>{t('rescue.report')} {compactId(mission.reportId)}</small>
      </span>
      <MissionStatusBadge status={mission.status} />
    </button>)}
  </div>
}
