import { test, expect } from '@playwright/test'

test.describe('Accessibility', () => {
  test('login page has proper form labels', async ({ page }) => {
    await page.goto('/login')

    // All inputs should have associated labels
    const emailInput = page.locator('input[name="email"]').first()
    const emailId = await emailInput.getAttribute('id')
    if (emailId) {
      const label = page.locator(`label[for="${emailId}"]`)
      await expect(label).toBeVisible()
    }

    const passwordInput = page.locator('input[name="password"]')
    const passwordId = await passwordInput.getAttribute('id')
    if (passwordId) {
      const label = page.locator(`label[for="${passwordId}"]`)
      await expect(label).toBeVisible()
    }
  })

  test('login page buttons are focusable', async ({ page }) => {
    await page.goto('/login')

    const submitButton = page.getByRole('button', { name: /se connecter/i })
    await submitButton.focus()
    await expect(submitButton).toBeFocused()
  })

  test('html element has lang="fr"', async ({ page }) => {
    await page.goto('/login')
    const lang = await page.locator('html').getAttribute('lang')
    expect(lang).toBe('fr')
  })

  test('signup page has required field indicators', async ({ page }) => {
    await page.goto('/signup')

    const requiredInputs = page.locator('input[required]')
    const count = await requiredInputs.count()
    expect(count).toBeGreaterThanOrEqual(3) // venue_name, email, password
  })
})
