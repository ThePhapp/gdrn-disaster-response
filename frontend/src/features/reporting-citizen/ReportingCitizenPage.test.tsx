import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  list: vi.fn(),
  withdraw: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock('./reporting-api', async importOriginal => ({
  ...await importOriginal<typeof import('./reporting-api')>(),
  createReport: mocks.create,
  listReports: mocks.list,
  withdrawReport: mocks.withdraw,
}))

vi.mock('react-router-dom', async importOriginal => ({
  ...await importOriginal<typeof import('react-router-dom')>(),
  useNavigate: () => mocks.navigate,
}))

import { ReportingCitizenPage } from './ReportingCitizenPage'
import type { Report, ReportPage } from './reporting-api'

const report: Report = {
  id: '00000000-0000-0000-0000-000000000001',
  reporterId: '00000000-0000-0000-0000-000000000010',
  type: 'FLOOD',
  description: 'Nước đang dâng gần khu dân cư.',
  latitude: 21.0285,
  longitude: 105.8542,
  status: 'PENDING',
  createdAt: '2026-10-14T08:00:00Z',
  updatedAt: '2026-10-14T08:00:00Z',
}

const page = (items: Report[] = [report]): ReportPage => ({
  items,
  page: 0,
  size: 10,
  totalElements: items.length,
  totalPages: items.length ? 1 : 0,
})

describe('ReportingCitizenPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.list.mockResolvedValue(page())
    mocks.create.mockResolvedValue(report)
    mocks.withdraw.mockResolvedValue(undefined)
  })

  it('loads the citizen report list and shows status', async () => {
    render(<ReportingCitizenPage />)

    expect(await screen.findByText(report.description)).toBeVisible()
    expect(screen.getByText('Đang chờ xác minh')).toBeVisible()
    expect(mocks.list).toHaveBeenCalledWith({
      page: 0,
      size: 10,
      sort: 'createdAt,desc',
    })
  })

  it('shows an empty state when the citizen has no reports', async () => {
    mocks.list.mockResolvedValueOnce(page([]))

    render(<ReportingCitizenPage />)

    expect(await screen.findByText('Bạn chưa có báo cáo nào.')).toBeVisible()
  })

  it('shows a recoverable error when loading reports fails', async () => {
    mocks.list.mockRejectedValueOnce(new Error('network'))

    render(<ReportingCitizenPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Không thể kết nối máy chủ. Vui lòng thử lại.',
    )
  })

  it('validates description and coordinates before sending', async () => {
    const user = userEvent.setup()
    render(<ReportingCitizenPage />)

    await user.click(screen.getByRole('button', { name: 'Gửi báo cáo' }))

    expect(await screen.findByText('Vui lòng mô tả tình huống.')).toBeVisible()
    expect(screen.getByText('Vĩ độ phải là số từ -90 đến 90.')).toBeVisible()
    expect(screen.getByText('Kinh độ phải là số từ -180 đến 180.')).toBeVisible()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('submits a valid report and navigates to my reports', async () => {
    const user = userEvent.setup()
    render(<ReportingCitizenPage />)

    await user.type(
      screen.getByLabelText('Mô tả tình huống'),
      'Nước đang dâng gần khu dân cư.',
    )
    await user.type(screen.getByLabelText('Vĩ độ (latitude)'), '21.0285')
    await user.type(screen.getByLabelText('Kinh độ (longitude)'), '105.8542')
    await user.click(screen.getByRole('button', { name: 'Gửi báo cáo' }))

    await waitFor(() => {
      expect(mocks.create).toHaveBeenCalledWith({
        type: 'FLOOD',
        description: 'Nước đang dâng gần khu dân cư.',
        latitude: 21.0285,
        longitude: 105.8542,
      })
    })
    expect(mocks.navigate).toHaveBeenCalledWith('/my-reports')
    expect(await screen.findByRole('status')).toHaveTextContent(report.id)
  })

  it('shows an error when creating a report fails', async () => {
    const user = userEvent.setup()
    mocks.create.mockRejectedValueOnce(new Error('network'))

    render(<ReportingCitizenPage />)

    await user.type(screen.getByLabelText('Mô tả tình huống'), 'Có ngập nước.')
    await user.type(screen.getByLabelText('Vĩ độ (latitude)'), '21.0285')
    await user.type(screen.getByLabelText('Kinh độ (longitude)'), '105.8542')
    await user.click(screen.getByRole('button', { name: 'Gửi báo cáo' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Không thể kết nối máy chủ. Vui lòng thử lại.',
    )
    expect(mocks.navigate).not.toHaveBeenCalled()
  })

  it('does not withdraw a report when confirmation is cancelled', async () => {
    const user = userEvent.setup()
    render(<ReportingCitizenPage />)

    await screen.findByText(report.description)
    await user.click(screen.getByRole('button', { name: 'Rút báo cáo' }))
    expect(screen.getByRole('alertdialog')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Hủy' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(mocks.withdraw).not.toHaveBeenCalled()
  })

  it('withdraws a pending report and reloads the list', async () => {
    const user = userEvent.setup()
    render(<ReportingCitizenPage />)

    await screen.findByText(report.description)
    await user.click(screen.getByRole('button', { name: 'Rút báo cáo' }))
    await user.click(screen.getByRole('button', { name: 'Xác nhận rút' }))

    await waitFor(() => {
      expect(mocks.withdraw).toHaveBeenCalledWith(report.id)
    })
    await waitFor(() => {
      expect(mocks.list).toHaveBeenCalledTimes(2)
    })

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('shows a conflict and reloads the list when withdrawal returns 409', async () => {
    const user = userEvent.setup()
    mocks.withdraw.mockRejectedValueOnce(
    new (await import('../../shared/api')).ApiError(409, {
        timestamp: '2026-10-14T10:00:00Z',
        status: 409,
        code: 'INVALID_TRANSITION',
        message: 'Report is no longer pending',
        path: '/api/reports/00000000-0000-0000-0000-000000000001',
        fieldErrors: [],
    }),
    )

    render(<ReportingCitizenPage />)

    await screen.findByText(report.description)
    await user.click(screen.getByRole('button', { name: 'Rút báo cáo' }))
    await user.click(screen.getByRole('button', { name: 'Xác nhận rút' }))

    expect(await screen.findByText(
      'Dữ liệu đã thay đổi. Vui lòng tải lại và thử lại.',
    )).toBeVisible()

    await waitFor(() => {
      expect(mocks.list).toHaveBeenCalledTimes(2)
    })
    expect(mocks.withdraw).toHaveBeenCalledTimes(1)
  })

})
