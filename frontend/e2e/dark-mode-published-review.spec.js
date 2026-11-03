// Browser review evidence against real Django publication records. The documents
// come from the app's normal writer; no navigation or media API is intercepted.
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { test, expect, api, BACKEND } from './support.js'
import { reviewSchema, reviewPublication } from './dark-mode-review-data.js'

const group = (page) => page.getByRole('radiogroup', { name: 'Color theme', exact: true })
const radio = (page, name) => group(page).getByRole('radio', { name, exact: true })
const palette = (page) => page.evaluate(() => document.documentElement.getAttribute('data-pwb-theme'))

async function publishFixture(request, owned, title, options = {}, editSchema = (schema) => schema) {
  const created = await api(request, 'POST', '/sites/', { title })
  expect(created.status).toBe(201)
  const site = created.data
  owned.push(site.id)
  const schema = editSchema(reviewSchema(title, options))
  const publication = reviewPublication(schema, title, site.slug)
  expect(publication).toHaveLength(options.mixed ? 3 : 2)
  const seeded = await api(request, 'PATCH', `/sites/${site.id}/`, {
    schema, published: true, published_pages: publication,
  })
  expect(seeded.status).toBe(200)
  expect(seeded.data.published).toBe(true)
  const loaded = await api(request, 'GET', `/sites/${site.id}/`)
  expect(loaded.status).toBe(200)
  expect(loaded.data.schema.pages.map((page) => page.id)).toEqual(options.mixed ? ['home', 'about', 'document'] : ['home', 'about'])
  return site
}

async function snapshot(page) {
  return page.evaluate(() => ({
    url: location.href,
    palette: document.documentElement.getAttribute('data-pwb-theme'),
    pick: document.documentElement.getAttribute('data-pwb-theme-pick'),
    followsDevice: document.documentElement.hasAttribute('data-pwb-theme-follow'),
    nativeDark: matchMedia('(prefers-color-scheme: dark)').matches,
    radios: [...document.querySelectorAll('[role="radio"]')].map((element) => ({
      name: element.getAttribute('aria-label') || element.textContent.trim(),
      checked: element.getAttribute('aria-checked'),
      tabIndex: element.tabIndex,
    })),
  }))
}

async function record(history, page, step) {
  history.push({ step, ...(await snapshot(page)) })
}

async function settleMediaNotification(page) {
  // An unchanged explicit choice must be checked after the native media event
  // could reach the runtime, rather than racing that event with an assertion.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}

async function attachEvidence(testInfo, browserName, history, contexts, namedPages) {
  const pages = []
  for (const { page, name } of namedPages) {
    if (page.isClosed()) continue
    try {
      const path = testInfo.outputPath(`${name}.png`)
      await page.screenshot({ path, fullPage: false })
      await testInfo.attach(`${name}.png`, { path, contentType: 'image/png' })
      pages.push({ name, ...(await snapshot(page)) })
    } catch (error) {
      pages.push({ name, captureError: String(error) })
    }
  }
  const cookies = []
  for (const [index, context] of contexts.entries()) {
    try {
      cookies.push({ index, paletteCookies: (await context.cookies()).filter((cookie) => cookie.name === 'pwb-theme') })
    } catch (error) {
      cookies.push({ index, captureError: String(error) })
    }
  }
  const path = testInfo.outputPath('published-review-evidence.json')
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify({ browserName, history, pages, contexts: cookies }, null, 2))
  await testInfo.attach('published-review-evidence.json', { path, contentType: 'application/json' })
}

async function cleanUp(request, contexts, owned) {
  for (const context of contexts) await context.close()
  for (const id of owned) {
    const deleted = await api(request, 'DELETE', `/sites/${id}/`)
    expect(deleted.status).toBe(204)
  }
}

