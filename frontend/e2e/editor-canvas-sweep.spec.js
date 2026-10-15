// Canvas workflows beyond a single add/delete: real pointer gestures, the
// inspector, selection tools, independent phone edits and page-scoped themes.
import { test, expect, api, openEditor, save } from './support.js'

const properties = (page) => page.locator('[data-tour="properties"]')
const blocks = (page) => page.locator('main [data-cid]')
const block = (page, id) => page.locator(`main [data-cid="${id}"]`)
const heading = (id, x, y, extra = {}) => ({
  id, type: 'heading', props: { text: id },
  styles: { color: '#172554', fontSize: '32px', fontWeight: 'bold' },
  layout: { x, y, w: 180, h: 60 },
  mobileLayout: { x: 20, y, w: 240, h: 60 },
  ...extra,
})

async function createCanvas(request, components, extraPages = []) {
  const { status, data: site } = await api(request, 'POST', '/sites/', { title: 'E2E canvas sweep' })
  expect(status).toBe(201)
  const { data: full } = await api(request, 'GET', `/sites/${site.id}/`)
  const home = {
    ...full.schema.pages[0], name: 'Home', mode: 'empty',
    canvasWidth: 1000, mobileWidth: 390, mobileManual: true, components,
  }
  const { status: patched } = await api(request, 'PATCH', `/sites/${site.id}/`, {
    schema: { ...full.schema, pages: [home, ...extraPages.map((page) => ({ ...home, ...page }))] },
  })
  expect(patched).toBe(200)
  return { siteId: site.id, homeId: home.id }
}

async function edit(page, siteId) {
  await openEditor(page, siteId)
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await expect(page.locator('#free-canvas')).toBeVisible()
}

async function box(page, id) {
  return block(page, id).evaluate((element) => ({
    x: parseFloat(element.style.left), y: parseFloat(element.style.top),
    w: parseFloat(element.style.width), h: parseFloat(element.style.height),
  }))
}

async function select(page, ids) {
  for (const [index, id] of ids.entries()) {
    await block(page, id).click({ position: { x: 12, y: 12 }, modifiers: index ? ['Shift'] : [] })
  }
}

async function gesture(page, locator, dx, dy) {
  const rect = await locator.boundingBox()
  expect(rect).not.toBeNull()
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2)
  await page.mouse.down()
  await page.mouse.move(rect.x + rect.width / 2 + dx, rect.y + rect.height / 2 + dy, { steps: 8 })
  await page.mouse.up()
}

async function expand(page, name) {
  const button = properties(page).getByRole('button', { name, exact: true })
  if (await button.getAttribute('aria-expanded') === 'false') await button.click()
}

async function switchPage(page, name) {
  await page.getByRole('tab', { name: 'Files', exact: true }).first().click()
  await page.locator(`button[title="Open ${name}"]`).click()
}

test('inspector edits and pointer move/resize at an explicit zoom survive undo, redo and reload', async ({ page, request }) => {
  const { siteId } = await createCanvas(request, [heading('hero', 80, 100)])
  try {
    await edit(page, siteId)
    await select(page, ['hero'])
    await properties(page).getByRole('tab', { name: 'Content', exact: true }).click()
    await properties(page).getByRole('textbox', { name: 'Text', exact: true }).fill('Canvas edit — Türkçe ğüşi')
    await expect(block(page, 'hero')).toContainText('Canvas edit — Türkçe ğüşi')

    await properties(page).getByRole('tab', { name: 'Design', exact: true }).click()
    await properties(page).getByRole('textbox', { name: 'Text color', exact: true }).fill('#be123c')
    await expect(block(page, 'hero').locator('h1, h2, h3').first()).toHaveCSS('color', 'rgb(190, 18, 60)')

    await properties(page).getByRole('tab', { name: 'Layout', exact: true }).click()
    await properties(page).getByLabel('Width', { exact: true }).fill('280')
    await properties(page).getByLabel('Height', { exact: true }).fill('90')
    await expect.poll(() => box(page, 'hero')).toEqual({ x: 80, y: 100, w: 280, h: 90 })

    await page.getByRole('button', { name: 'Zoom the canvas out', exact: true }).click()
    const scale = await page.locator('#free-canvas').evaluate((element) => element.getBoundingClientRect().width / 1000)
    const beforeMove = await box(page, 'hero')
    // The block centre is content, away from all resize affordances.
    await gesture(page, block(page, 'hero'), 137 * scale, 63 * scale)
    // Its right edge lands close enough to the artboard centre to snap at 500.
    await expect.poll(() => box(page, 'hero')).toEqual({ ...beforeMove, x: 220, y: 163 })
    const moved = await box(page, 'hero')
    await gesture(page, block(page, 'hero').locator('[data-resize-handle="se"]'), 80 * scale, 40 * scale)
    await expect.poll(() => box(page, 'hero')).toEqual({ ...moved, w: 360, h: 130 })
    await page.keyboard.press('Control+z')
    await expect.poll(() => box(page, 'hero')).toEqual(moved)
    await page.keyboard.press('Control+Shift+z')
    await expect.poll(() => box(page, 'hero')).toEqual({ ...moved, w: 360, h: 130 })
    await save(page)
    await page.reload()
    await expect(block(page, 'hero')).toContainText('Canvas edit — Türkçe ğüşi')
    await expect.poll(() => box(page, 'hero')).toEqual({ ...moved, w: 360, h: 130 })
    const { data: saved } = await api(request, 'GET', `/sites/${siteId}/`)
    expect(saved.schema.pages[0].components[0].styles.color).toBe('#be123c')
  } finally { await api(request, 'DELETE', `/sites/${siteId}/`) }
})

