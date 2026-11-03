// What jsdom cannot see: the source view's colours in a real stylesheet, with the
// field's own text out of the way and lying exactly over them.
import { test, expect, createHtmlSite, openEditor, api } from './support.js'

const code = '<!DOCTYPE html>\n<html>\n<head><style>body { color: #111111; }</style></head>\n<body class="a">\n<!-- note -->\n<h1>Hello</h1>\n<script>const a = "b"</script>\n</body>\n</html>\n'

test('the source view shows code in color, in a code font, and the switch turns it off and is remembered', async ({ page, request }) => {
  const siteId = await createHtmlSite(request, 'E2E source colors', [{ html: code }])
  await openEditor(page, siteId)
  await page.getByRole('button', { name: 'Source', exact: true }).click()
  const field = page.getByRole('textbox', { name: 'HTML source editor', exact: true })
  await expect(field).toHaveValue(code)
  const style = (selector, property) => page.locator(selector).evaluate((el, p) => getComputedStyle(el)[p], property)
  const behind = page.locator('.code-field-behind')
  await expect(behind.locator('.code-t-tag').first()).toHaveText('html')

  // Its own text is out of the way, and what is behind shows through.
  expect(await style('.code-field-input', 'color')).toBe('rgba(0, 0, 0, 0)')
  expect(await style('.code-field-input', 'backgroundColor')).toBe('rgba(0, 0, 0, 0)')
  expect(await style('.code-t-tag >> nth=0', 'color')).toBe('rgb(126, 231, 135)')
  expect(await style('.code-t-comment >> nth=0', 'color')).toBe('rgb(139, 148, 158)')

  // Lying exactly over them: anything off here puts the caret on the wrong letter.
  for (const property of ['fontFamily', 'fontSize', 'lineHeight', 'paddingLeft', 'paddingTop', 'whiteSpace', 'tabSize']) {
    expect(await style('.code-field-input', property), property).toBe(await style('.code-field-behind', property))
  }
  expect(await style('.code-field-input', 'fontFamily')).toMatch(/mono/i)
  const size = (locator) => locator.evaluate((el) => [el.clientWidth, el.clientHeight, el.scrollHeight])
  expect(await size(field)).toEqual(await size(behind))
  await field.evaluate((el) => { el.style.height = '60px' })
  await field.evaluate((el) => { el.scrollTop = 40; el.dispatchEvent(new Event('scroll')) })
  await expect.poll(() => behind.evaluate((el) => el.scrollTop)).toBe(await field.evaluate((el) => el.scrollTop))
  await field.evaluate((el) => { el.style.height = '' })

  // Typing still goes to the field, and the colours follow.
  await field.click()
  await page.keyboard.press('Control+End')
  await page.keyboard.type('<b>x</b>')
  await expect(field).toHaveValue(`${code}<b>x</b>`)
  await expect(behind).toContainText('<b>x</b>')

  const toggle = page.getByRole('button', { name: 'Code colors', exact: true })
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await expect(behind).toHaveCount(0)
  await expect(field).toHaveValue(`${code}<b>x</b>`)
  // Plain, it is still in a code font, and its text can be read.
  expect(await field.evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/mono/i)
  expect(await field.evaluate((el) => getComputedStyle(el).color)).not.toBe('rgba(0, 0, 0, 0)')

  await page.reload()
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('button', { name: 'Code colors', exact: true })).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('.code-field-behind')).toHaveCount(0)
  await api(request, 'DELETE', `/sites/${siteId}/`)
})
