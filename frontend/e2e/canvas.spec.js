// The canvas: blocks placed, copied, moved and taken back.
import { test, expect, api, openEditor, save } from './support.js'

const blocks = (page) => page.locator('main [data-cid]')

test('place, duplicate, nudge, multi-select, undo, and keep it all', async ({ page, request }) => {
  const { data: site } = await api(request, 'POST', '/sites/', { title: 'E2E canvas' })
  await openEditor(page, site.id)

  await page.getByRole('tab', { name: 'Components' }).click()
  await page.locator('[role=tabpanel]').getByRole('button', { name: /Heading/ }).first().click()
  await page.locator('[title^="Click to place"]').first().click()
  const area = await page.locator('main').last().boundingBox()
  await page.mouse.click(area.x + 240, area.y + 200)
  await expect(blocks(page)).toHaveCount(1)
  const first = await blocks(page).first().getAttribute('data-cid')
  const block = (id) => page.locator(`main [data-cid="${id}"]`)

  await block(first).click({ position: { x: 6, y: 6 } })
  await page.keyboard.press('Control+d')
  await expect(blocks(page)).toHaveCount(2)
  await page.keyboard.press('Control+z')
  await expect(blocks(page)).toHaveCount(1)

  // A burst of nudges is one step; Shift moves ten times as far.
  await block(first).click({ position: { x: 6, y: 6 } })
  const left = () => block(first).evaluate((el) => parseFloat(el.style.left))
  const x0 = await left()
  await page.keyboard.press('ArrowRight')
  const x1 = await left()
  await page.keyboard.press('Shift+ArrowRight')
  expect([x1 - x0, (await left()) - x1]).toEqual([1, 10])
  await page.keyboard.press('Control+z')
  await expect.poll(left).toBe(x0)

  // Two blocks apart, selected together, deleted and brought back at once.
  // (Undo clears the selection, so pick the block again first.)
  await block(first).click({ position: { x: 6, y: 6 } })
  await page.keyboard.press('Control+d')
  for (let i = 0; i < 12; i += 1) await page.keyboard.press('Shift+ArrowDown')
  const ids = await blocks(page).evaluateAll((els) => els.map((el) => el.getAttribute('data-cid')))
  await block(ids[0]).click({ position: { x: 6, y: 6 } })
  await block(ids[1]).click({ position: { x: 6, y: 6 }, modifiers: ['Shift'] })
  await expect(page.getByRole('button', { name: 'Delete selected' })).toBeVisible()
  await page.keyboard.press('Delete')
  await expect(blocks(page)).toHaveCount(0)
  await page.keyboard.press('Control+z')
  await expect(blocks(page)).toHaveCount(2)

  await save(page)
  await page.reload()
  await expect(blocks(page)).toHaveCount(2)
  await api(request, 'DELETE', `/sites/${site.id}/`)
})
