import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { ReportAttachments } from './ReportAttachments'

const mocks = vi.hoisted(() => ({ list: vi.fn(), content: vi.fn(), upload: vi.fn(), remove: vi.fn() }))
vi.mock('./reporting-attachments-api', async importOriginal => ({
  ...await importOriginal<typeof import('./reporting-attachments-api')>(),
  listReportAttachments: mocks.list,
  getReportAttachmentContent: mocks.content,
  uploadReportAttachment: mocks.upload,
  deleteReportAttachment: mocks.remove,
}))

const attachment = {
  id: '00000000-0000-0000-0000-000000000002', reportId: '00000000-0000-0000-0000-000000000001',
  originalFilename: 'evidence.png', mediaType: 'image/png' as const, sizeBytes: 2048, createdAt: '2026-10-23T00:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.list.mockResolvedValue([])
  mocks.content.mockResolvedValue(new Blob(['image']))
  mocks.upload.mockResolvedValue(attachment)
  mocks.remove.mockResolvedValue(undefined)
  vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: vi.fn() })
})

it('keeps authority read-only while allowing visible metadata to load', async () => {
  render(<ReportAttachments reportId={attachment.reportId} canManage={false} />)
  expect(await screen.findByText('Báo cáo chưa có ảnh minh chứng.')).toBeVisible()
  expect(screen.queryByLabelText('Thêm ảnh minh chứng')).not.toBeInTheDocument()
  expect(mocks.list).toHaveBeenCalledWith(attachment.reportId)
})

it('rejects unsupported files in the citizen picker before upload', async () => {
  render(<ReportAttachments reportId={attachment.reportId} canManage />)
  const input = await screen.findByLabelText('Thêm ảnh minh chứng')
  fireEvent.change(input, { target: { files: [new File(['text'], 'notes.txt', { type: 'text/plain' })] } })
  expect(await screen.findByText('Chỉ hỗ trợ ảnh JPEG và PNG.')).toBeVisible()
  expect(mocks.upload).not.toHaveBeenCalled()
})

it('requires a second deliberate click before deleting an owned image', async () => {
  mocks.list.mockResolvedValue([attachment])
  const user = userEvent.setup()
  render(<ReportAttachments reportId={attachment.reportId} canManage />)
  expect(await screen.findByText('evidence.png')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Xóa' }))
  expect(mocks.remove).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Xác nhận xóa' }))
  expect(mocks.remove).toHaveBeenCalledWith(attachment.reportId, attachment.id)
})
