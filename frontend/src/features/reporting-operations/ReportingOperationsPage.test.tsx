import { beforeEach, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../app/App'
import { session } from '../../auth/session'
import { ReportingOperationsPage } from './ReportingOperationsPage'
import type { Report } from './reporting-api'

vi.mock('../../shared/location', () => ({
  LocationMap: ({ value, onChange, readOnly, disabled, radiusMeters, label }: {
    value?: { latitude: number; longitude: number }
    onChange?: (value: { latitude: number; longitude: number }) => void
    readOnly?: boolean
    disabled?: boolean
    radiusMeters?: number
    label?: string
  }) => <button type="button" aria-label={label ?? 'Bản đồ giả lập'} disabled={disabled || readOnly}
    data-location={value ? `${value.latitude},${value.longitude}` : 'blank'} data-radius={radiusMeters ?? 'blank'}
    onClick={() => onChange?.({ latitude: 0, longitude: 0 })}>Bản đồ giả lập</button>,
}))

const original: Report = { id: '00000000-0000-4000-8000-000000000005', reporterId: '00000000-0000-4000-8000-000000000001', type: 'FLOOD', description: 'Nước ngập lối vào', latitude: 21, longitude: 105, status: 'PENDING', createdAt: '2026-10-10T03:00:00Z', updatedAt: '2026-10-10T03:00:00Z' }
const disaster = { id: '00000000-0000-4000-8000-000000000004', name: 'Lũ miền Bắc', type: 'FLOOD', status: 'ACTIVE' }
const page = (items: unknown[], index = 0, pages = 1) => ({ items, page: index, size: 20, totalElements: pages === 2 ? 21 : items.length, totalPages: items.length ? pages : 0 })
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status })
let report: Report
let failure = 0
let detailFailure = false
let fetcher: ReturnType<typeof vi.fn<(path: string, options?: RequestInit) => Promise<Response>>>
beforeEach(() => {
  report = { ...original }; failure = 0; detailFailure = false
  // jsdom has no modal top-layer implementation; browser suite covers actual focus trap/Escape.
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', '') } })
  fetcher = vi.fn(async (path: string, options?: RequestInit) => {
    const url = new URL(path, 'http://test')
    if (options?.method === 'PATCH') {
      if (failure) { if (failure === 409) report = { ...report, status: 'REJECTED', rejectionReason: 'Đã xử lý bởi người khác' }; return json({ code: 'INVALID_TRANSITION', fieldErrors: [] }, failure) }
      report = { ...report, ...JSON.parse(String(options.body)) }
      return json(report)
    }
    if (url.pathname === '/api/reports') return json(page(url.searchParams.get('status') === 'PENDING' && report.status !== 'PENDING' ? [] : [report]))
    if (url.pathname === `/api/reports/${original.id}`) return detailFailure ? json({}, 404) : json(report)
    if (url.pathname === '/api/disasters') return json(page(url.searchParams.get('page') === '1' ? [disaster] : [{ ...disaster, id: 'other-disaster', name: 'Trang đầu' }], Number(url.searchParams.get('page')), 2))
    throw new Error(`Unexpected test request ${path}`)
  })
  vi.stubGlobal('fetch', fetcher)
})
async function openReport() {
  render(<ReportingOperationsPage />)
  await userEvent.click(await screen.findByRole('button', { name: /Nước ngập lối vào/ }))
  await screen.findByRole('button', { name: 'Xác minh báo cáo' })
}
async function reject() {
  await userEvent.click(screen.getByRole('button', { name: 'Từ chối báo cáo' }))
  await userEvent.type(screen.getByLabelText('Lý do từ chối'), '  Sai vị trí  ')
  await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra quyết định' }))
  await userEvent.click(screen.getByRole('button', { name: 'Xác nhận quyết định' }))
}

