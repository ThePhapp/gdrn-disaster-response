import { MemoryRouter, useNavigate } from 'react-router-dom'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api'
import type { Mission, Page, Report, RescueTeam } from './rescue-api'

const mocks = vi.hoisted(() => ({
  listMissions: vi.fn(), listRescueTeams: vi.fn(), listVerifiedReports: vi.fn(), getReport: vi.fn(),
  createMission: vi.fn(), updateMissionStatus: vi.fn(),
}))
vi.mock('./rescue-api', async importOriginal => ({
  ...await importOriginal<typeof import('./rescue-api')>(),
  ...mocks,
}))

vi.mock('../../shared/location', () => ({ LocationMap: ({ value, readOnly }: { value: { latitude: number; longitude: number }; readOnly: boolean }) => <div data-testid="report-map" data-readonly={String(readOnly)}>{value.latitude},{value.longitude}</div> }))

import { RescuePage } from './RescuePage'

const report: Report = {
  id: '00000000-0000-0000-0000-000000000005', reporterId: 'citizen-1', type: 'FLOOD',
  description: 'Nước dâng gần khu dân cư.', latitude: 16.0471, longitude: 108.2068,
  status: 'VERIFIED', disasterId: 'disaster-1', verifiedAt: '2026-10-09T10:00:00Z',
  createdAt: '2026-10-09T09:00:00Z', updatedAt: '2026-10-09T10:00:00Z',
}
const team: RescueTeam = { id: '00000000-0000-0000-0000-000000000006', name: 'Đội cứu hộ miền Trung', availability: 'AVAILABLE' }
const assigned: Mission = {
  id: '00000000-0000-0000-0000-000000000007', reportId: report.id, teamId: team.id,
  status: 'ASSIGNED', assignedAt: '2026-10-09T10:05:00Z', updatedAt: '2026-10-09T10:05:00Z',
}
const page = <T,>(items: T[], totalElements = items.length): Page<T> => ({ items, page: 0, size: 20, totalElements, totalPages: totalElements ? 1 : 0 })