test('three blocks align, distribute, drag together and support repeated copy, cut, undo and redo', async ({ page, request }) => {
  const { siteId } = await createCanvas(request, [heading('alpha', 70, 90), heading('beta', 350, 200), heading('gamma', 700, 300)])
  try {
    await edit(page, siteId)
    await select(page, ['alpha', 'beta', 'gamma'])
    await page.getByRole('button', { name: 'Align top', exact: true }).click()
    await page.getByRole('button', { name: 'Distribute horizontally', exact: true }).click()
    await expect.poll(async () => Promise.all(['alpha', 'beta', 'gamma'].map((id) => box(page, id)))).toEqual([
      { x: 70, y: 90, w: 180, h: 60 }, { x: 385, y: 90, w: 180, h: 60 }, { x: 700, y: 90, w: 180, h: 60 },
    ])
    const scale = await page.locator('#free-canvas').evaluate((element) => element.getBoundingClientRect().width / 1000)
    await gesture(page, block(page, 'alpha'), 37 * scale, 43 * scale)
    await expect.poll(async () => (await Promise.all(['alpha', 'beta', 'gamma'].map((id) => box(page, id)))).map(({ x, y }) => [x, y]))
      .toEqual([[107, 133], [422, 133], [737, 133]])

    await page.keyboard.press('Control+c')
    await page.keyboard.press('Control+v')
    await expect(blocks(page)).toHaveCount(6)
    await page.keyboard.press('Control+v')
    await expect(blocks(page)).toHaveCount(9)
    await save(page)
    const { data: saved } = await api(request, 'GET', `/sites/${siteId}/`)
    const copies = saved.schema.pages[0].components.slice(3)
    expect(copies.map((component) => [component.layout.x, component.layout.y])).toEqual([
      [131, 157], [446, 157], [761, 157], [155, 181], [470, 181], [785, 181],
    ])
    expect(new Set(saved.schema.pages[0].components.map((component) => component.id)).size).toBe(9)

    await page.keyboard.press('Control+x')
    await expect(blocks(page)).toHaveCount(6)
    await page.keyboard.press('Control+z')
    await expect(blocks(page)).toHaveCount(9)
    await page.keyboard.press('Control+y')
    await expect(blocks(page)).toHaveCount(6)
    await page.keyboard.press('Control+v')
    await expect(blocks(page)).toHaveCount(9)
  } finally { await api(request, 'DELETE', `/sites/${siteId}/`) }
})

