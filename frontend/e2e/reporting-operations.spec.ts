import { expect, test, type APIRequestContext } from '@playwright/test'

test('C2 real citizen submit → authority verify → citizen reads VERIFIED, rejection/conflict/role and responsive workbench', async ({ page, playwright }) => {
  test.setTimeout(90000)
  const baseURL = process.env.E2E_API_URL || 'http://127.0.0.1:18080'
  async function loginApi(role: 'CITIZEN_ONE' | 'AUTHORITY') {
    const email = process.env[`DEMO_${role}_EMAIL`]
    const password = process.env[`DEMO_${role}_PASSWORD`]
    if (!email || !password) throw new Error(`Missing DEMO_${role} credentials`)
    const client = await playwright.request.newContext({ baseURL })
    const response = await client.post('/api/auth/login', { data: { email, password } })
    expect(response.status()).toBe(200)
    const { accessToken } = await response.json()
    await client.dispose()
    return playwright.request.newContext({ baseURL, extraHTTPHeaders: { Authorization: `Bearer ${accessToken}` } })
  }
  const citizen = await loginApi('CITIZEN_ONE')
  const authority = await loginApi('AUTHORITY')
  const tag = `C2 ${Date.now()}`
  async function checkContrast(selector: string, border = false) {
    const ratios = await page.locator(selector).evaluateAll((elements, useBorder) => {
      function luminance(color: string) {
        const channels = color.match(/[\d.]+/g)!.slice(0, 3).map(value => {
          const channel = Number(value) / 255
          return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4
        })
        return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722
      }
      return elements.map(element => {
        const style = getComputedStyle(element)
        let ancestor: Element | null = element
        let background = style.backgroundColor
        while (background === 'rgba(0, 0, 0, 0)' && ancestor?.parentElement) {
          ancestor = ancestor.parentElement; background = getComputedStyle(ancestor).backgroundColor
        }
        const first = luminance(useBorder ? style.borderTopColor : style.color), second = luminance(background)
        return (Math.max(first, second) + .05) / (Math.min(first, second) + .05)
      })
    }, border)
    expect(ratios.length).toBeGreaterThan(0)
    for (const ratio of ratios) expect(ratio).toBeGreaterThanOrEqual(border ? 3 : 4.5)
    console.log(`C2 contrast ${selector}: min ${Math.min(...ratios).toFixed(2)}:1`)
  }
  async function submitReport(client: APIRequestContext, suffix: string) {
    const response = await client.post('/api/reports', { data: { type: 'FLOOD', description: `${tag} ${suffix}`, latitude: 21, longitude: 105 } })
    expect(response.status()).toBe(201)
    return response.json()
  }
  try {
    const created = await authority.post('/api/disasters', { data: { name: tag, type: 'FLOOD', severity: 'HIGH', description: 'Kiểm thử C2 local', latitude: 21, longitude: 105 } })
    expect(created.status()).toBe(201)
    const disaster = await created.json()
    const report = await submitReport(citizen, 'xác minh')
    await page.goto('/login')
    await page.getByLabel('Email', { exact: true }).fill(process.env.DEMO_AUTHORITY_EMAIL!)
    await page.getByLabel('Mật khẩu', { exact: true }).fill(process.env.DEMO_AUTHORITY_PASSWORD!)
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
    await expect(page).toHaveURL(/\/operations\/reports$/)
    await page.getByLabel('Trạng thái', { exact: true }).selectOption('PENDING')
    await page.getByLabel('Vĩ độ', { exact: true }).fill('21')
    await page.getByLabel('Kinh độ', { exact: true }).fill('105')
    await page.getByLabel('Bán kính (m)', { exact: true }).fill('1000')
    const filtered = page.waitForResponse(response => response.url().includes('/api/reports?') && response.url().includes('radiusMeters=1000'))
    await page.getByRole('button', { name: 'Áp dụng bộ lọc' }).click()
    expect((await filtered).status()).toBe(200)
    await page.getByRole('button', { name: new RegExp(`${tag} xác minh`) }).click()
    const detail = page.getByRole('complementary', { name: 'Chi tiết và quyết định báo cáo' })
    await expect(detail).toContainText(report.id)
    for (const width of [360, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.screenshot({ path: `test-results/c2-${width}.png`, fullPage: true })
    }
    await checkContrast('.report-status')
    await checkContrast('.report-filter-hint')
    await checkContrast('.report-card')
    await checkContrast('.danger-secondary')
    await checkContrast('#report-filter-lat', true)
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.evaluate(() => { document.documentElement.style.fontSize = '' })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    expect(await page.getByRole('button', { name: 'Xác minh báo cáo', exact: true }).evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0s')
    await page.getByRole('button', { name: 'Xác minh báo cáo', exact: true }).click()
    await page.getByLabel('Thảm họa đang hoạt động').selectOption(disaster.id)
    await page.getByRole('button', { name: 'Kiểm tra quyết định' }).click()
    await expect(page.getByRole('dialog')).toContainText(disaster.name)
    await expect(page.getByRole('button', { name: 'Quay lại' })).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(page.getByRole('button', { name: 'Xác nhận quyết định' })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Quay lại' })).toBeFocused()
    expect(await page.getByRole('button', { name: 'Quay lại' }).evaluate(element => getComputedStyle(element).outlineStyle)).toBe('solid')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Kiểm tra quyết định' })).toBeFocused()
    await page.getByRole('button', { name: 'Kiểm tra quyết định' }).click()
    await page.setViewportSize({ width: 360, height: 900 })
    await page.screenshot({ path: 'test-results/c2-confirm-360.png', fullPage: true })
    await page.getByRole('button', { name: 'Xác nhận quyết định' }).click()
    await expect(detail).toContainText('Đã xác minh · VERIFIED')
    await checkContrast('.report-status--verified')
    const citizenRead = await citizen.get(`/api/reports/${report.id}`)
    expect(citizenRead.status()).toBe(200)
    expect(await citizenRead.json()).toMatchObject({ status: 'VERIFIED', disasterId: disaster.id })
    expect((await citizen.patch(`/api/reports/${report.id}/verification`, { data: { status: 'REJECTED', rejectionReason: 'Forbidden' } })).status()).toBe(403)

    await submitReport(citizen, 'từ chối')
    await page.getByRole('button', { name: 'Xóa bộ lọc' }).click()
    await page.getByRole('button', { name: new RegExp(`${tag} từ chối`) }).click()
    await page.getByRole('button', { name: 'Từ chối báo cáo', exact: true }).click()
    await page.getByRole('button', { name: 'Kiểm tra quyết định' }).click()
    await expect(page.getByLabel('Lý do từ chối', { exact: true })).toHaveAttribute('aria-invalid', 'true')
    expect(await page.locator('#decision-error').evaluate(element => {
      const expected = document.createElement('span')
      expected.style.color = 'var(--gdrn-error-text)'; element.append(expected)
      const matches = getComputedStyle(element).color === getComputedStyle(expected).color
      expected.remove(); return matches
    })).toBe(true)
    await page.getByLabel('Lý do từ chối', { exact: true }).fill('Thiếu thông tin vị trí')
    await page.getByRole('button', { name: 'Kiểm tra quyết định' }).click()
    await page.getByRole('button', { name: 'Xác nhận quyết định' }).click()
    await expect(detail).toContainText('Đã từ chối · REJECTED')
    await checkContrast('.report-status--rejected')

    const racing = await submitReport(citizen, 'cạnh tranh')
    await page.getByRole('button', { name: 'Xóa bộ lọc' }).click()
    await page.getByRole('button', { name: new RegExp(`${tag} cạnh tranh`) }).click()
    await page.getByRole('button', { name: 'Từ chối báo cáo', exact: true }).click()
    await page.getByLabel('Lý do từ chối', { exact: true }).fill('Quyết định trên dữ liệu cũ')
    await page.getByRole('button', { name: 'Kiểm tra quyết định' }).click()
    expect((await authority.patch(`/api/reports/${racing.id}/verification`, { data: { status: 'VERIFIED', disasterId: disaster.id } })).status()).toBe(200)
    await page.getByRole('button', { name: 'Xác nhận quyết định' }).click()
    await expect(detail.getByRole('alert')).toContainText('409:')
    await expect(detail).toContainText('Đã xác minh · VERIFIED')
    await expect(detail.getByText(/Quyết định đã được lưu/)).toHaveCount(0)
    const withdrawn = await submitReport(citizen, 'rút trước quyết định')
    await page.getByRole('button', { name: 'Xóa bộ lọc' }).click()
    await page.getByRole('button', { name: new RegExp(`${tag} rút trước quyết định`) }).click()
    await page.getByRole('button', { name: 'Từ chối báo cáo', exact: true }).click()
    await page.getByLabel('Lý do từ chối', { exact: true }).fill('Báo cáo đã được rút')
    await page.getByRole('button', { name: 'Kiểm tra quyết định' }).click()
    expect((await citizen.delete(`/api/reports/${withdrawn.id}`)).status()).toBe(204)
    await page.getByRole('button', { name: 'Xác nhận quyết định' }).click()
    await expect(detail.getByRole('alert').first()).toContainText('404:')
    await expect(detail.getByRole('button', { name: 'Xác minh báo cáo' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Đăng xuất' }).click()
    await page.getByLabel('Email', { exact: true }).fill(process.env.DEMO_CITIZEN_ONE_EMAIL!)
    await page.getByLabel('Mật khẩu', { exact: true }).fill(process.env.DEMO_CITIZEN_ONE_PASSWORD!)
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Đã đăng nhập' })).toBeVisible()
    await page.evaluate(() => { history.pushState(null, '', '/operations/reports'); dispatchEvent(new PopStateEvent('popstate')) })
    await expect(page.getByRole('alert')).toContainText('không có quyền')
    // Dispose test disaster via its supported lifecycle; verified reports intentionally remain for traceability.
    expect((await authority.patch(`/api/disasters/${disaster.id}`, { data: { expectedVersion: disaster.version, status: 'RESOLVED' } })).status()).toBe(200)
  } finally { await citizen.dispose(); await authority.dispose() }
})
