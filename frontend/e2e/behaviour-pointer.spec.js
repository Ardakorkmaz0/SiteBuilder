import { expect, test } from '@playwright/test'
import { pointerAt } from './behaviourActions.js'

test.use({ storageState: { cookies: [], origins: [] } })

test('the user action probe refuses a covered control and activates an exposed one', async ({ page }) => {
  await page.setContent('<button onclick="this.textContent=\'Logged\'">Log visit</button><div style="position:fixed;inset:0;background:transparent"></div>')
  const button = page.getByRole('button', { name: 'Log visit', exact: true })
  expect(await pointerAt(page, button)).toBe('covered')
  await expect(button).toBeVisible()
  await page.getByRole('button').evaluate(el => el.nextElementSibling.remove())
  expect(await pointerAt(page, button)).toBe('clicked')
  await expect(page.getByRole('button', { name: 'Logged', exact: true })).toBeVisible()
})