test('review: the three-way published group has one keyboard stop and follows only an explicit device choice', async ({ request, browser, browserName }, testInfo) => {
  const owned = [], contexts = [], namedPages = [], history = []
  try {
    const site = await publishFixture(request, owned, 'Review keyboard and device')
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] }, colorScheme: 'light' })
    contexts.push(context)
    const page = await context.newPage()
    namedPages.push({ page, name: 'three-way-switch' })
    const response = await page.goto(`${BACKEND}/s/${site.slug}/`)
    expect(response.status()).toBe(200)
    await expect(radio(page, 'Light')).toHaveAttribute('aria-checked', 'true')
    await radio(page, 'Light').focus()
    await page.keyboard.press('ArrowRight')
    await expect(radio(page, 'Dark')).toBeFocused()
    await expect(radio(page, 'Dark')).toHaveAttribute('aria-checked', 'true')
    expect(await group(page).getByRole('radio').evaluateAll((elements) => elements.filter((element) => element.tabIndex === 0).length)).toBe(1)
    await page.keyboard.press('Tab')
    expect(await group(page).evaluate((element) => element.contains(document.activeElement))).toBe(false)
    await page.keyboard.press('Shift+Tab')
    await expect(radio(page, 'Dark')).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect(radio(page, 'Device')).toBeFocused()
    await expect(radio(page, 'Device')).toHaveAttribute('aria-checked', 'true')
    await record(history, page, 'keyboard selected Device')

    await page.emulateMedia({ colorScheme: 'dark' })
    await expect.poll(() => palette(page)).toBe('dark')
    await record(history, page, 'Device follows dark while open')
    await page.emulateMedia({ colorScheme: 'light' })
    await expect.poll(() => palette(page)).toBe('light')
    await record(history, page, 'Device follows light while open')

    await radio(page, 'Light').click()
    await page.emulateMedia({ colorScheme: 'dark' })
    await settleMediaNotification(page)
    expect(await palette(page)).toBe('light')
    await expect(radio(page, 'Light')).toHaveAttribute('aria-checked', 'true')
    await record(history, page, 'explicit Light survives native dark')
    await radio(page, 'Dark').click()
    await page.emulateMedia({ colorScheme: 'light' })
    await settleMediaNotification(page)
    expect(await palette(page)).toBe('dark')
    await expect(radio(page, 'Dark')).toHaveAttribute('aria-checked', 'true')
    await record(history, page, 'explicit Dark survives native light')

    await radio(page, 'Device').click()
    await page.reload()
    await expect(radio(page, 'Device')).toHaveAttribute('aria-checked', 'true')
    const again = await context.newPage()
    namedPages.push({ page: again, name: 'device-second-visit' })
    const second = await again.goto(`${BACKEND}/s/${site.slug}/`)
    expect(second.status()).toBe(200)
    await expect(radio(again, 'Device')).toHaveAttribute('aria-checked', 'true')
    expect(new URL(again.url()).search).toBe('')
    await record(history, again, 'new tab remembers system at plain URL')
    await again.emulateMedia({ colorScheme: 'dark' })
    await expect.poll(() => palette(again)).toBe('dark')
    await record(history, again, 'remembered Device follows a later native dark change')
    const remembered = (await context.cookies()).find((cookie) => cookie.name === 'pwb-theme' && cookie.path === `/s/${site.slug}/`)
    expect(remembered?.value).toBe('system')
  } finally {
    try { await attachEvidence(testInfo, browserName, history, contexts, namedPages) }
    finally { await cleanUp(request, contexts, owned) }
  }
})

