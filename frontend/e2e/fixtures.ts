import { test as base } from '@playwright/test'

// Existing acceptance scenarios assert Vietnamese copy. Set the preference explicitly
// so they remain stable while the product default stays English for a clean browser.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => localStorage.setItem('gdrn.language', 'vi'))
    await use(page)
  },
})

export { expect } from '@playwright/test'
export type { APIRequestContext, Page, TestInfo } from '@playwright/test'
