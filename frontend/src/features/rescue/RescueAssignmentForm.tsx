import { LocationMap } from '../../shared/location'
import { EmptyState, ErrorMessage, Loading } from '../../shared/components'
import type { Page, Report, RescueTeam } from './rescue-api'
import { AvailabilityBadge, reportTypeLabels } from './RescueBadges'
import { RescuePagination } from './RescuePagination'

const dateTime = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })

function compactId(id: string) {
  return id.length > 12 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id
}

export function RescueAssignmentForm({ reports, reportsLoading, reportsError, selectedReport, reportDetailLoading,
  reportDetailError, onSelectReport, onReportPageChange, teams, teamsLoading, teamsError, selectedTeamId,
  onSelectTeam, onTeamPageChange, busy, onSubmit, onCancel }: {
  reports?: Page<Report>
  reportsLoading: boolean
  reportsError: string
  selectedReport?: Report
  reportDetailLoading: boolean
  reportDetailError: string
  onSelectReport: (report: Report) => void
  onReportPageChange: (page: number) => void
  teams?: Page<RescueTeam>
  teamsLoading: boolean
  teamsError: string
  selectedTeamId?: string
  onSelectTeam: (team: RescueTeam) => void
  onTeamPageChange: (page: number) => void
  busy: boolean
  onSubmit: () => void
  onCancel: () => void
}) {
  const reportEligible = selectedReport?.status === 'VERIFIED' && !reportDetailLoading && !reportDetailError
  const canSubmit = Boolean(reportEligible && selectedTeamId) && !busy && !teamsLoading && !teamsError
  return <div className="rescue-assignment-form">
    <section className="rescue-picker" aria-labelledby="rescue-report-picker-title">
      <div className="rescue-picker__header"><div><p className="eyebrow">BƯỚC 1</p><h3 id="rescue-report-picker-title">Chọn báo cáo đã xác minh</h3></div>
        <span className="rescue-picker__hint">Chỉ VERIFIED</span></div>
      {reportsError && <ErrorMessage>{reportsError}</ErrorMessage>}
      {reportsLoading && !reports && <Loading>Đang tải báo cáo đủ điều kiện…</Loading>}
      {!reportsLoading && !reportsError && !reports?.items.length && <EmptyState>Chưa có báo cáo VERIFIED để phân công.</EmptyState>}
      {reports?.items.length ? <div className="rescue-choice-list" role="list" aria-label="Báo cáo đã xác minh">
        {reports.items.map(report => <div role="listitem" key={report.id}>
          <button type="button" className={`rescue-choice${selectedReport?.id === report.id ? ' is-selected' : ''}`}
            disabled={busy || reportsLoading || Boolean(reportsError)} aria-pressed={selectedReport?.id === report.id} onClick={() => onSelectReport(report)}>
            <span><strong>{reportTypeLabels[report.type] ?? report.type}</strong>
              <small>Báo cáo {compactId(report.id)} · {dateTime.format(new Date(report.createdAt))}</small></span>
            <span className="rescue-choice__mark" aria-hidden="true">{selectedReport?.id === report.id ? 'Đã chọn' : 'Chọn'}</span>
          </button>
        </div>)}
      </div> : null}
      {reports && <RescuePagination result={reports} label="báo cáo" disabled={reportsLoading} onPageChange={onReportPageChange} />}
      {reportDetailLoading && <Loading>Đang tải chi tiết báo cáo…</Loading>}
      {reportDetailError && <ErrorMessage>{reportDetailError}</ErrorMessage>}
      {selectedReport && <div className="rescue-selected-report">
        <div><span className="rescue-fact-label">Nội dung báo cáo</span>
          {reportDetailLoading ? <Loading>Đang tải chi tiết báo cáo…</Loading> : <p>{selectedReport.description}</p>}</div>
        {selectedReport.status !== 'VERIFIED' && <ErrorMessage>Báo cáo không còn ở trạng thái đã xác minh. Hãy chọn báo cáo khác.</ErrorMessage>}
        <dl><div><dt>Tọa độ</dt><dd>{selectedReport.latitude}, {selectedReport.longitude}</dd></div>
          <div><dt>Mã báo cáo</dt><dd className="rescue-breakable">{selectedReport.id}</dd></div></dl>
        <LocationMap value={{ latitude: selectedReport.latitude, longitude: selectedReport.longitude }} readOnly label={`Vị trí báo cáo ${selectedReport.id}`} />
      </div>}
    </section>

    <section className="rescue-picker" aria-labelledby="rescue-team-picker-title">
      <div className="rescue-picker__header"><div><p className="eyebrow">BƯỚC 2</p><h3 id="rescue-team-picker-title">Chọn đội cứu hộ</h3></div>
        <span className="rescue-picker__hint">Chỉ đội sẵn sàng</span></div>
      {teamsError && <ErrorMessage>{teamsError}</ErrorMessage>}
      {teamsLoading && !teams && <Loading>Đang tải đội cứu hộ…</Loading>}
      {!teamsLoading && !teamsError && !teams?.items.length && <EmptyState>Hiện không có đội sẵn sàng.</EmptyState>}
      {teams?.items.length ? <div className="rescue-choice-list" role="list" aria-label="Đội cứu hộ sẵn sàng">
        {teams.items.map(team => <div role="listitem" key={team.id}>
          <button type="button" className={`rescue-choice${selectedTeamId === team.id ? ' is-selected' : ''}`}
            disabled={busy || teamsLoading || Boolean(teamsError)} aria-pressed={selectedTeamId === team.id} onClick={() => onSelectTeam(team)}>
            <span><strong>{team.name}</strong><small>Mã đội {compactId(team.id)}</small></span>
            <AvailabilityBadge availability={team.availability} />
          </button>
        </div>)}
      </div> : null}
      {teams && <RescuePagination result={teams} label="đội cứu hộ" disabled={teamsLoading} onPageChange={onTeamPageChange} />}
    </section>

    <div className="rescue-form-actions">
      <button type="button" className="secondary" onClick={onCancel} disabled={busy}>Quay lại</button>
      <button type="button" onClick={onSubmit} disabled={!canSubmit}>{busy ? 'Đang phân công…' : 'Tạo phân công'}</button>
    </div>
  </div>
}
