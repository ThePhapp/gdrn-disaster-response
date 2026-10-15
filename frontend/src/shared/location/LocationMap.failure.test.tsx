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
