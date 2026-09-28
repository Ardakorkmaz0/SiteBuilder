// The theme panel, a block offered to the community, and a draft shared by
// its link: three places that said one thing and did another.
import { randomBytes } from 'node:crypto'
import { test, expect, api, API, createHtmlSite, openEditor, clickInFrame, publish } from './support.js'

const properties = (page) => page.locator('[data-tour="properties"]')

// Colour and font edits wait for Apply, while the panel said "Changes here
// reach every page" and a save published the old colours.
test('a theme edit says it is not on the page until it is applied', async ({ page, request }) => {
  const { data: site } = await api(request, 'POST', '/sites/', { title: 'E2E theme' })
  await openEditor(page, site.id)
  await page.getByRole('tab', { name: 'Theme' }).click()
  const background = properties(page).locator('label')
    .filter({ has: page.locator('span', { hasText: /^Site background$/ }) }).locator('input[type=text]')
  await background.fill('#123456')
  await expect(properties(page).getByRole('status')).toContainText('Not on the page yet')

  await properties(page).getByRole('button', { name: 'Apply to design' }).click()
  await expect(properties(page).getByRole('status')).toHaveCount(0)
  await page.locator('header').getByRole('button', { name: 'Save', exact: true }).click()
  await expect.poll(async () => (await api(request, 'GET', `/sites/${site.id}/`)).data.schema.pages[0].background)
    .toBe('#123456')
  await api(request, 'DELETE', `/sites/${site.id}/`)
})

// Opened from a toolbar inside the page frame, the dialog left focus there
// (no Esc, no Tab) and closed on success without a word.
test('sharing a block takes the keyboard and says where it went', async ({ page, request }) => {
  const title = `E2E card ${randomBytes(2).toString('hex')}`
  const siteId = await createHtmlSite(request, 'E2E block source', [{
    html: '<!DOCTYPE html><html><head><style>.card{padding:24px;background:#fef3c7}</style></head><body>'
      + '<div id="card" class="card"><h3>A card</h3></div></body></html>',
  }])
  await openEditor(page, siteId, { edit: true })
  await publish(page, request, siteId)

  await clickInFrame(page, '#card', { x: 4, y: 4 })
  await clickInFrame(page, '[data-pwb-selection-action="share"]')
  const dialog = page.getByRole('dialog', { name: 'Share to the community' })
  await expect(dialog.getByLabel('Name')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)

  await clickInFrame(page, '#card', { x: 4, y: 4 })
  await clickInFrame(page, '[data-pwb-selection-action="share"]')
  await dialog.getByLabel('Name').fill(title)
  await dialog.getByRole('button', { name: 'Share', exact: true }).click()
  await expect(dialog.getByRole('status')).toContainText(`“${title}” is in the community library.`)
  await api(request, 'DELETE', `/sites/${siteId}/`)
})

test('a shared draft opens for exactly the people it is shared with', async ({ page, request, browser }) => {
  const draft = `E2E draft ${randomBytes(2).toString('hex')}`
  const siteId = await createHtmlSite(request, 'E2E shared draft', [{ html: `<!DOCTYPE html><html><body><h1>${draft}</h1></body></html>` }])

  // A second person, signed up for this test.
  const name = `e2e_friend_${randomBytes(3).toString('hex')}`
  const signup = await request.post(`${API}/auth/register/`, {
    data: { username: name, email: `${name}@example.test`, password: `E2e-${randomBytes(12).toString('base64url')}` },
  })
  const friend = await signup.json()

  const sees = async (token) => {
    // Contexts made in a test start from the project's signed-in state;
    // this visitor starts from nothing.
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const visitor = await context.newPage()
    if (token) {
      await visitor.goto('/login')
      await visitor.evaluate(([t, u]) => { localStorage.setItem('pwb_token', t); localStorage.setItem('pwb_user', u) }, [token, JSON.stringify(friend.user)])
    }
    await visitor.goto(link)
    await visitor.waitForLoadState('networkidle')
    await visitor.waitForTimeout(1500)
    const shown = await visitor.evaluate(() => document.body.innerText + [...document.querySelectorAll('iframe')].map((f) => f.getAttribute('srcdoc') || '').join(' '))
    await context.close()
    return shown.includes(draft)
  }

  await openEditor(page, siteId)
  await page.locator('header').getByRole('button', { name: /^Share/ }).first().click()
  const panel = page.getByRole('dialog').last()
  await expect(panel.getByRole('radio', { name: /^Not shared/ })).toBeChecked()
  const link = await panel.locator('input').evaluateAll((inputs) => inputs.map((i) => i.value).find((v) => v.includes('/review/')))
  expect(await sees(null), 'signed out, not shared').toBe(false)

  await panel.getByRole('radio', { name: /^Anyone with the link/ }).click()
  await expect(panel.getByRole('radio', { name: /^Anyone with the link/ })).toBeChecked()
  expect(await sees(null), 'signed out, anyone with the link').toBe(true)

  await panel.getByRole('radio', { name: /^Only people you name/ }).click()
  await expect(panel.getByRole('radio', { name: /^Only people you name/ })).toBeChecked()
  expect(await sees(friend.token), 'not named yet').toBe(false)
  await panel.getByLabel('Username').fill(name)
  await panel.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(panel.getByText(name)).toBeVisible()
  expect(await sees(friend.token), 'named').toBe(true)
  await api(request, 'DELETE', `/sites/${siteId}/`)
})
