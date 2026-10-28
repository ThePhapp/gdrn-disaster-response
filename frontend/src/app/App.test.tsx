import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { session } from '../auth/session'
import { I18nProvider } from '../shared/i18n'

vi.mock('./feature-routes', () => ({
  featureRoutes: [
    { path: '/reports/new', roles: ['CITIZEN'], element: <p>Create report</p> },
    { path: '/my-reports', roles: ['CITIZEN'], element: <p>My reports</p> },
    { path: '/operations/dashboard', roles: ['AUTHORITY'], element: <p>Dashboard</p> },
  ],
  landingPath: (role: string) => role === 'CITIZEN' ? '/my-reports' : '/operations/dashboard',
}))

import { App } from './App'

describe('browser tab title', () => {
  beforeEach(() => { localStorage.clear(); document.title = 'GDRN' })

  function renderAt(path: string, role?: 'CITIZEN' | 'AUTHORITY') {
    if (role) session.establish('test-token', { id: 'user', email: 'user@example.test', role }, new Date(Date.now() + 60_000).toISOString(), session.snapshot().generation)
    return render(<I18nProvider><MemoryRouter initialEntries={[path]}><App /></MemoryRouter></I18nProvider>)
  }

  it('follows citizen navigation, language changes and logout', async () => {
    const user = userEvent.setup()
    renderAt('/my-reports', 'CITIZEN')
    expect(document.title).toBe('GDRN — My reports')
    await user.click(screen.getByRole('link', { name: 'Create report' }))
    expect(document.title).toBe('GDRN — Create report')
    await user.click(screen.getByRole('button', { name: 'Switch language to Vietnamese' }))
    expect(document.title).toBe('GDRN — Tạo báo cáo')
    await user.click(screen.getByRole('button', { name: 'Đăng xuất' }))
    await waitFor(() => expect(document.title).toBe('GDRN — Đăng nhập'))
  })

  it('sets the title on a direct authority route', () => {
    renderAt('/operations/dashboard', 'AUTHORITY')
    expect(document.title).toBe('GDRN — Dashboard')
  })

  it('shows the sign-in title after a protected route redirects', async () => {
    renderAt('/reports/new')
    await waitFor(() => expect(document.title).toBe('GDRN — Sign in'))
  })

  it('replaces the previous title on an unknown authenticated route', () => {
    renderAt('/missing', 'CITIZEN')
    expect(document.title).toContain('GDRN — ')
    expect(document.title).not.toBe('GDRN — Đăng nhập')
    expect(document.title).toContain(screen.getByText(/page/i).textContent)
  })
})
