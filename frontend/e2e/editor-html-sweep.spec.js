import { test, expect, api, createHtmlSite, openEditor, inFrame, save, savedHtml } from './support.js'

// Small imported page, deliberately including the things which differ from a
// native canvas: imported !important rules, real navigation, a script-driven
// disclosure, and a form. All accounts and documents belong to these tests.
const PAGE = `<!DOCTYPE html><html><head><title>HTML sweep</title><style>
body{font-family:system-ui;margin:0;padding:16px;color:#111827}
header,section{padding:16px;margin:8px 0;border:1px solid #ddd}
h1{font-size:40px!important;font-weight:400!important;text-align:left!important;color:#111827!important}
nav{display:flex!important;justify-content:flex-start!important;align-items:flex-start!important;gap:16px}
nav a{display:inline-block;padding:8px}p{margin:8px 0}img{display:block}
</style></head><body>
<header><h1 id="heading">Sweep heading</h1><nav id="menu"><a id="nav-home" href="#top">Home</a><a id="nav-contact" href="#contact">Contact</a></nav></header>
<section id="intro"><h2>Introduction</h2><p id="paragraph">Original paragraph</p><p id="second-paragraph">Second paragraph</p></section>
<section id="contact"><h2 id="contact-heading">Contact section</h2><button id="toggle" onclick="document.getElementById('details').hidden=false">Show details</button><div id="details" hidden><p id="details-text">Hidden details</p></div><form id="form" onsubmit="event.preventDefault();document.getElementById('result').textContent='Submitted'" ><label>Name <input name="name" required></label><button type="submit">Send form</button><output id="result"></output></form></section>
</body></html>`

const properties = (page) => page.locator('[data-tour="properties"]')
const field = (root, label) => root.locator('label').filter({ has: root.page().locator('span', { hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }) }).locator('input,textarea,select').first()
const siteFrame = (page) => page.frameLocator('main iframe[title="site"]')
const undo = (page) => page.locator('header button[title="Undo (Ctrl+Z)"]').click()
const redo = (page) => page.locator('header button[title="Redo (Ctrl+Shift+Z)"]').click()
const tool = async (page, name) => {
  await page.locator('button[title="Editing tools"]').click()
  await page.locator('.studio-menu').getByRole('button', { name, exact: true }).click()
}
const textIs = (page, selector, text) => expect.poll(() => inFrame(page, (doc, s) => doc.querySelector(s)?.textContent, selector)).toBe(text)

async function clickInFrame(page, selector, { x, y } = {}) {
  // A mode/phone transition first shows its authored seed, then replaces it
  // with the script-style reading. Pick only after that document is ready.
  await expect(page.locator('iframe[title="Reading the page"]')).toHaveCount(0)
  await page.waitForFunction(() => document.querySelector('main iframe[title="site"]')?.contentDocument?.readyState === 'complete')
  await page.evaluate(async ([sel, dy]) => {
    const doc = document.querySelector('main iframe[title="site"]').contentDocument
    doc.querySelector(sel).scrollIntoView({ behavior: 'instant', block: dy == null ? 'center' : 'start' })
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  }, [selector, y ?? null])
  const point = await page.evaluate(([sel, dx, dy]) => {
    const frame = document.querySelector('main iframe[title="site"]')
    // Scrolling can also shift the iframe's outer container. Measure its box
    // after the scroll; measuring before it clicked the next paragraph.
    const box = frame.getBoundingClientRect()
    const zoom = box.width / frame.contentWindow.innerWidth
    const r = frame.contentDocument.querySelector(sel).getBoundingClientRect()
    return [box.x + (r.x + (dx ?? r.width / 2)) * zoom, box.y + (r.y + (dy ?? r.height / 2)) * zoom]
  }, [selector, x ?? null, y ?? null])
  await page.mouse.click(...point)
  await page.waitForTimeout(400)
}

