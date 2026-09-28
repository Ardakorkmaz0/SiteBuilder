// Form fields: a password field from the palette is a real field, edited part
// by part in the large view, and its show/hide button works once published,
// on a canvas page and on an HTML page alike.
import { test, expect, api, createHtmlSite, openEditor, clickInFrame, inFrame, publish, BACKEND } from './support.js'

async function pickField(page, kind) {
  await page.getByRole('tab', { name: 'Components' }).click()
  await page.locator('[role=tabpanel]').getByRole('button', { name: /Form field/ }).first().click()
  await page.locator(`[title$="— ${kind}"]`).first().click()
}

async function revealOnPublishedPage(browser, slug) {
  const viewer = await browser.newContext()
  const visitor = await viewer.newPage()
  await visitor.goto(`${BACKEND}/s/${slug}/`)
  const input = visitor.locator('.pwb-password input')
  await expect(input).toHaveAttribute('type', 'password')
  await visitor.locator('[data-pwb-reveal]').click()
  await expect(input).toHaveAttribute('type', 'text')
  await expect(visitor.locator('[data-pwb-reveal]')).toHaveAttribute('aria-pressed', 'true')
  return { viewer, visitor }
}

test('a password field on the canvas, edited part by part', async ({ page, request, browser }) => {
  const { data: site } = await api(request, 'POST', '/sites/', { title: 'E2E form field' })
  await openEditor(page, site.id)
  await pickField(page, 'Password')
  const area = await page.locator('main').last().boundingBox()
  await page.mouse.click(area.x + 240, area.y + 200)
  const block = page.locator('main [data-cid]').first()
  await expect(block.locator('input[type="password"]')).toHaveCount(1)
  await expect(block.locator('iframe')).toHaveCount(0)

  await block.click({ position: { x: 6, y: 6 } })
  await page.getByRole('button', { name: 'Open large' }).click()
  const dialog = page.getByRole('dialog', { name: 'Open large' })
  // Under the dark app theme the field keeps the site's own colours.
  const preview = dialog.locator('[data-part-picker]')
  expect(await preview.locator('input').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(255, 255, 255)')
  await preview.locator('[data-field-part="label"]').click()
  const labelPart = dialog.getByRole('region', { name: 'Label' })
  await expect(labelPart).toHaveCount(1)
  await labelPart.locator('label').filter({ has: page.locator('span', { hasText: /^Color$/ }) }).locator('input[type="text"]').fill('#c00000')
  await expect.poll(() => block.locator('label').evaluate((el) => getComputedStyle(el).color)).toBe('rgb(192, 0, 0)')
  await page.keyboard.press('Escape')

  const slug = await publish(page, request, site.id)
  const { viewer, visitor } = await revealOnPublishedPage(browser, slug)
  expect(await visitor.locator('label').first().evaluate((el) => getComputedStyle(el).color)).toBe('rgb(192, 0, 0)')
  await viewer.close()

  // The server keeps what the editor sent: once, a saved password field came
  // back as a text field and lost its part settings.
  const { data: saved } = await api(request, 'GET', `/sites/${site.id}/`)
  const props = saved.schema.pages[0].components[0].props
  expect([props.inputType, props.labelColor]).toEqual(['password', '#c00000'])
  await page.reload()
  await page.waitForLoadState('networkidle')
  await expect(page.locator('main [data-cid] input[type="password"]')).toHaveCount(1)
  await api(request, 'DELETE', `/sites/${site.id}/`)
})

test('the same password field dropped into an HTML page', async ({ page, request, browser }) => {
  const siteId = await createHtmlSite(request, 'E2E form field html', [{
    html: '<!DOCTYPE html><html><body><section><h2>Sign in</h2><p id="para">Welcome back.</p></section></body></html>',
  }])
  await openEditor(page, siteId, { edit: true })
  await pickField(page, 'Password')
  await clickInFrame(page, '#para')
  const placed = await inFrame(page, (doc) => {
    const input = doc.querySelector('input[type="password"]')
    return input && {
      label: doc.querySelector(`label[for="${input.id}"]`)?.textContent,
      reveal: !!doc.querySelector('[data-pwb-reveal]'),
    }
  })
  expect(placed).toEqual({ label: 'Password', reveal: true })

  const slug = await publish(page, request, siteId)
  const { viewer } = await revealOnPublishedPage(browser, slug)
  await viewer.close()
  await api(request, 'DELETE', `/sites/${siteId}/`)
})
