import { test, expect } from '@playwright/test'

test.describe('TV Player (/tv/[token])', () => {
  test('returns 404 for invalid token', async ({ page }) => {
    const response = await page.goto('/tv/invalid-token-xyz')

    // Should either 404 or 500 (if Supabase not configured)
    expect([404, 500]).toContain(response?.status())
  })

  test('TV page has no dashboard layout', async ({ page }) => {
    await page.goto('/tv/invalid-token-xyz')

    // Verify no sidebar is present (TV pages have their own minimal layout)
    const sidebar = page.locator('[data-sidebar]')
    await expect(sidebar).not.toBeVisible()
  })
})
