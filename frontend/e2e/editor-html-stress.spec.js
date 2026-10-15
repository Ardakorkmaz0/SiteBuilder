import { test, expect, api, createHtmlSite, openEditor, inFrame, save, savedHtml } from './support.js'

const PAGE = `<!DOCTYPE html><html><head><title>Editing stress</title><style>
body{font:16px system-ui;margin:0;padding:12px}main{display:grid;gap:12px}
.card{display:flex;flex-direction:column;gap:24px;padding:32px;border:6px solid #64748b;border-radius:18px;width:440px;max-width:500px;min-height:80px;position:relative;z-index:6}
p,h2{margin:0}textarea{width:280px;height:64px}nav{display:flex;gap:12px}
</style></head><body><main>
<article id="card-a" class="card"><h2 id="target-a">Birinci kart</h2><p id="copy-a">Original A</p><a href="#target-a">Jump within A</a></article>
<article id="card-b" class="card"><h2 id="target-b">İkinci kart</h2><p id="copy-b">Original B</p></article>
<section id="form-card"><label>Message<textarea id="message">Original message</textarea></label></section>
</main></body></html>`

const panel = (page) => page.locator('[data-tour="properties"]')
const field = (page, name) => panel(page).locator('label').filter({ has: page.locator('span', { hasText: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }) }).locator('input,textarea,select').first()
const undo = (page) => page.locator('header button[title="Undo (Ctrl+Z)"]').click()
const redo = (page) => page.locator('header button[title="Redo (Ctrl+Shift+Z)"]').click()
const text = (page, selector) => inFrame(page, (doc, s) => doc.querySelector(s)?.textContent, selector)

async function pointInFrame(page, selector, { x, y } = {}) {
  await expect(page.locator('iframe[title="Reading the page"]')).toHaveCount(0)
  await page.waitForFunction(() => document.querySelector('main iframe[title="site"]')?.contentDocument?.readyState === 'complete')
  await page.evaluate(async ([s, dy]) => {
    document.querySelector('main iframe[title="site"]').contentDocument.querySelector(s).scrollIntoView({ behavior: 'instant', block: dy == null ? 'center' : 'start' })
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  }, [selector, y ?? null])
  return page.evaluate(([s, dx, dy]) => {
    const frame = document.querySelector('main iframe[title="site"]')
    const b = frame.getBoundingClientRect()
    const scale = b.width / frame.contentWindow.innerWidth
    const r = frame.contentDocument.querySelector(s).getBoundingClientRect()
    return { x: b.x + (r.x + (dx ?? r.width / 2)) * scale, y: b.y + (r.y + (dy ?? r.height / 2)) * scale }
  }, [selector, x ?? null, y ?? null])
}

async function select(page, selector, position) {
  const p = await pointInFrame(page, selector, position)
  await page.mouse.click(p.x, p.y)
  await expect.poll(() => inFrame(page, (doc, s) => doc.querySelector(s)?.hasAttribute('data-pwb-selected'), selector)).toBe(true)
}

async function designGroup(page, name) {
  await panel(page).getByRole('tab', { name: 'Design', exact: true }).click()
  const group = panel(page).getByRole('button', { name, exact: true })
  if (await group.getAttribute('aria-expanded') !== 'true') await group.click()
}

