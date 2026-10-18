import { expect, test } from '@playwright/test'

test('defaults to English and switches the login screen to Vietnamese', async ({ page }) => {
  await page.goto('/login')

  await expect(page.getByRole('heading', { name: 'Sign in to GDRN' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('button', { name: 'Switch language to Vietnamese' })).toHaveAttribute('aria-pressed', 'false')

  await page.getByRole('button', { name: 'Switch language to Vietnamese' }).click()
  await expect(page.getByRole('heading', { name: 'Đăng nhập GDRN' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi')
  await expect(page.getByRole('button', { name: 'Đổi ngôn ngữ sang Tiếng Anh' })).toHaveAttribute('aria-pressed', 'false')

  await page.getByRole('button', { name: 'Đổi ngôn ngữ sang Tiếng Anh' }).click()
  await expect(page.getByRole('heading', { name: 'Sign in to GDRN' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})
