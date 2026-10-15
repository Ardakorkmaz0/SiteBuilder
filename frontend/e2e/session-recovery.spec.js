import { randomBytes } from 'node:crypto'
import { test, expect, API, api, openEditor, save } from './support.js'

test.use({ isolatedAccount: false, storageState: { cookies: [], origins: [] } })

test('an expired editor session can sign in and recover unsaved HTML', async ({ page, request }) => {
  const username = `e2e_recovery_${randomBytes(4).toString('hex')}`
  const password = `Recovery-${randomBytes(12).toString('base64url')}`
  const registration = await request.post(`${API}/auth/register/`, {
    data: { username, email: `${username}@example.test`, password },
  })
  expect(registration.status()).toBe(201)
  const { token, user } = await registration.json()
  const { data: site, status } = await api(request, 'POST', '/sites/', { title: 'E2E recovery' }, token)
  expect(status).toBe(201)
  const html = '<!doctype html><html><body><h1>Before expiry</h1></body></html>'
  await api(request, 'PATCH', `/sites/${site.id}/`, {
    schema: { ...site.schema, pages: [{ ...site.schema.pages[0], mode: 'html', html }] },
  }, token)
  try {
    await page.goto('/login')
    await page.evaluate(({ token, user }) => {
      localStorage.setItem('pwb_token', token)
      localStorage.setItem('pwb_user', JSON.stringify(user))
      localStorage.setItem('pwb_editor_tour_v1', '1')
      localStorage.setItem('pwb_language', 'en')
    }, { token, user })
    await openEditor(page, site.id)
    await page.getByRole('button', { name: 'Source', exact: true }).click()
    const field = page.getByRole('textbox', { name: /HTML source/i })
    await expect(field).toBeVisible()
    await field.fill('<!doctype html><html><body><h1>Recover this unsaved document</h1></body></html>')
    await page.route(`${API}/sites/${site.id}/`, async (route) => {
      if (!['PUT', 'PATCH'].includes(route.request().method())) return route.continue()
      await route.fulfill({ status: 401, headers: { 'Access-Control-Allow-Origin': 'http://localhost:5173' }, json: { detail: 'Session expired' } })
      await page.unroute(`${API}/sites/${site.id}/`)
    })
    await page.locator('header').getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page).toHaveURL(/\/login$/)
    await page.getByLabel('Username').fill(username)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/editor/${site.id}$`))
    await page.getByRole('button', { name: 'Restore local draft' }).click()
    await expect(page.getByRole('textbox', { name: /HTML source/i })).toHaveValue(/Recover this unsaved document/)
    await save(page)
    const { data: restored } = await api(request, 'GET', `/sites/${site.id}/`, undefined, token)
    expect(restored.schema.pages[0].html).toContain('Recover this unsaved document')
  } finally {
    await api(request, 'DELETE', `/sites/${site.id}/`, undefined, token)
  }
})
