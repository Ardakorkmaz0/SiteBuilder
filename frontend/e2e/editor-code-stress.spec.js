import fs from 'node:fs/promises'
import { test, expect, api, openEditor, save } from './support.js'

const source = (page) => page.getByRole('textbox', { name: 'HTML source editor', exact: true })
const original = 'Original component heading'

async function canvas(request) {
  const { status, data: site } = await api(request, 'POST', '/sites/', { title: 'E2E source stress' })
  expect(status).toBe(201)
  const { status: patched } = await api(request, 'PATCH', `/sites/${site.id}/`, {
    schema: { ...site.schema, pages: [{ ...site.schema.pages[0], name: 'Home', mode: 'empty', components: [{
      id: 'hero', type: 'heading', props: { text: original }, styles: { fontSize: '32px' }, layout: { x: 60, y: 80, w: 550, h: 80 },
    }] }] },
  })
  expect(patched).toBe(200)
  return site.id
}

async function code(page, siteId) {
  await openEditor(page, siteId)
  await page.getByRole('button', { name: 'Source', exact: true }).click()
  await expect(source(page)).toBeVisible()
}

async function exportText(page, format) {
  await page.getByRole('button', { name: 'Export', exact: true }).click()
  const downloaded = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: format }).click()
  return fs.readFile(await (await downloaded).path(), 'utf8')
}

test('pending component-source edits are in both standalone exports and preview files before Apply', async ({ page, request }) => {
  const siteId = await canvas(request)
  try {
    await code(page, siteId)
    const pending = (await source(page).inputValue()).replace(original, 'Unsaved standalone edit ğüş')
    await source(page).fill(pending)
    for (const file of [/home\.single\.html/, /home\.optimized\.min\.html/]) {
      await page.getByRole('button', { name: file }).click()
      await expect(page.getByLabel('Generated source preview')).toContainText('Unsaved standalone edit ğüş')
    }
    for (const format of [/Single website file/, /Optimized publication/]) {
      expect(await exportText(page, format)).toContain('Unsaved standalone edit ğüş')
    }
    const stored = (await api(request, 'GET', `/sites/${siteId}/`)).data
    expect(stored.schema.pages[0].mode).toBe('empty')
    expect(stored.schema.pages[0].components[0].props.text).toBe(original)
    await page.getByRole('button', { name: /index\.html$/ }).click()
    await expect(source(page)).toHaveValue(pending)
  } finally { await api(request, 'DELETE', `/sites/${siteId}/`) }
})

test('custom CSS and JavaScript survive file switches, native browser preview, save and reload', async ({ page, request }) => {
  const siteId = await canvas(request)
  const css = 'h1,h2,h3 { color: rgb(217, 70, 239) !important; }'
  const js = "document.querySelector('h1,h2,h3').textContent='JavaScript çalıştı';"
  try {
    await code(page, siteId)
    await page.getByRole('button', { name: /custom\.css$/ }).click()
    await page.getByRole('textbox', { name: 'Custom CSS editor', exact: true }).fill(css)
    await page.getByRole('button', { name: /custom\.js$/ }).click()
    await page.getByRole('textbox', { name: 'Custom JavaScript editor', exact: true }).fill(js)
    await page.getByRole('button', { name: /custom\.css$/ }).click()
    await expect(page.getByRole('textbox', { name: 'Custom CSS editor', exact: true })).toHaveValue(css)
    await save(page)
    await page.getByRole('button', { name: 'View', exact: true }).click()
    const rendered = page.frameLocator('main iframe').getByRole('heading', { name: 'JavaScript çalıştı', exact: true })
    await expect(rendered).toBeVisible()
    await expect(rendered).toHaveCSS('color', 'rgb(217, 70, 239)')
    await page.reload()
    await expect(rendered).toBeVisible()
    await expect(rendered).toHaveCSS('color', 'rgb(217, 70, 239)')
    const stored = (await api(request, 'GET', `/sites/${siteId}/`)).data
    expect(stored.schema.customCss).toBe(css)
    expect(stored.schema.customJs).toBe(js)
    expect(stored.schema.pages[0].components[0].props.text).toBe(original)
  } finally { await api(request, 'DELETE', `/sites/${siteId}/`) }
})

test('native field Undo leaves the canvas intact and Ctrl+S saves the resulting source field', async ({ page, request }) => {
  const siteId = await canvas(request)
  try {
    await code(page, siteId)
    await page.getByRole('button', { name: /custom\.css$/ }).click()
    const css = page.getByRole('textbox', { name: 'Custom CSS editor', exact: true })
    await css.fill('/* retained CSS */')
    await css.press('End')
    await css.pressSequentially('Z')
    await css.press('Control+z')
    await expect(css).toHaveValue('/* retained CSS */')
    const written = page.waitForResponse((res) => new URL(res.url()).pathname === `/api/sites/${siteId}/` && ['PUT', 'PATCH'].includes(res.request().method()))
    await css.press('Control+s')
    expect((await written).ok()).toBe(true)
    await page.reload()
    await page.getByRole('button', { name: /custom\.css$/ }).click()
    await expect(css).toHaveValue('/* retained CSS */')
    expect((await api(request, 'GET', `/sites/${siteId}/`)).data.schema.pages[0].components[0].props.text).toBe(original)
  } finally { await api(request, 'DELETE', `/sites/${siteId}/`) }
})

test('applying source, removing HTML and undoing restores both document and retained component design', async ({ page, request }) => {
  const siteId = await canvas(request)
  try {
    await code(page, siteId)
    await source(page).fill('<!doctype html><html><body><h1>Converted HTML revision</h1></body></html>')
    await page.getByRole('button', { name: 'Apply HTML', exact: true }).click()
    await save(page)
    await page.getByRole('button', { name: 'More actions', exact: true }).click()
    await page.getByRole('button', { name: 'Remove HTML', exact: true }).click()
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    await expect(page.locator('main [data-cid="hero"]')).toContainText(original)
    await page.locator('header').getByRole('button', { name: 'Undo (Ctrl+Z)', exact: true }).click()
    await expect(source(page)).toHaveValue(/Converted HTML revision/)
    await save(page)
    expect((await api(request, 'GET', `/sites/${siteId}/`)).data.schema.pages[0].components[0].props.text).toBe(original)
    await source(page).fill('<!doctype html><html><body><h1>New source after restoring HTML</h1></body></html>')
    await save(page)
    const row = page.locator('button[aria-label="Rename page: Home"]').locator('../..')
    await row.hover()
    await row.getByRole('button', { name: 'Rename page: Home', exact: true }).click()
    await row.locator('input').fill('Renamed Home')
    await row.locator('input').press('Enter')
    await page.locator('header').getByRole('button', { name: 'Undo (Ctrl+Z)', exact: true }).click()
    await expect(page.locator('button[title^="Home —"]')).toBeVisible()
    await expect(source(page)).toHaveValue(/New source after restoring HTML/)
    await save(page)
    await page.reload()
    await expect(source(page)).toHaveValue(/New source after restoring HTML/)
  } finally { await api(request, 'DELETE', `/sites/${siteId}/`) }
})
