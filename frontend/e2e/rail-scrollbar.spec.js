// A side menu pinned full height (a converted page's contents column) is
// drawn from a design taller than a short screen. Where a scrollbar takes
// room (Brave, Firefox on Linux), the bar narrowed the box, the box shrank
// its drawing to fit, the shorter drawing no longer needed the bar, the box
// widened again, and the menu flipped between two sizes on every frame:
// the page kept redrawing and its links could not be clicked.
import { test, expect, chromium } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })
test.skip(({ browserName }) => browserName !== 'chromium', 'a browser of our own, with room-taking scrollbars, is launched from Chromium')

const item = (i) => ({ id: `item${i}`, type: 'text', props: { text: `Chapter ${i}` }, styles: {}, layout: { x: 20, y: 20 + i * 60, w: 240, h: 30 } })
const SCHEMA = {
  theme: {},
  pages: [{
    id: 'home', name: 'Home', mode: 'empty', canvasWidth: 1200,
    components: [{
      id: 'rail', type: 'container', styles: { backgroundColor: '#eeeeee' },
      props: { scrollBehavior: 'fixed', pinHeight: 'full', pinX: 'left', pinY: 'top' },
      // Read 916 tall in a 900 px window; its chapters reach 890.
      layout: { x: 0, y: 0, w: 300, h: 916 },
      children: Array.from({ length: 15 }, (_, i) => item(i)),
    }, { id: 'body', type: 'text', props: { text: 'The page' }, styles: {}, layout: { x: 340, y: 40, w: 600, h: 3000 } }],
  }],
}

test('a full-height side menu keeps one size where scrollbars take room', async ({ page }) => {
  await page.goto('/')
  const html = await page.evaluate(async (schema) => {
    const { schemaToSingleHtml } = await import('/src/utils/schemaToFiles.js')
    return schemaToSingleHtml(schema, 'Rail')
  }, SCHEMA)

  const browser = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] })
  try {
    // Between 916 x 0.95 and 916 tall: scaled down the drawing fits, at full
    // size it does not.
    const view = await (await browser.newContext({ viewport: { width: 1200, height: 890 } })).newPage()
    await view.setContent(html, { waitUntil: 'load' })
    await view.waitForTimeout(500)
    const changes = await view.evaluate(() => new Promise((resolve) => {
      let count = 0
      const watch = new MutationObserver((list) => { count += list.length })
      watch.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['style'] })
      setTimeout(() => { watch.disconnect(); resolve(count) }, 1500)
    }))
    expect(changes).toBe(0)
    await view.getByText('Chapter 3', { exact: true }).click({ timeout: 3000 })
  } finally {
    await browser.close()
  }
})
