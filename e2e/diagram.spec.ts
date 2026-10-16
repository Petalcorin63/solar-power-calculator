/** The system diagram: every drawing renders, boxes are colored, and parts can be explored. */
import type { Locator } from '@playwright/test'
import { diagramBox, expect, tab, test } from './fixtures'

/** The six drawings, and how to reach each from the Setup tab. */
const DRAWINGS = [
  { name: 'off-grid, separate equipment', system: 'Off-grid', boxes: ['Solar panels', 'Charge controller', 'Battery bank', 'Inverter', 'Household loads'] },
  { name: 'off-grid, all-in-one', system: 'Off-grid', setup: 'All-in-one', boxes: ['Solar panels', 'Battery bank', 'All-in-one inverter', 'Household loads'] },
  { name: 'off-grid, all-in-one with AC input', system: 'Off-grid', setup: 'All-in-one', acInput: 'Grid or generator', boxes: ['Solar panels', 'Battery bank', 'All-in-one inverter', 'Grid / generator', 'Household loads'] },
  { name: 'grid-tied', system: 'Grid-tied', boxes: ['Solar panels', 'Grid-tie inverter', 'Main breaker box', 'Utility grid'] },
  { name: 'hybrid', system: 'Hybrid', boxes: ['Solar panels', 'Battery bank', 'Hybrid inverter', 'Utility grid', 'Main breaker box', 'Critical loads'] },
  { name: 'hybrid, all-in-one', system: 'Hybrid', setup: 'All-in-one', boxes: ['Solar panels', 'Battery bank', 'All-in-one inverter', 'Utility grid', 'Main breaker box', 'Critical loads'] },
]

for (const drawing of DRAWINGS) {
  test(`draws the ${drawing.name} system with colored boxes`, async ({ page }) => {
    await page.goto('/')
    await page.getByRole('radio', { name: new RegExp(`^${drawing.system}`) }).click()
    if (drawing.setup) {
      const select = page.getByLabel('Equipment setup')
      await select.selectOption({ label: await optionLabel(select, drawing.setup) })
    }
    if (drawing.acInput) {
      const select = page.getByLabel('AC input (backup charging)')
      await select.selectOption({ label: await optionLabel(select, drawing.acInput) })
    }
    await tab(page, 'Diagram').click()

    for (const label of drawing.boxes) {
      const box = diagramBox(page, label)
      await expect(box, label).toBeVisible()
      // Regression: when Tailwind didn't see the color classes, every box rendered solid black.
      const fill = await box.locator(':scope > rect').evaluate(rect => getComputedStyle(rect).fill)
      expect(fill, `${label} fill`).not.toBe('rgb(0, 0, 0)')
    }
  })
}

test('shows a part’s calculation, and asks for missing inputs before sizing a wire', async ({ page }) => {
  await page.goto('/#/diagram')
  await page.reload()

  await diagramBox(page, 'Battery bank').click()
  const detail = page.locator('section[aria-live]')
  await expect(detail.getByRole('heading', { name: 'Battery bank' })).toBeVisible()
  await expect(detail.getByText('Battery capacity needed')).toBeVisible()

  // The panel wire needs datasheet values and a cable length first. Selected by keyboard:
  // its breaker sits on top of the wire's midpoint, where a click would land.
  await page.getByRole('button', { name: /^Wire, Panels/ }).focus()
  await page.keyboard.press('Enter')
  await expect(detail.getByText('Fill these in first')).toBeVisible()
})

test('the Diagram tab counts the parts that still need info', async ({ page }) => {
  await page.goto('/#/diagram')
  await page.reload()
  const summary = page.getByText(/parts? still needs? info/)
  const count = (await summary.textContent())?.match(/\d+/)?.[0]
  expect(count).toBeDefined()
  await expect(tab(page, 'Diagram')).toContainText(`${count} need info`)
})

/** The full text of the first option starting with `start` (option labels are long). */
async function optionLabel(select: Locator, start: string): Promise<string> {
  const labels = await select.locator('option').allTextContents()
  const match = labels.map(l => l.trim()).find(l => l.startsWith(start))
  if (!match) throw new Error(`No option starting with "${start}" in ${JSON.stringify(labels)}`)
  return match
}
