import { test, expect, api } from './support.js'
import { makeAccount, unique, publishedSite, reply, rows } from './account-support.js'

const cardFor = (page, title) => page.getByRole('article').filter({ has: page.getByRole('heading', { name: title, exact: true }) })

test('profile edits, explore search, favorites and a site report reach the real server', async ({ page, request, account }) => {
  const author = await makeAccount(request)
  const authorName = unique('Creator')
  expect((await api(request, 'PATCH', '/profile/', { display_name: authorName }, author.token)).status).toBe(200)
  const title = unique('Portfolio')
  const site = await publishedSite(request, author, title)
  try {
    await page.goto('/profile')
    const displayName = unique('Profile')
    await page.getByRole('textbox', { name: 'Display name', exact: true }).fill(displayName)
    await page.getByRole('textbox', { name: 'Headline', exact: true }).fill('Round six creator')
    await page.getByRole('textbox', { name: 'Bio', exact: true }).fill('A profile saved through the real account form.')
    await page.getByRole('textbox', { name: 'Website', exact: true }).fill('https://example.test/portfolio')
    const saved = reply(page, '/profile/', 'PATCH')
    await page.getByRole('button', { name: 'Save profile', exact: true }).click()
    expect((await saved).status()).toBe(200)
    await page.reload()
    await expect(page.getByRole('textbox', { name: 'Display name', exact: true })).toHaveValue(displayName)
    await expect(page.getByRole('textbox', { name: 'Headline', exact: true })).toHaveValue('Round six creator')
    await expect(page.getByRole('textbox', { name: 'Bio', exact: true })).toHaveValue('A profile saved through the real account form.')
    await expect(page.getByRole('textbox', { name: 'Website', exact: true })).toHaveValue('https://example.test/portfolio')
    await page.goto(`/u/${account.user.id}`)
    await expect(page.getByRole('heading', { name: displayName, exact: true })).toBeVisible()

    await page.getByRole('link', { name: 'Sitebuilder home', exact: true }).click()
    await page.getByRole('button', { name: 'Portfolio', exact: true }).click()
    const card = cardFor(page, title)
    await expect(card).toBeVisible()
    await card.getByRole('button', { name: 'More actions', exact: true }).click()
    const favorited = reply(page, `/sites/${site.id}/favorite/`)
    await card.getByRole('menuitemcheckbox', { name: 'Favorite', exact: true }).click()
    expect((await favorited).status()).toBe(201)
    const favorites = await api(request, 'GET', '/favorites/')
    expect(favorites.status).toBe(200)
    expect(rows(favorites.data).map((item) => item.id)).toContain(site.id)
    await page.getByRole('link', { name: 'Favorites', exact: true }).click()
    await expect(cardFor(page, title)).toBeVisible()
    await cardFor(page, title).getByRole('link', { name: authorName, exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/u/${author.user.id}$`))
    const removed = reply(page, `/sites/${site.id}/favorite/`, 'DELETE')
    await cardFor(page, title).getByRole('button', { name: 'Unfavorite', exact: true }).click()
    expect((await removed).status()).toBe(200)
    await expect(cardFor(page, title).getByRole('button', { name: 'Favorite', exact: true })).toHaveAttribute('aria-pressed', 'false')
    const remaining = await api(request, 'GET', '/favorites/')
    expect(remaining.status).toBe(200)
    expect(rows(remaining.data).map((item) => item.id)).not.toContain(site.id)
    await page.goto('/favorites')
    await expect(page.getByText('No favorites yet', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Search', exact: true }).click()
    const search = page.getByRole('searchbox', { name: 'Search sites and creators', exact: true })
    await search.fill(title)
    await search.press('Enter')
    await expect(page).toHaveURL(/\/search\?q=/)
    await expect(cardFor(page, title)).toBeVisible()
    // Search the creator too: this is a separate result type and API path.
    await page.getByRole('searchbox', { name: 'Search query', exact: true }).fill(authorName)
    await page.getByRole('searchbox', { name: 'Search query', exact: true }).press('Enter')
    await page.getByRole('region', { name: 'People', exact: true }).getByRole('link', { name: new RegExp(authorName) }).click()
    await expect(page).toHaveURL(new RegExp(`/u/${author.user.id}$`))
    await cardFor(page, title).getByRole('link', { name: title, exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/site/${site.slug}$`))
    await page.getByRole('button', { name: 'More actions', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Report this site', exact: true }).click()
    const report = page.getByRole('dialog', { name: 'Report this site', exact: true })
    await report.getByRole('combobox', { name: 'Reason', exact: true }).selectOption('spam')
    await report.getByRole('textbox', { name: /Details/ }).fill('Local E2E moderation fixture, not a real complaint.')
    const reported = reply(page, `/sites/${site.id}/report/`)
    await report.getByRole('button', { name: 'Submit report', exact: true }).click()
    expect((await reported).status()).toBe(201)
    await expect(report).toContainText('Thanks — our team will review this site.')
  } finally {
    expect((await api(request, 'DELETE', `/sites/${site.id}/`, undefined, author.token)).status).toBe(204)
  }
})

test('dashboard search expands on demand and phone navigation keeps three working destinations', async ({ page }) => {
  await page.goto('/')
  const search = page.getByRole('searchbox', { name: 'Search sites and creators', exact: true })
  const searchTrigger = page.getByRole('button', { name: 'Search', exact: true })
  await expect(search).toHaveCount(0)
  await searchTrigger.click()
  await expect(search).toBeVisible()
  await expect(search).toBeFocused()
  await search.press('Escape')
  await expect(search).toHaveCount(0)
  await expect(searchTrigger).toBeFocused()

  await page.setViewportSize({ width: 390, height: 844 })
  const navigation = page.getByRole('navigation', { name: 'Quick navigation', exact: true })
  await expect(navigation).toBeVisible()
  await expect(navigation.getByRole('link')).toHaveCount(3)
  const destinations = [
    ['My sites', '/sites'],
    ['Favorites', '/favorites'],
    ['Explore', '/'],
  ]
  for (const [name, path] of destinations) {
    const link = navigation.getByRole('link', { name, exact: true })
    await expect(link).toHaveAttribute('href', path)
    await link.click()
    await expect(page).toHaveURL(new URL(path, 'http://localhost:5173').href)
    await expect(navigation.getByRole('link', { name, exact: true })).toHaveAttribute('aria-current', 'page')
  }
  await page.getByRole('button', { name: 'Account menu', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Profile', exact: true })).toBeVisible()
})

test('a community block can be found, previewed, reported and copied into an owned draft', async ({ page, request }) => {
  const author = await makeAccount(request)
  const published = await publishedSite(request, author, unique('Sharing author'))
  let componentId
  let targetId
  try {
    const title = unique('Shared portfolio')
    const shared = await api(request, 'POST', '/components/', {
      title, description: 'A local round six block.', category: 'portfolio',
      html: '<div data-pwb-shared="round6"><h3>Round six copied block</h3></div>',
      css: '[data-pwb-shared="round6"] { padding: 12px; }',
      natural_width: 320, natural_height: 180,
    }, author.token)
    expect(shared.status).toBe(201)
    componentId = shared.data.id
    const target = await api(request, 'POST', '/sites/', { title: unique('Copy target') })
    expect(target.status).toBe(201)
    targetId = target.data.id
    const before = await api(request, 'GET', `/sites/${targetId}/`)
    expect(before.status).toBe(200)
    await page.goto('/community')
    await page.getByRole('searchbox', { name: 'Search blocks…', exact: true }).fill(title)
    await page.getByRole('button', { name: 'Portfolio', exact: true }).click()
    const card = cardFor(page, title)
    await expect(card).toBeVisible()
    await card.getByRole('button', { name: `Preview ${title}`, exact: true }).click()
    const preview = page.getByRole('dialog', { name: 'Preview block', exact: true })
    await expect(preview).toBeVisible()
    await expect(preview.getByRole('heading', { name: title, exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(preview).toHaveCount(0)
    await card.getByRole('button', { name: 'Report this block', exact: true }).click()
    const report = page.getByRole('dialog', { name: 'Report this block', exact: true })
    await report.getByRole('combobox', { name: 'Reason', exact: true }).selectOption('spam')
    await report.getByRole('textbox', { name: 'Details (optional)', exact: true }).fill('Local E2E moderation fixture.')
    const reported = reply(page, `/public/components/${componentId}/report/`)
    await report.getByRole('button', { name: 'Submit report', exact: true }).click()
    expect((await reported).status()).toBe(201)
    await expect(report).toContainText('Thanks — a moderator will look at it.')
    await page.keyboard.press('Escape')
    await expect(report).toHaveCount(0)
    await card.getByRole('button', { name: 'Use this', exact: true }).click()
    const use = page.getByRole('dialog', { name: 'Add to one of your sites', exact: true })
    await use.getByRole('combobox', { name: 'Site', exact: true }).selectOption(String(targetId))
    const copied = reply(page, `/public/components/${componentId}/use/`)
    await use.getByRole('button', { name: 'Add to my site', exact: true }).click()
    const copiedResponse = await copied
    expect(copiedResponse.status()).toBe(200)
    const result = await copiedResponse.json()
    expect(result.site_id).toBe(targetId)
    await expect(page).toHaveURL(new RegExp(`/editor/${targetId}$`))
    const after = await api(request, 'GET', `/sites/${targetId}/`)
    expect(after.status).toBe(200)
    const blocks = after.data.schema.pages[0].components
    expect(blocks.length).toBe(before.data.schema.pages[0].components.length + 1)
    const block = blocks.find((item) => item.id === result.block_id)
    expect(block.type).toBe('html')
    expect(block.props._sharedFrom).toBe(componentId)
    expect(block.props.code).toContain('Round six copied block')
    expect(after.data.revision).toBe(before.data.revision + 1)
  } finally {
    if (targetId) expect((await api(request, 'DELETE', `/sites/${targetId}/`)).status).toBe(204)
    if (componentId) expect((await api(request, 'POST', `/components/${componentId}/withdraw/`, {}, author.token)).status).toBe(200)
    expect((await api(request, 'DELETE', `/sites/${published.id}/`, undefined, author.token)).status).toBe(204)
  }
})
