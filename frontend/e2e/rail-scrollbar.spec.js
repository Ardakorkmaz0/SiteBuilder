// A box drawn from a fitted design (a converted page's contents column)
// that scrolls inside itself. Where a scrollbar takes room (Brave, Firefox
// on Linux), the bar narrowed the box, the box shrank its drawing to fit, the
// shorter drawing no longer needed the bar, the box widened again, and it
// flipped between two sizes on every frame: the page kept redrawing and its
// links could not be clicked. The bar's room is now kept whether it shows or
// not: one size, a bar to see and drag, the drawing fitted to what is left.
import { test, expect, chromium } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })

const item = (i, extra = {}) => ({ id: `item${i}`, type: 'text', props: { text: `Chapter ${i}` }, styles: {}, layout: { x: 20, y: 20 + i * 60, w: 240, h: 30 }, ...extra })
const chapters = () => Array.from({ length: 15 }, (_, i) => item(i))
const BODY = { id: 'body', type: 'text', props: { text: 'The page' }, styles: {}, layout: { x: 340, y: 40, w: 600, h: 3000 } }
const page1 = (components, customCss = '') => ({ theme: {}, customCss, pages: [{ id: 'home', name: 'Home', mode: 'empty', canvasWidth: 1200, components }] })

// Pinned full height, read 916 tall in a 900 px window; its chapters reach
// 890, and one more block stands past its right edge.
const PINNED = page1([{
  id: 'rail', type: 'container', styles: { backgroundColor: '#eeeeee' },
  props: { scrollBehavior: 'fixed', pinHeight: 'full', pinX: 'left', pinY: 'top' },
  layout: { x: 0, y: 0, w: 300, h: 916 },
  children: [...chapters(), item(15, { props: { text: 'Far right' }, layout: { x: 185, y: 20, w: 100, h: 30 }, styles: { transform: 'translateX(130px)' } })],
}, BODY])
// Not pinned: a box the page's own CSS makes scroll (ChatGPT's review, 10).
const SCROLLING = page1([{
  id: 'menu', type: 'container', styles: { backgroundColor: '#eeeeee' }, props: {},
  layout: { x: 0, y: 0, w: 300, h: 916 }, children: chapters(),
}, BODY], '#menu { height: 890px; overflow: auto; }')

async function publish(page, schema) {
  return page.evaluate(async (s) => {
    const { schemaToSingleHtml } = await import('/src/utils/schemaToFiles.js')
    return schemaToSingleHtml(s, 'Rail')
  }, schema)
}

// A page in a browser whose scrollbars take room: Chromium launched without
// its test-only hiding of them; Firefox as it is. Checked on a box first.
async function withRoomTakingScrollbars(browserName, browser, html, run) {
  const own = browserName === 'chromium' ? await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] }) : null
  try {
    const context = await (own || browser).newContext({ viewport: { width: 1200, height: 890 } })
    const view = await context.newPage()
    await view.setContent('<div id="probe" style="width:100px;height:50px;overflow:scroll"></div>')
    const room = await view.locator('#probe').evaluate((el) => el.offsetWidth - el.clientWidth)
    test.skip(room === 0, 'this browser draws scrollbars over the page, taking no room')
    await view.setContent(html, { waitUntil: 'load' })
    await view.waitForTimeout(500)
    await run(view)
    await context.close()
  } finally {
    await own?.close()
  }
}

const styleChanges = (view) => view.evaluate(() => new Promise((resolve) => {
  let count = 0
  const watch = new MutationObserver((list) => { count += list.length })
  watch.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['style'] })
  setTimeout(() => { watch.disconnect(); resolve(count) }, 1500)
}))

test('a full-height side menu keeps one size, shows its scrollbar, and fits its drawing beside it', async ({ page, browser, browserName }) => {
  await page.goto('/')
  const html = await publish(page, PINNED)

  await withRoomTakingScrollbars(browserName, browser, html, async (view) => {
    expect(await styleChanges(view)).toBe(0)
    const rail = view.locator('[data-pwb-container-root]').first()
    const fit = await rail.evaluate((root) => {
      const scroller = root.closest('[data-pwb-container-width]').parentElement
      return { bar: scroller.offsetWidth - scroller.clientWidth, room: scroller.clientWidth, drawn: root.getBoundingClientRect().width }
    })
    // The bar shows, and the 300 px drawing is fitted to what it leaves.
    expect(fit.bar).toBeGreaterThan(0)
    expect(Math.abs(fit.drawn - fit.room)).toBeLessThanOrEqual(1)

    // The last chapter can be scrolled to and pressed.
    await view.mouse.move(100, 400)
    await view.mouse.wheel(0, 2000)
    await view.waitForTimeout(300)
    const last = await view.getByText('Chapter 14', { exact: true }).boundingBox()
    expect(last.y + last.height).toBeLessThanOrEqual(890)
    const hit = await view.evaluate(([x, y]) => document.elementFromPoint(x, y)?.textContent?.trim(), [last.x + last.width / 2, last.y + last.height / 2])
    expect(hit).toBe('Chapter 14')

    // What stands past its right edge can still be scrolled to.
    await view.mouse.move(100, 400)
    await view.mouse.wheel(200, 0)
    await view.waitForTimeout(300)
    const across = await rail.evaluate((root) => root.closest('[data-pwb-container-width]').parentElement.scrollLeft)
    expect(across).toBeGreaterThan(0)
  })
})

test('a box the page makes scroll keeps one size where scrollbars take room', async ({ page, browser, browserName }) => {
  await page.goto('/')
  const html = await publish(page, SCROLLING)

  await withRoomTakingScrollbars(browserName, browser, html, async (view) => {
    expect(await styleChanges(view)).toBe(0)
  })
})
