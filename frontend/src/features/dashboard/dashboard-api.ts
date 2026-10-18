import { api } from '../../shared/api'

export type DateRange = { from: string; to: string }
export type DashboardSummary = {
  from: string | null; to: string | null; timeZone: string; asOf: string
  reports: { pending: number; verified: number; rejected: number }
  missions: { assigned: number; inProgress: number; completed: number }
  teams: { available: number; busy: number }
}

export function getDashboard(range: DateRange | null, signal?: AbortSignal) {
  const query = range ? `?${new URLSearchParams(range)}` : ''
  return api<DashboardSummary>(`/api/dashboard${query}`, { signal })
}

export function validRange(from: string, to: string) {
  const valid = (value: string) => {
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value) || value.startsWith('0000')) return false
    const date = new Date(`${value}T00:00:00Z`)
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  }
  return (!from && !to) || (valid(from) && valid(to) && from <= to)
}
