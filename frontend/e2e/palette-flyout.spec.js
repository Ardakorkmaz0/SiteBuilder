// Quick add: resting the pointer on a palette row opens a flyout of numbered
// variants, and a number key puts one on the canvas without a drag or a tap.
import { test, expect, api, openEditor } from './support.js'

const blocks = (page) => page.locator('main [data-cid]')
const box = (locator) => locator.evaluate((el) => ({
  left: parseFloat(el.style.left),
  top: parseFloat(el.style.top),
  width: parseFloat(el.style.width),
  height: parseFloat(el.style.height),
}))

test('a number key adds a variant into view, then below the selected block, and one undo takes it back', async ({ page, request }) => {
  const { data: site } = await api(request, 'POST', '/sites/', { title: 'E2E quick add' })
  await openEditor(page, site.id)
  await page.getByRole('tab', { name: 'Components' }).click()

  const row = page.locator('[role=tabpanel]').getByRole('button', { name: /^\W*Image\d+▸$/ })
  await row.hover()
  const flyout = page.locator('[data-palette-flyout="image"]')
  await expect(flyout).toBeVisible()
  const cards = flyout.locator('[aria-keyshortcuts]')
  await expect(cards).toHaveCount(4)
  await expect(cards.nth(1)).toHaveAttribute('aria-keyshortcuts', '2')

  await page.keyboard.press('2')
  await expect(blocks(page)).toHaveCount(1)
  const first = blocks(page).first()
  // A dropped embed is fitted to its content just after: let that settle.
  await page.waitForTimeout(600)
  // Across the middle of the canvas, and on screen.
  const canvasWidth = await page.locator('#free-canvas').evaluate((el) => parseFloat(el.style.width) || el.offsetWidth)
  const placed = await box(first)
  expect(placed.left).toBeLessThan(canvasWidth / 2)
  expect(placed.left + placed.width).toBeGreaterThan(canvasWidth / 2)
  await expect(first).toBeInViewport()

  // Selected, the next one goes 24 px below it, centred on it.
  await page.keyboard.press('Escape')
  await first.click({ position: { x: 8, y: 8 } })
  await row.hover()
  await expect(flyout).toBeVisible()
  const selected = await box(first)
  await page.keyboard.press('3')
  await expect(blocks(page)).toHaveCount(2)
  const second = await box(blocks(page).nth(1))
  expect(second.top).toBe(selected.top + selected.height + 24)

  await page.keyboard.press('Escape')
  await page.keyboard.press('Control+z')
  await expect(blocks(page)).toHaveCount(1)
})

test('a field being typed in keeps its digits, and the flyout closes once the pointer leaves', async ({ page, request }) => {
  const { data: site } = await api(request, 'POST', '/sites/', { title: 'E2E quick add keys' })
  await openEditor(page, site.id)
  await page.getByRole('tab', { name: 'Components' }).click()

  const row = page.locator('[role=tabpanel]').getByRole('button', { name: /^\W*Button\d+▸$/ })
  await row.hover()
  const flyout = page.locator('[data-palette-flyout="button"]')
  await expect(flyout).toBeVisible()

  // The page name field in the properties panel, focused without moving the
  // pointer, so the flyout stays open while a digit is typed.
  const name = page.getByRole('textbox', { name: 'Page name', exact: true }).first()
  await name.focus()
  await page.keyboard.press('End')
  await page.keyboard.press('2')
  await expect(name).toHaveValue(/2$/)
  await expect(flyout).toBeVisible()
  await expect(blocks(page)).toHaveCount(0)

  await page.mouse.move(5, 5)
  await expect(flyout).toBeHidden()
})