test('phone styles, geometry and duplication stay independent of the desktop design', async ({ page, request }) => {
  const original = heading('responsive', 80, 100)
  const { siteId } = await createCanvas(request, [original])
  try {
    await edit(page, siteId)
    await page.locator('[data-tour="devices"]').getByRole('button', { name: 'Mobile', exact: true }).click()
    await select(page, ['responsive'])
    await properties(page).getByRole('tab', { name: 'Design', exact: true }).click()
    await properties(page).getByRole('textbox', { name: 'Text color', exact: true }).fill('#15803d')
    await properties(page).getByRole('tab', { name: 'Layout', exact: true }).click()
    await properties(page).getByLabel('Width', { exact: true }).fill('250')
    await properties(page).getByLabel('X', { exact: true }).fill('35')
    await properties(page).getByLabel('Y', { exact: true }).fill('140')
    await expect.poll(() => box(page, 'responsive')).toEqual({ x: 35, y: 140, w: 250, h: 60 })
    // Do not leave keyboard focus in a field: Ctrl+D there belongs to typing.
    await select(page, ['responsive'])
    await page.keyboard.press('Control+d')
    await expect(blocks(page)).toHaveCount(2)
    const copyId = await blocks(page).last().getAttribute('data-cid')
    await expect.poll(() => box(page, copyId)).toEqual({ x: 59, y: 164, w: 250, h: 60 })
    await page.keyboard.press('Control+z')
    await expect(blocks(page)).toHaveCount(1)
    await page.keyboard.press('Control+y')
    await expect.poll(() => box(page, copyId)).toEqual({ x: 59, y: 164, w: 250, h: 60 })

    await page.locator('[data-tour="devices"]').getByRole('button', { name: 'PC', exact: true }).click()
    await expect.poll(() => box(page, 'responsive')).toEqual(original.layout)
    await expect(block(page, 'responsive').locator('h1, h2, h3').first()).toHaveCSS('color', 'rgb(23, 37, 84)')
    await save(page)
    await page.reload()
    await page.locator('[data-tour="devices"]').getByRole('button', { name: 'Mobile', exact: true }).click()
    await expect.poll(() => box(page, 'responsive')).toEqual({ x: 35, y: 140, w: 250, h: 60 })
    await expect(block(page, 'responsive').locator('h1, h2, h3').first()).toHaveCSS('color', 'rgb(21, 128, 61)')
    await select(page, ['responsive'])
    await expand(page, 'Responsive')
    await properties(page).getByRole('checkbox', { name: 'Show on Mobile', exact: true }).uncheck()
    await expect(block(page, 'responsive')).toContainText('Hidden on mobile')
    await expect(block(page, 'responsive')).toHaveCSS('opacity', '0.35')
    await page.locator('[data-tour="devices"]').getByRole('button', { name: 'PC', exact: true }).click()
    await expect(block(page, 'responsive')).toHaveCSS('opacity', '1')
    await save(page)
    const { data: saved } = await api(request, 'GET', `/sites/${siteId}/`)
    expect(saved.schema.pages[0].components.find((component) => component.id === 'responsive'))
      .toMatchObject({ hidden: false, hiddenMobile: true, stylesMobile: { color: '#15803d' } })
  } finally { await api(request, 'DELETE', `/sites/${siteId}/`) }
})

test('duplicating and repeatedly pasting at the right edge stays on both canvases after reload', async ({ page, request }) => {
  const { siteId } = await createCanvas(request, [heading('edge', 820, 100, {
    mobileLayout: { x: 150, y: 100, w: 240, h: 60 },
  })])
  try {
    await edit(page, siteId)
    await select(page, ['edge'])
    await page.keyboard.press('Control+d')
    await page.keyboard.press('Control+c')
    await page.keyboard.press('Control+v')
    await page.keyboard.press('Control+v')
    await expect(blocks(page)).toHaveCount(4)
    const ids = await blocks(page).evaluateAll((elements) => elements.map((element) => element.getAttribute('data-cid')))
    const pcBoxes = await Promise.all(ids.map((id) => box(page, id)))
    expect(pcBoxes.map(({ x, y }) => [x, y])).toEqual([[820, 100], [820, 124], [820, 148], [820, 172]])
    await save(page)
    await page.reload()
    await expect.poll(async () => Promise.all(ids.map((id) => box(page, id)))).toEqual(pcBoxes)
    await page.locator('[data-tour="devices"]').getByRole('button', { name: 'Mobile', exact: true }).click()
    await expect.poll(async () => (await Promise.all(ids.map((id) => box(page, id)))).map(({ x, y }) => [x, y]))
      .toEqual([[150, 100], [150, 124], [150, 148], [150, 172]])
  } finally { await api(request, 'DELETE', `/sites/${siteId}/`) }
})

