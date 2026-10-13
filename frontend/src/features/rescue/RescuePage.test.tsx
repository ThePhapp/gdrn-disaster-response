import { MemoryRouter } from 'react-router-dom'
import { render, screen, waitFor, within } from '@testing-library/react'
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

  function renderPage() {
    return render(<MemoryRouter initialEntries={['/operations/rescue']}><RescuePage /></MemoryRouter>)
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
  })
})
