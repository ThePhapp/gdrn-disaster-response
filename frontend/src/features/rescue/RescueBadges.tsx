import type { MissionStatus, TeamAvailability } from './rescue-api'
import { useI18n, type TranslationKey } from '../../shared/i18n'

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
export function rescueStatusLabel(t: (key: TranslationKey) => string, status: MissionStatus) { return t(`rescue.status.${status}` as TranslationKey) }
export function rescueAvailabilityLabel(t: (key: TranslationKey) => string, availability: TeamAvailability) { return t(`rescue.availability.${availability}` as TranslationKey) }
export function rescueReportTypeLabel(t: (key: TranslationKey) => string, type: string) { return t(`rescue.type.${type}` as TranslationKey) }

export function MissionStatusBadge({ status }: { status: MissionStatus }) {
  const { t, language } = useI18n()
  return <span className={`rescue-badge mission-status--${status.toLowerCase()}`}>{language === 'vi' ? missionStatusLabels[status] : rescueStatusLabel(t, status)}</span>
}

export function AvailabilityBadge({ availability }: { availability: TeamAvailability }) {
  const { t, language } = useI18n()
  return <span className={`rescue-badge availability--${availability.toLowerCase()}`}>{language === 'vi' ? availabilityLabels[availability] : rescueAvailabilityLabel(t, availability)}</span>
}
