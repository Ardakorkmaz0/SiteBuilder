import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { test, expect, API, APP_ORIGIN, api } from './support.js'
import { makeAccount, unique, testPassword, reply, signIn, signOut } from './account-support.js'

test.use({ isolatedAccount: false, storageState: { cookies: [], origins: [] } })

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('pwb_language', 'en')
    localStorage.setItem('pwb_editor_tour_v1', '1')
  })
})

async function resetLinkFor(email) {
  const directory = fileURLToPath(new URL('./.mail/', import.meta.url))
  for (const filename of await fs.readdir(directory).catch(() => [])) {
    const message = await fs.readFile(`${directory}${filename}`, 'utf8')
    if (!message.includes(`To: ${email}`)) continue
    const decoded = message.replace(/=\r?\n/g, '').replace(/=3D/g, '=')
    const link = decoded.match(/http:\/\/localhost:5173\/reset-password\?[^\s<>]+/)?.[0]
    if (link) return link
  }
  return null
}

test('registration, logout and local-mail reset preserve identity and revoke the old session', async ({ page, request }) => {
  const username = unique('lifecycle')
  const email = `${username}@example.test`
  const password = testPassword()
  const replacement = testPassword()
  await page.goto('/register')
  await page.getByRole('textbox', { name: 'Username', exact: true }).fill(username)
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  const registered = reply(page, '/auth/register/')
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  const response = await registered
  expect(response.status()).toBe(201)
  const original = await response.json()
  await expect(page).toHaveURL(`${APP_ORIGIN}/`)
  await signOut(page)

  await signIn(page, username, testPassword(), 400)
  await expect(page.getByRole('alert')).toBeVisible()
  const returning = await signIn(page, username.toUpperCase(), password)
  expect(returning.user.id).toBe(original.user.id)
  await expect(page).toHaveURL(`${APP_ORIGIN}/`)
  await signOut(page)

  await page.getByRole('link', { name: 'Forgot password?', exact: true }).click()
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email)
  const sent = reply(page, '/auth/password/reset/')
  await page.getByRole('button', { name: 'Send reset link', exact: true }).click()
  expect((await sent).status()).toBe(200)
  await expect(page.getByRole('status')).toContainText(email)
  // Poll a boolean so a failed assertion cannot print the reset token.
  await expect.poll(async () => Boolean(await resetLinkFor(email))).toBe(true)
  const link = await resetLinkFor(email)
  expect(new URL(link).origin === APP_ORIGIN).toBe(true)
  await page.goto(link)
  await page.getByLabel('New password', { exact: true }).fill(replacement)
  const reset = reply(page, '/auth/password/reset/confirm/')
  await page.getByRole('button', { name: 'Reset password', exact: true }).click()
  expect((await reset).status()).toBe(200)
  await expect(page.getByRole('status')).toContainText('Your password has been reset.')
  await expect(page).toHaveURL(`${APP_ORIGIN}/login`)
  const oldSession = await request.get(`${API}/auth/me/`, { headers: { Authorization: `Token ${original.token}` } })
  expect(oldSession.status()).toBe(401)
  await signIn(page, username, password, 400)
  await expect(page.getByRole('alert')).toBeVisible()
  const renewed = await signIn(page, username, replacement)
  expect(renewed.user.id).toBe(original.user.id)
  expect(renewed.token === original.token).toBe(false)
  await expect(page).toHaveURL(`${APP_ORIGIN}/`)
})

test('signing into an existing account adopts a guest draft without changing its contents', async ({ page, request }) => {
  const owner = await makeAccount(request)
  let siteId
  let guestToken
  try {
    await page.goto('/login')
    const entered = reply(page, '/auth/guest/')
    await page.getByRole('button', { name: 'Continue without signing in', exact: true }).click()
    const response = await entered
    expect(response.status()).toBe(201)
    const guest = await response.json()
    guestToken = guest.token
    await expect(page).toHaveURL(`${APP_ORIGIN}/`)
    const title = unique('Guest draft')
    const created = await api(request, 'POST', '/sites/', { title }, guest.token)
    expect(created.status).toBe(201)
    siteId = created.data.id
    const before = await api(request, 'GET', `/sites/${siteId}/`, undefined, guest.token)
    expect(before.status).toBe(200)
    await page.goto('/login')
    const adopted = reply(page, '/auth/adopt/')
    const signedIn = await signIn(page, owner.username, owner.password)
    expect(signedIn.user.id).toBe(owner.user.id)
    const adoption = await adopted
    expect(adoption.status()).toBe(200)
    expect((await adoption.json()).moved.sites).toBe(1)
    await expect(page).toHaveURL(`${APP_ORIGIN}/`)
    const after = await api(request, 'GET', `/sites/${siteId}/`, undefined, owner.token)
    expect(after.status).toBe(200)
    expect(after.data.title).toBe(title)
    expect(after.data.schema).toEqual(before.data.schema)
    const formerGuest = await api(request, 'GET', `/sites/${siteId}/`, undefined, guest.token)
    expect(formerGuest.status).toBe(401)
    await page.reload()
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
  } finally {
    if (siteId) {
      let removed = await api(request, 'DELETE', `/sites/${siteId}/`, undefined, owner.token)
      if (removed.status === 404 && guestToken) removed = await api(request, 'DELETE', `/sites/${siteId}/`, undefined, guestToken)
      expect(removed.status).toBe(204)
    }
  }
})
