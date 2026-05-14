import { expect, test } from '@playwright/test'

test('opens email marketing as its own admin screen', async ({ page }) => {
  await page.goto('/admin/email-marketing')
  await page.getByLabel('Admin email').fill('admin@example.com')
  await page.getByLabel('Password').fill('admin-password-123')
  await page.getByRole('button', { name: 'Open admin backend' }).click()

  await expect(page).toHaveURL(/\/admin\/email-marketing$/)
  await expect(page.getByRole('heading', { name: 'Campaigns and autoresponders.' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'New newsletter' })).toBeVisible()
  await expect(page.getByText('Available placeholders')).toBeVisible()
})
