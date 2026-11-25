// The bar over the stage keeps every control inside it at every window width,
// with both rails open as they are by default and in Turkish, whose words are
// the longest. Short of room the words give way to icons and the zoom and the
// browser frame move into the ⋯ menu. The bar once ran past its end, and the
// ⋯ menu at the end was out of reach; a canvas page's part selector with a
// long part name pushed it out again, and the screen list hung off the end of
// the stage, which cut its right-hand cards off.
import { test, expect, api, createHtmlSite, openEditor } from './support.js'

// 1040: the narrowest window whose bar still has the PC/Mobile switch.
const WIDTHS = [1920, 1600, 1440, 1280, 1100, 1040, 1024]
const DOCUMENT = '<!doctype html><html><head><title>Bar</title></head><body><h1>Bar</h1><p>Room to work.</p></body></html>'
const bar = (page) => page.locator('.studio-toolbar:has([data-tour="canvas-modes"])')

async function dismissOverlays(page) {
  for (let i = 0; i < 3 && await page.locator('.studio-overlay').count(); i += 1) {
    await page.keyboard.press('Escape')
    await page.waitForTimeout(250)
  }
}

async function fitsAtEveryWidth(page, where) {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 })
    await page.waitForTimeout(200)
    const measured = await bar(page).evaluate((element) => {
      const box = element.getBoundingClientRect()
      const more = element.querySelector('[data-tour="canvas-tools"]').getBoundingClientRect()
      return {
        overflow: element.scrollWidth - element.clientWidth,
        moreWidth: more.width,
        moreRight: more.right,
        barRight: box.right,
      }
    })
    expect(measured.overflow, `${where} at ${width}px: the bar runs past its end`).toBeLessThanOrEqual(0)
    expect(measured.moreWidth, `${where} at ${width}px: the ⋯ button is shown`).toBeGreaterThan(0)
    expect(measured.moreRight, `${where} at ${width}px: the ⋯ button is inside the bar`).toBeLessThanOrEqual(measured.barRight + 0.5)
    await listIsInView(page, `${where} at ${width}px`)
  }
}

// The screen list opens where all of it can be seen: just inside the middle
// of each of its edges is the list, not the rail or the page beside it.
async function listIsInView(page, where) {
  await bar(page).getByRole('button', { name: /^Ekran boyutu:/ }).click()
  const list = page.getByRole('dialog', { name: 'Ekran boyutu', exact: true })
  await expect(list).toBeVisible()
  const edges = await list.evaluate((element) => {
    const box = element.getBoundingClientRect()
    const midX = box.left + box.width / 2
    const midY = box.top + box.height / 2
    return [[box.left + 4, midY], [midX, box.top + 4], [box.right - 4, midY], [midX, box.bottom - 4]]
      .map(([x, y]) => element.contains(document.elementFromPoint(x, y)))
  })
  expect(edges, `${where}: the screen list can be seen to its left, top, right and bottom edge`).toEqual([true, true, true, true])
  await page.keyboard.press('Escape')
  await expect(list).toHaveCount(0)
}

// At 1024px with both rails open the bar is at its narrowest: the zoom is not
// in it but in the ⋯ menu, and works from there.
async function zoomsFromTheMenu(page) {
  await page.setViewportSize({ width: 1024, height: 900 })
  await page.waitForTimeout(200)
  const zoomIn = bar(page).getByRole('button', { name: 'Tuvali yakınlaştır', exact: true })
  await expect(zoomIn).toHaveCount(0)
  await bar(page).getByRole('button', { name: 'Tuval araçları', exact: true }).click()
  await expect(zoomIn).toHaveCount(1)
  const readout = bar(page).getByRole('button', { name: /^Yakınlaştırma: %\d+/ })
  const before = await readout.getAttribute('aria-label')
  await zoomIn.click()
  await expect(readout).not.toHaveAttribute('aria-label', before)
  await expect(bar(page).getByRole('button', { name: /^Tarayıcı çerçevesini (göster|gizle)$/ })).toHaveCount(1)
}

test('the stage bar keeps every control inside it at every width, and the zoom works from its ⋯ menu', async ({ page, request }) => {
  const htmlSite = await createHtmlSite(request, 'E2E stage bar', [{ html: DOCUMENT }])
  const created = await api(request, 'POST', '/sites/', { title: 'E2E stage bar canvas' })
  expect(created.status).toBe(201)
  const canvasSite = created.data.id
  try {
    const { data: full } = await api(request, 'GET', `/sites/${canvasSite}/`)
    // Shown a part at a time, with a long part name in the bar's part selector.
    const home = {
      ...full.schema.pages[0], name: 'Home', mode: 'empty', canvasWidth: 1000,
      parts: [
        { key: 'intro', label: 'Giriş bölümü: sayfanın ilk ve en uzun başlıklı parçası' },
        { key: 'details', label: 'Ayrıntılar' },
      ],
      components: [{ id: 'hello', type: 'heading', props: { text: 'Hello', shownBy: ['intro'] }, styles: {}, layout: { x: 80, y: 80, w: 300, h: 60 } }],
    }
    const seeded = await api(request, 'PATCH', `/sites/${canvasSite}/`, { schema: { ...full.schema, pages: [home] } })
    expect(seeded.status, JSON.stringify(seeded.data)).toBe(200)

    await openEditor(page, htmlSite)
    await page.evaluate(() => localStorage.setItem('pwb_language', 'tr'))
    await page.reload()
    await page.waitForLoadState('networkidle')
    await dismissOverlays(page)
    await page.getByRole('button', { name: 'Düzenle', exact: true }).click()
    await expect(page.locator('main iframe[title="site"]')).toBeVisible()
    await fitsAtEveryWidth(page, 'HTML page')
    await zoomsFromTheMenu(page)

    await page.setViewportSize({ width: 1440, height: 900 })
    await openEditor(page, canvasSite)
    await page.getByRole('button', { name: 'Düzenle', exact: true }).click()
    await expect(page.locator('#free-canvas')).toBeVisible()
    await expect(bar(page).getByRole('combobox', { name: 'Tuvalde gösterilen bölüm', exact: true })).toBeVisible()
    await fitsAtEveryWidth(page, 'canvas page')
    await zoomsFromTheMenu(page)
  } finally {
    await api(request, 'DELETE', `/sites/${htmlSite}/`)
    await api(request, 'DELETE', `/sites/${canvasSite}/`)
  }
})
