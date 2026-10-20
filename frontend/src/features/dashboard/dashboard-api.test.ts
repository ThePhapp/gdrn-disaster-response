import { describe, expect, it, vi } from 'vitest'
import { getDashboard, validRange } from './dashboard-api'

describe('dashboard date and request contract', () => {
  it('validates leap days, paired dates and ordering without normalizing invalid dates', () => {
    expect(validRange('', '')).toBe(true)
    expect(validRange('2024-02-29', '2024-02-29')).toBe(true)
    expect(validRange('2026-02-29', '2026-03-01')).toBe(false)
    expect(validRange('2026-10-18', '')).toBe(false)
    expect(validRange('2026-10-19', '2026-10-18')).toBe(false)
    expect(validRange('0000-01-01', '2026-10-18')).toBe(false)
    expect(validRange('0001-01-01', '9999-12-31')).toBe(true)
  })

  it('sends paired calendar dates and abort signal through the shared client', async () => {
    const fetch = vi.fn().mockImplementation(async () => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetch)
    const controller = new AbortController()
    await getDashboard({ from: '2026-10-01', to: '2026-10-18' }, controller.signal)
    expect(fetch).toHaveBeenLastCalledWith('/api/dashboard?from=2026-10-01&to=2026-10-18',
      expect.objectContaining({ signal: controller.signal, cache: 'no-store', credentials: 'omit' }))
    await getDashboard(null)
    expect(fetch.mock.calls.at(-1)?.[0]).toBe('/api/dashboard')
  })
})
