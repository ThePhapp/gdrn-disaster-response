import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ApiError } from '../../shared/api'
import { ErrorMessage, PageHeader } from '../../shared/components'
import { MissionList } from './MissionList'
import { MissionPanel } from './MissionPanel'
import { RescueAssignmentForm } from './RescueAssignmentForm'
import { RescueFilters } from './RescueFilters'
import { RescuePagination } from './RescuePagination'
import {
  createMission, getReport, listMissions, listRescueTeams, listVerifiedReports, updateMissionStatus,
  type Mission, type MissionFilters, type Page, type Report, type RescueTeam, type TransitionStatus,
} from './rescue-api'
import './rescue.css'

const pageSize = 20
type Mode = 'detail' | 'create'

function message(error: unknown) {
  if (error instanceof ApiError) {
    const code = error.problem?.code
    if (code === 'TEAM_BUSY') return 'Đội đã được phân công cho nhiệm vụ khác. Danh sách đã được cập nhật.'
    if (code === 'REPORT_ALREADY_ASSIGNED') return 'Báo cáo đã có nhiệm vụ. Danh sách đã được cập nhật.'
    if (code === 'REPORT_NOT_VERIFIED') return 'Báo cáo không còn ở trạng thái đã xác minh.'
    if (code === 'DISASTER_NOT_ACTIVE') return 'Thảm họa liên quan không còn hoạt động, không thể tạo nhiệm vụ.'
    if (code === 'INVALID_TRANSITION') return 'Trạng thái nhiệm vụ đã thay đổi. Hãy tải lại trước khi tiếp tục.'
    return error.message
  }
  if (error instanceof DOMException && error.name === 'AbortError') return ''
  return 'Không thể kết nối máy chủ. Vui lòng thử lại.'
}

