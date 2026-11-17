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
  await phone.close()
})
