// Each file goes live on its own from the file list, keeps off the public site
// on request, and Ctrl+Z takes either back: checked at the addresses visitors use.
import { test, expect, api, createHtmlSite, openEditor, BACKEND } from './support.js'

const document = (text) => `<!doctype html><html><head><title>${text}</title></head><body><h1>${text}</h1></body></html>`

test('a file goes live alone, stays off on request, and Ctrl+Z takes each back', async ({ page, request }) => {
  const siteId = await createHtmlSite(request, 'E2E page live', [
    { html: document('Home content') },
    { id: 'page_about', name: 'About', html: document('About content') },
    { id: 'page_team', name: 'Team', html: document('Team content') },
  ])
  const statusOf = async (slug, path) => (await request.get(`${BACKEND}/s/${slug}/${path}`)).status()
  const row = (name) => page.getByRole('button', { name, exact: true }).locator('..')
  const menuOf = (name) => page.getByRole('menu', { name: `Options for ${name}`, exact: true })
  const isWrite = (path) => (response) => new URL(response.url()).pathname === `/api/sites/${siteId}/${path}/` && response.request().method() === 'POST'
  try {
    await openEditor(page, siteId)
    await expect(row('index.html')).toHaveAttribute('data-live-state', 'none')
    await expect(row('about.html')).toHaveAttribute('data-live-state', 'none')

    let written = page.waitForResponse(isWrite('page-live'))
    await row('index.html').click({ button: 'right', position: { x: 4, y: 4 } })
    await menuOf('index.html').getByRole('menuitem', { name: 'Go live', exact: true }).click()
    const sentHome = await written
    expect(sentHome.status()).toBe(200)
    const { slug } = await sentHome.json()
    await expect(row('index.html')).toHaveAttribute('data-live-state', 'live')
    expect(await statusOf(slug, '')).toBe(200)
    expect(await statusOf(slug, 'about/')).toBe(404)

    written = page.waitForResponse(isWrite('page-live'))
    await row('about.html').click({ button: 'right', position: { x: 4, y: 4 } })
    await menuOf('about.html').getByRole('menuitem', { name: 'Go live', exact: true }).click()
    expect((await written).status()).toBe(200)
    await expect(row('about.html')).toHaveAttribute('data-live-state', 'live')
    expect(await statusOf(slug, 'about/')).toBe(200)
    expect(await statusOf(slug, 'team/')).toBe(404)

    // The draft of a page that never went live cannot be read from outside.
    const pub = await (await request.get(`${BACKEND}/api/public/sites/${slug}/`)).json()
    expect(pub.schema.pages.map((item) => item.name)).toEqual(['Home', 'About'])

    written = page.waitForResponse(isWrite('live-undo'))
    await page.keyboard.press('Control+z')
    expect((await written).status()).toBe(200)
    await expect(row('about.html')).toHaveAttribute('data-live-state', 'none')
    expect(await statusOf(slug, 'about/')).toBe(404)
    expect(await statusOf(slug, '')).toBe(200)

    written = page.waitForResponse(isWrite('live-undo'))
    await page.keyboard.press('Control+Shift+z')
    expect((await written).status()).toBe(200)
    await expect(row('about.html')).toHaveAttribute('data-live-state', 'live')
    expect(await statusOf(slug, 'about/')).toBe(200)

    written = page.waitForResponse(isWrite('page-visibility'))
    await row('about.html').click({ button: 'right', position: { x: 4, y: 4 } })
    await menuOf('about.html').getByRole('menuitemcheckbox', { name: 'Do not show in public', exact: true }).click()
    expect((await written).status()).toBe(200)
    await expect(row('about.html')).toHaveAttribute('data-live-state', 'none')
    expect(await statusOf(slug, 'about/')).toBe(404)

    // Sending the whole site leaves it out, and brings the unsent page in.
    const sent = page.waitForResponse((response) => new URL(response.url()).pathname === `/api/sites/${siteId}/`
      && ['PUT', 'PATCH'].includes(response.request().method()))
    await page.getByRole('button', { name: 'Send draft live', exact: true }).click()
    expect((await sent).status()).toBe(200)
    await expect(row('team.html')).toHaveAttribute('data-live-state', 'live')
    expect(await statusOf(slug, 'team/')).toBe(200)
    expect(await statusOf(slug, 'about/')).toBe(404)
  } finally {
    expect((await api(request, 'DELETE', `/sites/${siteId}/`)).status).toBe(204)
  }
})
