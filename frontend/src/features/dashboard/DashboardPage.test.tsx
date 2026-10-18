import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api'
import { I18nProvider } from '../../shared/i18n'
import type { DashboardSummary } from './dashboard-api'
const mocks = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('./dashboard-api', async original => ({
  ...await original<typeof import('./dashboard-api')>(), getDashboard: mocks.get,
}))
import { DashboardPage } from './DashboardPage'

const summary: DashboardSummary = {
  from: null, to: null, timeZone: 'Asia/Ho_Chi_Minh', asOf: '2026-10-18T09:00:00Z',
  reports: { pending: 105, verified: 2, rejected: 3 },
  missions: { assigned: 1, inProgress: 2, completed: 3 }, teams: { available: 4, busy: 3 },
}

describe('DashboardPage', () => {
  beforeEach(() => { mocks.get.mockReset(); mocks.get.mockResolvedValue(summary) })

  it('shows global totals, current capacity and both status breakdowns', async () => {
    render(<DashboardPage />)
    expect(await screen.findByRole('article', { name: 'Tổng số báo cáo' })).toHaveTextContent('110')
    expect(screen.getByRole('article', { name: 'Nhiệm vụ đang xử lý' })).toHaveTextContent('3')
    expect(screen.getByRole('article', { name: 'Đội rảnh hiện tại' })).toHaveTextContent('4')
    expect(screen.getByRole('table', { name: 'Báo cáo theo trạng thái' })).toHaveTextContent('105')
    expect(mocks.get).toHaveBeenCalledWith(null, expect.any(AbortSignal))
    expect(screen.getByText(/Đội rảnh\/bận phản ánh hiện tại/)).toBeVisible()
  })

  it('keeps drafts separate, validates, applies dates and clears to all time', async () => {
    render(<DashboardPage />)
    await screen.findByRole('article', { name: 'Tổng số báo cáo' })
    await userEvent.type(screen.getByLabelText('Từ ngày'), '2026-10-18')
    expect(mocks.get).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByRole('button', { name: 'Áp dụng thời gian' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Nhập đủ hai ngày')
    expect(mocks.get).toHaveBeenCalledTimes(1)
    await userEvent.type(screen.getByLabelText('Đến ngày'), '2026-10-17')
    await userEvent.click(screen.getByRole('button', { name: 'Áp dụng thời gian' }))
    expect(mocks.get).toHaveBeenCalledTimes(1)
    await userEvent.clear(screen.getByLabelText('Đến ngày'))
    await userEvent.type(screen.getByLabelText('Đến ngày'), '2026-10-18')
    await userEvent.click(screen.getByRole('button', { name: 'Áp dụng thời gian' }))
    await waitFor(() => expect(mocks.get).toHaveBeenLastCalledWith({ from: '2026-10-18', to: '2026-10-18' }, expect.any(AbortSignal)))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Xóa thời gian' }))
    await waitFor(() => expect(mocks.get).toHaveBeenLastCalledWith(null, expect.any(AbortSignal)))
    expect(screen.getByLabelText('Từ ngày')).toHaveValue('')
  })

  it('aborts old requests and never displays a late response under another range', async () => {
    let finish!: (data: DashboardSummary) => void
    mocks.get.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const view = render(<DashboardPage />)
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải thống kê')
    const signal = mocks.get.mock.calls[0][1] as AbortSignal
    await userEvent.type(screen.getByLabelText('Từ ngày'), '2026-10-18')
    await userEvent.type(screen.getByLabelText('Đến ngày'), '2026-10-18')
    await userEvent.click(screen.getByRole('button', { name: 'Áp dụng thời gian' }))
    expect(signal.aborted).toBe(true)
    await screen.findByRole('article', { name: 'Tổng số báo cáo' })
    await act(async () => finish({ ...summary, reports: { pending: 999, verified: 0, rejected: 0 } }))
    expect(screen.queryByText('999')).not.toBeInTheDocument()
    const latest = mocks.get.mock.calls.at(-1)?.[1] as AbortSignal
    view.unmount()
    expect(latest.aborted).toBe(true)
  })

  it('shows empty cohorts with team capacity and recovers from errors', async () => {
    mocks.get.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ ...summary,
      reports: { pending: 0, verified: 0, rejected: 0 }, missions: { assigned: 0, inProgress: 0, completed: 0 } })
    render(<DashboardPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể tải thống kê')
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByText(/Không có báo cáo hoặc nhiệm vụ/)).toBeVisible()
    expect(screen.getByRole('article', { name: 'Đội rảnh hiện tại' })).toHaveTextContent('4')
  })

  it('shows a forbidden state without a retry loop', async () => {
    mocks.get.mockRejectedValueOnce(new ApiError(403))
    render(<DashboardPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Bạn không có quyền')
    expect(screen.queryByRole('button', { name: 'Thử lại' })).not.toBeInTheDocument()
  })

  it('translates the dashboard without fetching data again', async () => {
    window.localStorage.setItem('gdrn.language', 'en')
    const { LanguageSwitcher } = await import('../../shared/i18n')
    render(<I18nProvider><LanguageSwitcher /><DashboardPage /></I18nProvider>)
    expect(await screen.findByRole('article', { name: 'Total reports' })).toHaveTextContent('110')
    await userEvent.click(screen.getByRole('button', { name: 'Switch language to Vietnamese' }))
    expect(screen.getByRole('heading', { name: 'Tổng quan ứng phó' })).toBeVisible()
    expect(within(screen.getByRole('table', { name: 'Báo cáo theo trạng thái' })).getByText('Chờ xử lý')).toBeVisible()
    expect(mocks.get).toHaveBeenCalledTimes(1)
  })
})
