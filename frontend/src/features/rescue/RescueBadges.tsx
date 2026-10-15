import type { MissionStatus, TeamAvailability } from './rescue-api'

export const missionStatusLabels: Record<MissionStatus, string> = {
  ASSIGNED: 'Đã phân công',
  IN_PROGRESS: 'Đang thực hiện',
  COMPLETED: 'Đã hoàn tất',
}

export const availabilityLabels: Record<TeamAvailability, string> = {
  AVAILABLE: 'Sẵn sàng',
  BUSY: 'Đang bận',
}

export const reportTypeLabels: Record<string, string> = {
  EARTHQUAKE: 'Động đất',
  FLOOD: 'Lũ lụt',
  TYPHOON: 'Bão',
  WILDFIRE: 'Cháy rừng',
  TSUNAMI: 'Sóng thần',
}

export function MissionStatusBadge({ status }: { status: MissionStatus }) {
  return <span className={`rescue-badge mission-status--${status.toLowerCase()}`}>{missionStatusLabels[status]}</span>
}

export function AvailabilityBadge({ availability }: { availability: TeamAvailability }) {
  return <span className={`rescue-badge availability--${availability.toLowerCase()}`}>{availabilityLabels[availability]}</span>
}
