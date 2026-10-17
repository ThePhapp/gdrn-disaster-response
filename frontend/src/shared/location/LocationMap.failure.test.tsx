import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'

vi.mock('./config', () => ({ mapTileConfig: { styleUrl: 'https://maps.example/style.json', attribution: 'Example' } }))
const state = vi.hoisted(() => ({ fail: true }))
vi.mock('./MapLibreMap', () => ({
  MapLibreMap: () => {
    if (state.fail) throw new Error('Map chunk/render failed')
    return <div>Map recovered</div>
  },
}))
import { LocationMap } from './LocationMap'

it('isolates renderer failure, preserves manual input and retries without resetting the form', async () => {
  const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    render(<form><input aria-label="Latitude" defaultValue="12.5" /><LocationMap /></form>)
    await screen.findByText('Không thể mở bản đồ. Bạn vẫn có thể nhập tọa độ.')
    await userEvent.type(screen.getByLabelText('Latitude'), '6')
    expect(screen.getByLabelText('Latitude')).toHaveValue('12.56')
    state.fail = false
    await userEvent.click(screen.getByRole('button', { name: 'Thử tải lại' }))
    expect(await screen.findByText('Map recovered')).toBeVisible()
    expect(screen.getByLabelText('Latitude')).toHaveValue('12.56')
  } finally { errorLog.mockRestore() }
})

it('describes the numeric detail fallback for read-only previews without promising editing', async () => {
  state.fail = true
  const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    render(<LocationMap readOnly value={{ latitude: 0, longitude: 0 }} />)
    expect(await screen.findByText('Không thể mở bản đồ. Tọa độ vẫn hiển thị trong chi tiết.')).toBeVisible()
    expect(screen.getByText('Không tải được lớp bản đồ. Tọa độ vẫn hiển thị trong chi tiết.')).toBeVisible()
    expect(screen.queryByText(/Nhập tọa độ vẫn hoạt động/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thử tải lại' })).toBeEnabled()
  } finally { errorLog.mockRestore() }
})
