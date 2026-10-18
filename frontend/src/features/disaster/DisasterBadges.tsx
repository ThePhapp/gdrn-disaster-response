import type { DisasterStatus, DisasterType, Severity } from './disaster-api'
import { useI18n, type TranslationKey } from '../../shared/i18n'

export const typeLabels: Record<DisasterType, string> = {
  EARTHQUAKE: 'Động đất',
  FLOOD: 'Lũ lụt',
  TYPHOON: 'Bão',
  WILDFIRE: 'Cháy rừng',
  TSUNAMI: 'Sóng thần',
}

export const severityLabels: Record<Severity, string> = {
  LOW: 'Thấp',
  MODERATE: 'Trung bình',
  HIGH: 'Cao',
  CRITICAL: 'Nghiêm trọng',
}

export const statusLabels: Record<DisasterStatus, string> = {
  ACTIVE: 'Đang hoạt động',
  RESOLVED: 'Đã kết thúc',
}

export function disasterLabel(t: (key: TranslationKey) => string, type: DisasterType) { return t(`disaster.type.${type}` as TranslationKey) }
export function severityLabel(t: (key: TranslationKey) => string, severity: Severity) { return t(`disaster.severity.${severity}` as TranslationKey) }
export function statusLabel(t: (key: TranslationKey) => string, status: DisasterStatus) { return t(`disaster.status.${status}` as TranslationKey) }

export function SeverityBadge({ severity }: { severity: Severity }) {
  const { t } = useI18n()
  return <span className={`disaster-badge severity severity--${severity.toLowerCase()}`}>{severityLabel(t, severity)}</span>
}

export function StatusBadge({ status }: { status: DisasterStatus }) {
  const { t } = useI18n()
  return <span className={`disaster-badge status status--${status.toLowerCase()}`}>{statusLabel(t, status)}</span>
}
