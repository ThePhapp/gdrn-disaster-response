import { api, apiBlob } from '../../shared/api'

export const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024
export const MAX_ATTACHMENTS = 5

export type ReportAttachment = {
  id: string
  reportId: string
  originalFilename: string
  mediaType: 'image/jpeg' | 'image/png'
  sizeBytes: number
  createdAt: string
}

export function listReportAttachments(reportId: string) {
  return api<ReportAttachment[]>(`/api/reports/${encodeURIComponent(reportId)}/attachments`)
}

export function uploadReportAttachment(reportId: string, file: File) {
  const body = new FormData()
  body.append('file', file)
  return api<ReportAttachment>(`/api/reports/${encodeURIComponent(reportId)}/attachments`, { method: 'POST', body })
}

export function getReportAttachmentContent(reportId: string, attachmentId: string) {
  return apiBlob(`/api/reports/${encodeURIComponent(reportId)}/attachments/${encodeURIComponent(attachmentId)}/content`)
}

export function deleteReportAttachment(reportId: string, attachmentId: string) {
  return api<void>(`/api/reports/${encodeURIComponent(reportId)}/attachments/${encodeURIComponent(attachmentId)}`, { method: 'DELETE' })
}
