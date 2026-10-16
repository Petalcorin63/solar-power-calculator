/** Accounts in the browser: the My projects tab appears only for signed-in users. */
import { expect, tab, test } from './fixtures'

test('My projects appears after signing in and goes away on sign-out', async ({ page }) => {
  await page.goto('/')
  await expect(tab(page, 'My projects')).toHaveCount(0)

  // A #/projects link while signed out falls back to Setup rather than a blank page.
  await page.goto('/#/projects')
  await page.reload()
  await expect(tab(page, 'Setup')).toHaveAttribute('aria-selected', 'true')

  // Sign up through the API (the same request the form sends), then reload to pick up the session.
  const email = `e2e-${Date.now()}@example.com`
  const response = await page.request.post('/api/auth/register', {
    headers: { 'X-Requested-With': 'fetch' },
    data: { email, password: 'correct horse battery' },
  })
  expect(response.status()).toBe(201)
  await page.reload()

  await tab(page, 'My projects').click()
  await expect(page.getByText('Unsaved draft')).toBeVisible()

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(tab(page, 'My projects')).toHaveCount(0)
  await expect(tab(page, 'Setup')).toHaveAttribute('aria-selected', 'true')
})
