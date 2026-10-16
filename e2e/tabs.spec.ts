/** Tab navigation: switching, the URL hash, back/forward, and edits carrying across tabs. */
import { expect, tab, test } from './fixtures'

test('opens on Setup and moves through the tabs with the next-step buttons', async ({ page }) => {
  await page.goto('/')
  await expect(tab(page, 'Setup')).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('heading', { name: 'Sunlight & solar panels' })).toBeVisible()

  await page.getByRole('button', { name: 'See your results' }).click()
  await expect(page).toHaveURL(/#\/results$/)
  await expect(page.getByText('Solar panels needed')).toBeVisible()

  await page.getByRole('button', { name: 'Size the wires and breakers' }).click()
  await expect(page).toHaveURL(/#\/diagram$/)
  await expect(page.locator('svg[role=group]')).toBeVisible()

  await page.getByRole('button', { name: 'See the formulas and sources' }).click()
  await expect(page.getByRole('heading', { name: 'Formulas & references' })).toBeVisible()
})

test('an edit on Setup shows up on Results', async ({ page }) => {
  await page.goto('/')
  const panelWatts = page.getByLabel('Panel wattage')
  await panelWatts.fill('500')
  await panelWatts.blur()

  await tab(page, 'Results').click()
  await expect(page.getByText('× 500 W panel(s)')).toBeVisible()
})

test('back and forward move between tabs, and links can open a tab directly', async ({ page }) => {
  await page.goto('/')
  await tab(page, 'Results').click()
  await tab(page, 'Diagram').click()

  await page.goBack()
  await expect(tab(page, 'Results')).toHaveAttribute('aria-selected', 'true')
  await page.goForward()
  await expect(tab(page, 'Diagram')).toHaveAttribute('aria-selected', 'true')

  await page.goto('/#/references')
  await page.reload()
  await expect(tab(page, 'Formulas')).toHaveAttribute('aria-selected', 'true')
})

test('a citation link jumps within the references tab instead of switching tabs', async ({ page }) => {
  await page.goto('/#/references')
  await page.locator('sup a[href^="#ref-"]').first().click()
  await expect(page).toHaveURL(/#ref-/)
  await expect(tab(page, 'Formulas')).toHaveAttribute('aria-selected', 'true')
})

test('every tab fits a phone screen without sideways scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  for (const label of ['Setup', 'Results', 'Diagram', 'Formulas']) {
    await tab(page, label).click()
    const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    expect(overflows, `${label} tab overflows at 390px`).toBe(false)
  }
})