export function RescuePage() {
  const [searchParams] = useSearchParams()
  const reportIdFromQuery = searchParams.get('reportId') ?? ''
  const [filters, setFilters] = useState<MissionFilters>({ page: 0, size: pageSize, sort: 'createdAt,desc' })
  const [missions, setMissions] = useState<Page<Mission>>()
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [selectedMission, setSelectedMission] = useState<Mission>()
  const [selectedReport, setSelectedReport] = useState<Report>()
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState('')
  const [mode, setMode] = useState<Mode>('detail')
  const [mutationError, setMutationError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState<TransitionStatus>()
  const [selectedTeam, setSelectedTeam] = useState<RescueTeam>()
  const [reports, setReports] = useState<Page<Report>>()
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportsError, setReportsError] = useState('')
  const [reportFilters, setReportFilters] = useState({ page: 0, size: pageSize, sort: 'createdAt,desc' as const })
  const [teams, setTeams] = useState<Page<RescueTeam>>()
  const [teamsLoading, setTeamsLoading] = useState(false)
  const [teamsError, setTeamsError] = useState('')
  const [teamFilters, setTeamFilters] = useState({ page: 0, size: pageSize, sort: 'name,asc' as const, availability: 'AVAILABLE' as const })
  const panel = useRef<HTMLElement>(null)
  const missionListRequest = useRef(0)
  const reportListRequest = useRef(0)
  const teamListRequest = useRef(0)
  const reportDetailRequest = useRef(0)
  const mutationInFlight = useRef(false)

  const loadMissions = useCallback(async () => {
    const request = ++missionListRequest.current
    setListLoading(true); setListError('')
    try {
      const result = await listMissions(filters)
      if (request === missionListRequest.current) setMissions(result)
    } catch (error) {
      if (request === missionListRequest.current) setListError(message(error))
    } finally {
      if (request === missionListRequest.current) setListLoading(false)
    }
  }, [filters])

  useEffect(() => { void loadMissions() }, [loadMissions])

  const loadReports = useCallback(async () => {
    const request = ++reportListRequest.current
    setReportsLoading(true); setReportsError('')
    try {
      const result = await listVerifiedReports(reportFilters)
      if (request === reportListRequest.current) setReports(result)
    } catch (error) {
      if (request === reportListRequest.current) setReportsError(message(error))
    } finally {
      if (request === reportListRequest.current) setReportsLoading(false)
    }
  }, [reportFilters])

  const loadTeams = useCallback(async () => {
    const request = ++teamListRequest.current
    setTeamsLoading(true); setTeamsError('')
    try {
      const result = await listRescueTeams(teamFilters)
      if (request === teamListRequest.current) setTeams(result)
    } catch (error) {
      if (request === teamListRequest.current) setTeamsError(message(error))
    } finally {
      if (request === teamListRequest.current) setTeamsLoading(false)
    }
  }, [teamFilters])

  useEffect(() => {
    if (mode === 'create') {
      void loadReports()
      void loadTeams()
    }
  }, [mode, loadReports, loadTeams])

  const loadReport = useCallback(async (id: string, fallback?: Report) => {
    const request = ++reportDetailRequest.current
    setReportError(''); setReportLoading(true)
    if (fallback) setSelectedReport(fallback)
    try {
      const result = await getReport(id)
      if (request === reportDetailRequest.current) setSelectedReport(result)
    } catch (error) {
      if (request === reportDetailRequest.current) setReportError(message(error))
    } finally {
      if (request === reportDetailRequest.current) setReportLoading(false)
    }
  }, [])

  useEffect(() => {
    if (reportIdFromQuery) {
      setMode('create'); setMutationError('')
      void loadReport(reportIdFromQuery)
    }
  }, [loadReport, reportIdFromQuery])

  function changeFilter(next: Partial<MissionFilters>) {
    setFilters(current => ({ ...current, ...next, page: next.page ?? 0 }))
    reportDetailRequest.current++
    setSelectedMission(undefined); setSelectedReport(undefined); setReportError(''); setMutationError('')
  }

  function changeReportPage(page: number) {
    setReportFilters(current => ({ ...current, page }))
  }

  function changeTeamPage(page: number) {
    setTeamFilters(current => ({ ...current, page }))
  }

  async function selectMission(mission: Mission) {
    setSelectedMission(mission); setMode('detail'); setConfirming(undefined); setMutationError('')
    await loadReport(mission.reportId)
  }

  async function selectReport(report: Report) {
    setSelectedTeam(undefined); setMutationError('')
    await loadReport(report.id, report)
  }

  function startCreate() {
    reportDetailRequest.current++
    setMode('create'); setSelectedMission(undefined); setSelectedReport(undefined); setSelectedTeam(undefined)
    setReportLoading(false); setMutationError(''); setReportError(''); setReportFilters(current => ({ ...current, page: 0 })); setTeamFilters(current => ({ ...current, page: 0 }))
  }

  async function refreshAfterConflict() {
    await Promise.all([loadMissions(), loadReports(), loadTeams()])
  }

  async function create() {
    if (mutationInFlight.current || !selectedReport || !selectedTeam) return
    mutationInFlight.current = true
    setBusy(true); setMutationError('')
    try {
      const mission = await createMission(selectedReport.id, selectedTeam.id)
      setSelectedMission(mission); setMode('detail'); setConfirming(undefined)
      await loadMissions()
      await loadReport(mission.reportId, selectedReport)
      requestAnimationFrame(() => panel.current?.focus())
    } catch (error) {
      setMutationError(message(error))
      if (error instanceof ApiError && error.status === 409) {
        if (error.problem?.code === 'TEAM_BUSY') setSelectedTeam(undefined)
        if (['REPORT_ALREADY_ASSIGNED', 'REPORT_NOT_VERIFIED', 'DISASTER_NOT_ACTIVE'].includes(error.problem?.code ?? '')) {
          reportDetailRequest.current++
          setSelectedReport(undefined); setReportLoading(false)
        }
        await refreshAfterConflict()
      }
    } finally { mutationInFlight.current = false; setBusy(false) }
  }

  async function transition(status: TransitionStatus) {
    if (mutationInFlight.current || !selectedMission) return
    mutationInFlight.current = true
    setBusy(true); setMutationError('')
    try {
      const mission = await updateMissionStatus(selectedMission.id, status)
      setSelectedMission(mission); setConfirming(undefined)
      await loadMissions()
      requestAnimationFrame(() => panel.current?.focus())
    } catch (error) {
      setMutationError(message(error))
      if (error instanceof ApiError && error.status === 409) {
        reportDetailRequest.current++
        setSelectedMission(undefined); setSelectedReport(undefined); setConfirming(undefined); setReportLoading(false)
        await loadMissions()
      }
    } finally { mutationInFlight.current = false; setBusy(false) }
  }

  return <section className="rescue-page">
    <PageHeader eyebrow="ĐIỀU PHỐI / CỨU HỘ" title="Điều phối cứu hộ"
      description="Phân công đội cho báo cáo đã xác minh và theo dõi tiến độ nhiệm vụ."
      action={<button type="button" onClick={startCreate}>Tạo phân công</button>} />

    <RescueFilters filters={filters} onChange={changeFilter} />
    {listError && <div className="rescue-list-error"><ErrorMessage>{listError}</ErrorMessage><button type="button" className="secondary" onClick={() => void loadMissions()}>Thử lại</button></div>}
    <div className="rescue-workspace">
      <div className="rescue-master">
        <div className="rescue-master__summary"><strong>{missions?.totalElements ?? 0} nhiệm vụ</strong>
          {listLoading && missions && <span role="status">Đang cập nhật…</span>}</div>
        <MissionList result={missions} loading={listLoading} selectedId={selectedMission?.id} onSelect={mission => void selectMission(mission)} />
        {missions && <RescuePagination result={missions} label="nhiệm vụ" disabled={listLoading} onPageChange={page => changeFilter({ page })} />}
      </div>
      <aside ref={panel} tabIndex={-1} className="rescue-panel"
        aria-label={mode === 'create' ? 'Tạo phân công cứu hộ' : 'Chi tiết nhiệm vụ cứu hộ'}>
        {mutationError && <ErrorMessage>{mutationError}</ErrorMessage>}
        {mode === 'create' && <><p className="eyebrow">PHÂN CÔNG MỚI</p><h2>Tạo phân công cứu hộ</h2>
          <RescueAssignmentForm reports={reports} reportsLoading={reportsLoading} reportsError={reportsError}
            selectedReport={selectedReport} reportDetailLoading={reportLoading} reportDetailError={reportError}
            onSelectReport={report => void selectReport(report)} onReportPageChange={changeReportPage}
            teams={teams} teamsLoading={teamsLoading} teamsError={teamsError} selectedTeamId={selectedTeam?.id}
            onSelectTeam={setSelectedTeam} onTeamPageChange={changeTeamPage} busy={busy} onSubmit={() => void create()}
            onCancel={() => setMode('detail')} /></>}
        {mode === 'detail' && <MissionPanel mission={selectedMission} report={selectedReport} reportLoading={reportLoading}
          reportError={reportError} busy={busy} confirming={confirming} onConfirmTransition={setConfirming}
          onTransition={status => void transition(status)} onCancelTransition={() => setConfirming(undefined)}
          onRetryReport={() => { if (selectedMission) void loadReport(selectedMission.reportId) }} />}
      </aside>
    </div>
  </section>
}
