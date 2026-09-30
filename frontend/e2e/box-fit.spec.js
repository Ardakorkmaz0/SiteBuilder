// Resizing a block makes its content fit the box: bigger with a bigger box,
// smaller with a smaller one, and the published page draws it the same way.
import { test, expect, api, openEditor, publish, save, BACKEND } from './support.js'

const zoomOf = (transform) => (transform && transform.startsWith('matrix') ? parseFloat(transform.slice(7)) : 1)

async function resize(page, id, factor) {
  const block = page.locator(`main [data-cid="${id}"]`)
  const before = await block.boundingBox()
  const handle = await block.locator('[data-resize-handle="se"]').boundingBox()
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2)
  await page.mouse.down()
  await page.mouse.move(before.x + before.width * factor, before.y + before.height * factor, { steps: 6 })
  await page.mouse.up()
}

test('a resized field grows with its box, in the editor and on the page', async ({ page, request, browser }) => {
  const { data: site } = await api(request, 'POST', '/sites/', { title: 'E2E box fit' })
  await openEditor(page, site.id)
  await page.getByRole('tab', { name: 'Components' }).click()
  await page.locator('[role=tabpanel]').getByRole('button', { name: /Form field/ }).first().click()
  await page.locator('[title$="— Password"]').first().click()
  const area = await page.locator('main').last().boundingBox()
  await page.mouse.click(area.x + 200, area.y + 160)
  const id = await page.locator('main [data-cid]').first().getAttribute('data-cid')
  await page.locator(`main [data-cid="${id}"]`).click({ position: { x: 4, y: 4 } })

  await resize(page, id, 2)
  const root = page.locator(`main [data-cid="${id}"] [data-pwb-fit-root]`)
  await expect.poll(async () => zoomOf(await root.evaluate((el) => getComputedStyle(el).transform))).toBeGreaterThan(1.4)
  const inEditor = zoomOf(await root.evaluate((el) => getComputedStyle(el).transform))
  await save(page)

  const slug = await publish(page, request, site.id)
  const viewer = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const visitor = await viewer.newPage()
  await visitor.goto(`${BACKEND}/s/${slug}/`)
  const published = visitor.locator(`.c-${id} [data-pwb-fit-root]`)
  await expect.poll(async () => zoomOf(await published.evaluate((el) => getComputedStyle(el).transform))).toBeGreaterThan(1.4)
  expect(Math.abs(zoomOf(await published.evaluate((el) => getComputedStyle(el).transform)) - inEditor)).toBeLessThan(0.05)
  await viewer.close()

  // Smaller than it started: the content shrinks instead of being cut off.
  await page.reload()
  await page.waitForLoadState('networkidle')
  await page.locator(`main [data-cid="${id}"]`).click({ position: { x: 4, y: 4 } })
  await resize(page, id, 0.25)
  await expect.poll(async () => zoomOf(await root.evaluate((el) => getComputedStyle(el).transform))).toBeLessThan(0.8)
  await api(request, 'DELETE', `/sites/${site.id}/`)
})
