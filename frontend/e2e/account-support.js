import { randomBytes } from 'node:crypto'
import { API, api, expect } from './support.js'

export const unique = (prefix) => `${prefix}_${randomBytes(6).toString('hex')}`
export const testPassword = () => `E2e-${randomBytes(12).toString('base64url')}`
export const rows = (data) => Array.isArray(data) ? data : data.results
export const reply = (page, path, method = 'POST') => page.waitForResponse((response) =>
  new URL(response.url()).pathname === `/api${path}` && response.request().method() === method)

export async function makeAccount(request) {
  const username = unique('round6')
  const password = testPassword()
  const email = `${username}@example.test`
  const response = await request.post(`${API}/auth/register/`, { data: { username, email, password } })
  // Do not include authentication responses in assertion messages.
  expect(response.status()).toBe(201)
  return { ...await response.json(), username, password, email }
}

export async function publishedSite(request, author, title) {
  const created = await api(request, 'POST', '/sites/', { title }, author.token)
  expect(created.status).toBe(201)
  const published = await api(request, 'PATCH', `/sites/${created.data.id}/`, {
    published: true,
    category: 'portfolio',
    published_pages: [{ path: '', title: 'Home', html: '<!doctype html><h1>Round six fixture</h1>' }],
  }, author.token)
  expect(published.status).toBe(200)
  return published.data
}

export async function signIn(page, username, password, expectedStatus = 200) {
  await page.getByRole('textbox', { name: 'Username', exact: true }).fill(username)
  await page.getByLabel('Password', { exact: true }).fill(password)
  const signedIn = reply(page, '/auth/login/')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  const response = await signedIn
  expect(response.status()).toBe(expectedStatus)
  return expectedStatus === 200 ? response.json() : null
}

export async function signOut(page) {
  await page.getByRole('button', { name: 'Account menu', exact: true }).click()
  await page.getByRole('button', { name: 'Log out', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
}
