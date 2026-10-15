import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMission, listMissions, listRescueTeams, listVerifiedReports, updateMissionStatus } from './rescue-api'

describe('rescue-api', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(new Response('{}', { status: 200 }))))
  })

  it('builds the E14 mission query with contract filters', async () => {
    await listMissions({ page: 1, size: 20, sort: 'createdAt,desc', status: 'IN_PROGRESS', teamId: 'team-1' })
    expect(fetch).toHaveBeenCalledWith(
      '/api/rescue-missions?page=1&size=20&sort=createdAt%2Cdesc&status=IN_PROGRESS&teamId=team-1',
      expect.anything(),
    )
  })

  it('forces report selection to VERIFIED and supports paginated teams', async () => {
    await listVerifiedReports({ page: 0, size: 20, sort: 'createdAt,desc' })
    await listRescueTeams({ page: 2, size: 20, sort: 'name,asc', availability: 'AVAILABLE' })
    expect(fetch).toHaveBeenNthCalledWith(1, '/api/reports?page=0&size=20&sort=createdAt%2Cdesc&status=VERIFIED', expect.anything())
    expect(fetch).toHaveBeenNthCalledWith(2, '/api/rescue-teams?page=2&size=20&sort=name%2Casc&availability=AVAILABLE', expect.anything())
  })

  it('sends only the contract body for create and transition commands', async () => {
    await createMission('report-1', 'team-1')
    await updateMissionStatus('mission-1', 'COMPLETED')
    expect(fetch).toHaveBeenNthCalledWith(1, '/api/rescue-missions', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ reportId: 'report-1', teamId: 'team-1' }),
    }))
    expect(fetch).toHaveBeenNthCalledWith(2, '/api/rescue-missions/mission-1/status', expect.objectContaining({
      method: 'PATCH', body: JSON.stringify({ status: 'COMPLETED' }),
    }))
  })
})
