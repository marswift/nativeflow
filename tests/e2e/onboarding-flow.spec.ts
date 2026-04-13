/**
 * E2E: Onboarding completion flow
 *
 * Prerequisites:
 *   npm install -D @playwright/test
 *   npx playwright install
 *
 * Run:
 *   npx playwright test tests/e2e/onboarding-flow.spec.ts
 */

import { test, expect } from '@playwright/test'

test.describe('Onboarding flow', () => {
  test('completes onboarding with all required fields', async ({ page }) => {
    // This test requires an authenticated session.
    // Use Playwright's storageState or manual login before running.
    test.skip(true, 'Requires authenticated session — configure storageState')

    await page.goto('/onboarding')

    // Fill required fields
    await page.fill('#username', 'e2e-test-user')
    await page.selectOption('#age_group', '20s')
    await page.selectOption('#target_region_slug', 'en_us_new_york')
    await page.selectOption('#origin_country_code', 'JP')
    await page.selectOption('#current_level', 'beginner')
    await page.fill('[id="speak_by_deadline"]', '1年')
    await page.fill('[id="target_outcome"]', 'E2Eテスト')

    // Submit
    await page.click('button[type="submit"]')

    // Should redirect to /lesson
    await expect(page).toHaveURL(/\/lesson/)
  })

  test('shows validation errors for empty required fields', async ({ page }) => {
    test.skip(true, 'Requires authenticated session')

    await page.goto('/onboarding')
    await page.click('button[type="submit"]')

    // At least one error should be visible
    await expect(page.locator('.text-red-600').first()).toBeVisible()
  })
})