test('review: published choices survive middle-click and later visits without reaching another site or visitor', async ({ request, browser, browserName }, testInfo) => {
  const owned = [], contexts = [], namedPages = [], history = []
  try {
    const destination = await publishFixture(request, owned, 'Review destination B')
    const source = await publishFixture(request, owned, 'Review source A', { otherSlug: destination.slug })
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] }, colorScheme: 'light' })
    contexts.push(context)
    const page = await context.newPage()
    namedPages.push({ page, name: 'site-navigation' })
    expect((await page.goto(`${BACKEND}/s/${destination.slug}/`)).status()).toBe(200)
    await radio(page, 'Light').click()
    await page.reload()
    await expect(radio(page, 'Light')).toHaveAttribute('aria-checked', 'true')
    expect((await context.cookies()).find((cookie) => cookie.path === `/s/${destination.slug}/` && cookie.name === 'pwb-theme')?.value).toBe('light')

    expect((await page.goto(`${BACKEND}/s/${source.slug}/`)).status()).toBe(200)
    await radio(page, 'Dark').click()
    await record(history, page, 'A selected dark before any cookie-writing navigation')
    const opened = context.waitForEvent('page')
    await page.getByRole('link', { name: 'About', exact: true }).click({ button: 'middle' })
    const middleTab = await opened
    namedPages.push({ page: middleTab, name: 'middle-click-new-tab' })
    await expect(middleTab).toHaveURL(`${BACKEND}/s/${source.slug}/about/?pwb-theme=dark`)
    await expect(middleTab.getByRole('heading', { name: 'Review source A about', exact: true })).toBeVisible()
    await expect(radio(middleTab, 'Dark')).toHaveAttribute('aria-checked', 'true')
    expect(await palette(middleTab)).toBe('dark')
    await record(history, middleTab, 'middle click carries dark to A about')

    await page.getByRole('link', { name: 'About', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Review source A about', exact: true })).toBeVisible()
    expect(await palette(page)).toBe('dark')
    await record(history, page, 'ordinary navigation carries dark to A about')
    const again = await context.newPage()
    namedPages.push({ page: again, name: 'site-second-visit' })
    expect((await again.goto(`${BACKEND}/s/${source.slug}/`)).status()).toBe(200)
    expect(new URL(again.url()).search).toBe('')
    await expect(radio(again, 'Dark')).toHaveAttribute('aria-checked', 'true')
    await record(history, again, 'second visit at plain A address keeps dark')
    await again.getByRole('link', { name: 'Other site', exact: true }).click()
    await expect(again.getByRole('heading', { name: 'Review destination B home', exact: true })).toBeVisible()
    expect(new URL(again.url()).search).toBe('')
    await expect(radio(again, 'Light')).toHaveAttribute('aria-checked', 'true')
    expect(await palette(again)).toBe('light')
    expect((await context.cookies()).find((cookie) => cookie.path === `/s/${destination.slug}/` && cookie.name === 'pwb-theme')?.value).toBe('light')
    await record(history, again, 'A link does not replace B light cookie')

    const otherContext = await browser.newContext({ storageState: { cookies: [], origins: [] }, colorScheme: 'light' })
    contexts.push(otherContext)
    const other = await otherContext.newPage()
    namedPages.push({ page: other, name: 'separate-visitor' })
    expect((await other.goto(`${BACKEND}/s/${source.slug}/`)).status()).toBe(200)
    await expect(radio(other, 'Light')).toHaveAttribute('aria-checked', 'true')
    expect(await palette(other)).toBe('light')
    expect((await otherContext.cookies()).filter((cookie) => cookie.name === 'pwb-theme')).toEqual([])
    await record(history, other, 'new visitor does not inherit A dark choice')
  } finally {
    try { await attachEvidence(testInfo, browserName, history, contexts, namedPages) }
    finally { await cleanUp(request, contexts, owned) }
  }
})

test('review: a real published HTML block corner shows the dark page through its frame', async ({ request, browser, browserName }, testInfo) => {
  const owned = [], contexts = [], namedPages = [], history = []
  try {
    const site = await publishFixture(request, owned, 'Review dark HTML frame', {}, (schema) => ({
      ...schema,
      colorMode: { start: 'dark', theme: { backgroundColor: '#111317' } },
      pages: schema.pages.map((page, index) => index ? page : {
        ...page,
        components: [...page.components, {
          id: 'review-html-block', type: 'html', props: { code: '<p>In a block</p>' }, styles: {}, layout: { x: 40, y: 360, w: 400, h: 160 },
        }],
      }),
    }))
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] }, colorScheme: 'light' })
    contexts.push(context)
    const page = await context.newPage()
    namedPages.push({ page, name: 'dark-html-block-page' })
    expect((await page.goto(`${BACKEND}/s/${site.slug}/`)).status()).toBe(200)
    expect(await palette(page)).toBe('dark')
    // This generated iframe has no accessible name; assert uniqueness before
    // selecting its visible corner, and verify its real content has loaded.
    const frame = page.locator('iframe')
    await expect(frame).toHaveCount(1)
    await expect(frame).toBeVisible()
    await expect(page.frameLocator('iframe').getByText('In a block', { exact: true })).toBeVisible()
    const box = await frame.boundingBox()
    expect(box).not.toBeNull()
    const cornerPath = testInfo.outputPath('html-block-corner.png')
    const shot = await page.screenshot({ path: cornerPath, clip: { x: box.x + box.width - 12, y: box.y + box.height - 12, width: 4, height: 4 } })
    await testInfo.attach('html-block-corner.png', { path: cornerPath, contentType: 'image/png' })
    const reader = await context.newPage()
    const pixel = await reader.evaluate(async (png) => {
      const image = new Image()
      image.src = `data:image/png;base64,${png}`
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const drawing = canvas.getContext('2d')
      drawing.drawImage(image, 0, 0)
      return [...drawing.getImageData(1, 1, 1, 1).data]
    }, shot.toString('base64'))
    await reader.close()
    history.push({ step: 'actual frame corner pixel', rgba: pixel, box })
    await record(history, page, 'dark HTML frame after its text loaded')
    expect(pixel).toEqual([17, 19, 23, 255])
  } finally {
    try { await attachEvidence(testInfo, browserName, history, contexts, namedPages) }
    finally { await cleanUp(request, contexts, owned) }
  }
})
