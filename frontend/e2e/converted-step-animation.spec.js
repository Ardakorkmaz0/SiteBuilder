import fs from 'node:fs/promises'
import { test, expect, api, createHtmlSite, openEditor, save, publish, BACKEND } from './support.js'
import { pointerAt } from './behaviourActions.js'
import { openLesson, platformSandbox } from './lessonDocument.js'

const lines = ['Count three rows.', 'Each row holds four seeds.']
const ledger = ['Multiply three by four.', 'Plant twelve seeds.']
const source = () => fs.readFile(new URL('./fixtures/behaviour/garden-steps.html', import.meta.url), 'utf8')

async function clickStep(page, control, steps, times, duration, reduced) {
  // Pause what the real click starts on its first painted frame, before
  // crossing back into the test runner. An untriggered effect cannot pass.
  const observation = await page.evaluateHandle(() => ({
    started: new Promise(resolve => window.addEventListener('click', () => requestAnimationFrame(() => {
      const animations = document.getAnimations().filter(animation => animation.playState === 'running')
      animations.forEach(animation => animation.pause())
      resolve(animations)
    }), { capture: true, once: true })),
  }))
  expect(await pointerAt(page, control)).toBe('clicked')
  for (const { target, delay, opacity } of steps) {
    const sample = await target.evaluate(async (element, { observation, times }) => {
      const animations = await observation.started
      await Promise.all(animations.map(animation => animation.ready))
      const motion = animations.find(animation => animation.effect.target.contains(element))
      const frames = times.map(ms => {
        for (const animation of animations) animation.currentTime = ms
        let opacity = 1
        for (let node = element; node; node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity)
        return { opacity, y: element.getBoundingClientRect().top }
      })
      const timing = motion?.effect.getTiming()
      return { count: animations.length, duration: timing?.duration, delay: timing?.delay, frames }
    }, { observation, times })
    await expect(target).toBeVisible()
    expect(sample.count, 'only the newly opened lines animate').toBe(reduced ? 0 : steps.length)
    if (!reduced) {
      expect(sample.duration).toBe(duration)
      expect(sample.delay).toBe(delay)
    }
    for (const [index, frame] of sample.frames.entries()) {
      const progress = reduced ? 1 : opacity[index]
      expect(frame.opacity).toBeCloseTo(progress, 2)
      expect(frame.y - sample.frames.at(-1).y).toBeCloseTo(8 * (1 - progress), 1)
    }
  }
  await observation.evaluate(async observation => {
    for (const animation of await observation.started) animation.finish()
  })
  await observation.dispose()
}

async function readSteps(page, reduced) {
  const control = page.getByText('Next step', { exact: true })
  const steps = lines.map(line => page.getByText(line, { exact: true }))
  const rows = ledger.map(line => page.getByText(line, { exact: true }))
  for (const step of [...steps, ...rows]) {
    await expect(step).toHaveCount(1)
    await expect(step).toBeHidden()
  }
  const single = target => [{ target, delay: 0, opacity: [0, 0.8024, 1] }]
  await clickStep(page, control, single(steps[0]), [0, 175, 350], 350, reduced)
  await expect(steps[1]).toBeHidden()
  await clickStep(page, control, single(steps[1]), [0, 175, 350], 350, reduced)
  await expect(steps[0]).toBeVisible()
  for (const row of rows) await expect(row).toBeHidden()
  // At 60 ms only the first row has moved. Halfway through the second
  // row's entrance (290 ms), the first one is already nearly settled.
  await clickStep(page, control, [
    { target: rows[0], delay: 0, opacity: [0, 60 / 340, 0.5, 290 / 340, 1] },
    { target: rows[1], delay: 120, opacity: [0, 0, 50 / 340, 0.5, 1] },
  ], [0, 60, 170, 290, 460], 340, reduced)
  for (const step of steps) await expect(step).toBeVisible()
}

test('editable lesson steps keep their click entrance after saving, reopening and publishing', async ({ page, browser, request }) => {
  const lesson = await source()
  const siteId = await createHtmlSite(request, 'E2E garden steps', [{ html: lesson }])
  try {
    await openEditor(page, siteId)
    await page.getByRole('banner').getByRole('button', { name: 'More actions', exact: true }).click()
    await page.getByRole('button', { name: 'Convert to canvas blocks', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Garden arithmetic', exact: true })).toBeVisible({ timeout: 45_000 })
    await save(page)
    await page.goto('about:blank')
    await openEditor(page, siteId)
    const stored = await api(request, 'GET', `/sites/${siteId}/`)
    expect(stored.status).toBe(200)
    const slug = await publish(page, request, siteId)
    for (const [width, reduced] of [[1280, false], [390, false], [390, true]]) {
      await test.step(`${width}px, reduced motion ${reduced}`, async () => {
        const visitor = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: reduced ? 'reduce' : 'no-preference', storageState: { cookies: [], origins: [] } })
        try {
          const original = await visitor.newPage()
          await openLesson(original, lesson)
          await readSteps(original, reduced)
          const result = await visitor.newPage()
          const response = await result.goto(`${BACKEND}/s/${slug}/`)
          expect(response.status()).toBe(200)
          const csp = await response.headerValue('content-security-policy')
          expect(csp.split(';').map(rule => rule.trim())).toContain(platformSandbox)
          await readSteps(result, reduced)
        } finally { await visitor.close() }
      })
    }
    const flatten = blocks => blocks.flatMap(block => [block, ...flatten(block.children || [])])
    const blocks = flatten(stored.data.schema.pages[0].components)
    for (const [text, timing] of [
      ...lines.map(text => [text, { durationMs: 350, easing: 'ease' }]),
      [ledger[0], { durationMs: 340, easing: 'linear' }],
      [ledger[1], { durationMs: 340, easing: 'linear', delayMs: 120 }],
    ]) {
      const matching = blocks.filter(block => block.type === 'text' && block.props.text === text)
      expect(matching, 'editable text, not an image or embed').toHaveLength(1)
      expect(matching[0].props.showEntrance).toEqual({ fromOpacity: 0, fromY: 8, ...timing })
    }
  } finally {
    expect((await api(request, 'DELETE', `/sites/${siteId}/`)).status).toBe(204)
  }
})
