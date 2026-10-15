import { EmptyState, Loading } from '../../shared/components'
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
  if (loading && !result) return <Loading>Đang tải danh sách nhiệm vụ…</Loading>
  if (!result?.items.length) return <EmptyState>Không có nhiệm vụ phù hợp bộ lọc.</EmptyState>
  return <div className="rescue-list" aria-busy={loading} aria-label="Danh sách nhiệm vụ cứu hộ">
    {result.items.map(mission => <button type="button" key={mission.id}
      className={`rescue-list__item${selectedId === mission.id ? ' is-selected' : ''}`}
      aria-pressed={selectedId === mission.id} onClick={() => onSelect(mission)}>
      <span className="rescue-list__identity">
        <strong>Nhiệm vụ {compactId(mission.id)}</strong>
        <small>Đội {compactId(mission.teamId)} · {dateTime.format(new Date(mission.assignedAt))}</small>
        <small>Báo cáo {compactId(mission.reportId)}</small>
      </span>
      <MissionStatusBadge status={mission.status} />
    </button>)}
  </div>
}
