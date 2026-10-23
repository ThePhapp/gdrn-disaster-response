import { act, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  get: vi.fn(),
  list: vi.fn(),
  missions: vi.fn(),
  withdraw: vi.fn(),
  attachments: vi.fn(),
  attachmentContent: vi.fn(),
  uploadAttachment: vi.fn(),
  deleteAttachment: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock('../../shared/location', () => ({
  LocationMap: ({ value, onChange, readOnly, disabled, label }: {
    value?: { latitude: number; longitude: number }
    onChange?: (value: { latitude: number; longitude: number }) => void
    readOnly?: boolean
    disabled?: boolean
    label?: string
  }) => <button type="button" aria-label={label ?? 'Bản đồ giả lập'} disabled={disabled || readOnly}
    data-location={value ? `${value.latitude},${value.longitude}` : 'blank'}
    data-read-only={readOnly ? 'true' : 'false'}
    onClick={() => onChange?.({ latitude: 0, longitude: 0 })}>Bản đồ giả lập</button>,
}))

vi.mock('./reporting-api', async importOriginal => ({
  ...await importOriginal<typeof import('./reporting-api')>(),
  createReport: mocks.create,
  getReport: mocks.get,
  listReports: mocks.list,
  listReportMissions: mocks.missions,
  withdrawReport: mocks.withdraw,
}))

vi.mock('../reporting-attachments/reporting-attachments-api', async importOriginal => ({
  ...await importOriginal<typeof import('../reporting-attachments/reporting-attachments-api')>(),
  listReportAttachments: mocks.attachments,
  getReportAttachmentContent: mocks.attachmentContent,
  uploadReportAttachment: mocks.uploadAttachment,
  deleteReportAttachment: mocks.deleteAttachment,
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

const verifiedReport: Report = {
  ...report,
  status: 'VERIFIED',
  disasterId: '00000000-0000-0000-0000-000000000020',
  verifiedAt: '2026-10-14T09:00:00Z',
  updatedAt: '2026-10-14T09:00:00Z',
}

const page = (items: Report[] = [report]): ReportPage => ({
  items,
  page: 0,
  size: 20,
  totalElements: items.length,
  totalPages: items.length ? 1 : 0,
})

const renderAt = (path: '/reports/new' | '/my-reports') => {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ReportingCitizenPage />
    </MemoryRouter>,
  )
}

describe('ReportingCitizenPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.list.mockResolvedValue(page())
    mocks.create.mockResolvedValue(report)
    mocks.get.mockResolvedValue(report)
    mocks.missions.mockResolvedValue({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 })
    mocks.withdraw.mockResolvedValue(undefined)
    mocks.attachments.mockResolvedValue([])
    mocks.attachmentContent.mockResolvedValue(new Blob())
    mocks.uploadAttachment.mockResolvedValue(undefined)
    mocks.deleteAttachment.mockResolvedValue(undefined)
  })

  it('loads the citizen report list and shows status', async () => {
    renderAt('/my-reports')

    expect(await screen.findByText(report.description)).toBeVisible()
    expect(screen.getAllByText('Đang chờ xác minh')).toHaveLength(2)
    expect(mocks.list).toHaveBeenCalledWith({
      page: 0,
      size: 20,
      sort: 'createdAt,desc',
      status: undefined,
      type: undefined,
    })
  })

  it('shows an empty state when the citizen has no reports', async () => {
    mocks.list.mockResolvedValueOnce(page([]))

    renderAt('/my-reports')

    expect(await screen.findByText('Bạn chưa có báo cáo nào.')).toBeVisible()
  })

  it('shows a recoverable error when loading reports fails', async () => {
    mocks.list.mockRejectedValueOnce(new Error('network'))

    renderAt('/my-reports')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Không thể kết nối máy chủ. Vui lòng thử lại.',
    )
  })

  it('validates description and coordinates before sending', async () => {
    const user = userEvent.setup()
    renderAt('/reports/new')

    await user.click(screen.getByRole('button', { name: 'Gửi báo cáo' }))

    expect(await screen.findByText('Vui lòng mô tả tình huống.')).toBeVisible()
    expect(screen.getByText('Vĩ độ phải là số từ -90 đến 90.')).toBeVisible()
    expect(screen.getByText('Kinh độ phải là số từ -180 đến 180.')).toBeVisible()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('submits a valid report and navigates to my reports', async () => {
    const user = userEvent.setup()
    renderAt('/reports/new')

    await user.type(
      screen.getByLabelText('Mô tả tình huống'),
      'Nước đang dâng gần khu dân cư.',
    )
    await user.type(screen.getByLabelText('Vĩ độ (latitude)'), '21.0285')
    await user.type(screen.getByLabelText('Kinh độ (longitude)'), '105.8542')
    expect(screen.getByRole('button', { name: 'Chọn vị trí báo cáo' })).toHaveAttribute('data-location', '21.0285,105.8542')
    await user.click(screen.getByRole('button', { name: 'Gửi báo cáo' }))

    await waitFor(() => {
      expect(mocks.create).toHaveBeenCalledWith({
        type: 'FLOOD',
        description: 'Nước đang dâng gần khu dân cư.',
        latitude: 21.0285,
        longitude: 105.8542,
      })
    })
    expect(mocks.navigate).toHaveBeenCalledWith('/my-reports', {
      state: { selectedReportId: report.id },
    })
  })

  it('keeps blank coordinates unselected and submits an exact zero map selection', async () => {
    const user = userEvent.setup()
    renderAt('/reports/new')
    const map = screen.getByRole('button', { name: 'Chọn vị trí báo cáo' })
    expect(map).toHaveAttribute('data-location', 'blank')

    await user.type(screen.getByLabelText('Mô tả tình huống'), 'Kiểm tra tọa độ không.')
    await user.click(map)
    expect(screen.getByLabelText('Vĩ độ (latitude)')).toHaveValue('0')
    expect(screen.getByLabelText('Kinh độ (longitude)')).toHaveValue('0')
    expect(map).toHaveAttribute('data-location', '0,0')
    await user.click(screen.getByRole('button', { name: 'Gửi báo cáo' }))

    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ latitude: 0, longitude: 0 })))
  })

  it('locks submit and the map while one create request is pending', async () => {
    const user = userEvent.setup()
    let finish!: (value: Report) => void
    mocks.create.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    renderAt('/reports/new')

    await user.type(screen.getByLabelText('Mô tả tình huống'), 'Không gửi trùng báo cáo.')
    await user.click(screen.getByRole('button', { name: 'Chọn vị trí báo cáo' }))
    await user.click(screen.getByRole('button', { name: 'Gửi báo cáo' }))
    const submit = screen.getByRole('button', { name: 'Đang gửi báo cáo…' })
    expect(submit).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Chọn vị trí báo cáo' })).toBeDisabled()
    await user.click(submit)
    expect(mocks.create).toHaveBeenCalledTimes(1)

    await act(async () => finish(report))
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/my-reports', {
      state: { selectedReportId: report.id },
    }))
  })

  it('shows an error when creating a report fails', async () => {
    const user = userEvent.setup()
    mocks.create.mockRejectedValueOnce(new Error('network'))

    renderAt('/reports/new')

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
    renderAt('/my-reports')

    await screen.findByText(report.description)
    await user.click(screen.getByRole('button', { name: 'Rút báo cáo' }))
    expect(screen.getByRole('alertdialog')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Hủy' })).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Hủy' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(mocks.withdraw).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Rút báo cáo' })).toHaveFocus()
  })

  it('closes the withdrawal dialog with Escape and returns focus', async () => {
    const user = userEvent.setup()
    renderAt('/my-reports')

    await screen.findByText(report.description)
    const trigger = screen.getByRole('button', { name: 'Rút báo cáo' })
    await user.click(trigger)
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('filters reports and loads fresh detail through E09', async () => {
    const user = userEvent.setup()
    renderAt('/my-reports')

    await screen.findByText(report.description)
    await user.selectOptions(screen.getByLabelText('Trạng thái'), 'PENDING')
    await waitFor(() => {
      expect(mocks.list).toHaveBeenLastCalledWith({
        page: 0,
        size: 20,
        sort: 'createdAt,desc',
        status: 'PENDING',
        type: undefined,
      })
    })

    await user.click(screen.getByRole('button', { name: /Nước đang dâng/ }))
    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith(report.id))
    expect(await screen.findByText('Mã báo cáo')).toBeVisible()
    expect(screen.getByRole('button', { name: `Vị trí báo cáo ${report.id}` })).toHaveAttribute('data-location', '21.0285,105.8542')
    expect(screen.getByRole('button', { name: `Vị trí báo cáo ${report.id}` })).toHaveAttribute('data-read-only', 'true')
    expect(screen.getByText('Báo cáo cần được xác minh trước khi có thể phân công cứu hộ.')).toBeVisible()
    expect(mocks.missions).not.toHaveBeenCalled()
  })

  it('shows an empty mission state for a verified report without an assignment', async () => {
    const user = userEvent.setup()
    mocks.list.mockResolvedValue(page([verifiedReport]))
    mocks.get.mockResolvedValue(verifiedReport)
    renderAt('/my-reports')

    await user.click(await screen.findByRole('button', { name: /Nước đang dâng/ }))

    await waitFor(() => expect(mocks.missions).toHaveBeenCalledWith(verifiedReport.id))
    expect(await screen.findByText('Chưa có nhiệm vụ cứu hộ cho báo cáo này.')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Làm mới tiến độ' }))
    await waitFor(() => expect(mocks.missions).toHaveBeenCalledTimes(2))
  })

  it('refreshes E09 detail before loading newly available mission progress', async () => {
    const user = userEvent.setup()
    mocks.get
      .mockResolvedValueOnce(report)
      .mockResolvedValueOnce(verifiedReport)
    renderAt('/my-reports')

    await user.click(await screen.findByRole('button', { name: /Nước đang dâng/ }))
    expect(await screen.findByText('Báo cáo cần được xác minh trước khi có thể phân công cứu hộ.')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Làm mới chi tiết' }))

    await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(mocks.missions).toHaveBeenCalledWith(verifiedReport.id))
    expect(await screen.findByText('Chưa có nhiệm vụ cứu hộ cho báo cáo này.')).toBeVisible()
  })

  it('shows mission progress from E14', async () => {
    const user = userEvent.setup()
    mocks.list.mockResolvedValue(page([verifiedReport]))
    mocks.get.mockResolvedValue(verifiedReport)
    mocks.missions.mockResolvedValue({
      items: [{
        id: '00000000-0000-0000-0000-000000000030',
        reportId: verifiedReport.id,
        teamId: '00000000-0000-0000-0000-000000000040',
        status: 'COMPLETED',
        assignedAt: '2026-10-14T10:00:00Z',
        startedAt: '2026-10-14T10:10:00Z',
        completedAt: '2026-10-14T11:00:00Z',
        updatedAt: '2026-10-14T11:00:00Z',
      }],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
    })
    renderAt('/my-reports')

    await user.click(await screen.findByRole('button', { name: /Nước đang dâng/ }))

    expect(await screen.findByText('Đã hoàn thành')).toBeVisible()
    expect(screen.getByText('Bắt đầu cứu hộ')).toBeVisible()
    expect(screen.getByText('Hoàn thành')).toBeVisible()
  })

  it('withdraws a pending report and reloads the list', async () => {
    const user = userEvent.setup()
    renderAt('/my-reports')

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

    renderAt('/my-reports')

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
