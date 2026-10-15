import { describe, expect, it, vi } from 'vitest'
import { listReportMissions } from './reporting-api'

describe('citizen reporting API', () => {
  it('loads E14 for one report with the contract pagination and sort', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      items: [],
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 0,
    })))
    vi.stubGlobal('fetch', fetcher)

    await listReportMissions('00000000-0000-0000-0000-000000000001')

    expect(fetcher.mock.calls[0][0]).toBe(
      '/api/rescue-missions?page=0&size=20&sort=createdAt%2Cdesc&reportId=00000000-0000-0000-0000-000000000001',
    )
    expect(fetcher.mock.calls[0][1]).toMatchObject({
      credentials: 'omit',
      cache: 'no-store',
    })
  })
})
