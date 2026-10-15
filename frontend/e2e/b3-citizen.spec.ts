import { expect, test, type Page } from '@playwright/test'

const citizenOne = {
  email: process.env.DEMO_CITIZEN_ONE_EMAIL,
  password: process.env.DEMO_CITIZEN_ONE_PASSWORD,
}
const citizenTwo = {
  email: process.env.DEMO_CITIZEN_TWO_EMAIL,
  password: process.env.DEMO_CITIZEN_TWO_PASSWORD,
}

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
  await expect(page.getByText(description, { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Chi tiết báo cáo' })).toBeVisible()

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
