import { test, expect, api, openEditor, save, publish, BACKEND } from './support.js'
import { pointerAt } from './behaviourActions.js'

const source = `<!doctype html><html lang="en"><title>Field journal</title>
<body><h1>Field journal</h1>
<button type="button" onclick="document.getElementById('reading').hidden = !document.getElementById('reading').hidden">Inspect sample</button>
<p id="reading" hidden>The sample contains mica.</p></body></html>`

async function pointAt(page, control) {
  await expect(control).toBeVisible()
  expect(await pointerAt(page, control)).toBe('clicked')
}

async function inspectSample(page) {
  const control = page.getByText('Inspect sample', { exact: true })
  const reading = page.getByText('The sample contains mica.', { exact: true })
  await expect(reading).toHaveCount(1)
  await expect(reading).toBeHidden()
  await pointAt(page, control)
  await expect(reading).toBeVisible()
  await pointAt(page, control)
  await expect(reading).toBeHidden()
}

test('sample inspection survives conversion, saving, reopening and anonymous publication', async ({ page, request, browser }) => {
  const visitor = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  let siteId
  try {
    const original = await visitor.newPage()
    await original.setContent(source)
    await inspectSample(original)
    await original.close()

    const created = await api(request, 'POST', '/sites/', { title: 'E2E field journal' })
    expect(created.status).toBe(201)
    siteId = created.data.id
    const path = `/sites/${siteId}/`
    const loaded = await api(request, 'GET', path)
    expect(loaded.status).toBe(200)
    const schema = loaded.data.schema
    const seeded = await api(request, 'PATCH', path, {
      schema: { ...schema, pages: [{ ...schema.pages[0], mode: 'html', html: source }] },
    })
    expect(seeded.status).toBe(200)
    await openEditor(page, siteId)
    await pointAt(page, page.getByRole('banner').getByRole('button', { name: 'More actions', exact: true }))
    await pointAt(page, page.getByRole('button', { name: 'Convert to canvas blocks', exact: true }))
    await expect(page.getByRole('heading', { name: 'Field journal', exact: true })).toBeVisible({ timeout: 45_000 })
    await save(page)
    const saved = await api(request, 'GET', path)
    expect(saved.status).toBe(200)
    expect(saved.data.schema.pages[0]).toMatchObject({ mode: 'empty', html: '', htmlBackup: source })
    await page.goto('about:blank')
    await openEditor(page, siteId)
    const slug = await publish(page, request, siteId)
    const published = await visitor.newPage()
    const response = await published.goto(`${BACKEND}/s/${slug}/`)
    expect(response.status()).toBe(200)
    const sandbox = (await response.headerValue('content-security-policy') || '').split(';')
      .map(directive => directive.trim().split(/\s+/)).find(words => words[0] === 'sandbox')
    expect(sandbox).toContain('allow-scripts')
    expect(sandbox).not.toContain('allow-same-origin')
    await inspectSample(published)
  } finally {
    try {
      if (siteId) expect((await api(request, 'DELETE', `/sites/${siteId}/`)).status).toBe(204)
    } finally {
      await visitor.close()
    }
  }
})
