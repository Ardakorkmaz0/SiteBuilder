import { expect } from '@playwright/test'

export const platformSandbox = 'sandbox allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads'

export async function openLesson(page, html, publication = 'platform') {
  const platform = publication === 'platform'
  if (!platform && publication !== 'custom-domain') throw new Error('Unknown lesson publication: ' + publication)
  const address = platform ? 'https://platform.invalid/s/lesson/' : 'https://lesson.invalid/'
  let served = 0
  await page.route('**/*', route => {
    if (route.request().url() !== address) return route.abort()
    served++
    return route.fulfill({
      contentType: 'text/html; charset=utf-8',
      headers: platform ? { 'Content-Security-Policy': platformSandbox + "; frame-ancestors 'self'" } : {},
      body: html,
    })
  })
  await page.goto(address)
  expect(served).toBe(1)
  expect(await page.evaluate(() => self.origin)).toBe(platform ? 'null' : new URL(address).origin)
  await page.evaluate(() => document.fonts.ready)
}