it('validates complete geography before any request, applies wire filters and clears them', async () => {
  render(<ReportingOperationsPage />)
  await screen.findByRole('button', { name: /Nước ngập lối vào/ })
  const map = screen.getByRole('button', { name: 'Chọn tâm và xem bán kính lọc' })
  expect(map).toHaveAttribute('data-location', 'blank')
  await userEvent.type(screen.getByLabelText('Vĩ độ'), '91')
  await userEvent.click(screen.getByRole('button', { name: 'Áp dụng bộ lọc' }))
  expect(fetcher).toHaveBeenCalledTimes(1)
  expect(screen.getByLabelText('Vĩ độ')).toHaveAttribute('aria-invalid', 'true')
  await userEvent.clear(screen.getByLabelText('Vĩ độ')); await userEvent.type(screen.getByLabelText('Vĩ độ'), '0')
  await userEvent.type(screen.getByLabelText('Kinh độ'), '0')
  await userEvent.type(screen.getByLabelText('Bán kính (m)'), '1.5')
  await userEvent.click(screen.getByRole('button', { name: 'Áp dụng bộ lọc' }))
  expect(fetcher).toHaveBeenCalledTimes(1)
  await userEvent.clear(screen.getByLabelText('Bán kính (m)')); await userEvent.type(screen.getByLabelText('Bán kính (m)'), '1000')
  expect(map).toHaveAttribute('data-location', '0,0')
  expect(map).toHaveAttribute('data-radius', '1000')
  await userEvent.selectOptions(screen.getByLabelText('Trạng thái'), 'PENDING')
  await userEvent.click(screen.getByRole('button', { name: 'Áp dụng bộ lọc' }))
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2))
  const query = new URL(fetcher.mock.calls[1][0], 'http://test').searchParams
  expect(Object.fromEntries(query)).toEqual({ page: '0', size: '20', sort: 'createdAt,desc', status: 'PENDING', lat: '0', lon: '0', radiusMeters: '1000' })
  await userEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }))
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(3))
  expect(fetcher.mock.calls[2][0]).not.toContain('radiusMeters')
  expect(map).toHaveAttribute('data-location', 'blank')
  expect(map).toHaveAttribute('data-radius', 'blank')
})

it('keeps the map as draft state, accepts a zero center click and only filters after apply', async () => {
  render(<ReportingOperationsPage />)
  await screen.findByRole('button', { name: /Nước ngập lối vào/ })
  const map = screen.getByRole('button', { name: 'Chọn tâm và xem bán kính lọc' })
  await userEvent.click(map)
  expect(screen.getByLabelText('Vĩ độ')).toHaveValue('0')
  expect(screen.getByLabelText('Kinh độ')).toHaveValue('0')
  expect(fetcher).toHaveBeenCalledTimes(1)
  await userEvent.type(screen.getByLabelText('Bán kính (m)'), '2500')
  expect(map).toHaveAttribute('data-radius', '2500')
  expect(fetcher).toHaveBeenCalledTimes(1)
  await userEvent.click(screen.getByRole('button', { name: 'Áp dụng bộ lọc' }))
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2))
  expect(fetcher.mock.calls[1][0]).toContain('lat=0&lon=0&radiusMeters=2500')
})

it('requires a disaster, selects beyond the first page, confirms and refreshes list/detail after approval', async () => {
  await openReport()
  const preview = screen.getByRole('button', { name: `Vị trí báo cáo ${original.id}` })
  expect(preview).toBeDisabled()
  expect(preview).toHaveAttribute('data-location', '21,105')
  await userEvent.click(screen.getByRole('button', { name: 'Xác minh báo cáo' }))
  await screen.findByLabelText('Thảm họa đang hoạt động')
  await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra quyết định' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Chọn một thảm họa ACTIVE')
  expect(fetcher.mock.calls.some(call => call[1]?.method === 'PATCH')).toBe(false)
  await userEvent.click(within(screen.getByRole('navigation', { name: 'Phân trang thảm họa' })).getByRole('button', { name: 'Trang sau' }))
  await screen.findByRole('option', { name: /Lũ miền Bắc/ })
  await userEvent.selectOptions(screen.getByLabelText('Thảm họa đang hoạt động'), disaster.id)
  await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra quyết định' }))
  expect(screen.getByRole('dialog')).toHaveTextContent(disaster.name)
  expect(screen.getByRole('button', { name: 'Quay lại' })).toHaveFocus()
  await userEvent.click(screen.getByRole('button', { name: 'Xác nhận quyết định' }))
  await waitFor(() => expect(within(screen.getByRole('complementary')).getByText(/Đã xác minh · VERIFIED/)).toBeVisible())
  const patch = fetcher.mock.calls.find(call => call[1]?.method === 'PATCH')!
  expect(JSON.parse(String(patch[1]?.body))).toEqual({ status: 'VERIFIED', disasterId: disaster.id })
  expect(fetcher.mock.calls.filter(call => call[0] === `/api/reports/${original.id}`)).toHaveLength(2)
  expect(screen.queryByRole('button', { name: 'Xác minh báo cáo' })).not.toBeInTheDocument()
})

