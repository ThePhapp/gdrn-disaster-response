import { api } from '../../shared/api'

export const missionStatuses = ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'] as const
export const transitionStatuses = ['IN_PROGRESS', 'COMPLETED'] as const
export const teamAvailabilities = ['AVAILABLE', 'BUSY'] as const
export const reportStatuses = ['PENDING', 'VERIFIED', 'REJECTED'] as const

export type MissionStatus = typeof missionStatuses[number]
export type TransitionStatus = typeof transitionStatuses[number]
export type TeamAvailability = typeof teamAvailabilities[number]
export type ReportStatus = typeof reportStatuses[number]

export type RescueTeam = {
  id: string
  name: string
  availability: TeamAvailability
}

export type Report = {
  id: string
  reporterId: string
  type: string
  description: string
  latitude: number
  longitude: number
  status: ReportStatus
  disasterId?: string
  verifiedAt?: string
  rejectionReason?: string
  rejectedAt?: string
  createdAt: string
  updatedAt: string
}

export type Mission = {
  id: string
  reportId: string
  teamId: string
  status: MissionStatus
  assignedAt: string
  startedAt?: string
  completedAt?: string
  updatedAt: string
}

export type Page<T> = {
  items: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type MissionFilters = {
  page: number
  size: number
  sort: 'createdAt,desc' | 'createdAt,asc'
  status?: MissionStatus
  teamId?: string
  reportId?: string
}

export type TeamFilters = {
  page: number
  size: number
  sort: 'name,asc' | 'name,desc'
  availability?: TeamAvailability
}

export type ReportFilters = {
  page: number
  size: number
  sort: 'createdAt,desc' | 'createdAt,asc'
  status?: ReportStatus
}

function queryString(values: Record<string, string | number | undefined>) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) if (value !== undefined) query.set(key, String(value))
  return query
}

export function listMissions(filters: MissionFilters) {
  const query = queryString({ ...filters })
  return api<Page<Mission>>(`/api/rescue-missions?${query}`)
}

export function listRescueTeams(filters: TeamFilters) {
  const query = queryString({ ...filters })
  return api<Page<RescueTeam>>(`/api/rescue-teams?${query}`)
}

export function listVerifiedReports(filters: Omit<ReportFilters, 'status'>) {
  const query = queryString({ ...filters, status: 'VERIFIED' })
  return api<Page<Report>>(`/api/reports?${query}`)
}

export function getReport(id: string) {
  return api<Report>(`/api/reports/${id}`)
}

export function createMission(reportId: string, teamId: string) {
  return api<Mission>('/api/rescue-missions', {
    method: 'POST',
    body: JSON.stringify({ reportId, teamId }),
  })
}

export function updateMissionStatus(id: string, status: TransitionStatus) {
  return api<Mission>(`/api/rescue-missions/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}
