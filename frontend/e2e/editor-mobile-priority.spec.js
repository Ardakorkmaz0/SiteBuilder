import { test, expect, api, createHtmlSite, openEditor, clickInFrame, inFrame, save, savedHtml } from './support.js'

const properties = (page) => page.locator('[data-tour="properties"]')
const ORIGINAL_GRADIENT = 'linear-gradient(35deg, rgb(225, 29, 72), rgb(22, 163, 74))'
const PHONE_GRADIENT = 'linear-gradient(35deg, rgb(225, 29, 72), rgb(37, 99, 235))'

async function waitForHeading(page) {
  await expect(page.locator('iframe[title="Reading the page"]')).toHaveCount(0)
  await expect.poll(() => inFrame(page, (doc) => !!doc.querySelector('#hero'))).toBe(true)
}

async function chooseHeading(page) {
  await waitForHeading(page)
  await clickInFrame(page, '#hero')
  await properties(page).getByRole('tab', { name: 'Design', exact: true }).click()
}

async function renderedStyle(page) {
  return inFrame(page, (doc) => {
    const element = doc.querySelector('#hero')
    if (!element) return null
    const style = doc.defaultView.getComputedStyle(element)
    return { fontSize: style.fontSize, backgroundImage: style.backgroundImage }
  })
}

for (const layered of [false, true]) {
  test(`phone edits beat imported ${layered ? 'layered' : 'unlayered'} ID important rules and survive save, reload and reset`, async ({ page, request }) => {
    const pinned = '#hero { font-size: 40px !important; background-image: linear-gradient(35deg, #e11d48, #16a34a) !important; }'
    const css = layered ? `@layer template { ${pinned} }` : pinned
    const siteId = await createHtmlSite(request, 'E2E mobile style priority', [{
      html: `<!DOCTYPE html><html><head><title>Responsive priority</title><style>${css} body{margin:0;padding:24px} h1{padding:24px}</style></head><body><h1 id="hero">Responsive heading</h1></body></html>`,
    }])
    try {
      await openEditor(page, siteId, { edit: true })
      await chooseHeading(page)
      await properties(page).getByRole('spinbutton', { name: 'Font size (px)', exact: true }).fill('52')
      await expect.poll(() => renderedStyle(page)).toEqual({ fontSize: '52px', backgroundImage: ORIGINAL_GRADIENT })

      await page.getByRole('button', { name: 'Mobile', exact: true }).click()
      await expect.poll(() => inFrame(page, (doc) => doc.defaultView.innerWidth)).toBeLessThan(768)
      await chooseHeading(page)
      await properties(page).getByRole('spinbutton', { name: 'Font size (px)', exact: true }).fill('28')
      await properties(page).getByRole('button', { name: 'Background image & gradient', exact: true }).click()
      await properties(page).getByRole('textbox', { name: 'Gradient to', exact: true }).fill('#2563eb')
      // These assertions read the actual media-query cascade, not the saved
      // custom properties that already passed the jsdom utility tests.
      await expect.poll(() => renderedStyle(page)).toEqual({ fontSize: '28px', backgroundImage: PHONE_GRADIENT })

      await page.getByRole('button', { name: 'PC', exact: true }).click()
      await expect.poll(() => renderedStyle(page)).toEqual({ fontSize: '52px', backgroundImage: ORIGINAL_GRADIENT })
      await page.getByRole('button', { name: 'Mobile', exact: true }).click()
      await expect.poll(() => renderedStyle(page)).toEqual({ fontSize: '28px', backgroundImage: PHONE_GRADIENT })

      await save(page)
      expect(await savedHtml(request, siteId)).toContain('--pwb-mobile-background-image')
      await page.reload()
      await waitForHeading(page)
      await page.getByRole('button', { name: 'Mobile', exact: true }).click()
      await expect.poll(() => renderedStyle(page)).toEqual({ fontSize: '28px', backgroundImage: PHONE_GRADIENT })
      await page.getByRole('button', { name: 'PC', exact: true }).click()
      await expect.poll(() => renderedStyle(page)).toEqual({ fontSize: '52px', backgroundImage: ORIGINAL_GRADIENT })

      await page.getByRole('button', { name: 'Mobile', exact: true }).click()
      await chooseHeading(page)
      await properties(page).getByRole('button', { name: /Reset mobile styles/ }).click()
      await expect.poll(() => renderedStyle(page)).toEqual({ fontSize: '52px', backgroundImage: ORIGINAL_GRADIENT })
      await save(page)
      const reset = await savedHtml(request, siteId)
      expect(reset).not.toContain('data-pwb-mobile-font-size')
      expect(reset).not.toContain('data-pwb-mobile-background-image')
    } finally {
      await api(request, 'DELETE', `/sites/${siteId}/`)
    }
  })
}
