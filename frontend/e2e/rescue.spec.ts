import { expect, test, type APIRequestContext } from './fixtures'

// Match the configured provider, including custom HTTPS styles and attribution.
const mapStyleUrl = process.env.VITE_MAP_STYLE_URL?.trim() || (process.env.VITE_MAPTILER_KEY
  ? `https://api.maptiler.com/maps/streets-v4/style.json?key=${encodeURIComponent(process.env.VITE_MAPTILER_KEY.trim())}` : '')
const mapAttribution = process.env.VITE_MAP_ATTRIBUTION?.trim() || (process.env.VITE_MAPTILER_KEY ? 'MapTiler' : '')

function compactId(id: string) {
  return id.length > 12 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id
}

test('C2 verifies, S04 links to D2 read-only preview, mission completes after RESOLVED and B3 sees progress', async ({ page, playwright }) => {
  test.setTimeout(90000)
  const baseURL = process.env.E2E_API_URL || 'http://127.0.0.1:8080'
  const authorityEmail = process.env.DEMO_AUTHORITY_EMAIL
  const authorityPassword = process.env.DEMO_AUTHORITY_PASSWORD
  const citizenEmail = process.env.DEMO_CITIZEN_ONE_EMAIL
  const citizenPassword = process.env.DEMO_CITIZEN_ONE_PASSWORD
  if (!authorityEmail || !authorityPassword || !citizenEmail || !citizenPassword) {
    throw new Error('Set the demo authority and citizen credentials for the real rescue demo backend')
  }

  async function loginApi(email: string, password: string): Promise<APIRequestContext> {
    const loginClient = await playwright.request.newContext({ baseURL })
    const response = await loginClient.post('/api/auth/login', { data: { email, password } })
    expect(response.status()).toBe(200)
    const { accessToken } = await response.json()
    await loginClient.dispose()
    return playwright.request.newContext({ baseURL, extraHTTPHeaders: { Authorization: `Bearer ${accessToken}` } })
  }

  const authority = await loginApi(authorityEmail, authorityPassword)
  const citizen = await loginApi(citizenEmail, citizenPassword)
  const tag = `D2 ${Date.now()}`
  let missionId: string | undefined

  try {
    const disasterResponse = await authority.post('/api/disasters', {
      data: { name: tag, type: 'FLOOD', severity: 'HIGH', description: 'D2 browser fixture', latitude: 21, longitude: 105 },
    })
    expect(disasterResponse.status()).toBe(201)
    const disaster = await disasterResponse.json()

    const reportResponse = await citizen.post('/api/reports', {
      data: { type: 'FLOOD', description: `${tag} verified report`, latitude: 21, longitude: 105 },
    })
    expect(reportResponse.status()).toBe(201)
    const report = await reportResponse.json()

    await page.goto('/login')
    await page.getByLabel('Email', { exact: true }).fill(authorityEmail)
    await page.getByLabel('Mật khẩu', { exact: true }).fill(authorityPassword)
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
    await expect(page).toHaveURL(/\/operations\/dashboard$/)
    await page.getByRole('link', { name: 'Báo cáo', exact: true }).click()
    await expect(page).toHaveURL(/\/operations\/reports$/)
    await page.getByRole('button', { name: new RegExp(`${tag} verified report`) }).click()
    await page.getByRole('button', { name: 'Xác minh báo cáo', exact: true }).click()
    await page.getByLabel('Thảm họa đang hoạt động').selectOption(disaster.id)
    await page.getByRole('button', { name: 'Kiểm tra quyết định' }).click()
    await page.getByRole('button', { name: 'Xác nhận quyết định' }).click()
    const handoff = page.getByRole('link', { name: 'Điều phối cứu hộ cho báo cáo' })
    await expect(handoff).toHaveAttribute('href', `/operations/rescue?reportId=${report.id}`)
    await handoff.click()
    await expect(page).toHaveURL(new RegExp(`/operations/rescue\\?reportId=${report.id}$`))
    const preview = page.locator(`section.location-map[aria-label="Vị trí báo cáo ${report.id}"]`)
    await expect(preview).toBeVisible()
    await expect(preview).toContainText('Vị trí chỉ để xem.')
    if (mapStyleUrl && mapAttribution) {
      await expect(preview.locator('.maplibregl-canvas')).toBeVisible()
      const attributionText = await page.evaluate(html => new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '', mapAttribution)
      await expect(preview.locator('.maplibregl-ctrl-attrib')).toContainText(attributionText)
      await expect(preview.getByText('Đang tải lớp bản đồ…', { exact: true })).toHaveCount(0, { timeout: 20000 })
      await expect(preview.locator('.location-map__tile-error')).toHaveCount(0)
      await page.screenshot({ path: 'test-results/d2-map-online.png', fullPage: true })
    }
    // Only tile transport is blocked; all business operations still use the real backend.
    if (mapStyleUrl && mapAttribution) await page.route(url => url.href === new URL(mapStyleUrl).href, route => route.abort())
    const availableTeams = page.getByRole('list', { name: 'Đội cứu hộ sẵn sàng' }).getByRole('button')
    await expect(availableTeams.first()).toBeVisible()
    await availableTeams.first().click()

    const createResponse = page.waitForResponse(response => response.url().includes('/api/rescue-missions') && response.request().method() === 'POST')
    await page.getByRole('complementary', { name: 'Phân công nhiệm vụ cứu hộ' })
      .getByRole('button', { name: 'Tạo phân công', exact: true }).click()
    const createdResponse = await createResponse
    expect(createdResponse.status()).toBe(201)
    missionId = (await createdResponse.json()).id
    await expect(page.getByRole('heading', { name: /Nhiệm vụ/ })).toBeVisible()
    if (mapStyleUrl && mapAttribution) {
      await expect(preview.locator('.location-map__tile-error')).toBeVisible({ timeout: 20000 })
      await expect(preview.getByRole('button', { name: 'Thử tải lại' })).toBeEnabled()
      await page.screenshot({ path: 'test-results/d2-map-failure.png', fullPage: true })
    }

    for (const width of [1280, 768, 360]) {
      await page.setViewportSize({ width, height: 900 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.screenshot({ path: `test-results/d2-rescue-${width}.png`, fullPage: true })
    }

    const resolved = await authority.patch(`/api/disasters/${disaster.id}`, { data: { status: 'RESOLVED', expectedVersion: disaster.version } })
    expect(resolved.status()).toBe(200)

    const startResponse = page.waitForResponse(response => response.url().includes('/status') && response.request().method() === 'PATCH')
    await page.getByRole('button', { name: 'Bắt đầu thực hiện' }).click()
    expect((await startResponse).status()).toBe(200)
    await expect(page.getByRole('complementary', { name: 'Nhiệm vụ' })
      .getByText('Đang thực hiện', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Hoàn tất nhiệm vụ' }).click()
    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toBeVisible()
    await expect(page.getByRole('button', { name: 'Quay lại' })).toBeFocused()
    const completeResponse = page.waitForResponse(response => response.url().includes('/status') && response.request().method() === 'PATCH')
    await page.getByRole('button', { name: 'Xác nhận đã hoàn tất' }).click()
    expect((await completeResponse).status()).toBe(200)
    await expect(page.getByRole('complementary', { name: 'Nhiệm vụ' })
      .getByText('Đã hoàn tất', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Đăng xuất' }).click()
    await page.getByLabel('Email', { exact: true }).fill(citizenEmail)
    await page.getByLabel('Mật khẩu', { exact: true }).fill(citizenPassword)
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
    await expect(page).toHaveURL(/\/my-reports$/)
    await page.locator('li').filter({ hasText: `${tag} verified report` }).getByRole('button').click()
    await expect(page.getByText('Đã hoàn thành', { exact: true })).toBeVisible()
  } finally {
    if (missionId) {
      for (const status of ['IN_PROGRESS', 'COMPLETED']) {
        await authority.patch(`/api/rescue-missions/${missionId}/status`, { data: { status } })
      }
    }
    await citizen.dispose()
    await authority.dispose()
  }
})

test('authority assigns a verified report, progresses it and sees a real conflict', async ({ page, playwright }) => {
  test.setTimeout(90000)
  const baseURL = process.env.E2E_API_URL || 'http://127.0.0.1:8080'
  const authorityEmail = process.env.DEMO_AUTHORITY_EMAIL
  const authorityPassword = process.env.DEMO_AUTHORITY_PASSWORD
  const citizenEmail = process.env.DEMO_CITIZEN_ONE_EMAIL
  const citizenPassword = process.env.DEMO_CITIZEN_ONE_PASSWORD
  if (!authorityEmail || !authorityPassword || !citizenEmail || !citizenPassword) {
    throw new Error('Set the demo authority and citizen credentials for the real rescue demo backend')
  }

  async function loginApi(email: string, password: string): Promise<APIRequestContext> {
    const loginClient = await playwright.request.newContext({ baseURL })
    const response = await loginClient.post('/api/auth/login', { data: { email, password } })
    expect(response.status()).toBe(200)
    const { accessToken } = await response.json()
    await loginClient.dispose()
    return playwright.request.newContext({ baseURL, extraHTTPHeaders: { Authorization: `Bearer ${accessToken}` } })
  }

  const authority = await loginApi(authorityEmail, authorityPassword)
  const citizen = await loginApi(citizenEmail, citizenPassword)
  const tag = `D2 ${Date.now()}`
  let missionId: string | undefined
  const otherSession = await page.context().browser()!.newContext()
  const otherPage = await otherSession.newPage()
  await otherPage.addInitScript(() => localStorage.setItem('gdrn.language', 'vi'))

  try {
    const disasterResponse = await authority.post('/api/disasters', {
      data: { name: tag, type: 'FLOOD', severity: 'HIGH', description: 'D2 browser fixture', latitude: 21, longitude: 105 },
    })
    expect(disasterResponse.status()).toBe(201)
    const disaster = await disasterResponse.json()

    const reportResponse = await citizen.post('/api/reports', {
      data: { type: 'FLOOD', description: `${tag} verified report`, latitude: 21, longitude: 105 },
    })
    expect(reportResponse.status()).toBe(201)
    const report = await reportResponse.json()

    const verification = await authority.patch(`/api/reports/${report.id}/verification`, {
      data: { status: 'VERIFIED', disasterId: disaster.id },
    })
    expect(verification.status()).toBe(200)

    await page.goto('/login')
    await page.getByLabel('Email', { exact: true }).fill(authorityEmail)
    await page.getByLabel('Mật khẩu', { exact: true }).fill(authorityPassword)
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
    await expect(page).toHaveURL(/\/operations\/dashboard$/)
    await page.getByRole('link', { name: 'Báo cáo', exact: true }).click()
    await expect(page).toHaveURL(/\/operations\/reports$/)
    await page.getByRole('link', { name: 'Cứu hộ', exact: true }).click()
    await expect(page).toHaveURL(/\/operations\/rescue$/)
    await expect(page.getByRole('heading', { name: 'Điều phối cứu hộ' })).toBeVisible()

    const reportButton = page.getByRole('list', { name: 'Báo cáo đã xác minh' })
      .getByRole('button', { name: new RegExp(`Báo cáo ${compactId(report.id)}`) })
    await page.getByRole('button', { name: 'Tạo phân công', exact: true }).first().click()
    await expect(reportButton).toBeVisible()
    await reportButton.click()
    const availableTeams = page.getByRole('list', { name: 'Đội cứu hộ sẵn sàng' }).getByRole('button')
    await expect(availableTeams.first()).toBeVisible()
    await availableTeams.first().click()

    const otherReportResponse = await citizen.post('/api/reports', {
      data: { type: 'FLOOD', description: `${tag} second report`, latitude: 21, longitude: 105 },
    })
    expect(otherReportResponse.status()).toBe(201)
    const otherReport = await otherReportResponse.json()
    expect((await authority.patch(`/api/reports/${otherReport.id}/verification`, {
      data: { status: 'VERIFIED', disasterId: disaster.id },
    })).status()).toBe(200)
    await otherPage.goto(`${new URL(page.url()).origin}/login`)
    await otherPage.getByLabel('Email', { exact: true }).fill(authorityEmail)
    await otherPage.getByLabel('Mật khẩu', { exact: true }).fill(authorityPassword)
    await otherPage.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
    await expect(otherPage).toHaveURL(/\/operations\/dashboard$/)
    await otherPage.getByRole('link', { name: 'Báo cáo', exact: true }).click()
    await expect(otherPage).toHaveURL(/\/operations\/reports$/)
    await otherPage.evaluate(id => { history.pushState({}, '', `/operations/rescue?reportId=${id}`); dispatchEvent(new PopStateEvent('popstate')) }, otherReport.id)
    const otherTeam = otherPage.getByRole('list', { name: 'Đội cứu hộ sẵn sàng' }).getByRole('button').first()
    await expect(otherTeam).toHaveText(await availableTeams.first().innerText(), { useInnerText: true })
    await otherTeam.click()
    await expect(otherPage.getByRole('complementary', { name: 'Phân công nhiệm vụ cứu hộ' }).getByRole('button', { name: 'Tạo phân công', exact: true })).toBeEnabled()

    const createResponse = page.waitForResponse(response => response.url().includes('/api/rescue-missions') && response.request().method() === 'POST')
    await page.getByRole('complementary', { name: 'Phân công nhiệm vụ cứu hộ' })
      .getByRole('button', { name: 'Tạo phân công', exact: true }).click()
    const createdResponse = await createResponse
    expect(createdResponse.status()).toBe(201)
    missionId = (await createdResponse.json()).id
    const losingResponse = otherPage.waitForResponse(response => response.url().endsWith('/api/rescue-missions') && response.request().method() === 'POST')
    await otherPage.getByRole('complementary', { name: 'Phân công nhiệm vụ cứu hộ' }).getByRole('button', { name: 'Tạo phân công', exact: true }).click()
    const lost = await losingResponse
    expect(lost.status()).toBe(409)
    expect((await lost.json()).code).toBe('TEAM_BUSY')
    await expect(otherPage.getByRole('alert')).toContainText('Đội đã được phân công')
    await expect(otherPage.getByRole('complementary', { name: 'Phân công nhiệm vụ cứu hộ' }).getByRole('button', { name: 'Tạo phân công', exact: true })).toBeDisabled()

    await expect(page.getByRole('heading', { name: /Nhiệm vụ/ })).toBeVisible()

    for (const width of [1280, 768, 360]) {
      await page.setViewportSize({ width, height: 900 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.screenshot({ path: `test-results/d2-rescue-${width}.png`, fullPage: true })
    }

    const startResponse = page.waitForResponse(response => response.url().includes('/status') && response.request().method() === 'PATCH')
    await page.getByRole('button', { name: 'Bắt đầu thực hiện' }).click()
    expect((await startResponse).status()).toBe(200)
    await expect(page.getByRole('complementary', { name: 'Nhiệm vụ' })
      .getByText('Đang thực hiện', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Hoàn tất nhiệm vụ' }).click()
    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toBeVisible()
    await expect(page.getByRole('button', { name: 'Quay lại' })).toBeFocused()
    const completeResponse = page.waitForResponse(response => response.url().includes('/status') && response.request().method() === 'PATCH')
    await page.getByRole('button', { name: 'Xác nhận đã hoàn tất' }).click()
    expect((await completeResponse).status()).toBe(200)
    await expect(page.getByRole('complementary', { name: 'Nhiệm vụ' })
      .getByText('Đã hoàn tất', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Tạo phân công', exact: true }).first().click()
    const duplicateReportButton = page.getByRole('list', { name: 'Báo cáo đã xác minh' })
      .getByRole('button', { name: new RegExp(`Báo cáo ${compactId(report.id)}`) })
    await expect(duplicateReportButton).toBeVisible()
    await duplicateReportButton.click()
    const conflictTeams = page.getByRole('list', { name: 'Đội cứu hộ sẵn sàng' }).getByRole('button')
    await expect(conflictTeams.first()).toBeVisible()
    await conflictTeams.first().click()
    const conflictResponse = page.waitForResponse(response => response.url().endsWith('/api/rescue-missions') && response.request().method() === 'POST')
    await page.getByRole('complementary', { name: 'Phân công nhiệm vụ cứu hộ' })
      .getByRole('button', { name: 'Tạo phân công', exact: true }).click()
    expect((await conflictResponse).status()).toBe(409)
    await expect(page.getByRole('alert')).toContainText('Báo cáo đã có nhiệm vụ')
    await expect(page.getByRole('heading', { name: 'Tạo phân công cứu hộ' })).toBeVisible()
  } finally {
    if (missionId) {
      for (const status of ['IN_PROGRESS', 'COMPLETED']) {
        await authority.patch(`/api/rescue-missions/${missionId}/status`, { data: { status } })
      }
    }
    await otherSession.close()
    await citizen.dispose()
    await authority.dispose()
  }
})
