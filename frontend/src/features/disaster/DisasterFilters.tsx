import {
  disasterStatuses,
  disasterTypes,
  type DisasterFilters as Filters,
  type DisasterStatus,
  type DisasterType,
} from './disaster-api'
import { disasterLabel, statusLabel } from './DisasterBadges'
import { useI18n } from '../../shared/i18n'

export function DisasterFilters({ filters, onChange }: {
  filters: Filters
  onChange: (next: Partial<Filters>) => void
}) {
  const { t } = useI18n()
  return <fieldset className="disaster-filters">
    <legend className="sr-only">{t('disaster.filterLegend')}</legend>
    <div><label htmlFor="filter-status">{t('disaster.status')}</label><span className="disaster-select">
      <select id="filter-status" value={filters.status ?? ''}
        onChange={event => onChange({ status: event.target.value as DisasterStatus || undefined })}>
        <option value="">{t('disaster.allStatuses')}</option>
        {disasterStatuses.map(status => <option key={status} value={status}>{statusLabel(t, status)}</option>)}
      </select>
    </span></div>
    <div><label htmlFor="filter-type">{t('disaster.type')}</label><span className="disaster-select">
      <select id="filter-type" value={filters.type ?? ''}
        onChange={event => onChange({ type: event.target.value as DisasterType || undefined })}>
        <option value="">{t('disaster.allTypes')}</option>
        {disasterTypes.map(type => <option key={type} value={type}>{disasterLabel(t, type)}</option>)}
      </select>
    </span></div>
    <div><label htmlFor="filter-sort">{t('disaster.sort')}</label><span className="disaster-select">
      <select id="filter-sort" value={filters.sort}
        onChange={event => onChange({ sort: event.target.value as Filters['sort'] })}>
        <option value="createdAt,desc">{t('disaster.newest')}</option>
        <option value="createdAt,asc">{t('disaster.oldest')}</option>
      </select>
    </span></div>
  </fieldset>
}
