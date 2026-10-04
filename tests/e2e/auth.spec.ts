import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('login page renders with French text', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('h2, [class*="CardTitle"]')).toContainText('Connexion')
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.getByText('Se connecter')).toBeVisible()
    await expect(page.getByText('lien magique', { exact: false })).toBeVisible()
  })

  test('signup page renders with French text', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.locator('h2, [class*="CardTitle"]')).toContainText('Créer un compte')
    await expect(page.locator('input[name="venue_name"]')).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.getByText('essai gratuit', { exact: false })).toBeVisible()
  })

  test('login page has link to signup', async ({ page }) => {
    await page.goto('/login')
    const signupLink = page.getByRole('link', { name: /créer un compte/i })
    await expect(signupLink).toBeVisible()
    await expect(signupLink).toHaveAttribute('href', '/signup')
  })

  test('signup page has link to login', async ({ page }) => {
    await page.goto('/signup')
    const loginLink = page.getByRole('link', { name: /se connecter/i })
    await expect(loginLink).toBeVisible()
    await expect(loginLink).toHaveAttribute('href', '/login')
  })

  test('root redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page has correct lang attribute', async ({ page }) => {
    await page.goto('/login')
    const lang = await page.locator('html').getAttribute('lang')
    expect(lang).toBe('fr')
  })
})
