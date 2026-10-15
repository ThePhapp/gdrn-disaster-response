import { missionStatuses, type MissionFilters, type MissionStatus } from './rescue-api'
import { missionStatusLabels } from './RescueBadges'

export function RescueFilters({ filters, onChange }: {
  filters: MissionFilters
  onChange: (next: Partial<MissionFilters>) => void
}) {
  return <fieldset className="rescue-filters">
    <legend className="sr-only">Bộ lọc và sắp xếp nhiệm vụ cứu hộ</legend>
    <div><label htmlFor="rescue-filter-status">Trạng thái nhiệm vụ</label><span className="rescue-select">
      <select id="rescue-filter-status" value={filters.status ?? ''}
        onChange={event => onChange({ status: event.target.value as MissionStatus || undefined })}>
        <option value="">Tất cả trạng thái</option>
        {missionStatuses.map(status => <option key={status} value={status}>{missionStatusLabels[status]}</option>)}
      </select>
    </span></div>
    <div><label htmlFor="rescue-filter-sort">Sắp xếp</label><span className="rescue-select">
      <select id="rescue-filter-sort" value={filters.sort}
        onChange={event => onChange({ sort: event.target.value as MissionFilters['sort'] })}>
        <option value="createdAt,desc">Mới phân công trước</option>
        <option value="createdAt,asc">Cũ phân công trước</option>
      </select>
    </span></div>
  </fieldset>
}
