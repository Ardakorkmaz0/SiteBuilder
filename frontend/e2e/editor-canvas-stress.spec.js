// Mixed coordinate spaces, clipboard ownership and history across pages and
// devices. Existing blocks stay in their parent when dragged to its boundary.
import { test, expect, api, openEditor, save } from './support.js'

const properties = (page) => page.locator('[data-tour="properties"]')
const blocks = (page) => page.locator('main [data-cid]')
const block = (page, id) => page.locator(`main [data-cid="${id}"]`)
const arrange = (page) => page.getByRole('toolbar', { name: 'Arrange', exact: true })
const heading = (id, x, y) => ({
  id, type: 'heading', props: { text: id }, styles: { color: '#172554', fontSize: '30px' },
  layout: { x, y, w: 180, h: 60 }, mobileLayout: { x: 20, y, w: 240, h: 60 },
})

async function createFixture(request) {
  const { status, data: site } = await api(request, 'POST', '/sites/', { title: 'E2E canvas stress' })
  expect(status).toBe(201)
  const { data: full } = await api(request, 'GET', `/sites/${site.id}/`)
  const container = {
    id: 'container', type: 'container', props: {}, styles: { backgroundColor: '#e2e8f0', padding: '0px' },
    layout: { x: 40, y: 60, w: 620, h: 300 }, mobileLayout: { x: 10, y: 60, w: 370, h: 300 },
    children: [heading('inner', 40, 50)],
  }
  const outside = heading('outside', 100, 450)
  outside.props.anchor = 'portable'
  const source = {
    ...full.schema.pages[0], name: 'Source', mode: 'empty', canvasWidth: 1000, mobileWidth: 390,
    mobileManual: true, components: [container, outside],
  }
  const target = { ...source, id: 'target', name: 'Target', canvasWidth: 500, mobileWidth: 320, components: [] }
  const response = await api(request, 'PATCH', `/sites/${site.id}/`, { schema: { ...full.schema, pages: [source, target] } })
  expect(response.status).toBe(200)
  return { siteId: site.id, sourceId: source.id }
}

async function edit(page, siteId) {
  await openEditor(page, siteId)
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await expect(page.locator('#free-canvas')).toBeVisible()
}

async function pick(page, id, shift = false) {
  await block(page, id).click({ position: { x: 12, y: 12 }, modifiers: shift ? ['Shift'] : [] })
}

async function switchPage(page, name) {
  await page.getByRole('tab', { name: 'Files', exact: true }).first().click()
  await page.locator(`button[title="Open ${name}"]`).click()
}

async function device(page, name) {
  await page.locator('[data-tour="devices"]').getByRole('button', { name, exact: true }).click()
}

async function box(page, id) {
  return block(page, id).evaluate((element) => ({
    x: parseFloat(element.style.left), y: parseFloat(element.style.top),
    w: parseFloat(element.style.width), h: parseFloat(element.style.height),
  }))
}

test('cutting a mixed nested/page selection keeps the uncopied child and undo restores the cut', async ({ page, request }) => {
  const { siteId } = await createFixture(request)
  try {
    await edit(page, siteId)
    await pick(page, 'inner')
    await pick(page, 'outside', true)
    await page.keyboard.press('Control+x')
    await expect(block(page, 'outside')).toHaveCount(0)
    await expect(block(page, 'inner')).toContainText('inner')
    await page.keyboard.press('Control+v')
    await expect(blocks(page)).toHaveCount(3)
    await expect(block(page, 'container').locator('[data-cid]')).toHaveCount(1)
    await page.keyboard.press('Control+z')
    await expect(blocks(page)).toHaveCount(2)
    await page.keyboard.press('Control+z')
    await expect(blocks(page)).toHaveCount(3)
    await expect(block(page, 'outside')).toContainText('outside')
    await expect(block(page, 'inner')).toContainText('inner')
    await save(page)
  } finally { await api(request, 'DELETE', `/sites/${siteId}/`) }
})

test('duplicating a selected parent and child creates one subtree and leaves the original intact', async ({ page, request }) => {
  const { siteId } = await createFixture(request)
  try {
    await edit(page, siteId)
    await pick(page, 'inner')
    // The child's floating Arrange bar covers the parent's top-left corner.
    // Select the parent's empty lower-right area without touching that bar.
    const parentRect = await block(page, 'container').boundingBox()
    await block(page, 'container').click({
      modifiers: ['Shift'],
      position: { x: parentRect.width - 20, y: parentRect.height - 20 },
    })
    await expect(properties(page).getByRole('heading', { name: 'Selection', exact: true })).toBeVisible()
    await page.keyboard.press('Control+d')
    await expect(blocks(page)).toHaveCount(5)
    await expect(block(page, 'container').locator('[data-cid]')).toHaveCount(1)
    await save(page)
    const { data } = await api(request, 'GET', `/sites/${siteId}/`)
    const components = data.schema.pages[0].components
    expect(components.find((component) => component.id === 'container').children.map((component) => component.id)).toEqual(['inner'])
    const copy = components.find((component) => component.type === 'container' && component.id !== 'container')
    expect(copy.children).toHaveLength(1)
    expect(copy.children[0].id).not.toBe('inner')
    await page.keyboard.press('Control+z')
    await expect(blocks(page)).toHaveCount(3)
    await page.keyboard.press('Control+y')
    await expect(blocks(page)).toHaveCount(5)
  } finally { await api(request, 'DELETE', `/sites/${siteId}/`) }
})

