import { test, expect, api, openEditor, publish, BACKEND } from './support.js'

const TITLE = 'Security boundary fixture'
const SENTINEL_KEY = 'pwb_security_fixture'
const SENTINEL_VALUE = 'owned-test-data'
const CONTACT_ID = 'sandbox_contact'
const HOME = `<!doctype html><html><head><title>Sandbox home</title></head><body>
  <h1>Sandbox home</h1>
  <p role="status" aria-label="Script execution">pending</p>
  <p role="status" aria-label="Parent DOM access">pending</p>
  <p role="status" aria-label="Storage access">pending</p>
  <p role="status" aria-label="Cookie access">pending</p>
  <a href="#${CONTACT_ID}">Open contact safely</a>
  <script>
    function probe(name, read) {
      var outcome = 'accessible';
      try { read(); } catch (error) { outcome = error.name === 'SecurityError' ? 'blocked' : 'unexpected error'; }
      document.querySelector('[aria-label="' + name + '"]').textContent = outcome;
    }
    probe('Parent DOM access', function () {
      parent.document.documentElement.setAttribute('data-security-parent-access', 'changed');
    });
    probe('Storage access', function () { localStorage.getItem('${SENTINEL_KEY}'); });
    probe('Cookie access', function () { return document.cookie; });
    document.querySelector('[aria-label="Script execution"]').textContent = 'Script executed';
  </script>
</body></html>`

async function seed(request) {
  const created = await api(request, 'POST', '/sites/', { title: TITLE })
  expect(created.status).toBe(201)
  const id = created.data.id
  try {
    const loaded = await api(request, 'GET', `/sites/${id}/`)
    expect(loaded.status).toBe(200)
    const schema = loaded.data.schema
    const result = await api(request, 'PATCH', `/sites/${id}/`, {
      schema: { ...schema, pages: [
        { ...schema.pages[0], id: 'sandbox_home', name: 'Home', mode: 'html', html: HOME, components: [] },
        { ...schema.pages[0], id: CONTACT_ID, name: 'Contact', mode: 'html', html: '<!doctype html><html><body><h1>Trusted contact page</h1></body></html>', components: [] },
      ] },
    })
    expect(result.status).toBe(200)
    return id
  } catch (error) {
    await api(request, 'DELETE', `/sites/${id}/`)
    throw error
  }
}

async function expectIsolation(surface, { parent = false } = {}) {
  await expect(surface.getByRole('status', { name: 'Script execution', exact: true })).toHaveText('Script executed')
  await expect(surface.getByRole('status', { name: 'Storage access', exact: true })).toHaveText('blocked')
  await expect(surface.getByRole('status', { name: 'Cookie access', exact: true })).toHaveText('blocked')
  if (parent) await expect(surface.getByRole('status', { name: 'Parent DOM access', exact: true })).toHaveText('blocked')
}

test('the live viewer runs user scripts without giving them the app or trusting a foreign sender', async ({ page, request }) => {
  const siteId = await seed(request)
  try {
    await openEditor(page, siteId)
    const slug = await publish(page, request, siteId)
    await page.evaluate(([key, value]) => localStorage.setItem(key, value), [SENTINEL_KEY, SENTINEL_VALUE])
    await page.goto(`/site/${slug}#%E0%A4%A`)
    const frame = page.frameLocator(`iframe[title="${TITLE}"]`)
    await expectIsolation(frame, { parent: true })
    expect(await page.evaluate(() => document.documentElement.getAttribute('data-security-parent-access'))).toBeNull()
    expect(await page.evaluate((key) => localStorage.getItem(key), SENTINEL_KEY)).toBe(SENTINEL_VALUE)

    // A real delivered message from the app window is a different WindowProxy
    // from the displayed opaque-origin frame. Wait for delivery before checking.
    await page.evaluate((contactId) => new Promise((resolve) => {
      const delivered = (event) => {
        if (event.source !== window || event.data?.type !== 'pwb-navigate') return
        window.removeEventListener('message', delivered)
        resolve()
      }
      window.addEventListener('message', delivered)
      window.postMessage({ type: 'pwb-navigate', hash: '#' + contactId }, '*')
    }), CONTACT_ID)
    await expect(page).not.toHaveURL(new RegExp(`#${CONTACT_ID}$`))
    await expect(frame.getByRole('heading', { name: 'Sandbox home', exact: true })).toBeVisible()

    // The same navigation from the displayed frame is allowed.
    await frame.getByRole('link', { name: 'Open contact safely', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`#${CONTACT_ID}$`))
    await expect(frame.getByRole('heading', { name: 'Trusted contact page', exact: true })).toBeVisible()
  } finally {
    expect((await api(request, 'DELETE', `/sites/${siteId}/`)).status).toBe(204)
  }
})

test('the published HTTP document enforces its CSP sandbox even without an iframe', async ({ page, request, browser }) => {
  const siteId = await seed(request)
  let visitor
  try {
    await openEditor(page, siteId)
    const slug = await publish(page, request, siteId)
    visitor = await browser.newContext()
    const published = await visitor.newPage()
    // Establish readable storage on the SAME HTTP origin before entering /s/.
    // Only this synthetic sentinel is read; no account state is copied here.
    const baseline = await published.goto(`${BACKEND}/api/public/config/`)
    expect(baseline.status()).toBe(200)
    await published.evaluate(([key, value]) => {
      localStorage.setItem(key, value)
      document.cookie = 'pwb_security_fixture=owned-test-data; path=/; SameSite=Lax'
    }, [SENTINEL_KEY, SENTINEL_VALUE])
    expect(await published.evaluate((key) => localStorage.getItem(key), SENTINEL_KEY)).toBe(SENTINEL_VALUE)
    expect(await published.evaluate(() => document.cookie.includes('pwb_security_fixture=owned-test-data'))).toBe(true)

    const response = await published.goto(`${BACKEND}/s/${slug}/`)
    expect(response.status()).toBe(200)
    const policy = response.headers()['content-security-policy'] || ''
    expect(policy).toMatch(/(?:^|;)\s*sandbox\b/)
    expect(policy).toContain('allow-scripts')
    expect(policy).not.toContain('allow-same-origin')
    await expectIsolation(published)
    expect(await published.evaluate(() => window === window.top)).toBe(true)

    await published.goto(`${BACKEND}/api/public/config/`)
    expect(await published.evaluate((key) => localStorage.getItem(key), SENTINEL_KEY)).toBe(SENTINEL_VALUE)
    expect(await published.evaluate(() => document.cookie.includes('pwb_security_fixture=owned-test-data'))).toBe(true)
  } finally {
    try {
      if (visitor) await visitor.close()
    } finally {
      expect((await api(request, 'DELETE', `/sites/${siteId}/`)).status).toBe(204)
    }
  }
})
