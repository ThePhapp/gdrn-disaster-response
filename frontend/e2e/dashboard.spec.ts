import { expect, test, type Page, type APIRequestContext } from '@playwright/test'

const authority = { email: process.env.DEMO_AUTHORITY_EMAIL, password: process.env.DEMO_AUTHORITY_PASSWORD }
const citizen = { email: process.env.DEMO_CITIZEN_ONE_EMAIL, password: process.env.DEMO_CITIZEN_ONE_PASSWORD }

async function login(page: Page, account: typeof authority) {
  if (!account.email || !account.password) throw new Error('Set demo account environment variables for the real backend')
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(account.email)
  await page.getByLabel('Mật khẩu', { exact: true }).fill(account.password)
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page).not.toHaveURL(/\/login$/)
}

async function token(request: APIRequestContext, account: typeof authority) {
  const response = await request.post('/api/auth/login', { data: account })
  expect(response.status()).toBe(200)
  return (await response.json()).accessToken as string
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('gdrn.language', 'vi'))
})

test('DS1 real aggregate counts, date filter, refresh, language and responsive layout', async ({ page }) => {
  test.setTimeout(90_000)
  await login(page, authority)
  const initialResponse = page.waitForResponse(response => response.url().endsWith('/api/dashboard') && response.request().method() === 'GET')
  await page.getByRole('link', { name: 'Tổng quan', exact: true }).click()
  const initial = await (await initialResponse).json()
  const total = initial.reports.pending + initial.reports.verified + initial.reports.rejected
  await expect(page.getByRole('article', { name: 'Tổng số báo cáo' })).toContainText(total.toLocaleString('vi-VN'))
  await expect(page.getByRole('article', { name: 'Nhiệm vụ đang xử lý' })).toContainText(
    (initial.missions.assigned + initial.missions.inProgress).toLocaleString('vi-VN'))

  // Create and later withdraw only this test's report through the real API.
  const citizenToken = await token(page.request, citizen)
  const auth = { Authorization: `Bearer ${citizenToken}` }
  const created = await page.request.post('/api/reports', { headers: auth, data: {
    type: 'FLOOD', description: `DS1 browser fixture ${Date.now()}`, latitude: 21, longitude: 105,
  } })
  expect(created.status()).toBe(201)
  const report = await created.json()
  try {
    await page.getByRole('button', { name: 'Làm mới thống kê' }).click()
    await expect(page.getByRole('article', { name: 'Tổng số báo cáo' })).toContainText((total + 1).toLocaleString('vi-VN'))
    await page.getByLabel('Từ ngày', { exact: true }).fill('2020-01-01')
    await page.getByRole('button', { name: 'Áp dụng thời gian' }).click()
    await expect(page.getByRole('alert')).toContainText('Nhập đủ hai ngày')
    await page.getByLabel('Đến ngày', { exact: true }).fill('2020-01-01')
    const filteredResponse = page.waitForResponse(response => response.url().includes('/api/dashboard?from=2020-01-01&to=2020-01-01'))
    await page.getByRole('button', { name: 'Áp dụng thời gian' }).click()
    const filtered = await (await filteredResponse).json()
    expect(filtered.reports).toEqual({ pending: 0, verified: 0, rejected: 0 })
    expect(filtered.teams).toEqual(initial.teams)
    await expect(page.getByText(/Không có báo cáo hoặc nhiệm vụ/)).toBeVisible()
    for (const width of [360, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.screenshot({ path: `test-results/dashboard-empty-${width}.png`, fullPage: true })
    }
    await page.getByRole('button', { name: 'Xóa thời gian' }).click()
    await expect(page.getByRole('article', { name: 'Tổng số báo cáo' })).toContainText((total + 1).toLocaleString('vi-VN'))
    await expect(page.getByLabel('Từ ngày', { exact: true })).toHaveValue('')
    await page.getByRole('button', { name: 'Đổi ngôn ngữ sang Tiếng Anh' }).click()
    await expect(page.getByRole('heading', { name: 'Response overview', exact: true })).toBeVisible()
    await expect(page.getByRole('table', { name: 'Reports by status' })).toBeVisible()
    await page.screenshot({ path: 'test-results/dashboard-en-1280.png', fullPage: true })
    await page.getByRole('button', { name: 'Switch language to Vietnamese' }).click()
    await page.screenshot({ path: 'test-results/dashboard-vi-1280.png', fullPage: true })
  } finally {
    expect((await page.request.delete(`/api/reports/${report.id}`, { headers: auth })).status()).toBe(204)
  }
  await page.getByRole('button', { name: 'Làm mới thống kê' }).click()
  await expect(page.getByRole('article', { name: 'Tổng số báo cáo' })).toContainText(total.toLocaleString('vi-VN'))
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Đăng nhập GDRN' })).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(0)
})

test('DS1 citizen cannot view dashboard in navigation, route or API', async ({ page }) => {
  await login(page, citizen)
  await expect(page.getByRole('link', { name: 'Tổng quan', exact: true })).toHaveCount(0)
  await page.goto('/operations/dashboard')
  await expect(page.getByRole('alert')).toContainText('Bạn không có quyền')
  const citizenToken = await token(page.request, citizen)
  expect((await page.request.get('/api/dashboard', { headers: { Authorization: `Bearer ${citizenToken}` } })).status()).toBe(403)
  expect((await page.request.get('/api/dashboard')).status()).toBe(401)
})
