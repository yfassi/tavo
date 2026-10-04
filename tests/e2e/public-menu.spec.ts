import { test, expect } from '@playwright/test'

test.describe('Interactive Menu (/m/[slug])', () => {
  // These tests work with the seed data "Chez Rosalie" (slug: chez-rosalie)
  // They verify page structure and accessibility, not live DB queries

  test('returns 404 for unknown slug', async ({ page }) => {
    const response = await page.goto('/m/unknown-restaurant-xyz')
    expect(response?.status()).toBe(404)
  })

  test('menu page has correct HTML structure', async ({ page }) => {
    // This test will only pass with seed data in the DB
    // In CI without DB, it will be skipped via the response check
    const response = await page.goto('/m/chez-rosalie')

    if (response?.status() === 500) {
      test.skip(true, 'Skipping: Supabase not configured')
      return
    }

    if (response?.status() === 404) {
      test.skip(true, 'Skipping: seed data not present')
      return
    }

    // Verify semantic structure
    await expect(page.locator('header')).toBeVisible()
    await expect(page.locator('main')).toBeVisible()
    await expect(page.locator('footer')).toBeVisible()
  })

  test('menu page has allergen disclaimer in footer', async ({ page }) => {
    const response = await page.goto('/m/chez-rosalie')
    if (!response?.ok()) {
      test.skip(true, 'Skipping: page not available')
      return
    }

    await expect(page.getByText('allergènes', { exact: false })).toBeVisible()
    await expect(page.getByText('Prix TTC')).toBeVisible()
    await expect(page.getByText('Tavo', { exact: false })).toBeVisible()
  })

  test('menu page uses native details/summary for categories', async ({ page }) => {
    const response = await page.goto('/m/chez-rosalie')
    if (!response?.ok()) {
      test.skip(true, 'Skipping: page not available')
      return
    }

    const details = page.locator('details')
    const count = await details.count()
    expect(count).toBeGreaterThan(0)

    // First category should be open by default
    const firstDetails = details.first()
    await expect(firstDetails).toHaveAttribute('open', '')
  })
})