it('rejects blank/overlong reason and counts Unicode code points rather than UTF-16 units', async () => {
  await openReport()
  await userEvent.click(screen.getByRole('button', { name: 'Từ chối báo cáo' }))
  await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra quyết định' }))
  expect(screen.getByLabelText('Lý do từ chối')).toHaveAttribute('aria-invalid', 'true')
  const input = screen.getByLabelText('Lý do từ chối')
  await userEvent.click(input); await userEvent.paste('😀'.repeat(501))
  await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra quyết định' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  await userEvent.clear(input); await userEvent.paste('😀'.repeat(500))
  await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra quyết định' }))
  await userEvent.click(screen.getByRole('button', { name: 'Xác nhận quyết định' }))
  await screen.findByText(/Quyết định đã được lưu/)
  expect(JSON.parse(String(fetcher.mock.calls.find(call => call[1]?.method === 'PATCH')![1]?.body))).toEqual({ status: 'REJECTED', rejectionReason: '😀'.repeat(500) })
})

it.each([403, 404, 409])('shows %s and never announces false success', async status => {
  await openReport(); failure = status
  if (status === 404) detailFailure = true
  await reject()
  await waitFor(() => expect(screen.getAllByRole('alert').some(element => element.textContent?.includes(String(status)))).toBe(true))
  expect(screen.queryByText(/Quyết định đã được lưu/)).not.toBeInTheDocument()
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Xác minh báo cáo' })).not.toBeInTheDocument())
  expect(fetcher.mock.calls.filter(call => call[1]?.method === 'PATCH')).toHaveLength(1)
})

it('clears the actionable detail if a 409 refresh fails after withdrawal', async () => {
  await openReport(); failure = 409; detailFailure = true
  await reject()
  await screen.findByText(/404: Không tìm thấy/)
  expect(screen.queryByRole('button', { name: 'Xác minh báo cáo' })).not.toBeInTheDocument()
  expect(screen.getByText(/409: Báo cáo/)).toBeVisible()
})

it('ignores a late detail response after filters have changed', async () => {
  let resolve!: (response: Response) => void
  fetcher.mockImplementation(async (path: string) => path.includes('/api/reports?') ? json(page([report])) : new Promise<Response>(done => { resolve = done }))
  render(<ReportingOperationsPage />)
  await userEvent.click(await screen.findByRole('button', { name: /Nước ngập lối vào/ }))
  await userEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }))
  await act(async () => resolve(json(report)))
  expect(screen.queryByRole('button', { name: 'Xác minh báo cáo' })).not.toBeInTheDocument()
})

it('uses the shared AUTHORITY guard for the registered route', () => {
  session.establish('token', { id: 'citizen', email: 'c@example.test', role: 'CITIZEN' }, new Date(Date.now() + 60000).toISOString(), session.snapshot().generation)
  render(<MemoryRouter initialEntries={['/operations/reports']}><App /></MemoryRouter>)
  expect(screen.getByRole('alert')).toHaveTextContent('không có quyền')
  expect(fetcher).not.toHaveBeenCalled()
})

