// A published site adds the Draft/Live switch and "Send draft live" to the
// header. It has to stay inside the window down to a tablet, or the More menu
// (History, Share) starts off screen and the whole page scrolls sideways.
import { test, expect, createHtmlSite, openEditor, publish } from './support.js'

const document = (text) => `<!doctype html><html><head><title>${text}</title></head><body><h1>${text}</h1></body></html>`
const WIDTHS = [768, 820, 900, 1024, 1099, 1100, 1280]

async function headerFits(page, language) {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 800 })
    await page.waitForTimeout(150)
    const more = await page.locator('header [data-tour="more"]').boundingBox()
    const scrollWidth = await page.evaluate(() => globalThis.document.documentElement.scrollWidth)
    expect(more.x + more.width, `More actions at ${width}px in ${language}`).toBeLessThanOrEqual(width)
    expect(scrollWidth, `page width at ${width}px in ${language}`).toBeLessThanOrEqual(width)
  }
}

test('the header of a published site fits from tablet width up, in both languages', async ({ page, request }) => {
  const siteId = await createHtmlSite(request, 'E2E header widths', [{ html: document('Home') }])
  await openEditor(page, siteId)
  await publish(page, request, siteId)

  await headerFits(page, 'English')
  // Short of room it is an icon, and it still says what it does.
  await page.setViewportSize({ width: 768, height: 800 })
  await expect(page.getByRole('button', { name: 'Send draft live', exact: true })).toBeVisible()

  await page.evaluate(() => localStorage.setItem('pwb_language', 'tr'))
  await page.reload()
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('button', { name: 'Canlıya aktar', exact: true })).toBeVisible()
  await headerFits(page, 'Turkish')
})
