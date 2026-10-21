import { expect, test, type Page, type TestInfo } from './fixtures'

// Audit evidence, not a claim of complete WCAG conformance. Business APIs are real.
async function inspect(page: Page, info: TestInfo, screen: string) {
  for (const width of [360, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(page.locator('h1')).toHaveCount(1)
    expect.soft(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${screen}/${width}: reflow`).toBe(true)
    const metrics = await page.evaluate(() => {
      function rgba(value: string): number[] {
        const parts = value.match(/[\d.]+/g)?.map(Number) ?? []
        return value.startsWith('color(srgb') ? [...parts.slice(0, 3).map(n => n * 255), parts[3] ?? 1] : [...parts.slice(0, 3), parts[3] ?? 1]
      }
      function luminance(color: number[]) {
        return color.slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
          .reduce((total, v, i) => total + v * [.2126, .7152, .0722][i], 0)
      }
      const samples = [...document.querySelectorAll<HTMLElement>('body *')].filter(el => {
        if (!el.checkVisibility() || el.closest('[disabled], [aria-hidden=true], .maplibregl-map, .brand')) return false
        return [...el.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())
      }).map(el => {
        const style = getComputedStyle(el)
        const ancestors: Element[] = []
        for (let node: Element | null = el; node; node = node.parentElement) ancestors.unshift(node)
        let background = [255, 255, 255]
        for (const ancestor of ancestors) {
          const c = rgba(getComputedStyle(ancestor).backgroundColor)
          background = background.map((v, i) => c[i] * c[3] + v * (1 - c[3]))
        }
        const foreground = rgba(style.color)
        const a = luminance(foreground), b = luminance(background)
        const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05)
        const size = parseFloat(style.fontSize)
        const threshold = size >= 24 || (size >= 18.667 && Number(style.fontWeight) >= 700) ? 3 : 4.5
        return { selector: `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`, ratio, threshold, color: style.color, background, size, lineHeight: style.lineHeight }
      })
      return { samples, failures: samples.filter(s => s.ratio < s.threshold),
        panelPadding: document.querySelector('.rescue-panel') ? getComputedStyle(document.querySelector('.rescue-panel')!).padding : null }
    })
    await info.attach(`${screen}-${width}-metrics`, { body: JSON.stringify(metrics, null, 2), contentType: 'application/json' })
    expect.soft(metrics.failures, `${screen}/${width}: text contrast (excludes map imagery and logos)`).toEqual([])
    await page.screenshot({ path: info.outputPath(`${screen}-${width}.png`), fullPage: true })
    await page.evaluate(async () => {
      document.documentElement.style.fontSize = '200%'
      await document.fonts.ready
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    })
    await info.attach(`${screen}-${width}-resize`, { body: JSON.stringify(await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('body *')].filter(el => el.checkVisibility() && el.getBoundingClientRect().right > innerWidth)
        .map(el => ({ tag: el.tagName, className: el.className, right: el.getBoundingClientRect().right }))), null, 2), contentType: 'application/json' })
    expect.soft(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${screen}/${width}: text resize 200% (not native zoom)`).toBe(true)
    await page.evaluate(() => { document.documentElement.style.fontSize = '' })
  }
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.locator('.skip-link').focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('#main')).toBeFocused()
  // Sample the actual keyboard path from main, including map controls when present.
  const focus: object[] = []
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab')
    focus.push(await page.evaluate(() => {
      const el = document.activeElement as HTMLElement
      const style = getComputedStyle(el), rect = el.getBoundingClientRect()
      return { tag: el.tagName, className: el.className, outline: style.outlineStyle, boxShadow: style.boxShadow, width: rect.width, height: rect.height,
        inViewport: rect.bottom > 0 && rect.top < innerHeight }
    }))
  }
  await info.attach(`${screen}-keyboard`, { body: JSON.stringify(focus, null, 2), contentType: 'application/json' })
}

