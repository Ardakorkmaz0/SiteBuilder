// Signing up, as a stranger and as a guest who already made something.
import { randomBytes } from 'node:crypto'
import { test, expect, session, API } from './support.js'

test.use({ storageState: { cookies: [], origins: [] } })

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try { localStorage.setItem('pwb_language', 'en'); localStorage.setItem('pwb_editor_tour_v1', '1') } catch { /* private mode */ }
  })
})

const password = () => `E2e-${randomBytes(12).toString('base64url')}`

// Every refusal used to read "Please enter a valid value."
test('a refused sign-up says which rule failed', async ({ page }) => {
  await page.goto('/register')
  await page.getByLabel('Username').fill(session().user.username)
  await page.getByLabel('Email').fill(`dup_${randomBytes(3).toString('hex')}@example.test`)
  await page.getByLabel('Password', { exact: true }).fill(password())
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('alert')).toContainText('This username is already taken.')

  await page.getByLabel('Username').fill(`e2e_${randomBytes(4).toString('hex')}`)
  await page.getByLabel('Password', { exact: true }).fill('12345678')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('alert')).toContainText('This password is too common.')
})

test('a guest who signs up keeps their work and their identity', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Continue without signing in' }).click()
  await page.waitForFunction(() => !!localStorage.getItem('pwb_token'))
  const guest = await page.evaluate(async (base) => {
    const token = localStorage.getItem('pwb_token')
    const headers = { Authorization: `Token ${token}`, 'Content-Type': 'application/json' }
    await fetch(`${base}/sites/`, { method: 'POST', headers, body: JSON.stringify({ title: 'E2E guest work' }) })
    return (await fetch(`${base}/auth/me/`, { headers })).json()
  }, API)

  await page.goto('/register')
  const name = `e2e_guest_${randomBytes(3).toString('hex')}`
  await page.getByLabel('Username').fill(name)
  await page.getByLabel('Email').fill(`${name}@example.test`)
  await page.getByLabel('Password', { exact: true }).fill(password())
  await page.getByRole('button', { name: 'Create my account' }).click()
  await page.waitForURL(/localhost:5173\/($|\?)/)

  const after = await page.evaluate(async (base) => {
    const headers = { Authorization: `Token ${localStorage.getItem('pwb_token')}` }
    const me = await (await fetch(`${base}/auth/me/`, { headers })).json()
    const sites = await (await fetch(`${base}/sites/`, { headers })).json()
    return { id: me.id, guest: me.is_guest, titles: (sites.results || sites).map((s) => s.title) }
  }, API)
  expect(after).toEqual({ id: guest.id, guest: false, titles: expect.arrayContaining(['E2E guest work']) })
})
