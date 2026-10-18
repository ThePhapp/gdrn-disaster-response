import { LocationMap } from '../../shared/location'
import { EmptyState, ErrorMessage, Loading } from '../../shared/components'
import { useI18n } from '../../shared/i18n'
import type { Page, Report, RescueTeam } from './rescue-api'
import { AvailabilityBadge, rescueReportTypeLabel } from './RescueBadges'
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
  const { t } = useI18n()
  const reportEligible = selectedReport?.status === 'VERIFIED' && !reportDetailLoading && !reportDetailError
  const canSubmit = Boolean(reportEligible && selectedTeamId) && !busy && !teamsLoading && !teamsError
  return <div className="rescue-assignment-form">
    <section className="rescue-picker" aria-labelledby="rescue-report-picker-title">
      <div className="rescue-picker__header"><div><p className="eyebrow">{t('rescue.stepOne')}</p><h3 id="rescue-report-picker-title">{t('rescue.chooseReport')}</h3></div>
        <span className="rescue-picker__hint">{t('rescue.onlyVerified')}</span></div>
      {reportsError && <ErrorMessage>{reportsError}</ErrorMessage>}
      {reportsLoading && !reports && <Loading>{t('rescue.loading')}</Loading>}
      {!reportsLoading && !reportsError && !reports?.items.length && <EmptyState>{t('rescue.noVerified')}</EmptyState>}
      {reports?.items.length ? <div className="rescue-choice-list" role="list" aria-label={t('rescue.reports')}>
        {reports.items.map(report => <div role="listitem" key={report.id}>
          <button type="button" className={`rescue-choice${selectedReport?.id === report.id ? ' is-selected' : ''}`}
            disabled={busy || reportsLoading || Boolean(reportsError)} aria-pressed={selectedReport?.id === report.id} onClick={() => onSelectReport(report)}>
            <span><strong>{rescueReportTypeLabel(t, report.type) ?? report.type}</strong>
              <small>{t('rescue.report')} {compactId(report.id)} · {dateTime.format(new Date(report.createdAt))}</small></span>
            <span className="rescue-choice__mark" aria-hidden="true">{selectedReport?.id === report.id ? t('rescue.selected') : t('rescue.choose')}</span>
          </button>
        </div>)}
      </div> : null}
      {reports && <RescuePagination result={reports} label={t('rescue.reportShort')} disabled={reportsLoading} onPageChange={onReportPageChange} />}
      {reportDetailLoading && <Loading>{t('reporting.loadingDetail')}</Loading>}
      {reportDetailError && <ErrorMessage>{reportDetailError}</ErrorMessage>}
      {selectedReport && <div className="rescue-selected-report">
        <div><span className="rescue-fact-label">{t('rescue.reportContent')}</span>
          {reportDetailLoading ? <Loading>{t('reporting.loadingDetail')}</Loading> : <p>{selectedReport.description}</p>}</div>
        {selectedReport.status !== 'VERIFIED' && <ErrorMessage>{t('rescue.reportNotVerified')}</ErrorMessage>}
        <dl><div><dt>{t('rescue.coordinates')}</dt><dd>{selectedReport.latitude}, {selectedReport.longitude}</dd></div>
          <div><dt>{t('rescue.reportId')}</dt><dd className="rescue-breakable">{selectedReport.id}</dd></div></dl>
        <LocationMap value={{ latitude: selectedReport.latitude, longitude: selectedReport.longitude }} readOnly label={`${t('citizen.location')} ${selectedReport.id}`} />
      </div>}
    </section>

    <section className="rescue-picker" aria-labelledby="rescue-team-picker-title">
      <div className="rescue-picker__header"><div><p className="eyebrow">{t('rescue.stepTwo')}</p><h3 id="rescue-team-picker-title">{t('rescue.chooseTeam')}</h3></div>
        <span className="rescue-picker__hint">{t('rescue.onlyAvailable')}</span></div>
      {teamsError && <ErrorMessage>{teamsError}</ErrorMessage>}
      {teamsLoading && !teams && <Loading>{t('rescue.loading')}</Loading>}
      {!teamsLoading && !teamsError && !teams?.items.length && <EmptyState>{t('rescue.noTeams')}</EmptyState>}
      {teams?.items.length ? <div className="rescue-choice-list" role="list" aria-label={t('rescue.availableTeams')}>
        {teams.items.map(team => <div role="listitem" key={team.id}>
          <button type="button" className={`rescue-choice${selectedTeamId === team.id ? ' is-selected' : ''}`}
            disabled={busy || teamsLoading || Boolean(teamsError)} aria-pressed={selectedTeamId === team.id} onClick={() => onSelectTeam(team)}>
            <span><strong>{team.name}</strong><small>{t('rescue.teamId')} {compactId(team.id)}</small></span>
            <AvailabilityBadge availability={team.availability} />
          </button>
        </div>)}
      </div> : null}
      {teams && <RescuePagination result={teams} label={t('rescue.teamShort')} disabled={teamsLoading} onPageChange={onTeamPageChange} />}
    </section>

    <div className="rescue-form-actions">
      <button type="button" className="secondary" onClick={onCancel} disabled={busy}>{t('rescue.goBack')}</button>
      <button type="button" onClick={onSubmit} disabled={!canSubmit}>{busy ? t('rescue.creating') : t('rescue.createAssignment')}</button>
    </div>
  </div>
}
