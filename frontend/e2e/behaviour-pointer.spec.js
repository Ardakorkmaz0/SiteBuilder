import { expect, test } from '@playwright/test'
import { pointerAt, visitorMatches } from './behaviourActions.js'

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

test('the user can type inside a scaled lesson frame only when it is uncovered', async ({ page }) => {
  await page.setContent(`<iframe title="Practice" sandbox="allow-scripts" style="margin:70px;transform:scale(.8)" srcdoc='<label>Name <input></label>'></iframe><div id="cover" style="position:fixed;inset:0"></div>`)
  const fields = await visitorMatches(page, frame => frame.getByRole('textbox', { name: 'Name', exact: true }))
  expect(fields).toHaveLength(1)
  expect(await pointerAt(page, fields)).toBe('covered')
  await page.evaluate(() => document.getElementById('cover').remove())
  expect(await pointerAt(page, fields)).toBe('clicked')
  await page.keyboard.type('Sol')
  await expect(fields[0]).toHaveValue('Sol')
})
