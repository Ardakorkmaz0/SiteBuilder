import { test, expect, api, createHtmlSite, openEditor, BACKEND } from './support.js'

const document = (text) => `<!doctype html><html><head><title>${text}</title></head><body><h1>${text}</h1></body></html>`

test('loading a published checkpoint also restores the documents and addresses visitors receive', async ({ page, request }) => {
  const savedHome = document('Saved home content')
  const savedAbout = document('Saved about content')
  const newHome = document('New home content')
  const newContact = document('New contact content')
  const siteId = await createHtmlSite(request, 'E2E published checkpoint', [
    { html: savedHome },
    { id: 'page_about', name: 'About', html: savedAbout },
  ])
  try {
    const first = await api(request, 'PATCH', `/sites/${siteId}/`, {
      published: true,
      html: savedHome,
      published_pages: [
        { path: '', title: 'Saved home', html: savedHome },
        { path: 'about', title: 'Saved about', html: savedAbout },
      ],
    })
    expect(first.status, JSON.stringify(first.data)).toBe(200)
    const checkpoint = await api(request, 'POST', `/sites/${siteId}/versions/checkpoint/`, { label: 'Public launch checkpoint' })
    expect(checkpoint.status, JSON.stringify(checkpoint.data)).toBe(201)
    const next = await api(request, 'PATCH', `/sites/${siteId}/`, {
      html: newHome,
      schema: {
        ...first.data.schema,
        pages: [
          { ...first.data.schema.pages[0], html: newHome },
          { ...first.data.schema.pages[1], id: 'page_contact', name: 'Contact', html: newContact },
        ],
      },
      published_pages: [
        { path: '', title: 'New home', html: newHome },
        { path: 'contact', title: 'New contact', html: newContact },
      ],
    })
    expect(next.status, JSON.stringify(next.data)).toBe(200)
    const slug = next.data.slug
    const current = await request.get(`${BACKEND}/s/${slug}/contact/`)
    expect(current.status()).toBe(200)
    expect(await current.text()).toContain('New contact content')

    await openEditor(page, siteId)
    await page.getByRole('button', { name: 'More actions', exact: true }).click()
    await page.getByRole('button', { name: 'History', exact: true }).click()
    const history = page.getByRole('complementary', { name: 'Saves & history', exact: true })
    const checkpointRow = history.getByRole('listitem').filter({ hasText: 'Public launch checkpoint' })
    await expect(checkpointRow).toHaveCount(1)
    const load = checkpointRow.getByRole('button', { name: 'Load', exact: true })
    const restored = page.waitForResponse((response) => new URL(response.url()).pathname === `/api/sites/${siteId}/versions/${checkpoint.data.id}/restore/`)
    await load.click()
    expect((await restored).status()).toBe(200)
    await expect(load).toBeEnabled()

    const home = await request.get(`${BACKEND}/s/${slug}/`)
    expect(home.status()).toBe(200)
    expect(await home.text()).toContain('Saved home content')
    const about = await request.get(`${BACKEND}/s/${slug}/about/`)
    expect(about.status()).toBe(200)
    expect(await about.text()).toContain('Saved about content')
    expect((await request.get(`${BACKEND}/s/${slug}/contact/`)).status()).toBe(404)
    const loaded = await api(request, 'GET', `/sites/${siteId}/`)
    expect(loaded.data.schema.pages.map((item) => item.name)).toEqual(['Home', 'About'])
    expect(loaded.data.schema.pages[0].html).toContain('Saved home content')
  } finally {
    expect((await api(request, 'DELETE', `/sites/${siteId}/`)).status).toBe(204)
  }
})
