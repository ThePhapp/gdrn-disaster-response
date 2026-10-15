import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../shared/location', () => ({
  LocationMap: ({ value, onChange, disabled }: {
    value?: { latitude: number; longitude: number }
    onChange: (value: { latitude: number; longitude: number }) => void
    disabled?: boolean
  }) => <button type="button" aria-label="Chọn điểm giả lập" disabled={disabled}
    data-location={value ? `${value.latitude},${value.longitude}` : 'blank'}
    onClick={() => onChange({ latitude: 0, longitude: 0 })}>Chọn (0,0)</button>,
}))
import { DisasterForm } from './DisasterForm'
import type { Disaster } from './disaster-api'

const active: Disaster = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Lũ miền Trung', type: 'FLOOD', severity: 'HIGH', description: 'Nước đang dâng nhanh.',
  latitude: 16.0471, longitude: 108.2068, status: 'ACTIVE', version: 2,
  createdAt: '2026-10-09T10:00:00Z', updatedAt: '2026-10-09T10:10:00Z',
}

describe('DisasterForm', () => {
  it('validates required fields and coordinate ranges before creating', async () => {
    const create = vi.fn().mockResolvedValue(undefined)
    render(<DisasterForm busy={false} onCancel={vi.fn()} onCreate={create} onEdit={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Tạo thảm họa' }))
    expect(screen.getByLabelText('Tên thảm họa')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Mô tả')).toHaveAttribute('aria-invalid', 'true')
    expect(create).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.getByLabelText('Tên thảm họa')).toHaveFocus())

    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Tên thảm họa'), '  Lũ miền Trung  ')
    await user.type(screen.getByLabelText('Mô tả'), '  Nước đang dâng nhanh.  ')
    await user.type(screen.getByLabelText('Vĩ độ'), '91')
    await user.type(screen.getByLabelText('Kinh độ'), '108.2068')
    await user.click(screen.getByRole('button', { name: 'Tạo thảm họa' }))
    expect(screen.getByText('Vĩ độ phải nằm trong khoảng -90 đến 90.')).toBeVisible()
    expect(create).not.toHaveBeenCalled()

    await user.clear(screen.getByLabelText('Vĩ độ'))
    await user.type(screen.getByLabelText('Vĩ độ'), '16.0471')
    await user.click(screen.getByRole('button', { name: 'Tạo thảm họa' }))
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Lũ miền Trung', description: 'Nước đang dâng nhanh.', latitude: 16.0471, longitude: 108.2068,
    }))
  })

  it('sends only changed fields with the current version', async () => {
    const edit = vi.fn().mockResolvedValue(undefined)
    render(<DisasterForm disaster={active} busy={false} onCancel={vi.fn()} onCreate={vi.fn()} onEdit={edit} />)
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Chưa có thay đổi')
    expect(edit).not.toHaveBeenCalled()

    const name = screen.getByLabelText('Tên thảm họa')
    await userEvent.clear(name)
    await userEvent.type(name, 'Lũ miền Trung mở rộng')
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))
    expect(edit).toHaveBeenCalledWith({ expectedVersion: 2, name: 'Lũ miền Trung mở rộng' })
  })

  it('keeps manual input controlled, treats blank as unselected, and submits a map click at zero', async () => {
    const create = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<DisasterForm busy={false} onCancel={vi.fn()} onCreate={create} onEdit={vi.fn()} />)
    expect(await screen.findByRole('button', { name: 'Chọn điểm giả lập' })).toHaveAttribute('data-location', 'blank')
    await user.type(screen.getByLabelText('Tên thảm họa'), 'Kiểm tra tọa độ không')
    await user.type(screen.getByLabelText('Mô tả'), 'Không được biến ô trống thành số không.')
    await user.click(screen.getByRole('button', { name: 'Tạo thảm họa' }))
    expect(create).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Vĩ độ')).toHaveAttribute('aria-invalid', 'true')

    await user.type(screen.getByLabelText('Vĩ độ'), '12.5')
    await user.type(screen.getByLabelText('Kinh độ'), '-45.25')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Chọn điểm giả lập' }))
      .toHaveAttribute('data-location', '12.5,-45.25'))
    await user.clear(screen.getByLabelText('Vĩ độ'))
    await user.clear(screen.getByLabelText('Kinh độ'))
    await user.click(screen.getByRole('button', { name: 'Chọn điểm giả lập' }))
    expect(screen.getByLabelText('Vĩ độ')).toHaveValue(0)
    expect(screen.getByLabelText('Kinh độ')).toHaveValue(0)
    expect(screen.getByRole('button', { name: 'Chọn điểm giả lập' })).toHaveAttribute('data-location', '0,0')
    await user.click(screen.getByRole('button', { name: 'Tạo thảm họa' }))
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ latitude: 0, longitude: 0 }))
  })
})
