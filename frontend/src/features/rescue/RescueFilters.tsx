import { missionStatuses, type MissionFilters, type MissionStatus } from './rescue-api'
import { rescueStatusLabel } from './RescueBadges'
import { useI18n } from '../../shared/i18n'

export function RescueFilters({ filters, onChange }: {
  filters: MissionFilters
  onChange: (next: Partial<MissionFilters>) => void
}) {
  const { t } = useI18n()
  return <fieldset className="rescue-filters">
    <legend className="sr-only">{t('rescue.missionStatus')}</legend>
    <div><label htmlFor="rescue-filter-status">{t('rescue.missionStatus')}</label><span className="rescue-select">
      <select id="rescue-filter-status" value={filters.status ?? ''}
        onChange={event => onChange({ status: event.target.value as MissionStatus || undefined })}>
        <option value="">{t('reporting.allStatuses')}</option>
        {missionStatuses.map(status => <option key={status} value={status}>{rescueStatusLabel(t, status)}</option>)}
      </select>
    </span></div>
    <div><label htmlFor="rescue-filter-sort">{t('disaster.sort')}</label><span className="rescue-select">
      <select id="rescue-filter-sort" value={filters.sort}
        onChange={event => onChange({ sort: event.target.value as MissionFilters['sort'] })}>
        <option value="createdAt,desc">{t('rescue.newest')}</option>
        <option value="createdAt,asc">{t('rescue.oldest')}</option>
      </select>
    </span></div>
  </fieldset>
}
