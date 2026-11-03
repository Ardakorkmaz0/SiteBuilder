// A diagnostic of the browser's first native media value, independent of the
// app server. The real palette head script is used on a synthetic HTTP page.
// A light native value is recorded, not blamed on the app or skipped in Firefox.
import { devices, expect, test } from '@playwright/test'
import { colorModeFor, colorModeHeadTags } from '../src/utils/colorMode.js'

const ORIGIN = 'https://dark-mode-browser-probe.test'
const SANDBOX = 'sandbox allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads'
const pageSchema = { id: 'home', components: [{ id: 'switch', type: 'themeToggle', props: { states: 'three' } }] }
const mode = colorModeFor({ theme: { backgroundColor: '#ffffff' }, colorMode: { start: 'light' }, pages: [pageSchema] }, pageSchema)

function fixture(kind) {
  const firstMarkup = kind === 'palette'
    ? colorModeHeadTags(mode)
    : '<script>window.__probeControlFirst = matchMedia("(prefers-color-scheme: dark)").matches;</script>'
  return `<!doctype html><html><head><meta charset="utf-8">
    <link rel="icon" href="data:,">
    ${firstMarkup}
    <script>
      window.__probeHead = {
        palette: document.documentElement.getAttribute('data-pwb-theme'),
        pick: document.documentElement.getAttribute('data-pwb-theme-pick'),
        follow: document.documentElement.hasAttribute('data-pwb-theme-follow'),
        darkAfterScript: matchMedia('(prefers-color-scheme: dark)').matches,
        lightAfterScript: matchMedia('(prefers-color-scheme: light)').matches,
        readyState: document.readyState
      };
    </script>
    <style>#media-control{background:rgb(255,255,255)}@media(prefers-color-scheme:dark){#media-control{background:rgb(0,0,0)}}</style>
    </head><body><h1>Native color scheme probe</h1><div id="media-control">CSS media control</div></body></html>`
}

test('records first-load device media in plain and sandboxed documents in both engines', async ({ browser, browserName }, testInfo) => {
  test.setTimeout(90_000)
  const observations = []
  const metadata = {
    browserName,
    browserVersion: browser.version(),
    project: testInfo.project.name,
    descriptor: browserName === 'firefox' ? devices['Desktop Firefox'] : devices['Desktop Chrome'],
    syntheticDocument: true,
    realPaletteHeadScript: true,
  }
  expect(mode).toMatchObject({ base: 'light', alt: 'dark', initial: 'light' })
  try {
    for (const setup of ['context-dark', 'page-dark-before-goto']) {
      for (const sandboxed of [false, true]) {
        for (const kind of ['control', 'palette']) {
          const context = await browser.newContext({
            storageState: { cookies: [], origins: [] },
            colorScheme: setup === 'context-dark' ? 'dark' : 'light',
          })
          try {
            // This wrapper returns the real MediaQueryList unchanged. It records
            // the app's first native value without making a media query early.
            await context.addInitScript(() => {
              window.__probeMediaCalls = []
              const nativeMatchMedia = window.matchMedia.bind(window)
              window.matchMedia = (query) => {
                const result = nativeMatchMedia(query)
                window.__probeMediaCalls.push({ query, matches: result.matches, readyState: document.readyState, time: performance.now() })
                return result
              }
            })
            const page = await context.newPage()
            if (setup === 'page-dark-before-goto') await page.emulateMedia({ colorScheme: 'dark' })
            const path = `/probe/${setup}/${sandboxed ? 'sandbox' : 'plain'}/${kind}`
            let interceptedDocuments = 0
            await page.route(`${ORIGIN}${path}*`, async (route) => {
              expect(route.request().resourceType()).toBe('document')
              interceptedDocuments += 1
              await route.fulfill({
                status: 200,
                contentType: 'text/html; charset=utf-8',
                headers: { 'Cache-Control': 'no-store', ...(sandboxed ? { 'Content-Security-Policy': SANDBOX } : {}) },
                body: fixture(kind),
              })
            })
            const url = `${ORIGIN}${path}?pwb-theme=system`
            for (const navigation of ['first', 'reload']) {
              if (navigation === 'first') await page.goto(url)
              else await page.reload()
              const observed = await page.evaluate(() => ({
                head: window.__probeHead,
                mediaCalls: window.__probeMediaCalls,
                controlFirst: window.__probeControlFirst,
                darkAfterLoad: matchMedia('(prefers-color-scheme: dark)').matches,
                lightAfterLoad: matchMedia('(prefers-color-scheme: light)').matches,
                cssControl: getComputedStyle(document.getElementById('media-control')).backgroundColor,
                paletteAfterLoad: document.documentElement.getAttribute('data-pwb-theme'),
                userAgent: navigator.userAgent,
              }))
              observations.push({ setup, sandboxed, kind, navigation, interceptedDocuments, ...observed })
              expect(observed.mediaCalls[0].query).toBe('(prefers-color-scheme: dark)')
              expect(observed.head.readyState).toBe('loading')
              if (kind === 'palette') {
                expect(observed.head.pick).toBe('system')
                expect(observed.head.follow).toBe(true)
                expect(observed.head.palette).toBe(observed.mediaCalls[0].matches ? 'dark' : 'light')
              } else {
                expect(observed.controlFirst).toBe(observed.mediaCalls[0].matches)
              }
              expect(observed.cssControl).toBe(observed.darkAfterLoad ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)')
            }
            expect(interceptedDocuments).toBe(2)
          } finally {
            await context.close()
          }
        }
      }
    }
  } finally {
    await testInfo.attach('initial-device-media-probe.json', {
      body: Buffer.from(JSON.stringify({ metadata, observations }, null, 2)),
      contentType: 'application/json',
    })
  }
})

