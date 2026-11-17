// A container whose blocks have phone layouts places them on a phone by
// !important rules (schemaToFiles containerPhoneCss). What the page hides
// until a click (pageShow.js) must still close up there: the runtime's own
// moves were plain inline styles, which those rules beat, and a button
// under a hidden step stayed below it, over the next part of the page.
import { test, expect } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })

const block = (id, text, layout, mobileLayout, props = {}) => ({ id, type: 'text', props: { text, ...props }, styles: {}, layout, mobileLayout })

const SCHEMA = {
  theme: {},
  pages: [{
    id: 'home', name: 'Home', mode: 'empty', mobileWidth: 390, mobileManual: true, hiddenKeys: ['k1'],
    components: [{
      id: 'box', type: 'container', props: { phoneLayout: true }, styles: { backgroundColor: '#eeeeee' },
      layout: { x: 40, y: 40, w: 600, h: 260 }, mobileLayout: { x: 16, y: 16, w: 358, h: 260 },
      children: [
        block('first', 'First step', { x: 20, y: 20, w: 500, h: 40 }, { x: 10, y: 10, w: 330, h: 40 }),
        block('second', 'Second step', { x: 20, y: 70, w: 500, h: 100 }, { x: 10, y: 60, w: 330, h: 100 }, { shownBy: ['k1'] }),
        block('next', 'Next step', { x: 20, y: 180, w: 200, h: 40 }, { x: 10, y: 170, w: 200, h: 40 }),
      ],
    }],
  }],
}

test('a step hidden until a click closes up inside a container laid out for the phone', async ({ page, browser }) => {
  await page.goto('/')
  const html = await page.evaluate(async (schema) => {
    const { schemaToSingleHtml } = await import('/src/utils/schemaToFiles.js')
    return schemaToSingleHtml(schema, 'Steps')
  }, SCHEMA)

  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: { cookies: [], origins: [] } })
  const view = await phone.newPage()
  await view.setContent(html, { waitUntil: 'load' })
  await expect(view.getByText('Second step', { exact: true })).toBeHidden()
  // The blocks' boxes (each block's id is its anchor on the page).
  const first = await view.locator('#first').boundingBox()
  const next = await view.locator('#next').boundingBox()
  // 110 px under the first step's bottom with the second step shown; with
  // it hidden, the 10 px gap the design has between blocks.
  expect(Math.round(next.y - (first.y + first.height))).toBe(10)
  // And the box gives up the hidden step's 110 px: 260 tall as designed.
  const box = await view.locator('#box').boundingBox()
  expect(Math.round(box.height)).toBe(150)
  // Its drawing too, refitted to the shorter height: fitted to the desktop's
  // design height instead, it stayed 260 tall and painted 110 px past the box.
  const drawing = await view.locator('#box [data-pwb-container-root]').boundingBox()
  expect(Math.round(drawing.height)).toBe(150)
  await phone.close()
})

// Found in ChatGPT's review (2026-11-17): an embed in such a container kept
// its desktop frame height on the phone, inside a taller phone box, and the
// rest of what it shows was cut off.
test('an embed in a container laid out for the phone takes its phone box\'s height', async ({ page, browser }) => {
  await page.goto('/')
  const schema = structuredClone(SCHEMA)
  schema.pages[0].hiddenKeys = []
  schema.pages[0].components[0].mobileLayout.h = 280
  schema.pages[0].components[0].children = [{
    id: 'embed', type: 'html', styles: {},
    // Two columns of 60 px cells on the desktop, one column on the phone.
    props: { code: '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));font:20px/30px sans-serif"><div style="height:60px">First</div><div style="height:60px">Second</div><div style="height:60px">Third</div><div style="height:60px">Last</div></div>' },
    layout: { x: 20, y: 20, w: 500, h: 120 }, mobileLayout: { x: 10, y: 10, w: 330, h: 240 },
  }]
  const html = await page.evaluate(async (s) => {
    const { schemaToSingleHtml } = await import('/src/utils/schemaToFiles.js')
    return schemaToSingleHtml(s, 'Embed')
  }, schema)

  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: { cookies: [], origins: [] } })
  const view = await phone.newPage()
  await view.setContent(html, { waitUntil: 'load' })
  const frame = view.locator('#embed > iframe')
  await expect(frame).toHaveCount(1)
  expect(Math.round((await frame.boundingBox()).height)).toBe(240)
  await phone.close()
})

// Found in the same review: on a page laid out in flow the editor draws a
// container from its desktop design, scaled; the published page drew it at
// its phone design, with its blocks still at their desktop places.
test('a container on a page laid out in flow is published from its desktop design on the phone, as the editor draws it', async ({ page, browser }) => {
  await page.goto('/')
  const html = await page.evaluate(async (s) => {
    const { schemaToSingleHtml } = await import('/src/utils/schemaToFiles.js')
    const { useEditorStore } = await import('/src/store/editorStore.js')
    useEditorStore.getState().loadSchema(s)
    useEditorStore.getState().enableFlowMode()
    return schemaToSingleHtml(useEditorStore.getState().schema, 'Flow')
  }, SCHEMA)

  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: { cookies: [], origins: [] } })
  const view = await phone.newPage()
  await view.setContent(html, { waitUntil: 'load' })
  const root = view.locator('[data-pwb-container-root]').first()
  // The box's desktop design: 600 wide (its own width; its blocks reach 520).
  expect(await root.evaluate((el) => el.style.width)).toBe('600px')
  expect(await root.evaluate((el) => el.style.transform)).toMatch(/^scale\(0\.\d+\)$/)
  await phone.close()
})