test('UI01-B six-screen visual, contrast, reflow and keyboard audit', async ({ page, playwright }, info) => {
  test.setTimeout(180000)
  const baseURL = process.env.E2E_API_URL || 'http://127.0.0.1:18080'
  async function loginApi(role: string) {
    const client = await playwright.request.newContext({ baseURL })
    const response = await client.post('/api/auth/login', { data: { email: process.env[`DEMO_${role}_EMAIL`], password: process.env[`DEMO_${role}_PASSWORD`] } })
    expect(response.status()).toBe(200)
    const { accessToken } = await response.json()
    await client.dispose()
    return playwright.request.newContext({ baseURL, extraHTTPHeaders: { Authorization: `Bearer ${accessToken}` } })
  }
  async function login(role: string) {
    await page.goto('/login')
    await page.getByLabel('Email', { exact: true }).fill(process.env[`DEMO_${role}_EMAIL`]!)
    await page.getByLabel('Mật khẩu', { exact: true }).fill(process.env[`DEMO_${role}_PASSWORD`]!)
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Đăng xuất' })).toBeVisible()
    if (role === 'AUTHORITY') await page.getByRole('link', { name: 'Báo cáo', exact: true }).click()
  }
  const authority = await loginApi('AUTHORITY'), citizen = await loginApi('CITIZEN_ONE')
  const tag = `UI01-B ${Date.now()}`
  let missionId: string | undefined
  let disaster: { id: string; version: number } | undefined
  try {
    const created = await authority.post('/api/disasters', { data: { name: tag, type: 'FLOOD', severity: 'HIGH', description: 'Kiểm tra giao diện và khả năng truy cập — dữ liệu local.', latitude: 21, longitude: 105 } })
    expect(created.status()).toBe(201); disaster = await created.json()
    const submitted = await citizen.post('/api/reports', { data: { type: 'FLOOD', description: `${tag} — Nước dâng gần khu dân cư, cần kiểm tra vị trí và điều phối hỗ trợ.`, latitude: 21, longitude: 105 } })
    expect(submitted.status()).toBe(201); const report = await submitted.json()
    expect((await authority.patch(`/api/reports/${report.id}/verification`, { data: { status: 'VERIFIED', disasterId: disaster!.id } })).status()).toBe(200)
    const teams = await authority.get('/api/rescue-teams?availability=AVAILABLE&page=0&size=20')
    expect(teams.status()).toBe(200)
    const team = (await teams.json()).items[0]
    expect(team, 'Available demo team required').toBeTruthy()
    const assigned = await authority.post('/api/rescue-missions', { data: { reportId: report.id, teamId: team.id } })
    expect(assigned.status()).toBe(201); missionId = (await assigned.json()).id
    expect((await authority.patch(`/api/rescue-missions/${missionId}/status`, { data: { status: 'IN_PROGRESS' } })).status()).toBe(200)

    await page.goto('/login'); await inspect(page, info, 'S01')
    await login('CITIZEN_ONE')
    await page.locator('li').filter({ hasText: tag }).getByRole('button').click()
    await expect(page.getByRole('region', { name: 'Chi tiết báo cáo' })).toContainText(report.id)
    await expect(page.getByText('Đang cứu hộ', { exact: true })).toBeVisible()
    await inspect(page, info, 'S03')
    await page.getByRole('link', { name: 'Tạo báo cáo', exact: true }).click()
    await page.getByRole('button', { name: 'Gửi báo cáo', exact: true }).click()
    await expect(page.getByLabel('Mô tả tình huống')).toHaveAttribute('aria-invalid', 'true')
    await inspect(page, info, 'S02')
    await page.getByRole('button', { name: 'Đăng xuất' }).click()
    await login('AUTHORITY')
    await page.getByRole('button', { name: new RegExp(tag) }).click()
    await expect(page.getByRole('complementary', { name: 'Chi tiết và quyết định báo cáo' })).toContainText(report.id)
    await inspect(page, info, 'S04')
    await page.getByRole('link', { name: 'Thảm họa', exact: true }).click()
    await page.getByRole('button', { name: new RegExp(tag) }).click()
    await expect(page.getByRole('heading', { name: tag })).toBeVisible()
    await inspect(page, info, 'S05')
    await page.getByRole('link', { name: 'Cứu hộ', exact: true }).click()
    await page.locator('.rescue-list__item').first().click()
    await expect(page.locator('.mission-detail__description')).toContainText(tag)
    await inspect(page, info, 'S06')
  } finally {
    if (missionId) await authority.patch(`/api/rescue-missions/${missionId}/status`, { data: { status: 'COMPLETED' } })
    if (disaster) await authority.patch(`/api/disasters/${disaster.id}`, { data: { status: 'RESOLVED', expectedVersion: disaster.version } })
    await citizen.dispose(); await authority.dispose()
  }
})