test('cut and paste between pages keep anchors, nested content and both narrower layouts through history', async ({ page, request }) => {
  const { siteId, sourceId } = await createFixture(request)
  try {
    await edit(page, siteId)
    await pick(page, 'inner')
    await pick(page, 'outside', true)
    await page.keyboard.press('Control+x')
    await switchPage(page, 'Target')
    await page.keyboard.press('Control+v')
    await expect(blocks(page)).toHaveCount(1)
    await save(page)
    const { data } = await api(request, 'GET', `/sites/${siteId}/`)
    const source = data.schema.pages.find((item) => item.id === sourceId)
    const moved = data.schema.pages.find((item) => item.id === 'target').components[0]
    expect(source.components[0].children.map((component) => component.id)).toEqual(['inner'])
    expect(moved.props).toMatchObject({ text: 'outside', anchor: 'portable' })
    expect(moved.layout.x + moved.layout.w).toBeLessThanOrEqual(500)
    expect(moved.mobileLayout.x + moved.mobileLayout.w).toBeLessThanOrEqual(320)
    await page.keyboard.press('Control+z')
    await expect(blocks(page)).toHaveCount(0)
    await page.keyboard.press('Control+z')
    await expect(blocks(page)).toHaveCount(0)
    await switchPage(page, 'Source')
    await expect(blocks(page)).toHaveCount(3)
    await expect(block(page, 'outside')).toContainText('outside')
    await expect(block(page, 'inner')).toContainText('inner')
    await page.keyboard.press('Control+y')
    await expect(block(page, 'outside')).toHaveCount(0)
    await switchPage(page, 'Target')
    await page.keyboard.press('Control+y')
    await expect(blocks(page)).toHaveCount(1)
  } finally { await api(request, 'DELETE', `/sites/${siteId}/`) }
})

test('a nested child stays inside its parent after a pointer move beyond the parent bounds and one undo', async ({ page, request }) => {
  const { siteId } = await createFixture(request)
  try {
    await edit(page, siteId)
    await pick(page, 'inner')
    const original = await box(page, 'inner')
    const parent = await box(page, 'container')
    const canvasScale = await page.locator('#free-canvas').evaluate((element) => element.getBoundingClientRect().width / 1000)
    const innerScale = Number(await page.locator('[data-builder-droppable-id="container"]').getAttribute('data-builder-fit-scale'))
    const rect = await block(page, 'inner').boundingBox()
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2)
    await page.mouse.down()
    await page.mouse.move(rect.x + rect.width / 2 + 500 * canvasScale * innerScale, rect.y + rect.height / 2 + 250 * canvasScale * innerScale, { steps: 8 })
    await page.mouse.up()
    await expect.poll(() => box(page, 'inner')).toEqual({ ...original, x: 440, y: 240 })
    await expect.poll(() => box(page, 'container')).toEqual(parent)
    await expect(block(page, 'container').locator('[data-cid="inner"]')).toHaveCount(1)
    await page.keyboard.press('Control+z')
    await expect.poll(() => box(page, 'inner')).toEqual(original)
    await page.keyboard.press('Control+y')
    await expect.poll(() => box(page, 'inner')).toEqual({ ...original, x: 440, y: 240 })
  } finally { await api(request, 'DELETE', `/sites/${siteId}/`) }
})

test('hidden nested content can be recovered from the other device without losing its parent', async ({ page, request }) => {
  const { siteId } = await createFixture(request)
  try {
    await edit(page, siteId)
    await pick(page, 'inner')
    await arrange(page).getByRole('button', { name: 'Hide on Mobile', exact: true }).click()
    await device(page, 'Mobile')
    await expect(block(page, 'inner')).toContainText('Hidden on mobile')
    await page.keyboard.press('Escape')
    await expect(block(page, 'inner')).toHaveCount(0)
    await expect(block(page, 'container')).toBeVisible()
    await device(page, 'PC')
    await pick(page, 'inner')
    await arrange(page).getByRole('button', { name: 'Show on Mobile', exact: true }).click()
    await device(page, 'Mobile')
    await expect(block(page, 'inner')).toBeVisible()
    await expect(block(page, 'inner')).not.toContainText('Hidden on mobile')
    await save(page)
    const { data } = await api(request, 'GET', `/sites/${siteId}/`)
    expect(data.schema.pages[0].components[0].children[0].hiddenMobile).toBe(false)
  } finally { await api(request, 'DELETE', `/sites/${siteId}/`) }
})

test('selection survives device switches and undo separates the mobile change from the following desktop nudge', async ({ page, request }) => {
  const { siteId } = await createFixture(request)
  try {
    await edit(page, siteId)
    await pick(page, 'outside')
    await device(page, 'Mobile')
    await expect(properties(page).getByRole('heading', { name: 'Heading', exact: true })).toBeVisible()
    await properties(page).getByRole('tab', { name: 'Layout', exact: true }).click()
    await properties(page).getByRole('spinbutton', { name: 'Y', exact: true }).fill('500')
    await expect.poll(() => box(page, 'outside')).toMatchObject({ y: 500 })
    await device(page, 'PC')
    await expect(properties(page).getByRole('heading', { name: 'Heading', exact: true })).toBeVisible()
    await page.keyboard.press('ArrowRight')
    await expect.poll(() => box(page, 'outside')).toMatchObject({ x: 101, y: 450 })
    await page.keyboard.press('Control+z')
    await expect.poll(() => box(page, 'outside')).toMatchObject({ x: 100, y: 450 })
    await device(page, 'Mobile')
    await expect.poll(() => box(page, 'outside')).toMatchObject({ y: 500 })
    await page.keyboard.press('Control+z')
    await expect.poll(() => box(page, 'outside')).toMatchObject({ y: 450 })
  } finally { await api(request, 'DELETE', `/sites/${siteId}/`) }
})
