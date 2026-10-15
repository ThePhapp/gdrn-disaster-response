import { useEffect, useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { LocationValue } from './types'

vi.mock('./config', () => ({ mapTileConfig: { styleUrl: 'https://maps.example/style.json', attribution: 'Example' } }))

vi.mock('./MapLibreMap', () => ({
  MapLibreMap: ({ value, onChange, readOnly, disabled, radiusMeters, onMapReady }: {
    value?: LocationValue
    onChange?: (value: LocationValue) => void
    readOnly?: boolean
    disabled?: boolean
    radiusMeters?: number
    onMapReady: () => void
  }) => {
    useEffect(onMapReady, [onMapReady])
    return <button type="button" aria-label="Bản đồ giả lập" disabled={disabled || readOnly}
      data-value={value ? `${value.latitude},${value.longitude}` : 'blank'} data-radius={radiusMeters}
      onClick={() => onChange?.({ latitude: 0, longitude: 0 })}>Chọn (0,0)</button>
  },
}))

import { LocationMap } from './LocationMap'

function ControlledMap() {
  const [value, setValue] = useState<LocationValue>()
  return <><output>{value ? `${value.latitude},${value.longitude}` : 'Chưa chọn'}</output>
    <LocationMap value={value} onChange={setValue} radiusMeters={2500} /></>
}

describe('LocationMap', () => {
  it('is controlled, preserves an unselected value and accepts zero coordinates', async () => {
    render(<ControlledMap />)
    expect(await screen.findByRole('button', { name: 'Bản đồ giả lập' })).toHaveAttribute('data-value', 'blank')
    await userEvent.click(screen.getByRole('button', { name: 'Bản đồ giả lập' }))
    expect(screen.getByText('0,0')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Bản đồ giả lập' })).toHaveAttribute('data-value', '0,0')
    expect(screen.getByRole('button', { name: 'Bản đồ giả lập' })).toHaveAttribute('data-radius', '2500')
    await waitFor(() => expect(screen.queryByText('Đang tải lớp bản đồ…')).not.toBeInTheDocument())
  })

  it('does not allow selection when read-only', async () => {
    const change = vi.fn()
    render(<LocationMap value={{ latitude: 10, longitude: 20 }} onChange={change} readOnly />)
    const map = await screen.findByRole('button', { name: 'Bản đồ giả lập' })
    expect(map).toBeDisabled()
    await userEvent.click(map)
    expect(change).not.toHaveBeenCalled()
    expect(screen.getByText('Vị trí chỉ để xem.')).toBeVisible()
  })
})
