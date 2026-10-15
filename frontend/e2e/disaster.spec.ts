import { expect, test } from '@playwright/test'

const mapProviderConfigured = Boolean(process.env.VITE_MAPTILER_KEY || process.env.VITE_MAP_STYLE_URL)

test('authority creates, edits and resolves a disaster across UI01-C1 viewports', async ({ page }) => {
  const email = process.env.DEMO_AUTHORITY_EMAIL
  const password = process.env.DEMO_AUTHORITY_PASSWORD
  if (!email || !password) throw new Error('Set DEMO_AUTHORITY_EMAIL and DEMO_AUTHORITY_PASSWORD for the real demo backend')
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await page.getByRole('link', { name: 'Thảm họa', exact: true }).click()
  await expect(page).toHaveURL(/\/operations\/disasters$/)
  await expect(page.getByRole('heading', { name: 'Quản lý thảm họa' })).toBeVisible()

  const name = `Kiểm thử C1 ${Date.now()}`
  await page.getByRole('button', { name: 'Tạo thảm họa', exact: true }).click()
  await page.getByLabel('Tên thảm họa').fill(name)
  await page.getByLabel('Loại thảm họa').selectOption('FLOOD')
  await page.getByLabel('Mức độ').selectOption('HIGH')
  await page.getByLabel('Mô tả').fill('Thảm họa được tạo qua luồng UI thật của C1.')
  await page.getByLabel('Vĩ độ').fill('16.0471')
  await page.getByLabel('Kinh độ').fill('108.2068')
  await page.getByRole('complementary', { name: 'Tạo thảm họa' })
    .getByRole('button', { name: 'Tạo thảm họa', exact: true }).click()
  await expect(page.getByRole('heading', { name })).toBeVisible()
  await expect(page.locator(`section.location-map[aria-label="Vị trí thảm họa ${name}"]`)).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/ui01-c1-disaster-1280.png', fullPage: true })

  await page.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click()
  await page.getByLabel('Mức độ').selectOption('CRITICAL')
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()
  await expect(page.getByRole('complementary', { name: 'Chi tiết thảm họa' })
    .getByText('Nghiêm trọng', { exact: true })).toBeVisible()

  await page.setViewportSize({ width: 768, height: 900 })
  await expect(page.getByRole('heading', { name })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/ui01-c1-disaster-768.png', fullPage: true })

  await page.getByRole('button', { name: 'Kết thúc thảm họa', exact: true }).click()
  await expect(page.getByRole('alertdialog')).toContainText('không thể mở lại')
  await expect(page.getByRole('button', { name: 'Quay lại' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Kết thúc thảm họa', exact: true })).toBeFocused()

  await page.setViewportSize({ width: 360, height: 800 })
  await page.getByRole('button', { name: 'Kết thúc thảm họa', exact: true }).click()
  await expect(page.getByRole('alertdialog')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/ui01-c1-disaster-360-confirm.png', fullPage: true })
  await page.getByRole('button', { name: 'Xác nhận kết thúc', exact: true }).click()
  await expect(page.getByRole('complementary', { name: 'Chi tiết thảm họa' })
    .getByText('Đã kết thúc', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Quản lý thảm họa' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/ui01-c1-disaster-360-resolved.png', fullPage: true })
})

test('MapLibre loads the configured MapTiler style and attribution', async ({ page }) => {
  test.skip(!mapProviderConfigured, 'Map provider is not configured for this environment')
  const email = process.env.DEMO_AUTHORITY_EMAIL
  const password = process.env.DEMO_AUTHORITY_PASSWORD
  if (!email || !password) throw new Error('Set DEMO_AUTHORITY_EMAIL and DEMO_AUTHORITY_PASSWORD for the real demo backend')
  const providerFailures: string[] = []
  page.on('response', response => {
    const url = new URL(response.url())
    if (url.hostname.endsWith('maptiler.com') && !response.ok()) providerFailures.push(`${response.status()} ${url.hostname}${url.pathname}`)
  })
  page.on('requestfailed', request => {
    const url = new URL(request.url())
    if (url.hostname.endsWith('maptiler.com')) providerFailures.push(`NETWORK ${url.hostname}${url.pathname}`)
  })

  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Mật khẩu').fill(password)
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await page.getByRole('link', { name: 'Thảm họa', exact: true }).click()
  await page.getByRole('button', { name: 'Tạo thảm họa', exact: true }).click()
  await expect(page.locator('.maplibregl-canvas')).toBeVisible()
  await expect(page.locator('.maplibregl-ctrl-attrib').getByText('MapTiler', { exact: false })).toBeVisible()
  await expect(page.getByText('Đang tải lớp bản đồ…')).not.toBeVisible({ timeout: 15_000 })
  if (await page.getByText('Không tải được lớp bản đồ. Nhập tọa độ vẫn hoạt động.').isVisible()) {
    throw new Error(`MapTiler/MapLibre failed: ${providerFailures.join(', ') || 'no failed provider response'}`)
  }
  await page.screenshot({ path: 'test-results/ui01-a-maplibre-online.png', fullPage: true })
  await page.route('https://api.maptiler.com/**', route => route.abort('internetdisconnected'))
  await page.getByLabel('Vĩ độ').fill('40.7128')
  await page.getByLabel('Kinh độ').fill('-74.006')
  await expect(page.getByText('Không tải được lớp bản đồ. Nhập tọa độ vẫn hoạt động.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Thử tải lại' })).toBeEnabled()
  await expect(page.getByLabel('Kinh độ')).toHaveValue('-74.006')
})

test('S05 preserves manual fields when the lazy map module cannot load', async ({ page }) => {
  test.skip(!mapProviderConfigured, 'Map provider is not configured for this environment')
  const email = process.env.DEMO_AUTHORITY_EMAIL
  const password = process.env.DEMO_AUTHORITY_PASSWORD
  if (!email || !password) throw new Error('Set demo credentials for the real backend')
  await page.route(/\/src\/shared\/location\/MapLibreMap\.tsx|\/assets\/MapLibreMap-.*\.js/, route => route.abort())
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Mật khẩu').fill(password)
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await page.getByRole('link', { name: 'Thảm họa', exact: true }).click()
  await page.getByRole('button', { name: 'Tạo thảm họa', exact: true }).click()
  await expect(page.getByText('Không thể mở bản đồ. Bạn vẫn có thể nhập tọa độ.')).toBeVisible()
  await page.getByLabel('Tên thảm họa').fill('Bản nháp khi map lỗi')
  await page.getByLabel('Vĩ độ').fill('0')
  await page.getByLabel('Kinh độ').fill('0')
  await expect(page.getByLabel('Tên thảm họa')).toHaveValue('Bản nháp khi map lỗi')
  await expect(page.getByRole('button', { name: 'Thử tải lại' })).toBeEnabled()
})

test('S05 map keeps keyboard/manual fallback and exact zero-coordinate payload when tiles fail', async ({ page }) => {
  test.skip(!mapProviderConfigured, 'Map provider is not configured for this environment')
  const email = process.env.DEMO_AUTHORITY_EMAIL
  const password = process.env.DEMO_AUTHORITY_PASSWORD
  if (!email || !password) throw new Error('Set DEMO_AUTHORITY_EMAIL and DEMO_AUTHORITY_PASSWORD for the real demo backend')

  let tileRequests = 0
  await page.route('https://api.maptiler.com/**', route => {
    tileRequests += 1
    return route.abort('internetdisconnected')
  })
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await page.getByRole('link', { name: 'Thảm họa', exact: true }).click()
  await page.getByRole('button', { name: 'Tạo thảm họa', exact: true }).click()

  const map = page.locator('.maplibregl-canvas')
  await expect(map).toBeVisible()
  await expect(page.getByText('Không tải được lớp bản đồ. Nhập tọa độ vẫn hoạt động.')).toBeVisible()
  const retry = page.getByRole('button', { name: 'Thử tải lại' })
  await expect(retry).toBeEnabled()
  const failedRequestCount = tileRequests
  await retry.click()
  await expect(page.getByText('Không tải được lớp bản đồ. Nhập tọa độ vẫn hoạt động.')).toBeVisible()
  expect(tileRequests).toBeGreaterThan(failedRequestCount)
  await page.screenshot({ path: 'test-results/ui01-a-location-tile-failure.png', fullPage: true })
  await page.setViewportSize({ width: 360, height: 800 })
  await expect(map).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/ui01-a-location-tile-failure-360.png', fullPage: true })
  await page.setViewportSize({ width: 1280, height: 900 })
  await map.focus()
  const submit = page.getByRole('complementary', { name: 'Tạo thảm họa' })
    .getByRole('button', { name: 'Tạo thảm họa', exact: true })
  for (let step = 0; step < 8 && !(await submit.evaluate(element => element === document.activeElement)); step += 1) {
    await page.keyboard.press('Tab')
  }
  await expect(submit).toBeFocused()

  const box = await map.boundingBox()
  if (!box) throw new Error('Map has no visible bounding box')
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await expect(page.getByLabel('Vĩ độ')).not.toHaveValue('')
  await expect(page.getByLabel('Kinh độ')).not.toHaveValue('')
  await page.getByLabel('Vĩ độ').fill('')
  await page.getByLabel('Kinh độ').fill('')
  await submit.click()
  await expect(page.getByLabel('Vĩ độ')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByLabel('Vĩ độ')).toHaveValue('')
  await expect(page.getByLabel('Kinh độ')).toHaveValue('')

  const name = `Kiểm thử map S05 ${Date.now()}`
  await page.getByLabel('Tên thảm họa').fill(name)
  await page.getByLabel('Mô tả').fill('Tile bị chặn nhưng form và API thật vẫn hoạt động.')
  await page.getByLabel('Vĩ độ').fill('0')
  await page.getByLabel('Kinh độ').fill('0')
  const createResponse = page.waitForResponse(response => response.url().endsWith('/api/disasters')
    && response.request().method() === 'POST')
  await submit.click()
  const response = await createResponse
  expect(response.status()).toBe(201)
  expect(response.request().postDataJSON()).toEqual(expect.objectContaining({ latitude: 0, longitude: 0 }))
  await expect(page.getByRole('heading', { name })).toBeVisible()

  await page.getByRole('button', { name: 'Kết thúc thảm họa', exact: true }).click()
  await page.getByRole('button', { name: 'Xác nhận kết thúc', exact: true }).click()
  await expect(page.getByRole('complementary', { name: 'Chi tiết thảm họa' })
    .getByText('Đã kết thúc', { exact: true })).toBeVisible()
})