test.describe('deep HTML editing regressions', () => {
  let siteId
  test.beforeEach(async ({ page, request }) => {
    siteId = await createHtmlSite(request, 'E2E HTML editing stress', [{ html: PAGE }])
    await openEditor(page, siteId, { edit: true })
  })
  test.afterEach(async ({ request }) => {
    if (siteId) await api(request, 'DELETE', `/sites/${siteId}/`)
  })

  test('zero spacing and border choices override imported CSS, while empty restores the template', async ({ page }) => {
    await select(page, '#card-a', { x: 12, y: 12 })
    await designGroup(page, 'Box')
    await field(page, 'Padding (px)').fill('0')
    await field(page, 'Corner radius (px)').fill('0')
    await designGroup(page, 'Border')
    await field(page, 'Border width (px)').fill('0')
    await panel(page).getByRole('tab', { name: 'Layout', exact: true }).click()
    const flex = panel(page).getByRole('button', { name: 'Layout (rows / flex)', exact: true })
    if (await flex.getAttribute('aria-expanded') !== 'true') await flex.click()
    await field(page, 'Gap between items (px)').fill('0')
    expect(await inFrame(page, (doc) => {
      const cs = getComputedStyle(doc.querySelector('#card-a'))
      return [cs.paddingTop, cs.borderTopWidth, cs.borderTopLeftRadius, cs.gap]
    })).toEqual(['0px', '0px', '0px', '0px'])
    await field(page, 'Gap between items (px)').fill('')
    await designGroup(page, 'Box')
    await field(page, 'Padding (px)').fill('')
    await designGroup(page, 'Border')
    await field(page, 'Border width (px)').fill('')
    expect(await inFrame(page, (doc) => {
      const cs = getComputedStyle(doc.querySelector('#card-a'))
      return [cs.paddingTop, cs.borderTopWidth, cs.gap]
    })).toEqual(['32px', '6px', '24px'])
  })

  test('zero auto sizing, no maximum and stack order survive save and restore independently', async ({ page, request }) => {
    await select(page, '#card-a', { x: 12, y: 12 })
    await panel(page).getByRole('tab', { name: 'Layout', exact: true }).click()
    await field(page, 'Width (px, 0 = auto)').fill('0')
    await field(page, 'Height (px, 0 = auto)').fill('0')
    await field(page, 'Max width (px, 0 = none)').fill('0')
    await panel(page).getByRole('button', { name: 'Position & stacking', exact: true }).click()
    await field(page, 'Stack order (z-index)').fill('0')
    expect(await inFrame(page, (doc) => {
      const style = doc.querySelector('#card-a').style
      return [style.width, style.height, style.maxWidth, style.zIndex]
    })).toEqual(['auto', 'auto', 'none', '0'])
    await save(page)
    const stored = await savedHtml(request, siteId)
    expect(stored).toContain('max-width: none !important')
    await field(page, 'Width (px, 0 = auto)').fill('')
    await field(page, 'Max width (px, 0 = none)').fill('')
    expect(await inFrame(page, (doc) => {
      const cs = getComputedStyle(doc.querySelector('#card-a'))
      return [cs.width, cs.maxWidth]
    })).toEqual(['440px', '500px'])
  })

  test('mobile zero is different from clearing an override and never changes the desktop padding', async ({ page, request }) => {
    await select(page, '#card-a', { x: 12, y: 12 })
    await designGroup(page, 'Box')
    await field(page, 'Padding (px)').fill('48')
    await page.getByRole('button', { name: 'Mobile', exact: true }).click()
    await select(page, '#card-a', { x: 12, y: 12 })
    await designGroup(page, 'Box')
    await field(page, 'Padding (px)').fill('0')
    expect(await inFrame(page, (doc) => getComputedStyle(doc.querySelector('#card-a')).paddingTop)).toBe('0px')
    await field(page, 'Padding (px)').fill('')
    expect(await inFrame(page, (doc) => getComputedStyle(doc.querySelector('#card-a')).paddingTop)).toBe('48px')
    await field(page, 'Padding (px)').fill('0')
    await page.getByRole('button', { name: 'PC', exact: true }).click()
    await expect.poll(() => inFrame(page, (doc) => doc.querySelector('#card-a') && getComputedStyle(doc.querySelector('#card-a')).paddingTop)).toBe('48px')
    await save(page)
    expect(await savedHtml(request, siteId)).toContain('--pwb-mobile-padding: 0px')
  })

  test('a textarea receives Unicode multiline defaults which stay exact after Save and View reload', async ({ page, request }) => {
    const value = 'İstanbul 👩🏽‍💻 e\u0301\nİkinci <literal> & güvenli satır\nSon satır'
    await select(page, '#message')
    await field(page, 'Text').fill(value)
    expect(await inFrame(page, (doc) => doc.querySelector('#message').value)).toBe(value)
    await save(page)
    expect(await savedHtml(request, siteId)).not.toMatch(/<textarea[^>]*>[^]*?<br>[^]*?<\/textarea>/)
    await page.reload()
    await page.getByRole('button', { name: 'View', exact: true }).click()
    await expect(page.frameLocator('main iframe[title="site"]').locator('#message')).toHaveValue(value)
  })

  test('rich Unicode edits remain separate undo steps across Source, Edit and View transitions', async ({ page }) => {
    await select(page, '#copy-a')
    await field(page, 'Text').fill('İlk değişiklik 👋\nİkinci satır')
    await page.getByRole('button', { name: 'Source', exact: true }).click()
    const source = page.getByRole('textbox', { name: 'HTML source editor' })
    await source.fill((await source.inputValue()).replace('İlk değişiklik 👋', 'Kaynak değişikliği 🚀'))
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    await select(page, '#copy-a')
    await field(page, 'Text').fill('Son değişiklik 🧪')
    await undo(page)
    await expect.poll(() => text(page, '#copy-a')).toBe('Kaynak değişikliği 🚀İkinci satır')
    await undo(page)
    await expect.poll(() => text(page, '#copy-a')).toBe('İlk değişiklik 👋İkinci satır')
    await redo(page)
    await expect.poll(() => text(page, '#copy-a')).toBe('Kaynak değişikliği 🚀İkinci satır')
    await page.getByRole('button', { name: 'View', exact: true }).click()
    await expect(page.frameLocator('main iframe[title="site"]').locator('#copy-a')).toContainText('Kaynak değişikliği 🚀')
  })

  test('duplicated nested blocks keep their own link targets after reorder and save', async ({ page, request }) => {
    await select(page, '#card-a', { x: 12, y: 12 })
    await panel(page).getByRole('button', { name: 'Duplicate', exact: true }).click()
    await panel(page).getByRole('button', { name: 'More actions', exact: true }).click()
    await panel(page).getByRole('button', { name: 'Move down', exact: true }).click()
    expect(await inFrame(page, (doc) => [...doc.querySelectorAll('main > article')].map((el) => el.id))).toEqual(['card-a', 'card-b', 'card-a-2'])
    expect(await inFrame(page, (doc) => doc.querySelector('#card-a-2 a').getAttribute('href'))).toBe('#target-a-2')
    await save(page)
    expect(await savedHtml(request, siteId)).toContain('href="#target-a-2"')
    await undo(page)
    await expect.poll(() => inFrame(page, (doc) => [...doc.querySelectorAll('main > article')].map((el) => el.id))).toEqual(['card-a', 'card-a-2', 'card-b'])
  })

  test('HTML drag events reorder a nested article without moving the whole page wrapper', async ({ page }) => {
    await page.locator('button[title="Editing tools"]').click()
    await page.locator('.studio-menu').getByRole('button', { name: 'Move', exact: true }).click()
    await pointInFrame(page, '#card-a', { x: 12, y: 12 })
    await expect(page.frameLocator('main iframe[title="site"]').locator('#card-a')).toHaveAttribute('draggable', 'true')
    // Chromium's native drag loop can keep a CDP mouse.move pending as soon as
    // the threshold is crossed in a sandboxed iframe. Deliver the browser's
    // drag events instead: this still exercises the actual armed DOM nodes,
    // DataTransfer, hit-testing, placement indicator and commit handlers.
    await page.evaluate(() => {
      const frame = document.querySelector('main iframe[title="site"]')
      const doc = frame.contentDocument
      const win = frame.contentWindow
      const source = doc.querySelector('#card-a')
      const target = doc.querySelector('#card-b')
      const rect = target.getBoundingClientRect()
      const transfer = new win.DataTransfer()
      const fire = (node, type) => node.dispatchEvent(new win.DragEvent(type, {
        bubbles: true, cancelable: true, dataTransfer: transfer,
        clientX: rect.left + 12, clientY: rect.bottom - 12,
      }))
      if (!source.draggable || !target.draggable) throw new Error('Move tool has not armed the articles')
      try {
        fire(source, 'dragstart')
        fire(target, 'dragover')
        fire(target, 'drop')
      } finally {
        fire(source, 'dragend')
      }
    })
    await expect.poll(() => inFrame(page, (doc) => [...doc.querySelectorAll('main > article')].map((el) => el.id))).toEqual(['card-b', 'card-a'])
    await undo(page)
    await expect.poll(() => inFrame(page, (doc) => [...doc.querySelectorAll('main > article')].map((el) => el.id))).toEqual(['card-a', 'card-b'])
  })

  test('rapid selection changes keep content edits and later typing attached to the intended element', async ({ page, request }) => {
    await select(page, '#copy-a')
    await field(page, 'Text').fill('A edited first')
    await select(page, '#copy-b')
    await field(page, 'Text').fill('B edited second')
    await select(page, '#copy-a')
    await page.keyboard.press('End')
    await page.keyboard.type(' + typed')
    await page.getByRole('button', { name: 'Source', exact: true }).click()
    await expect(page.getByRole('textbox', { name: 'HTML source editor' })).toHaveValue(/A edited first \+ typed/)
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    await select(page, '#copy-b')
    await field(page, 'Text').fill('B edited again')
    await save(page)
    const stored = await savedHtml(request, siteId)
    expect(stored).toContain('A edited first + typed')
    expect(stored).toContain('B edited again')
    expect(stored).not.toContain('Original A')
    expect(stored).not.toContain('Original B')
  })
})
