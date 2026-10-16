/**
 * The `test` every browser test uses: Playwright's own, plus a check that the page
 * logged no errors — an uncaught exception in a component fails the test even if
 * everything the test looked at was fine.
 */
import { test as base, expect, type Locator, type Page } from '@playwright/test'

export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [async ({ page }, use) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text())
    })
    await use(errors)
    expect(errors, 'browser console errors').toEqual([])
  }, { auto: true }],
})

export { expect }

/** A tab in the tab bar, by the start of its label (labels can end in a badge, e.g. "5 need info"). */
export function tab(page: Page, label: string): Locator {
  return page.getByRole('tab', { name: new RegExp(`^${label}`) })
}

/** An equipment box on the diagram, by the label written on it. */
export function diagramBox(page: Page, label: string): Locator {
  return page
    .locator('svg[role=group] [role=button]')
    .filter({ has: page.locator('text').getByText(label, { exact: true }) })
}