it('locks selection and prevents duplicate writes while a decision is pending', async () => {
  await openReport()
  const fallback = fetcher.getMockImplementation()!
  let finish!: (response: Response) => void
  fetcher.mockImplementation((path: string, options?: RequestInit) => options?.method === 'PATCH'
    ? new Promise<Response>(resolve => { finish = resolve }) : fallback(path, options))
  await reject()
  expect(screen.getByRole('button', { name: 'Đang xử lý…' })).toHaveAttribute('aria-disabled', 'true')
  await userEvent.click(screen.getByRole('button', { name: 'Đang xử lý…' }))
  expect(fetcher.mock.calls.filter(call => call[1]?.method === 'PATCH')).toHaveLength(1)
  expect(screen.getByRole('button', { name: 'Xóa bộ lọc' })).toBeDisabled()
  report = { ...report, status: 'REJECTED', rejectionReason: 'Sai vị trí' }
  await act(async () => finish(json(report)))
  await screen.findByText(/Quyết định đã được lưu/)
})

it('does not keep old rows after a list failure and supports retry', async () => {
  await openReport()
  const fallback = fetcher.getMockImplementation()!
  fetcher.mockImplementationOnce(async () => json({}, 403))
  await userEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }))
  await screen.findByText(/403:/)
  expect(screen.queryByRole('button', { name: /Nước ngập lối vào/ })).not.toBeInTheDocument()
  fetcher.mockImplementation(fallback)
  await userEvent.click(screen.getByRole('button', { name: 'Tải lại danh sách' }))
  await screen.findByRole('button', { name: /Nước ngập lối vào/ })
})

it('moves back from an emptied last page after a decision removes its last pending report', async () => {
  const fallback = fetcher.getMockImplementation()!
  fetcher.mockImplementation(async (path: string, options?: RequestInit) => {
    if (path.startsWith('/api/reports?')) {
      const index = Number(new URL(path, 'http://test').searchParams.get('page'))
      return json(report.status === 'PENDING' ? page([report], index, 2) : { ...page(index ? [] : [{ ...original, id: 'remaining' }]), page: index, totalPages: 1 })
    }
    return fallback(path, options)
  })
  render(<ReportingOperationsPage />)
  await screen.findByRole('button', { name: /Nước ngập lối vào/ })
  await userEvent.click(within(screen.getByRole('navigation', { name: 'Phân trang báo cáo' })).getByRole('button', { name: 'Trang sau' }))
  await userEvent.click(await screen.findByRole('button', { name: /Nước ngập lối vào/ }))
  await screen.findByRole('button', { name: 'Từ chối báo cáo' })
  await reject()
  await waitFor(() => expect(screen.getByRole('button', { name: /remaining/ })).toBeVisible())
  expect(within(screen.getByRole('complementary')).getByText(/Đã từ chối · REJECTED/)).toBeVisible()
})

it('refreshes after DISASTER_NOT_ACTIVE and requires a new disaster selection without retrying the write', async () => {
  await openReport()
  const fallback = fetcher.getMockImplementation()!
  fetcher.mockImplementation((path, options) => options?.method === 'PATCH'
    ? Promise.resolve(json({ code: 'DISASTER_NOT_ACTIVE', fieldErrors: [] }, 409)) : fallback(path, options))
  await userEvent.click(screen.getByRole('button', { name: 'Xác minh báo cáo' }))
  await userEvent.selectOptions(await screen.findByLabelText('Thảm họa đang hoạt động'), 'other-disaster')
  await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra quyết định' }))
  await userEvent.click(screen.getByRole('button', { name: 'Xác nhận quyết định' }))
  await screen.findByText(/409: Thảm họa không còn ACTIVE/)
  await userEvent.click(await screen.findByRole('button', { name: 'Xác minh báo cáo' }))
  expect(await screen.findByLabelText('Thảm họa đang hoạt động')).toHaveValue('')
  await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra quyết định' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(fetcher.mock.calls.filter(call => call[1]?.method === 'PATCH')).toHaveLength(1)
  expect(screen.queryByText(/Quyết định đã được lưu/)).not.toBeInTheDocument()
})
