export async function visitorMatches(page, select) {
  return (await Promise.all(page.frames().map(frame => select(frame).all()))).flat()
}

export async function pointerAt(page, locator, action = 'click') {
  if (Array.isArray(locator)) {
    if (locator.length !== 1) return locator.length ? 'ambiguous' : 'missing'
    locator = locator[0]
  }
  const count = await locator.count()
  if (count !== 1) return count ? 'ambiguous' : 'missing'
  const hosts = []
  try {
    if (await locator.evaluate(() => window !== window.top)) {
      const handle = await locator.elementHandle()
      let frame
      try { frame = await handle.ownerFrame() } finally { await handle.dispose() }
      while (frame.parentFrame()) {
        hosts.push(await frame.frameElement())
        frame = frame.parentFrame()
      }
      for (const host of [...hosts].reverse()) {
        await host.evaluate(el => el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }))
      }
    }
    let point = await localHit(locator)
    for (const host of hosts) {
      if (!point) return 'covered'
      point = await host.evaluate((el, inner) => {
        const rect = el.getBoundingClientRect()
        const x = rect.left + (el.clientLeft + inner.x) * rect.width / el.offsetWidth
        const y = rect.top + (el.clientTop + inner.y) * rect.height / el.offsetHeight
        return document.elementFromPoint(x, y) === el ? { x, y } : null
      }, point)
    }
    if (!point) return 'covered'
    if (action === 'hover') {
      await page.mouse.move(point.x, point.y)
      return 'hovered'
    }
    await page.mouse.click(point.x, point.y)
    return 'clicked'
  } finally {
    for (const host of hosts) await host.dispose()
  }
}

function localHit(locator) {
  return locator.evaluate((el) => {
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
}
