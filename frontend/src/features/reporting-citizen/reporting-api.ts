import { api } from '../../shared/api'

export const reportTypes = [
  'EARTHQUAKE',
  'FLOOD',
  'TYPHOON',
  'WILDFIRE',
  'TSUNAMI',
] as const

export const reportStatuses = ['PENDING', 'VERIFIED', 'REJECTED'] as const

export type ReportType = typeof reportTypes[number]
export type ReportStatus = typeof reportStatuses[number]
export type MissionStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED'

export type CreateReportRequest = {
  type: ReportType
  description: string
  latitude: number
  longitude: number
}

export type Report = {
  id: string
  reporterId: string
  type: ReportType
  description: string
  latitude: number
  longitude: number
  status: ReportStatus
  disasterId?: string
  rejectionReason?: string
  verifiedAt?: string
  rejectedAt?: string
  createdAt: string
  updatedAt: string
}

export type ReportPage = {
  items: Report[]
  page: number
  size: number
  totalElements: number
  totalPages: number
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

export type MissionPage = {
  items: Mission[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type ReportFilters = {
  page: number
  size: number
  sort?: 'createdAt,desc' | 'createdAt,asc'
  status?: ReportStatus
  type?: ReportType
}

export function createReport(request: CreateReportRequest) {
  return api<Report>('/api/reports', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export function listReports(filters: ReportFilters) {
  const query = new URLSearchParams({
    page: String(filters.page),
    size: String(filters.size),
    sort: filters.sort ?? 'createdAt,desc',
  })

  if (filters.status) query.set('status', filters.status)
  if (filters.type) query.set('type', filters.type)

  return api<ReportPage>(`/api/reports?${query}`)
}

export function getReport(id: string) {
  return api<Report>(`/api/reports/${encodeURIComponent(id)}`)
}

export function listReportMissions(reportId: string) {
  const query = new URLSearchParams({
    page: '0',
    size: '20',
    sort: 'createdAt,desc',
    reportId,
  })
  return api<MissionPage>(`/api/rescue-missions?${query}`)
}

export function withdrawReport(id: string) {
  return api<void>(`/api/reports/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}
