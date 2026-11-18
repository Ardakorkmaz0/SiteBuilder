export async function pointerAt(page, locator, action = 'click') {
  const count = await locator.count()
  if (count !== 1) return count ? 'ambiguous' : 'missing'
  const point = await locator.evaluate((el) => {
    el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' })
    for (const rect of el.getClientRects()) {
      const left = Math.max(0, rect.left), right = Math.min(innerWidth, rect.right)
      const top = Math.max(0, rect.top), bottom = Math.min(innerHeight, rect.bottom)
      if (left >= right || top >= bottom) continue
      const x = (left + right) / 2, y = (top + bottom) / 2
      if (el.contains(document.elementFromPoint(x, y))) return { x, y }
    }
    return null
  })
  if (!point) return 'covered'
  if (action === 'hover') {
    await page.mouse.move(point.x, point.y)
    return 'hovered'
  }
  await page.mouse.click(point.x, point.y)
  return 'clicked'
}
