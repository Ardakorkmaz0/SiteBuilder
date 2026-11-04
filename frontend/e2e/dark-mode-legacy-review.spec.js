// Historical review evidence: replay the HTML Django actually returned with
// head scripts from three commits. Backend behavior is covered separately;
// this replay checks those recorded documents in both real CI browsers.
import fs from 'node:fs'
import { test, expect } from '@playwright/test'

const matrix = JSON.parse(fs.readFileSync(new URL('./fixtures/served-head-matrix.json', import.meta.url), 'utf8'))

// Firefox's Playwright context can report light during the first head script
// even when colorScheme is dark. Use an independent native reading at that
// same point instead of assuming the emulated preference reached the head.
const nativeProbe = '<script>window.__pwbReviewNativeDark=matchMedia("(prefers-color-scheme: dark)").matches;</script>'

test('recorded old and new palette heads keep their documented cookie and device behavior', async ({ browser, browserName }, testInfo) => {
  expect(matrix.cases).toHaveLength(15)
  expect(new Set(matrix.cases.map((entry) => entry.id)).size).toBe(15)
  const interceptedDocuments = []
  const results = []
  try {
    for (const entry of matrix.cases) {
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] },
        colorScheme: 'dark',
      })
      const url = new URL(entry.url)
      const requestCookies = []
      const errors = []
      try {
        if (entry.incomingCookie) {
          await context.addCookies([{
            name: 'pwb-theme', value: entry.incomingCookie,
            domain: url.hostname, path: '/s/stage3-review/',
            httpOnly: true, sameSite: 'Lax', secure: false,
          }])
        }
        const page = await context.newPage()
        page.on('pageerror', (error) => errors.push(String(error)))
        expect(entry.html.match(/<head>/g), entry.id).toHaveLength(1)
        const body = entry.html.replace('<head>', `<head>${nativeProbe}`)
        const headers = { ...entry.responseHeaders }
        if (entry.responseSetCookie) headers['set-cookie'] = entry.responseSetCookie
        await page.route(`${url.origin}/**`, async (route) => {
          if (route.request().resourceType() !== 'document') {
            await route.fulfill({ status: 204, body: '' })
            return
          }
          interceptedDocuments.push(entry.id)
          const incomingHeaders = await route.request().allHeaders()
          requestCookies.push(incomingHeaders.cookie || '')
          await route.fulfill({ status: 200, headers, body })
        })
        const response = await page.goto(entry.url, { waitUntil: 'load' })
        expect(response, entry.id).not.toBeNull()
        expect(response.status(), entry.id).toBe(200)
        const policy = response.headers()['content-security-policy']
        expect(policy, entry.id).toBe(entry.responseHeaders['content-security-policy'])
        expect(policy, entry.id).toContain('sandbox allow-scripts')
        expect(policy, entry.id).not.toContain('allow-same-origin')
        expect(response.headers()['cache-control'], entry.id).toBe('private, max-age=60')
        expect(response.headers().vary, entry.id).toBe('Cookie')
        const observed = await page.evaluate(() => {
          const root = document.documentElement
          let storageBlocked = false
          try { void localStorage } catch { storageBlocked = true }
          return {
            palette: root.getAttribute('data-pwb-theme'),
            pick: root.getAttribute('data-pwb-theme-pick'),
            followsDevice: root.hasAttribute('data-pwb-theme-follow'),
            headNativeDark: window.__pwbReviewNativeDark,
            loadedNativeDark: matchMedia('(prefers-color-scheme: dark)').matches,
            storageBlocked,
          }
        })
        const cookies = await context.cookies(entry.url)
        const kept = cookies.find((cookie) => cookie.name === 'pwb-theme')
        results.push({
          id: entry.id, browserName, headCommit: entry.headCommit,
          incomingCookie: entry.incomingCookie, query: url.search,
          expected: entry.expected, ...observed,
          keptCookie: kept && { value: kept.value, path: kept.path, httpOnly: kept.httpOnly, sameSite: kept.sameSite },
          documentInterceptions: interceptedDocuments.filter((id) => id === entry.id).length,
        })
        expect(requestCookies, entry.id).toEqual([entry.incomingCookie ? `pwb-theme=${entry.incomingCookie}` : ''])
        expect(observed.storageBlocked, entry.id).toBe(true)
        expect(typeof observed.headNativeDark, entry.id).toBe('boolean')
        const expectedPalette = entry.expected.palette === 'device'
          ? (observed.headNativeDark ? 'dark' : 'light')
          : entry.expected.palette
        expect(observed.palette, entry.id).toBe(expectedPalette)
        expect(observed.pick, entry.id).toBe(entry.expected.pick)
        expect(observed.followsDevice, entry.id).toBe(entry.expected.followsDevice)
        expect(kept, entry.id).toBeDefined()
        expect(kept.value, entry.id).toBe(entry.expected.cookieAfterLoad)
        expect(kept.path, entry.id).toBe('/s/stage3-review/')
        expect(kept.httpOnly, entry.id).toBe(true)
        expect(kept.sameSite, entry.id).toBe('Lax')
        expect(errors, entry.id).toEqual([])
        expect(interceptedDocuments.filter((id) => id === entry.id), entry.id).toHaveLength(1)
      } finally {
        await context.close()
      }
    }
    expect(interceptedDocuments).toHaveLength(15)
    expect(results).toHaveLength(15)
  } finally {
    await testInfo.attach(`legacy-head-matrix-${browserName}`, {
      body: Buffer.from(JSON.stringify({
        browserName, requestedColorScheme: 'dark',
        interceptedDocumentCount: interceptedDocuments.length,
        interceptedDocuments, results,
      }, null, 2)),
      contentType: 'application/json',
    })
  }
})
