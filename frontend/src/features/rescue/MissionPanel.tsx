import { EmptyState, ErrorMessage, Loading } from '../../shared/components'
import type { Mission, Report, RescueTeam, TransitionStatus } from './rescue-api'
import { MissionStatusBadge, reportTypeLabels } from './RescueBadges'
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
  if (!mission) return <div className="rescue-panel__welcome"><EmptyState>
    <strong>Chọn một nhiệm vụ</strong><span>Thông tin báo cáo và tiến độ đội sẽ hiển thị tại đây.</span>
  </EmptyState></div>
  return <div className="mission-detail">
    <div className="mission-detail__heading"><div><p className="eyebrow">NHIỆM VỤ CỨU HỘ</p><h2>Nhiệm vụ {compactId(mission.id)}</h2></div>
      <MissionStatusBadge status={mission.status} /></div>
    <section className="mission-detail__section" aria-labelledby="mission-report-title">
      <div className="mission-detail__section-heading"><h3 id="mission-report-title">Báo cáo liên quan</h3>
        {report && <span className="rescue-inline-status">{report.status === 'VERIFIED' ? 'Đã xác minh' : report.status}</span>}</div>
      {reportLoading && !report && <Loading>Đang tải báo cáo…</Loading>}
      {reportError && <div className="rescue-panel__error"><ErrorMessage>{reportError}</ErrorMessage><button type="button" className="secondary" onClick={onRetryReport}>Tải lại báo cáo</button></div>}
      {report && <><p className="mission-detail__type">{reportTypeLabels[report.type] ?? report.type}</p><p className="mission-detail__description">{report.description}</p></>}
    </section>
    <dl className="rescue-facts">
      <div><dt>Đội cứu hộ</dt><dd>{team?.name ?? `Mã đội ${compactId(mission.teamId)}`}</dd></div>
      <div><dt>Tọa độ báo cáo</dt><dd>{report ? `${report.latitude}, ${report.longitude}` : 'Chưa tải được'}</dd></div>
      <div><dt>Phân công lúc</dt><dd><time dateTime={mission.assignedAt}>{dateTime.format(new Date(mission.assignedAt))}</time></dd></div>
      {mission.startedAt && <div><dt>Bắt đầu lúc</dt><dd><time dateTime={mission.startedAt}>{dateTime.format(new Date(mission.startedAt))}</time></dd></div>}
      {mission.completedAt && <div><dt>Hoàn tất lúc</dt><dd><time dateTime={mission.completedAt}>{dateTime.format(new Date(mission.completedAt))}</time></dd></div>}
      <div><dt>Mã báo cáo</dt><dd className="rescue-breakable">{mission.reportId}</dd></div>
      <div><dt>Cập nhật</dt><dd><time dateTime={mission.updatedAt}>{dateTime.format(new Date(mission.updatedAt))}</time></dd></div>
    </dl>
    <div className="mission-actions">
      {mission.status === 'ASSIGNED' && <button type="button" onClick={() => onTransition('IN_PROGRESS')} disabled={busy}>Bắt đầu thực hiện</button>}
      {mission.status === 'IN_PROGRESS' && <button type="button" onClick={() => onConfirmTransition('COMPLETED')} disabled={busy}>Hoàn tất nhiệm vụ</button>}
      {mission.status === 'COMPLETED' && <p className="mission-actions__complete">Nhiệm vụ đã hoàn tất. Không còn thao tác tiến độ.</p>}
    </div>
    {confirming && <MissionTransitionDialog nextStatus={confirming} busy={busy}
      returnFocus={document.activeElement instanceof HTMLElement ? document.activeElement : null}
      onConfirm={() => onTransition(confirming)} onCancel={onCancelTransition} />}
  </div>
}
