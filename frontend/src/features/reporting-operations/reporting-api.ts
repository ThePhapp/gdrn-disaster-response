import { api } from '../../shared/api'
import type { DisasterPage, DisasterType } from '../disaster/disaster-api'

export type ReportStatus = 'PENDING' | 'VERIFIED' | 'REJECTED'
export type Report = {
  id: string; reporterId: string; type: DisasterType; description: string; latitude: number; longitude: number
  status: ReportStatus; disasterId?: string; rejectionReason?: string; createdAt: string; updatedAt: string
  verifiedAt?: string; rejectedAt?: string
}
export type ReportPage = { items: Report[]; page: number; size: number; totalElements: number; totalPages: number }
export type ReportFilters = { page: number; size: number; status?: ReportStatus; lat?: number; lon?: number; radiusMeters?: number }

export function listReports(filters: ReportFilters) {
  const query = new URLSearchParams({ page: String(filters.page), size: String(filters.size), sort: 'createdAt,desc' })
  if (filters.status) query.set('status', filters.status)
  if (filters.lat !== undefined) query.set('lat', String(filters.lat))
  if (filters.lon !== undefined) query.set('lon', String(filters.lon))
  if (filters.radiusMeters !== undefined) query.set('radiusMeters', String(filters.radiusMeters))
  return api<ReportPage>(`/api/reports?${query}`)
}
export const getReport = (id: string) => api<Report>(`/api/reports/${id}`)
export function listActiveDisasters(page: number, type: string) {
  const query = new URLSearchParams({ page: String(page), size: '20', sort: 'createdAt,desc', status: 'ACTIVE' })
  if (type) query.set('type', type)
  return api<DisasterPage>(`/api/disasters?${query}`)
}
export const verifyReport = (id: string, disasterId: string) => api<Report>(`/api/reports/${id}/verification`, {
  method: 'PATCH', body: JSON.stringify({ status: 'VERIFIED', disasterId }),
})
export const rejectReport = (id: string, rejectionReason: string) => api<Report>(`/api/reports/${id}/verification`, {
  method: 'PATCH', body: JSON.stringify({ status: 'REJECTED', rejectionReason }),
})
