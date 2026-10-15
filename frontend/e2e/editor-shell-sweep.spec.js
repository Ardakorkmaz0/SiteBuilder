import { test, expect, api, createHtmlSite, openEditor, save } from './support.js'

const simple = (text) => `<!doctype html><html><body><h1>${text}</h1></body></html>`

test('tablet toolbar keeps Save and AI named and saves pending source', async ({ page, request }) => {
  const siteId = await createHtmlSite(request, 'Tablet editor', [{ html: simple('Before tablet edit') }])
  try {
    await page.setViewportSize({ width: 887, height: 919 })
    await openEditor(page, siteId)
    await page.getByRole('button', { name: 'Source', exact: true }).click()
    await page.getByRole('textbox', { name: /HTML source/i }).fill(simple('Saved from tablet source'))
    await expect(page.locator('header').getByRole('button', { name: 'Save', exact: true })).toBeVisible()
    await save(page)
    expect((await api(request, 'GET', `/sites/${siteId}/`)).data.schema.pages[0].html).toContain('Saved from tablet source')

    const aiButton = page.getByRole('button', { name: 'Open AI assistant', exact: true })
    await aiButton.click()
    const assistant = page.getByRole('dialog', { name: 'AI Assistant', exact: true })
    await expect(assistant.getByRole('button', { name: 'Send', exact: true })).toBeDisabled()
    await expect(assistant.getByRole('textbox')).toBeDisabled()
    await assistant.getByRole('button', { name: 'AI settings', exact: true }).click()
    await expect(assistant.getByRole('combobox', { name: /^Provider/ })).toBeVisible()
    await assistant.getByRole('button', { name: 'Close AI panel', exact: true }).click()
    await expect(assistant).toHaveCount(0)
  } finally {
    await api(request, 'DELETE', `/sites/${siteId}/`)
  }
})

test('editor appearance, language and discovery metadata survive Save and reload', async ({ page, request }) => {
  const siteId = await createHtmlSite(request, 'Shell preferences', [{ html: simple('Preferences retain this content') }])
  try {
    await openEditor(page, siteId)
    await page.getByRole('button', { name: 'Your profile', exact: true }).first().click()
    await page.getByRole('button', { name: 'Light', exact: true }).click()
    await expect(page.locator('html')).toHaveAttribute('data-ui-theme', 'light')
    await page.getByRole('button', { name: 'Dark', exact: true }).click()
    await expect(page.locator('html')).toHaveAttribute('data-ui-theme', 'dark')
    await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('tr')
    await expect(page.locator('html')).toHaveAttribute('lang', 'tr')
    await expect(page.locator('header').getByRole('button', { name: 'Kaydet', exact: true })).toBeVisible()
    await page.getByRole('combobox', { name: 'Dil', exact: true }).selectOption('en')
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: 'More actions', exact: true }).click()
    await page.getByRole('combobox', { name: 'Category', exact: true }).selectOption('business')
    await page.getByRole('textbox', { name: 'Tags', exact: true }).fill('editor, Türkçe, regression')
    await page.keyboard.press('Escape')
    await save(page)
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-ui-theme', 'dark')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await page.getByRole('button', { name: 'More actions', exact: true }).click()
    await expect(page.getByRole('combobox', { name: 'Category', exact: true })).toHaveValue('business')
    await expect(page.getByRole('textbox', { name: 'Tags', exact: true })).toHaveValue('editor, Türkçe, regression')
    expect((await api(request, 'GET', `/sites/${siteId}/`)).data.schema.pages[0].html).toContain('Preferences retain this content')
  } finally {
    await api(request, 'DELETE', `/sites/${siteId}/`)
  }
})

test('keyboard help takes focus, closes with Escape and restores its menu opener', async ({ page, request }) => {
  const siteId = await createHtmlSite(request, 'Keyboard editor', [{ html: simple('Keyboard unchanged') }])
  try {
    await openEditor(page, siteId)
    const more = page.getByRole('button', { name: 'More actions', exact: true })
    await more.click()
    await page.getByRole('button', { name: 'Shortcuts', exact: true }).click()
    const help = page.getByRole('dialog', { name: 'Keyboard shortcuts', exact: true })
    await expect(help).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(help).toHaveCount(0)
    await expect(more).toBeFocused()
    await page.keyboard.press('Control+/')
    await expect(help).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(help).toHaveCount(0)
    expect((await api(request, 'GET', `/sites/${siteId}/`)).data.schema.pages[0].html).toContain('Keyboard unchanged')
  } finally {
    await api(request, 'DELETE', `/sites/${siteId}/`)
  }
})

test('phone preview switches pages, focuses and returns to desktop editing without losing the selected page', async ({ page, request }) => {
  const siteId = await createHtmlSite(request, 'Responsive editor', [
    { html: simple('Phone home') },
    { id: 'about', name: 'About', html: simple('Phone about') },
  ])
  try {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/editor/${siteId}`)
    const shell = page.getByTestId('mobile-editor-preview')
    await expect(shell).toBeVisible()
    await expect(shell.frameLocator('iframe').getByRole('heading', { name: 'Phone home' })).toBeVisible()
    await shell.getByRole('button', { name: 'Pages', exact: true }).click()
    await page.getByRole('dialog', { name: 'Site pages', exact: true }).getByRole('button', { name: 'About', exact: true }).click()
    await expect(shell.frameLocator('iframe').getByRole('heading', { name: 'Phone about' })).toBeVisible()
    await shell.getByRole('button', { name: 'Focus preview', exact: true }).click()
    await expect(shell.getByRole('navigation')).toHaveCount(0)
    await shell.getByRole('button', { name: 'Exit focused preview', exact: true }).click()
    await shell.getByRole('button', { name: 'Desktop', exact: true }).click()
    const desktop = page.getByRole('dialog', { name: 'Desktop editing', exact: true })
    await expect(desktop).toContainText('Open this link on a desktop')
    await page.keyboard.press('Escape')
    await expect(desktop).toHaveCount(0)
    await page.setViewportSize({ width: 1440, height: 900 })
    await expect(shell).toHaveCount(0)
    await expect(page.getByRole('tab', { name: /About/ })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('button', { name: 'Source', exact: true })).toBeVisible()
  } finally {
    await api(request, 'DELETE', `/sites/${siteId}/`)
  }
})