test('records the same initial documents without a matchMedia wrapper or init script', async ({ browser, browserName }, testInfo) => {
  test.setTimeout(60_000)
  const observations = []
  try {
    for (const sandboxed of [false, true]) {
      for (const kind of ['control', 'palette']) {
        const context = await browser.newContext({ storageState: { cookies: [], origins: [] }, colorScheme: 'dark' })
        try {
          const page = await context.newPage()
          const path = `/unwrapped/${sandboxed ? 'sandbox' : 'plain'}/${kind}`
          let interceptedDocuments = 0
          await page.route(`${ORIGIN}${path}*`, async (route) => {
            expect(route.request().resourceType()).toBe('document')
            interceptedDocuments += 1
            await route.fulfill({
              status: 200,
              contentType: 'text/html; charset=utf-8',
              headers: { 'Cache-Control': 'no-store', ...(sandboxed ? { 'Content-Security-Policy': SANDBOX } : {}) },
              body: fixture(kind),
            })
          })
          for (const navigation of ['first', 'reload']) {
            if (navigation === 'first') await page.goto(`${ORIGIN}${path}?pwb-theme=system`)
            else await page.reload()
            const observed = await page.evaluate(() => ({
              head: window.__probeHead,
              controlFirst: window.__probeControlFirst,
              darkAfterLoad: matchMedia('(prefers-color-scheme: dark)').matches,
              cssControl: getComputedStyle(document.getElementById('media-control')).backgroundColor,
              paletteAfterLoad: document.documentElement.getAttribute('data-pwb-theme'),
            }))
            observations.push({ sandboxed, kind, navigation, interceptedDocuments, ...observed })
            if (kind === 'palette') {
              expect(observed.head.pick).toBe('system')
              expect(['light', 'dark']).toContain(observed.head.palette)
            } else {
              expect(typeof observed.controlFirst).toBe('boolean')
            }
            expect(observed.cssControl).toBe(observed.darkAfterLoad ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)')
          }
          expect(interceptedDocuments).toBe(2)
        } finally {
          await context.close()
        }
      }
    }
  } finally {
    await testInfo.attach('initial-device-media-unwrapped.json', {
      body: Buffer.from(JSON.stringify({ browserName, browserVersion: browser.version(), syntheticDocument: true, observations }, null, 2)),
      contentType: 'application/json',
    })
  }
})
