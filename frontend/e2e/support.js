// What the specs share: the account from session.setup.js, the backend API,
// and the moves every editor test makes (open a site, click inside the page
// frame, publish).
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { test as base, expect } from '@playwright/test'

export const API = process.env.E2E_API_URL || 'http://127.0.0.1:8001/api'
export const BACKEND = API.replace(/\/api\/?$/, '')
export const APP_ORIGIN = 'http://localhost:5173'
export const AUTH_DIR = fileURLToPath(new URL('./.auth/', import.meta.url))
export const SESSION_FILE = `${AUTH_DIR}session.json`
export const STATE_FILE = `${AUTH_DIR}state.json`

export const session = () => JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'))

// Every page accepts the editor's confirmations (a delete, a load) and fails
// its test on an uncaught error, which a passing assertion could hide.
export const test = base.extend({
  // `provide` is Playwright's fixture callback, named so the React hooks lint
  // does not read it as a hook.
  page: async ({ page }, provide) => {
    const errors = []
    page.on('dialog', (dialog) => dialog.accept())
    page.on('pageerror', (error) => errors.push(String(error).slice(0, 200)))
    await provide(page)
    expect(errors, 'uncaught errors on the page').toEqual([])
  },
})
export { expect }

export async function api(request, method, path, body, token = session().token) {
  const response = await request.fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Token ${token}` },
    ...(body === undefined ? {} : { data: body }),
  })
  return { status: response.status(), data: await response.json().catch(() => null) }
}

// A site whose pages are HTML documents: [{ id?, name?, html }].
export async function createHtmlSite(request, title, pages) {
  const { data: site } = await api(request, 'POST', '/sites/', { title })
  const { data: full } = await api(request, 'GET', `/sites/${site.id}/`)
  const home = full.schema.pages[0]
  const schemaPages = pages.map((page, index) => ({
    ...home,
    ...(index ? { id: page.id || `page_${index}`, name: page.name || `Page ${index}` } : {}),
    mode: 'html',
    html: page.html,
  }))
  await api(request, 'PATCH', `/sites/${site.id}/`, { schema: { ...full.schema, pages: schemaPages } })
  return site.id
}

export async function savedHtml(request, siteId, index = 0) {
  const { data } = await api(request, 'GET', `/sites/${siteId}/`)
  return data.schema.pages[index]?.html || ''
}

// The editor with nothing in front of it and auto-save off, so Save is the
// only thing that writes and a test reads exactly what it saved.
export async function openEditor(page, siteId, { edit = false } = {}) {
  await page.goto(`/editor/${siteId}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(800)
  for (let i = 0; i < 3 && await page.locator('.studio-overlay').count(); i += 1) {
    await page.keyboard.press('Escape')
    await page.waitForTimeout(250)
  }
  const autoSave = page.locator('header [role="switch"]')
  if (await autoSave.getAttribute('aria-checked') === 'true') await autoSave.click()
  if (edit) {
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    await expect(page.locator('main iframe[title="site"]')).toBeVisible()
    await page.waitForTimeout(600)
  }
}

// The page preview is scaled with CSS zoom, and a locator click inside a
// zoomed iframe lands in the wrong place; the point is worked out instead.
export async function clickInFrame(page, selector, { x, y } = {}) {
  const point = await page.evaluate(([sel, dx, dy]) => {
    const frame = document.querySelector('main iframe')
    const box = frame.getBoundingClientRect()
    const zoom = box.width / frame.contentWindow.innerWidth
    const element = frame.contentDocument.querySelector(sel)
    // A click at a corner needs that corner in view: an element taller than
    // the frame, centred, has its top above it, and the click lands on the
    // editor's toolbar instead.
    element.scrollIntoView({ block: dy == null ? 'center' : 'start' })
    const r = element.getBoundingClientRect()
    return [box.x + (r.x + (dx ?? r.width / 2)) * zoom, box.y + (r.y + (dy ?? r.height / 2)) * zoom]
  }, [selector, x ?? null, y ?? null])
  await page.mouse.click(point[0], point[1])
  await page.waitForTimeout(400)
}

// Run `fn(document, arg)` inside the edit frame (same origin, no scripts).
export function inFrame(page, fn, arg) {
  return page.evaluate(([source, value]) => {
    const doc = document.querySelector('main iframe')?.contentDocument
    return doc ? new Function('doc', 'arg', `return (${source})(doc, arg)`)(doc, value) : null
  }, [fn.toString(), arg ?? null])
}

const isSiteWrite = (response) => /\/api\/sites\/\d+\/$/.test(new URL(response.url()).pathname)
  && ['PATCH', 'PUT'].includes(response.request().method())

// Save and wait for the server to have it.
export async function save(page) {
  const written = page.waitForResponse(isSiteWrite, { timeout: 20_000 })
  await page.locator('header').getByRole('button', { name: 'Save', exact: true }).click()
  expect((await written).ok()).toBe(true)
}

// Publish from the editor: it renders the documents /s/ serves.
export async function publish(page, request, siteId) {
  const written = page.waitForResponse(isSiteWrite, { timeout: 20_000 })
  await page.locator('header [data-tour="publish"]').click()
  expect((await written).ok()).toBe(true)
  await expect(page.locator('header [data-tour="publish"]')).toHaveText(/Published/)
  const { data } = await api(request, 'GET', `/sites/${siteId}/`)
  return data.slug
}

// A 64×48 solid red PNG, for uploads.
export const RED_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAEAAAAAwCAIAAAAuKetIAAAAY0lEQVR4nO3PQQkAMAzAwCqpf1ETMxF7HINABFzm7H7dcEEDWtCAFjSgBQ1oQQNa0IAWNKAFDWhBA1rQgBY0oAUNaEEDWtCAFjSgBQ1oQQNa0IAWNKAFDWhBA1rQgBY0oAWPXfevIMQjGCTTAAAAAElFTkSuQmCC',
  'base64',
)
