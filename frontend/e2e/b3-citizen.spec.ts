import { expect, test, type APIRequestContext, type Page } from './fixtures'

const citizenOne = {
  email: process.env.DEMO_CITIZEN_ONE_EMAIL,
  password: process.env.DEMO_CITIZEN_ONE_PASSWORD,
}
const citizenTwo = {
  email: process.env.DEMO_CITIZEN_TWO_EMAIL,
  password: process.env.DEMO_CITIZEN_TWO_PASSWORD,
}
const authorityAccount = {
  email: process.env.DEMO_AUTHORITY_EMAIL,
  password: process.env.DEMO_AUTHORITY_PASSWORD,
}
const mapTilerConfigured = Boolean(process.env.VITE_MAPTILER_KEY
  || process.env.VITE_MAP_STYLE_URL?.includes('maptiler.com'))

async function login(page: Page, account: typeof citizenOne) {
  if (!account.email || !account.password) throw new Error('Configure both demo citizen accounts for B3 browser smoke')
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(account.email)
  await page.getByLabel('Mật khẩu', { exact: true }).fill(account.password)
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page).toHaveURL(/\/my-reports$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Báo cáo sự cố' })).toBeVisible()
}

test('B3 real citizen create, isolation, responsive detail and withdrawal', async ({ page }) => {
  test.setTimeout(90_000)
  const description = `B3 browser smoke ${Date.now()}`

  await login(page, citizenOne)
  await page.getByRole('link', { name: 'Tạo báo cáo', exact: true }).click()
  await page.getByLabel('Mô tả tình huống').fill(description)
  await page.getByLabel('Vĩ độ (latitude)').fill('21.0285')
  await page.getByLabel('Kinh độ (longitude)').fill('105.8542')
  await page.getByRole('button', { name: 'Gửi báo cáo', exact: true }).click()
  await expect(page).toHaveURL(/\/my-reports$/)
  await expect(page.getByRole('region', { name: 'Chi tiết báo cáo' }).getByText(description, { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Chi tiết báo cáo' })).toBeVisible()
  await expect(page.locator('section.location-map[aria-label^="Vị trí báo cáo "]')).toBeVisible()

  for (const width of [360, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }

  await page.getByRole('button', { name: 'Đăng xuất' }).click()
  await login(page, citizenTwo)
  await expect(page.getByText('Đang tải danh sách báo cáo…')).toHaveCount(0)
  await expect(page.getByText(description, { exact: true })).toHaveCount(0)

  await page.getByRole('button', { name: 'Đăng xuất' }).click()
  await login(page, citizenOne)
  const reportRow = page.locator('li').filter({ hasText: description })
  await expect(reportRow).toHaveCount(1)
  const withdraw = reportRow.getByRole('button', { name: 'Rút báo cáo' })
  await withdraw.click()
  await expect(page.getByRole('button', { name: 'Hủy' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(withdraw).toBeFocused()
  await withdraw.click()
  await page.getByRole('button', { name: 'Xác nhận rút' }).click()
  await expect(reportRow).toHaveCount(0)
})

test('B3 shows real E14 mission lifecycle after report verification', async ({ page, playwright }) => {
  test.setTimeout(90_000)
  const baseURL = process.env.E2E_API_URL || 'http://127.0.0.1:18080'
  if (!citizenOne.email || !citizenOne.password || !citizenTwo.email || !citizenTwo.password
    || !authorityAccount.email || !authorityAccount.password) {
    throw new Error('Configure authority and both demo citizen accounts for B3 E14 browser smoke')
  }

  async function loginApi(email: string, password: string): Promise<APIRequestContext> {
    const loginClient = await playwright.request.newContext({ baseURL })
    const response = await loginClient.post('/api/auth/login', { data: { email, password } })
    expect(response.status()).toBe(200)
    const { accessToken } = await response.json()
    await loginClient.dispose()
    return playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: { Authorization: `Bearer ${accessToken}` },
    })
  }

  const authority = await loginApi(authorityAccount.email, authorityAccount.password)
  const otherCitizen = await loginApi(citizenTwo.email, citizenTwo.password)
  const tag = `B3 E14 browser smoke ${Date.now()}`
  let disaster: { id: string, version: number } | undefined
  let missionId: string | undefined
  let missionStatus: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | undefined

  try {
    const disasterResponse = await authority.post('/api/disasters', {
      data: { name: tag, type: 'FLOOD', severity: 'HIGH', description: tag, latitude: 21.0285, longitude: 105.8542 },
    })
    expect(disasterResponse.status()).toBe(201)
    const createdDisaster: { id: string, version: number } = await disasterResponse.json()
    disaster = createdDisaster

    await login(page, citizenOne)
    await page.getByRole('link', { name: 'Tạo báo cáo', exact: true }).click()
    await page.getByLabel('Mô tả tình huống').fill(tag)
    await page.getByLabel('Vĩ độ (latitude)').fill('21.0285')
    await page.getByLabel('Kinh độ (longitude)').fill('105.8542')
    const createResponsePromise = page.waitForResponse(response => response.url().endsWith('/api/reports') && response.request().method() === 'POST')
    await page.getByRole('button', { name: 'Gửi báo cáo', exact: true }).click()
    const createResponse = await createResponsePromise
    expect(createResponse.status()).toBe(201)
    const report = await createResponse.json()
    await expect(page.getByText('Báo cáo cần được xác minh trước khi có thể phân công cứu hộ.')).toBeVisible()

    const verification = await authority.patch(`/api/reports/${report.id}/verification`, {
      data: { status: 'VERIFIED', disasterId: createdDisaster.id },
    })
    expect(verification.status()).toBe(200)

    const teamsResponse = await authority.get('/api/rescue-teams?page=0&size=20&sort=name%2Casc&availability=AVAILABLE')
    expect(teamsResponse.status()).toBe(200)
    const teams = await teamsResponse.json()
    expect(teams.items.length, 'The demo profile must provide an available rescue team').toBeGreaterThan(0)

    const missionResponse = await authority.post('/api/rescue-missions', {
      data: { reportId: report.id, teamId: teams.items[0].id },
    })
    expect(missionResponse.status()).toBe(201)
    const mission = await missionResponse.json()
    missionId = mission.id
    missionStatus = 'ASSIGNED'

    expect((await otherCitizen.get(`/api/rescue-missions?page=0&size=20&sort=createdAt%2Cdesc&reportId=${report.id}`)).status()).toBe(404)

    await page.getByRole('button', { name: 'Làm mới chi tiết' }).click()
    await expect(page.getByText('Đã phân công', { exact: true })).toBeVisible()

    const started = await authority.patch(`/api/rescue-missions/${missionId}/status`, { data: { status: 'IN_PROGRESS' } })
    expect(started.status()).toBe(200)
    missionStatus = 'IN_PROGRESS'
    await page.getByRole('button', { name: 'Làm mới tiến độ' }).click()
    await expect(page.getByText('Đang cứu hộ', { exact: true })).toBeVisible()

    const completed = await authority.patch(`/api/rescue-missions/${missionId}/status`, { data: { status: 'COMPLETED' } })
    expect(completed.status()).toBe(200)
    missionStatus = 'COMPLETED'
    await page.getByRole('button', { name: 'Làm mới tiến độ' }).click()
    await expect(page.getByText('Đã hoàn thành', { exact: true })).toBeVisible()
    await expect(page.getByText('Bắt đầu cứu hộ')).toBeVisible()
    await expect(page.getByText('Hoàn thành', { exact: true })).toBeVisible()
  } finally {
    if (missionId && missionStatus === 'ASSIGNED') {
      const response = await authority.patch(`/api/rescue-missions/${missionId}/status`, { data: { status: 'IN_PROGRESS' } })
      if (response.ok()) missionStatus = 'IN_PROGRESS'
    }
    if (missionId && missionStatus === 'IN_PROGRESS') {
      await authority.patch(`/api/rescue-missions/${missionId}/status`, { data: { status: 'COMPLETED' } })
    }
    if (disaster) {
      await authority.patch(`/api/disasters/${disaster.id}`, { data: { expectedVersion: disaster.version, status: 'RESOLVED' } })
    }
    await otherCitizen.dispose()
    await authority.dispose()
  }
})

test('B3 keeps manual submit and detail available when map tiles fail', async ({ page }) => {
  test.skip(!mapTilerConfigured, 'MapTiler is not configured for this environment')
  test.setTimeout(60_000)
  const description = `B3 map fallback ${Date.now()}`
  await page.route('https://api.maptiler.com/**', route => route.abort('internetdisconnected'))
  await login(page, citizenOne)
  await page.getByRole('link', { name: 'Tạo báo cáo', exact: true }).click()
  await expect(page.getByText('Không tải được lớp bản đồ. Nhập tọa độ vẫn hoạt động.')).toBeVisible()
  await page.getByLabel('Mô tả tình huống').fill(description)
  await page.getByLabel('Vĩ độ (latitude)').fill('0')
  await page.getByLabel('Kinh độ (longitude)').fill('0')
  const createResponse = page.waitForResponse(response => response.url().endsWith('/api/reports')
    && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Gửi báo cáo', exact: true }).click()
  expect((await createResponse).status()).toBe(201)
  await expect(page).toHaveURL(/\/my-reports$/)
  await expect(page.getByRole('region', { name: 'Chi tiết báo cáo' }).getByText(description, { exact: true })).toBeVisible()
  await expect(page.locator('section.location-map[aria-label^="Vị trí báo cáo "]')).toBeVisible()
  await expect(page.getByText('Không tải được lớp bản đồ. Tọa độ vẫn hiển thị trong chi tiết.')).toBeVisible()
  await page.screenshot({ path: 'test-results/b3-map-failure.png', fullPage: true })

  const row = page.locator('li').filter({ hasText: description })
  await row.getByRole('button', { name: 'Rút báo cáo' }).click()
  await page.getByRole('button', { name: 'Xác nhận rút' }).click()
  await expect(row).toHaveCount(0)
})