describe('RescuePage', () => {
  beforeEach(() => {
    mocks.listMissions.mockResolvedValue(page([assigned]))
    mocks.listRescueTeams.mockResolvedValue(page([team]))
    mocks.listVerifiedReports.mockResolvedValue(page([report]))
    mocks.getReport.mockResolvedValue(report)
    mocks.createMission.mockResolvedValue(assigned)
    mocks.updateMissionStatus.mockResolvedValue({ ...assigned, status: 'IN_PROGRESS', startedAt: '2026-10-09T10:10:00Z', updatedAt: '2026-10-09T10:10:00Z' })
  })

  function renderPage(entry = '/operations/rescue') {
    return render(<MemoryRouter initialEntries={[entry]}><RescuePage /></MemoryRouter>)
  }

  it('loads missions, filters and advances a mission through confirmation', async () => {
    const user = userEvent.setup()
    renderPage()
    expect(await screen.findByRole('button', { name: /Nhiệm vụ 00000000/ })).toBeVisible()

    await user.selectOptions(screen.getByLabelText('Trạng thái nhiệm vụ'), 'IN_PROGRESS')
    await waitFor(() => expect(mocks.listMissions).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'IN_PROGRESS', page: 0 })))

    await user.click(screen.getByRole('button', { name: /Nhiệm vụ 00000000/ }))
    expect(await screen.findByText('Nước dâng gần khu dân cư.')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Bắt đầu thực hiện' }))
    await waitFor(() => expect(mocks.updateMissionStatus).toHaveBeenCalledWith(assigned.id, 'IN_PROGRESS'))

    await user.click(await screen.findByRole('button', { name: 'Hoàn tất nhiệm vụ' }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Hoàn tất nhiệm vụ?')
    await user.click(screen.getByRole('button', { name: /Xác nhận đã hoàn tất/ }))
    await waitFor(() => expect(mocks.updateMissionStatus).toHaveBeenLastCalledWith(assigned.id, 'COMPLETED'))
  })

  it('creates a mission from a verified report and available team', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getAllByRole('button', { name: 'Tạo phân công' })[0])
    expect(await screen.findByText('Chọn báo cáo đã xác minh')).toBeVisible()
    const reportPicker = screen.getByRole('heading', { name: 'Chọn báo cáo đã xác minh' }).closest('section')!
    const teamPicker = screen.getByRole('heading', { name: 'Chọn đội cứu hộ' }).closest('section')!
    await user.click(within(reportPicker).getByRole('button', { name: /Báo cáo 00000000/ }))
    await user.click(within(teamPicker).getByRole('button', { name: /Đội cứu hộ miền Trung/ }))
    await user.click(screen.getAllByRole('button', { name: 'Tạo phân công' })[1])
    await waitFor(() => expect(mocks.createMission).toHaveBeenCalledWith(report.id, team.id))
    expect(await screen.findByRole('heading', { name: /Nhiệm vụ 00000000/ })).toBeVisible()
  })

  it('shows assignment conflicts and keeps the form available', async () => {
    const user = userEvent.setup()
    mocks.createMission.mockRejectedValueOnce(new ApiError(409, {
      timestamp: '2026-10-09T10:00:00Z', status: 409, code: 'TEAM_BUSY',
      message: 'Team already has an active mission.', path: '/api/rescue-missions', fieldErrors: [],
    }))
    renderPage()
    await user.click(screen.getAllByRole('button', { name: 'Tạo phân công' })[0])
    const reportPicker = screen.getByRole('heading', { name: 'Chọn báo cáo đã xác minh' }).closest('section')!
    const teamPicker = screen.getByRole('heading', { name: 'Chọn đội cứu hộ' }).closest('section')!
    await user.click(await within(reportPicker).findByRole('button', { name: /Báo cáo 00000000/ }))
    await user.click(within(teamPicker).getByRole('button', { name: /Đội cứu hộ miền Trung/ }))
    await user.click(screen.getAllByRole('button', { name: 'Tạo phân công' })[1])
    expect(await screen.findByRole('alert')).toHaveTextContent('Đội đã được phân công')
    expect(screen.getByText('Tạo phân công cứu hộ')).toBeVisible()
    expect(mocks.listRescueTeams).toHaveBeenCalledTimes(2)
    expect(screen.getAllByRole('button', { name: 'Tạo phân công' })[1]).toBeDisabled()
  })

  it('does not assign a report from a deep link when it is no longer verified', async () => {
    const pending = { ...report, status: 'PENDING' as const, disasterId: undefined, verifiedAt: undefined }
    mocks.getReport.mockResolvedValueOnce(pending)
    renderPage(`/operations/rescue?reportId=${pending.id}`)

    expect(await screen.findByText('Báo cáo không còn ở trạng thái đã xác minh. Hãy chọn báo cáo khác.')).toBeVisible()
    expect(screen.getAllByRole('button', { name: 'Tạo phân công' })[1]).toBeDisabled()
  })

  it('clears a stale mission after a transition conflict', async () => {
    const user = userEvent.setup()
    mocks.updateMissionStatus.mockRejectedValueOnce(new ApiError(409, {
      timestamp: '2026-10-09T10:00:00Z', status: 409, code: 'INVALID_TRANSITION',
      message: 'Invalid mission transition.', path: `/api/rescue-missions/${assigned.id}/status`, fieldErrors: [],
    }))
    renderPage()
    await user.click(await screen.findByRole('button', { name: /Nhiệm vụ 00000000/ }))
    await user.click(await screen.findByRole('button', { name: 'Bắt đầu thực hiện' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Trạng thái nhiệm vụ đã thay đổi')
    expect(screen.queryByRole('button', { name: 'Bắt đầu thực hiện' })).not.toBeInTheDocument()
    expect(screen.getByText('Chọn một nhiệm vụ')).toBeVisible()
  })

  it('does not let an older report response overwrite the latest mission selection', async () => {
    const user = userEvent.setup()
    const secondMission = { ...assigned, id: '00000000-0000-0000-0000-000000000008', reportId: '00000000-0000-0000-0000-000000000009' }
    const secondReport = { ...report, id: secondMission.reportId, description: 'Báo cáo được chọn sau.' }
    let resolveFirst!: (value: Report) => void
    const firstResponse = new Promise<Report>(resolve => { resolveFirst = resolve })
    mocks.listMissions.mockResolvedValue(page([assigned, secondMission]))
    mocks.getReport.mockReturnValueOnce(firstResponse).mockResolvedValueOnce(secondReport)
    renderPage()

    await user.click(await screen.findByRole('button', { name: new RegExp(`Nhiệm vụ 00000000…${assigned.id.slice(-4)}`) }))
    await user.click(screen.getByRole('button', { name: new RegExp(`Nhiệm vụ 00000000…${secondMission.id.slice(-4)}`) }))
    expect(await screen.findByText(secondReport.description)).toBeVisible()

    resolveFirst(report)
    await waitFor(() => expect(screen.queryByText(report.description)).not.toBeInTheDocument())
    expect(screen.getByText(secondReport.description)).toBeVisible()
  })
  it.each([403, 404])('shows E09 %s from a deep link and never assigns', async status => {
    mocks.getReport.mockRejectedValueOnce(new ApiError(status, { status, code: 'NOT_FOUND', message: 'Không thể đọc báo cáo', timestamp: '', path: '', fieldErrors: [] }))
    renderPage(`/operations/rescue?reportId=${report.id}`)
    expect(await screen.findByRole('alert')).toBeVisible()
    expect(screen.queryByTestId('report-map')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Tạo phân công' })[1]).toBeDisabled()
    expect(mocks.createMission).not.toHaveBeenCalled()
  })

  it('removes the previous preview while the next report loads and on failure', async () => {
    const user = userEvent.setup()
    const second = { ...assigned, id: 'second-mission', reportId: 'second-report' }
    mocks.listMissions.mockResolvedValue(page([assigned, second]))
    renderPage()
    await user.click(await screen.findByRole('button', { name: /Nhiệm vụ 00000000/ }))
    expect(await screen.findByTestId('report-map')).toHaveAttribute('data-readonly', 'true')
    let reject!: (error: Error) => void
    mocks.getReport.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail }))
    await user.click(screen.getByRole('button', { name: /Nhiệm vụ second/ }))
    expect(screen.queryByTestId('report-map')).not.toBeInTheDocument()
    reject(new Error('offline'))
    expect(await screen.findByRole('alert')).toBeVisible()
    expect(screen.queryByTestId('report-map')).not.toBeInTheDocument()
  })

  it('uses report and team page 2 without losing pagination and clears preview on report page change', async () => {
    const user = userEvent.setup()
    mocks.listVerifiedReports.mockResolvedValue({ ...page([report]), totalPages: 2, totalElements: 21 })
    mocks.listRescueTeams.mockResolvedValue({ ...page([team]), totalPages: 2, totalElements: 21 })
    renderPage(`/operations/rescue?reportId=${report.id}`)
    expect(await screen.findByTestId('report-map')).toBeVisible()
    await user.click(within(screen.getByRole('navigation', { name: 'Phân trang báo cáo' })).getByRole('button', { name: 'Trang sau' }))
    await waitFor(() => expect(mocks.listVerifiedReports).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 })))
    expect(screen.queryByTestId('report-map')).not.toBeInTheDocument()
    await user.click(within(screen.getByRole('navigation', { name: 'Phân trang đội cứu hộ' })).getByRole('button', { name: 'Trang sau' }))
    await waitFor(() => expect(mocks.listRescueTeams).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, availability: 'AVAILABLE' })))
  })

  it.each([true, false])('retry reloads the selected report after failure (deep link: %s)', async deepLink => {
    const user = userEvent.setup()
    const secondReport = { ...report, id: 'second-report', description: 'Selected B' }
    mocks.listVerifiedReports.mockResolvedValue(page([report, secondReport]))
    renderPage(deepLink ? `/operations/rescue?reportId=${report.id}` : '/operations/rescue')
    if (deepLink) expect(await screen.findByTestId('report-map')).toBeVisible()
    else await user.click(screen.getByRole('button', { name: 'Tạo phân công' }))
    mocks.getReport.mockRejectedValueOnce(new Error('offline'))
    await user.click(screen.getByRole('button', { name: /Báo cáo second/ }))
    expect(await screen.findByRole('alert')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Tải lại lựa chọn' }))
    expect(mocks.getReport).toHaveBeenLastCalledWith(secondReport.id)
  })

  it.each(['success', 'conflict'])('ignores a previous assignment %s after navigating to a newer deep link', async outcome => {
    const user = userEvent.setup()
    const secondReport = { ...report, id: 'second-report', description: 'Selected B' }
    let navigate!: ReturnType<typeof useNavigate>
    function Navigation() { navigate = useNavigate(); return null }
    mocks.getReport.mockImplementation(async (id: string) => id === report.id ? report : secondReport)
    let finish!: (mission: Mission) => void
    let fail!: (error: Error) => void
    mocks.createMission.mockImplementation(() => new Promise((resolve, reject) => { finish = resolve; fail = reject }))
    render(<MemoryRouter initialEntries={[`/operations/rescue?reportId=${report.id}`]}><Navigation /><RescuePage /></MemoryRouter>)
    expect(await screen.findByTestId('report-map')).toBeVisible()
    await user.click(screen.getByRole('button', { name: /Đội cứu hộ miền Trung/ }))
    await user.click(screen.getAllByRole('button', { name: 'Tạo phân công' })[1])
    await act(async () => navigate('/operations/rescue?reportId=second-report'))
    expect(await screen.findByText(secondReport.description)).toBeVisible()
    await act(async () => {
      if (outcome === 'success') finish(assigned)
      else fail(new ApiError(409, { timestamp: '', status: 409, code: 'REPORT_ALREADY_ASSIGNED', message: '', path: '', fieldErrors: [] }))
    })
    expect(screen.getByText(secondReport.description)).toBeVisible()
  })
})