test.describe('HTML editor user-path sweep', () => {
  let siteId
  test.beforeEach(async ({ page, request }) => {
    siteId = await createHtmlSite(request, 'E2E HTML sweep', [{ html: PAGE }])
    await openEditor(page, siteId, { edit: true })
  })
  test.afterEach(async ({ request }) => {
    if (siteId) await api(request, 'DELETE', `/sites/${siteId}/`)
  })

  test('Source applies, saves, reloads, and keeps a later in-place multiline edit', async ({ page, request }) => {
    await page.getByRole('button', { name: 'Source', exact: true }).click()
    const source = page.getByRole('textbox', { name: 'HTML source editor' })
    await expect(source).toHaveValue(PAGE)
    await source.fill(PAGE.replace('Sweep heading', 'Source applied'))
    await page.getByRole('button', { name: 'Apply & Save', exact: true }).click()
    await expect.poll(() => savedHtml(request, siteId)).toContain('Source applied')
    await page.reload()
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    await textIs(page, '#heading', 'Source applied')
    await clickInFrame(page, '#paragraph')
    await field(properties(page), 'Text').fill('First line\nSecond <literal> line')
    await save(page)
    await page.reload()
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    await expect.poll(() => inFrame(page, (doc) => doc.querySelector('#paragraph')?.innerHTML)).toBe('First line<br>Second &lt;literal&gt; line')
  })

  test('typography and layout choices override imported important CSS', async ({ page, request }) => {
    await clickInFrame(page, '#heading')
    await properties(page).getByRole('tab', { name: 'Design', exact: true }).click()
    await field(properties(page), 'Font size (px)').fill('56')
    await field(properties(page), 'Font weight').selectOption('700')
    await field(properties(page), 'Text align').selectOption('center')
    expect(await inFrame(page, (doc) => {
      const cs = getComputedStyle(doc.querySelector('#heading'))
      return [cs.fontSize, cs.fontWeight, cs.textAlign]
    })).toEqual(['56px', '700', 'center'])
    await clickInFrame(page, '#nav-home')
    await properties(page).getByRole('button', { name: /Select parent/ }).click()
    await properties(page).getByRole('tab', { name: 'Layout', exact: true }).click()
    await properties(page).getByRole('button', { name: 'Layout (rows / flex)', exact: true }).click()
    await field(properties(page), 'Justify (horizontal)').selectOption('space-between')
    await field(properties(page), 'Align (vertical)').selectOption('center')
    expect(await inFrame(page, (doc) => {
      const cs = getComputedStyle(doc.querySelector('#menu'))
      return [cs.justifyContent, cs.alignItems]
    })).toEqual(['space-between', 'center'])
    await save(page)
    const saved = await savedHtml(request, siteId)
    expect(saved).toContain('56px !important')
    expect(saved).not.toContain('data-pwb-selected')
    expect(saved).not.toContain('data-pwb-selection-toolbar')
  })

  test('None, full opacity, visible overflow and unchecked italic override the template instead of reverting to it', async ({ page, request }) => {
    await page.getByRole('button', { name: 'Source', exact: true }).click()
    await page.getByRole('textbox', { name: 'HTML source editor' }).fill(PAGE.replace('</style>', '#paragraph{font-style:italic;opacity:0.4;overflow:hidden;box-shadow:0 5px 10px red;border:4px solid red}</style>'))
    await page.getByRole('button', { name: 'Apply & Save', exact: true }).click()
    await expect.poll(() => savedHtml(request, siteId)).toContain('box-shadow:0 5px 10px red')
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    await clickInFrame(page, '#paragraph')
    await properties(page).getByRole('tab', { name: 'Design', exact: true }).click()
    await properties(page).getByRole('checkbox', { name: 'Italic', exact: true }).uncheck()
    await properties(page).getByRole('button', { name: 'Border', exact: true }).click()
    await field(properties(page), 'Border style').selectOption('none')
    await properties(page).getByRole('button', { name: 'Effects', exact: true }).click()
    await field(properties(page), 'Shadow').selectOption('none')
    await field(properties(page), 'Opacity').focus()
    await page.keyboard.press('End')
    await field(properties(page), 'Overflow').selectOption('visible')
    expect(await inFrame(page, (doc) => {
      const cs = getComputedStyle(doc.querySelector('#paragraph'))
      return [cs.fontStyle, cs.borderTopStyle, cs.boxShadow, cs.opacity, cs.overflow]
    })).toEqual(['normal', 'none', 'none', '1', 'visible'])
    // Default is a different action: restore the imported rule for that field.
    await field(properties(page), 'Overflow').selectOption('')
    expect(await inFrame(page, (doc) => getComputedStyle(doc.querySelector('#paragraph')).overflow)).toBe('hidden')
    await field(properties(page), 'Overflow').selectOption('visible')
    await save(page)
    await page.reload()
    await expect.poll(() => inFrame(page, (doc) => {
      if (!doc.querySelector('#paragraph')) return null
      const cs = getComputedStyle(doc.querySelector('#paragraph'))
      return [cs.fontStyle, cs.borderTopStyle, cs.boxShadow, cs.opacity, cs.overflow]
    })).toEqual(['normal', 'none', 'none', '1', 'visible'])
  })

  test('mobile overrides leave desktop values intact and can be reset', async ({ page, request }) => {
    await clickInFrame(page, '#heading')
    await properties(page).getByRole('tab', { name: 'Design', exact: true }).click()
    await field(properties(page), 'Font size (px)').fill('52')
    await page.getByRole('button', { name: 'Mobile', exact: true }).click()
    await expect.poll(() => inFrame(page, (doc) => doc.defaultView.innerWidth)).toBeLessThan(768)
    await clickInFrame(page, '#heading')
    await properties(page).getByRole('tab', { name: 'Design', exact: true }).click()
    await field(properties(page), 'Font size (px)').fill('28')
    await field(properties(page), 'Line height (×)').fill('1.6')
    expect(await inFrame(page, (doc) => getComputedStyle(doc.querySelector('#heading')).fontSize)).toBe('28px')
    await properties(page).getByRole('button', { name: 'Effects', exact: true }).click()
    await field(properties(page), 'Shadow').selectOption('0 4px 12px rgba(0,0,0,0.15)')
    await expect(field(properties(page), 'Shadow')).toHaveValue('0 4px 12px rgba(0,0,0,0.15)')
    const opacity = properties(page).getByRole('slider', { name: 'Opacity' })
    await opacity.focus()
    await page.keyboard.press('Home')
    await page.keyboard.press('ArrowRight')
    await expect(opacity).toHaveValue('0.1')
    expect(await inFrame(page, (doc) => getComputedStyle(doc.querySelector('#heading')).opacity)).toBe('0.1')
    await page.getByRole('button', { name: 'PC', exact: true }).click()
    await expect.poll(() => inFrame(page, (doc) => doc.querySelector('#heading') && getComputedStyle(doc.querySelector('#heading')).fontSize)).toBe('52px')
    await page.getByRole('button', { name: 'Mobile', exact: true }).click()
    await clickInFrame(page, '#heading')
    await properties(page).getByRole('tab', { name: 'Design', exact: true }).click()
    await properties(page).getByRole('button', { name: /Reset mobile styles/ }).click()
    await expect.poll(() => inFrame(page, (doc) => getComputedStyle(doc.querySelector('#heading')).fontSize)).toBe('52px')
    await save(page)
    expect(await savedHtml(request, siteId)).not.toContain('data-pwb-mobile-font-size')
  })

  test('typing survives browser frame, reload, zoom, viewport, and mode transitions', async ({ page, request }) => {
    await clickInFrame(page, '#paragraph')
    await page.keyboard.press('End')
    await page.keyboard.type(' typed before frame')
    const frameToggle = page.locator('button[title="Show browser frame"],button[title="Hide browser frame"]')
    if (await frameToggle.getAttribute('title') === 'Hide browser frame') await frameToggle.click()
    await frameToggle.click()
    await textIs(page, '#paragraph', 'Original paragraph typed before frame')
    await page.getByRole('button', { name: 'Reload preview', exact: true }).click()
    await textIs(page, '#paragraph', 'Original paragraph typed before frame')
    await page.getByRole('button', { name: 'Zoom the canvas in', exact: true }).click()
    await page.getByRole('button', { name: /Zoom: .*click to fit/ }).click()
    await page.getByRole('button', { name: 'Mobile', exact: true }).click()
    await textIs(page, '#paragraph', 'Original paragraph typed before frame')
    await page.getByRole('button', { name: 'PC', exact: true }).click()
    await page.getByRole('button', { name: 'Source', exact: true }).click()
    await expect(page.getByRole('textbox', { name: 'HTML source editor' })).toHaveValue(/typed before frame/)
    await page.getByRole('button', { name: 'View', exact: true }).click()
    await expect(siteFrame(page).locator('#paragraph')).toContainText('typed before frame')
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    await save(page)
    expect(await savedHtml(request, siteId)).toContain('typed before frame')
  })

  test('the link tool connects a source to a section and its arrow stays out of saved HTML', async ({ page, request }) => {
    await tool(page, 'Link')
    await clickInFrame(page, '#nav-home')
    await clickInFrame(page, '#contact-heading')
    await expect.poll(() => inFrame(page, (doc) => doc.querySelector('#nav-home').getAttribute('href'))).toBe('#contact-heading')
    expect(await inFrame(page, (doc) => doc.querySelectorAll('svg[data-pwb-connections] line').length)).toBeGreaterThan(0)
    await save(page)
    const saved = await savedHtml(request, siteId)
    expect(saved).toContain('href="#contact-heading"')
    expect(saved).not.toContain('data-pwb-connections')
    expect(saved).not.toContain('pwb-arrowhead')
    await tool(page, 'Text')
    await clickInFrame(page, '#paragraph')
    await field(properties(page), 'Link (href)').selectOption('section')
    await properties(page).getByRole('combobox', { name: 'Section on this page' }).selectOption('contact')
    expect(await inFrame(page, (doc) => doc.querySelector('#paragraph').closest('a').getAttribute('href'))).toBe('#contact')
    await field(properties(page), 'Link (href)').selectOption('none')
    expect(await inFrame(page, (doc) => doc.querySelector('#paragraph').closest('a'))).toBeNull()
  })

  test('menu links can be added, renamed, reordered, removed, and saved without duplicate ids', async ({ page, request }) => {
    await clickInFrame(page, '#nav-home')
    await properties(page).getByRole('button', { name: /Select parent/ }).click()
    await properties(page).getByRole('button', { name: /Add link/ }).click()
    await properties(page).getByRole('textbox', { name: 'Link label', exact: true }).last().fill('Portfolio')
    await properties(page).getByRole('textbox', { name: 'Link target', exact: true }).last().fill('#intro')
    await properties(page).getByRole('button', { name: 'Move up', exact: true }).last().click()
    expect(await inFrame(page, (doc) => [...doc.querySelectorAll('#menu a')].map((a) => [a.textContent, a.getAttribute('href')]))).toEqual([
      ['Home', '#top'], ['Portfolio', '#intro'], ['Contact', '#contact'],
    ])
    const ids = await inFrame(page, (doc) => [...doc.querySelectorAll('#menu [id]')].map((a) => a.id))
    expect(new Set(ids).size).toBe(ids.length)
    await properties(page).getByRole('button', { name: 'Remove link', exact: true }).last().click()
    await save(page)
    await page.reload()
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    await expect.poll(() => inFrame(page, (doc) => [...doc.querySelectorAll('#menu a')].map((a) => a.textContent))).toEqual(['Home', 'Portfolio'])
    expect(await savedHtml(request, siteId)).toContain('Portfolio')
  })

  test('brush paints text, fill and border while keeping the content and saving the choices', async ({ page, request }) => {
    await tool(page, 'Brush')
    await page.getByRole('button', { name: 'Text', exact: true }).click()
    await page.getByRole('button', { name: 'Use #ef4444', exact: true }).click()
    await clickInFrame(page, '#heading')
    expect(await inFrame(page, (doc) => getComputedStyle(doc.querySelector('#heading')).color)).toBe('rgb(239, 68, 68)')
    await page.getByRole('button', { name: 'Fill', exact: true }).click()
    await page.getByRole('button', { name: 'Use #22c55e', exact: true }).click()
    await clickInFrame(page, '#intro', { x: 4, y: 4 })
    expect(await inFrame(page, (doc) => getComputedStyle(doc.querySelector('#intro')).backgroundColor)).toBe('rgb(34, 197, 94)')
    await page.getByRole('button', { name: 'Border', exact: true }).click()
    await page.getByRole('button', { name: 'Use #2563eb', exact: true }).click()
    await clickInFrame(page, '#intro', { x: 4, y: 4 })
    expect(await inFrame(page, (doc) => getComputedStyle(doc.querySelector('#intro')).borderTopColor)).toBe('rgb(37, 99, 235)')
    await save(page)
    expect(await savedHtml(request, siteId)).toContain('Original paragraph')
  })

  test('entrance and hover animation apply, run, remove and undo from a selected HTML element', async ({ page, request }) => {
    await clickInFrame(page, '#heading')
    await page.getByRole('tab', { name: 'Animation', exact: true }).click()
    await page.getByRole('button', { name: 'Fade up', exact: true }).click()
    await page.getByRole('button', { name: 'Use this animation', exact: true }).click()
    await page.getByRole('button', { name: 'Grow', exact: true }).click()
    expect(await inFrame(page, (doc) => {
      const heading = doc.querySelector('#heading')
      return [heading.getAttribute('data-anim-in'), heading.classList.contains('pwb-hover-grow')]
    })).toEqual(['fade-up', true])
    await save(page)
    expect(await savedHtml(request, siteId)).toContain('data-anim-in="fade-up"')
    await page.getByRole('button', { name: 'Run', exact: true }).click()
    await expect(siteFrame(page).locator('#heading')).toHaveAttribute('data-anim-in', 'fade-up')
    await expect.poll(() => siteFrame(page).locator('#heading').evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    await clickInFrame(page, '#heading')
    await page.getByRole('button', { name: 'Remove animation', exact: true }).click()
    expect(await inFrame(page, (doc) => doc.querySelector('#heading').hasAttribute('data-anim-in'))).toBe(false)
    await undo(page)
    await expect.poll(() => inFrame(page, (doc) => doc.querySelector('#heading')?.getAttribute('data-anim-in'))).toBe('fade-up')
  })

  test('spotlight edits the selected element, changes preview width, and Escape returns to the page', async ({ page, request }) => {
    await clickInFrame(page, '#paragraph')
    await clickInFrame(page, '[data-pwb-selection-action="spotlight"]')
    const dialog = page.getByRole('dialog', { name: 'Open large', exact: true })
    await expect(dialog).toBeVisible()
    await field(dialog, 'Text').fill('Changed in spotlight')
    await expect(dialog.frameLocator('iframe[title="Open large"]').locator('#paragraph')).toHaveText('Changed in spotlight')
    await dialog.getByRole('button', { name: 'Phone', exact: true }).click()
    await expect(dialog).toContainText('390px')
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await textIs(page, '#paragraph', 'Changed in spotlight')
    await save(page)
    expect(await savedHtml(request, siteId)).toContain('Changed in spotlight')
  })

  test('duplicate, move, delete, undo and redo operate on the selected element in order', async ({ page }) => {
    await clickInFrame(page, '#paragraph')
    await properties(page).getByRole('button', { name: 'Duplicate', exact: true }).click()
    await field(properties(page), 'Text').fill('Copied paragraph')
    await properties(page).getByRole('button', { name: 'More actions', exact: true }).click()
    await properties(page).getByRole('button', { name: 'Move down', exact: true }).click()
    expect(await inFrame(page, (doc) => [...doc.querySelectorAll('#intro > p')].map((p) => p.textContent))).toEqual(['Original paragraph', 'Second paragraph', 'Copied paragraph'])
    await properties(page).getByRole('button', { name: 'Delete component', exact: true }).click()
    expect(await inFrame(page, (doc) => doc.querySelectorAll('#intro > p').length)).toBe(2)
    await undo(page)
    await expect.poll(() => inFrame(page, (doc) => doc.querySelectorAll('#intro > p').length)).toBe(3)
    await redo(page)
    await expect.poll(() => inFrame(page, (doc) => doc.querySelectorAll('#intro > p').length)).toBe(2)
  })

  test('selection handles resize with a real pointer drag and the result is saved and undoable', async ({ page, request }) => {
    await clickInFrame(page, '#paragraph')
    await properties(page).getByRole('tab', { name: 'Layout', exact: true }).click()
    await field(properties(page), 'Width (px, 0 = auto)').fill('300')
    // Real pointer events, in screen coordinates: a locator drag inside the
    // zoomed preview would miss the handle by the iframe's CSS zoom factor.
    const point = await page.evaluate(() => {
      const frame = document.querySelector('main iframe[title="site"]')
      const box = frame.getBoundingClientRect()
      const zoom = box.width / frame.contentWindow.innerWidth
      const r = frame.contentDocument.querySelector('[data-pwb-resize-dir="e"][data-pwb-resize-kind="handle"]').getBoundingClientRect()
      return { x: box.x + (r.x + r.width / 2) * zoom, y: box.y + (r.y + r.height / 2) * zoom, zoom }
    })
    await page.mouse.move(point.x, point.y)
    await page.mouse.down()
    await page.mouse.move(point.x + 60, point.y, { steps: 12 })
    await page.mouse.up()
    const resized = await inFrame(page, (doc) => parseFloat(doc.querySelector('#paragraph').style.width))
    expect(resized).toBeGreaterThan(340)
    expect(Math.abs(resized - (300 + 60 / point.zoom))).toBeLessThan(4)
    await undo(page)
    await expect.poll(() => inFrame(page, (doc) => doc.querySelector('#paragraph')?.style.width)).toBe('300px')
    await redo(page)
    await expect.poll(() => inFrame(page, (doc) => parseFloat(doc.querySelector('#paragraph')?.style.width))).toBe(resized)
    await save(page)
    const saved = await savedHtml(request, siteId)
    expect(saved).toContain(`width: ${resized}px !important`)
    expect(saved).not.toContain('data-pwb-resize-overlay')
  })

  test('component placement cancels cleanly, inserts at the click, and also supports keyboard append', async ({ page, request }) => {
    const headingCount = () => inFrame(page, (doc) => doc.querySelectorAll('h1,h2,h3,h4,h5,h6').length)
    const initial = await headingCount()
    await page.getByRole('tab', { name: 'Components', exact: true }).click()
    await page.locator('[role="tabpanel"]').getByRole('button', { name: /Heading/ }).first().click()
    const variant = page.locator('[title^="Click to place"]').first()
    await variant.click()
    await page.getByRole('button', { name: 'Cancel (Esc)', exact: true }).click()
    expect(await headingCount()).toBe(initial)
    await variant.click()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Cancel (Esc)', exact: true })).toHaveCount(0)
    expect(await headingCount()).toBe(initial)
    await variant.click()
    await clickInFrame(page, '#intro', { x: 4, y: 4 })
    await expect.poll(headingCount).toBe(initial + 1)
    await expect(page.getByRole('button', { name: 'Cancel (Esc)', exact: true })).toHaveCount(0)
    await variant.press('Enter')
    await expect.poll(headingCount).toBe(initial + 2)
    await undo(page)
    await expect.poll(headingCount).toBe(initial + 1)
    await save(page)
    const saved = await savedHtml(request, siteId)
    expect(saved).not.toContain('data-pwb-dropline')
    expect(saved).not.toContain('data-pwb-hover')
  })

  test('View runs forms and opens script-driven content which can then be edited and saved', async ({ page, request }) => {
    await page.getByRole('button', { name: 'Run', exact: true }).click()
    await siteFrame(page).getByRole('button', { name: 'Show details', exact: true }).click()
    await expect(siteFrame(page).locator('#details')).toBeVisible()
    await siteFrame(page).getByRole('textbox', { name: 'Name', exact: true }).fill('Test visitor')
    await siteFrame(page).getByRole('button', { name: 'Send form', exact: true }).click()
    await expect(siteFrame(page).locator('#result')).toHaveText('Submitted')
    // The live-state reporter observes mutations, then gives Edit the opened
    // disclosure. The saved page should keep its original closed state.
    await page.waitForTimeout(400)
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    await expect(siteFrame(page).locator('#details')).toBeVisible()
    await clickInFrame(page, '#details-text')
    await field(properties(page), 'Text').fill('Edited hidden details')
    await save(page)
    const saved = await savedHtml(request, siteId)
    expect(saved).toContain('Edited hidden details')
    expect(saved).toMatch(/<div id="details" hidden(?:="")?>/)
    expect(saved).not.toContain('data-pwb-state')
  })
})