test('nested blocks duplicate and change layer inside their container; parent deletion undoes as a whole', async ({ page, request }) => {
  const container = {
    id: 'container', type: 'container', props: {}, styles: { backgroundColor: '#e2e8f0', padding: '20px' },
    layout: { x: 60, y: 80, w: 650, h: 300 }, mobileLayout: { x: 10, y: 60, w: 370, h: 300 },
    children: [heading('inner_first', 50, 40), heading('inner_second', 300, 140)],
  }
  const { siteId } = await createCanvas(request, [container, heading('outside', 100, 450)])
  try {
    await edit(page, siteId)
    await select(page, ['inner_first'])
    const arrange = page.getByRole('toolbar', { name: 'Arrange', exact: true })
    await arrange.getByRole('button', { name: 'Forward', exact: true }).click()
    await arrange.getByRole('button', { name: 'Duplicate', exact: true }).click()
    await expect(blocks(page)).toHaveCount(5)
    await save(page)
    const { data: saved } = await api(request, 'GET', `/sites/${siteId}/`)
    const children = saved.schema.pages[0].components.find((component) => component.id === 'container').children
    expect(children.map((component) => component.id).slice(0, 2)).toEqual(['inner_second', 'inner_first'])
    expect(children[2].id).not.toBe('inner_first')
    expect(children[2].props.text).toBe('inner_first')
    expect(saved.schema.pages[0].components).toHaveLength(2)

    await arrange.getByRole('button', { name: 'Select parent', exact: true }).click()
    await expect(properties(page).getByRole('heading', { name: 'Container', exact: true })).toBeVisible()
    await expect(arrange.getByRole('button', { name: 'Select parent', exact: true })).toBeDisabled()
    await arrange.getByRole('button', { name: 'Delete component', exact: true }).click()
    await expect(blocks(page)).toHaveCount(1)
    await page.keyboard.press('Control+z')
    await expect(blocks(page)).toHaveCount(5)
    await expect(block(page, 'inner_first')).toContainText('inner_first')
    await expect(block(page, 'inner_second')).toContainText('inner_second')
  } finally { await api(request, 'DELETE', `/sites/${siteId}/`) }
})

test('page settings, a local theme and copying to another page retain their scope', async ({ page, request }) => {
  const { siteId, homeId } = await createCanvas(request, [heading('home_heading', 80, 100)], [
    { id: 'about_page', name: 'About', components: [heading('about_heading', 100, 100)] },
  ])
  try {
    await edit(page, siteId)
    await page.keyboard.press('Escape')
    await properties(page).getByRole('tab', { name: 'Page', exact: true }).click()
    await properties(page).getByRole('textbox', { name: 'Page background (PC)', exact: true }).fill('#fef3c7')
    await properties(page).getByRole('textbox', { name: 'Page background (Mobile)', exact: true }).fill('#dcfce7')
    await properties(page).getByRole('combobox', { name: 'Page language', exact: true }).selectOption('tr')
    await properties(page).getByRole('combobox', { name: 'Text direction', exact: true }).selectOption('ltr')
    await properties(page).getByLabel('Search title', { exact: true }).fill('Canvas Home title')
    await properties(page).getByRole('textbox', { name: 'Search description', exact: true }).fill('Home description')
    await expect(page.locator('#free-canvas')).toHaveCSS('background-color', 'rgb(254, 243, 199)')
    await page.locator('[data-tour="devices"]').getByRole('button', { name: 'Mobile', exact: true }).click()
    await expect(page.locator('#free-canvas')).toHaveCSS('background-color', 'rgb(220, 252, 231)')
    await page.locator('[data-tour="devices"]').getByRole('button', { name: 'PC', exact: true }).click()

    await select(page, ['home_heading'])
    await properties(page).getByRole('button', { name: 'More actions', exact: true }).click()
    await properties(page).locator('select[title="Copy this component onto another page"]').selectOption('about_page')
    await expect(blocks(page)).toHaveCount(1)
    await switchPage(page, 'About')
    await expect(blocks(page)).toHaveCount(2)
    await page.keyboard.press('Escape')
    await properties(page).getByRole('tab', { name: 'Theme', exact: true }).click()
    await properties(page).getByRole('radio', { name: 'This page', exact: true }).click()
    await properties(page).getByRole('button', { name: /Noir Gold/ }).click()
    await save(page)

    const { data: saved } = await api(request, 'GET', `/sites/${siteId}/`)
    const home = saved.schema.pages.find((item) => item.id === homeId)
    const about = saved.schema.pages.find((item) => item.id === 'about_page')
    expect(home).toMatchObject({ background: '#fef3c7', backgroundMobile: '#dcfce7', language: 'tr', direction: 'ltr', seoTitle: 'Canvas Home title', seoDescription: 'Home description' })
    expect(home.theme).toBeUndefined()
    expect(about.theme).toBeTruthy()
    expect(about.components).toHaveLength(2)
    expect(about.components[1].id).not.toBe('home_heading')
    expect(about.components[1].props.text).toBe('home_heading')
    await switchPage(page, 'Home')
    await expect(page.locator('#free-canvas')).toHaveCSS('background-color', 'rgb(254, 243, 199)')
    await expect(block(page, 'home_heading').locator('h1, h2, h3').first()).toHaveCSS('color', 'rgb(23, 37, 84)')
  } finally { await api(request, 'DELETE', `/sites/${siteId}/`) }
})
