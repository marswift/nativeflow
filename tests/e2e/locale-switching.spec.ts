/**
 * E2E: Locale switching flows
 *
 * Prerequisites:
 *   npm install -D @playwright/test
 *   npx playwright install
 *
 * Run:
 *   npx playwright test tests/e2e/locale-switching.spec.ts
 */

import { test, expect } from '@playwright/test'

test.describe('Locale switching', () => {
  test('onboarding renders in Japanese by default', async ({ page }) => {
    await page.goto('/onboarding')
    await expect(page.getByRole('heading', { name: /ようこそ|NativeFlow/ })).toBeVisible()
  })

  test('switching to English re-renders onboarding', async ({ page }) => {
    await page.goto('/onboarding')
    // Select English from UI language dropdown
    await page.selectOption('#ui_language_code', 'en')
    await expect(page.getByRole('heading', { name: /Welcome/ })).toBeVisible()
  })

  test('login page reads locale from localStorage', async ({ page }) => {
    // Set locale before navigation
    await page.goto('/login')
    await page.evaluate(() => {
      localStorage.setItem('nativeflow:ui_language', 'en')
    })
    await page.reload()
    // After reload, should render in English
    await expect(page.getByRole('heading', { name: /Log in/ })).toBeVisible()
  })

  test('signup page reads locale from localStorage', async ({ page }) => {
    await page.goto('/signup')
    await page.evaluate(() => {
      localStorage.setItem('nativeflow:ui_language', 'en')
    })
    await page.reload()
    await expect(page.getByRole('heading', { name: /Sign up/ })).toBeVisible()
  })
})
