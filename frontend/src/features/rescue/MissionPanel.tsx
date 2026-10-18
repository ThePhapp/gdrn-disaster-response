import { LocationMap } from '../../shared/location'
import { EmptyState, ErrorMessage, Loading } from '../../shared/components'
import { useI18n } from '../../shared/i18n'
import type { Mission, Report, RescueTeam, TransitionStatus } from './rescue-api'
import { MissionStatusBadge, rescueReportTypeLabel } from './RescueBadges'
import { MissionTransitionDialog } from './MissionTransitionDialog'

const dateTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })

function compactId(id: string) {
  return id.length > 12 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id
}

export function MissionPanel({ mission, report, reportLoading, reportError, team, busy, confirming, onConfirmTransition,
  onTransition, onCancelTransition, onRetryReport }: {
  mission?: Mission
  report?: Report
  reportLoading: boolean
  reportError: string
  team?: RescueTeam
  busy: boolean
  confirming?: TransitionStatus
  onConfirmTransition: (status: TransitionStatus) => void
  onTransition: (status: TransitionStatus) => void
  onCancelTransition: () => void
  onRetryReport: () => void
}) {
  const { t } = useI18n()
  if (!mission) return <div className="rescue-panel__welcome"><EmptyState>
    <strong>{t('rescue.selectMission')}</strong><span>{t('rescue.selectMissionHint')}</span>
  </EmptyState></div>
  return <div className="mission-detail">
    <div className="mission-detail__heading"><div><p className="eyebrow">{t('rescue.assign')}</p><h2>{t('rescue.missions')} {compactId(mission.id)}</h2></div>
      <MissionStatusBadge status={mission.status} /></div>
    <section className="mission-detail__section" aria-labelledby="mission-report-title">
      <div className="mission-detail__section-heading"><h3 id="mission-report-title">{t('rescue.reports')}</h3>
        {report && <span className="rescue-inline-status">{report.status === 'VERIFIED' ? t('reporting.status.VERIFIED') : report.status}</span>}</div>
      {reportLoading && !report && <Loading>{t('reporting.loading')}</Loading>}
      {reportError && <div className="rescue-panel__error"><ErrorMessage>{reportError}</ErrorMessage><button type="button" className="secondary" onClick={onRetryReport}>{t('shared.reload')}</button></div>}
      {report && <><p className="mission-detail__type">{rescueReportTypeLabel(t, report.type) ?? report.type}</p><p className="mission-detail__description">{report.description}</p></>}
    </section>
    {report && !reportLoading && !reportError && <LocationMap value={{ latitude: report.latitude, longitude: report.longitude }} readOnly label={`Vị trí báo cáo ${report.id}`} />}
    <dl className="rescue-facts">
      <div><dt>{t('rescue.team')}</dt><dd>{team?.name ?? `${t('rescue.team')} ${compactId(mission.teamId)}`}</dd></div>
      <div><dt>{t('rescue.coordinates')}</dt><dd>{report ? `${report.latitude}, ${report.longitude}` : 'Not loaded'}</dd></div>
      <div><dt>{t('rescue.assigned')}</dt><dd><time dateTime={mission.assignedAt}>{dateTime.format(new Date(mission.assignedAt))}</time></dd></div>
      {mission.startedAt && <div><dt>{t('rescue.started')}</dt><dd><time dateTime={mission.startedAt}>{dateTime.format(new Date(mission.startedAt))}</time></dd></div>}
      {mission.completedAt && <div><dt>{t('rescue.completed')}</dt><dd><time dateTime={mission.completedAt}>{dateTime.format(new Date(mission.completedAt))}</time></dd></div>}
      <div><dt>{t('rescue.reportId')}</dt><dd className="rescue-breakable">{mission.reportId}</dd></div>
      <div><dt>{t('disaster.updated')}</dt><dd><time dateTime={mission.updatedAt}>{dateTime.format(new Date(mission.updatedAt))}</time></dd></div>
    </dl>
    <div className="mission-actions">
      {mission.status === 'ASSIGNED' && <button type="button" onClick={() => onTransition('IN_PROGRESS')} disabled={busy}>{t('rescue.startAction')}</button>}
      {mission.status === 'IN_PROGRESS' && <button type="button" onClick={() => onConfirmTransition('COMPLETED')} disabled={busy}>{t('rescue.completeAction')}</button>}
      {mission.status === 'COMPLETED' && <p className="mission-actions__complete">{t('rescue.completed')}</p>}
    </div>
    {confirming && <MissionTransitionDialog nextStatus={confirming} busy={busy}
      returnFocus={document.activeElement instanceof HTMLElement ? document.activeElement : null}
      onConfirm={() => onTransition(confirming)} onCancel={onCancelTransition} />}
  </div>
}
