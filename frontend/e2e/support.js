// Each editor test owns an account, so publishing in one test cannot consume
// another test's daily allowance. The setup account remains a known identity
// for authentication tests that deliberately start signed out.
import fs from 'node:fs'
import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { test as base, expect } from '@playwright/test'

export const API = process.env.E2E_API_URL || 'http://127.0.0.1:8001/api'
export const BACKEND = API.replace(/\/api\/?$/, '')
export const APP_ORIGIN = 'http://localhost:5173'
export const AUTH_DIR = fileURLToPath(new URL('./.auth/', import.meta.url))
export const SESSION_FILE = `${AUTH_DIR}session.json`
export const STATE_FILE = `${AUTH_DIR}state.json`

export const session = () => JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'))
const requestTokens = new WeakMap()

const accountState = ({ token, user }) => ({
  cookies: [],
  origins: [{
    origin: APP_ORIGIN,
    localStorage: [
      { name: 'pwb_token', value: token },
      { name: 'pwb_user', value: JSON.stringify(user) },
      { name: 'pwb_language', value: 'en' },
      { name: 'pwb_editor_tour_v1', value: '1' },
    ],
  }],
})

// Every page accepts the editor's confirmations (a delete, a load) and fails
// its test on an uncaught error, which a passing assertion could hide.
export const test = base.extend({
  isolatedAccount: [true, { option: true }],
  account: [async ({ playwright, isolatedAccount }, provide) => {
    if (!isolatedAccount) {
      await provide(null)
      return
    }
    // A separate context avoids a fixture cycle: the normal request context
    // inherits storageState, and storageState needs this account first.
    const registration = await playwright.request.newContext()
    try {
      const username = `e2e_test_${randomBytes(6).toString('hex')}`
      const response = await registration.post(`${API}/auth/register/`, {
        data: {
          username,
          email: `${username}@example.test`,
          password: `E2e-${randomBytes(12).toString('base64url')}`,
        },
      })
      expect(response.status(), await response.text()).toBe(201)
      await provide(await response.json())
    } finally {
      await registration.dispose()
    }
  }, { auto: true }],
  storageState: async ({ account }, provide) => {
    await provide(account ? accountState(account) : { cookies: [], origins: [] })
  },
  request: async ({ request, account }, provide) => {
    if (account) requestTokens.set(request, account.token)
    try {
      await provide(request)
    } finally {
      requestTokens.delete(request)
    }
  },
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

export async function api(request, method, path, body, token = requestTokens.get(request) ?? session().token) {
  const response = await request.fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Token ${token}` },
    ...(body === undefined ? {} : { data: body }),
  })
  return { status: response.status(), data: await response.json().catch(() => null) }
}

// A site whose pages are HTML documents: [{ id?, name?, html }].
export async function createHtmlSite(request, title, pages) {
  const created = await api(request, 'POST', '/sites/', { title })
  expect(created.status, JSON.stringify(created.data)).toBe(201)
  const site = created.data
  const loaded = await api(request, 'GET', `/sites/${site.id}/`)
  expect(loaded.status, JSON.stringify(loaded.data)).toBe(200)
  const full = loaded.data
  const home = full.schema.pages[0]
  const schemaPages = pages.map((page, index) => ({
    ...home,
    ...(index ? { id: page.id || `page_${index}`, name: page.name || `Page ${index}` } : {}),
    mode: 'html',
    html: page.html,
  }))
  const seeded = await api(request, 'PATCH', `/sites/${site.id}/`, { schema: { ...full.schema, pages: schemaPages } })
  expect(seeded.status, JSON.stringify(seeded.data)).toBe(200)
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
