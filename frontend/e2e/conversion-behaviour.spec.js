import fs from 'node:fs/promises'
import { test, expect } from '@playwright/test'
import { pointerAt, visitorMatches } from './behaviourActions.js'
import { convertFidelityPage } from './convertFidelityPage.js'
import { openLesson } from './lessonDocument.js'

test.use({ storageState: { cookies: [], origins: [] } })
test.skip(({ browserName }) => browserName !== 'chromium', 'the conversion and paint reference runs use Chromium')

async function withDocument(browser, html, read, publication) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 })
  try {
    const page = await context.newPage()
    await page.clock.install({ time: new Date('2025-01-01T00:00:00Z') })
    await page.clock.pauseAt(new Date('2025-01-01T00:01:00Z'))
    await openLesson(page, html, publication)
    return await read(page)
  } finally {
    await context.close()
  }
}

const words = text => frame => frame.getByText(text, { exact: true }).filter({ visible: true })
const count = async (page, text) => (await visitorMatches(page, words(text))).length
async function aim(page, query, action = 'click') {
  return pointerAt(page, await visitorMatches(page, query), action)
}
const press = (page, text) => aim(page, words(text))
const typeIn = async (page, name, value) => {
  const hit = await aim(page, frame => frame.getByRole('textbox', { name, exact: true }))
  if (hit === 'clicked') await page.keyboard.type(value)
  return hit
}
const routeLooks = async (page) => {
  const ridge = await visitorMatches(page, words('Ridge watch'))
  return {
    active: ridge.length === 1 && await ridge[0].evaluate(el => getComputedStyle(el).color === 'rgb(0, 100, 80)'),
    ridge: await count(page, 'Ridge watch selected'),
    brook: await count(page, 'Brook watch selected'),
  }
}
const atBrook = { active: false, ridge: 0, brook: 1 }
const atRidge = { active: true, ridge: 1, brook: 0 }

async function recordVisitAndReload(page) {
  const first = await count(page, 'Visits logged: 0')
  const hit = await press(page, 'Record visit')
  const once = await count(page, 'Visits logged: 1')
  await page.reload()
  return [first, hit, once, await count(page, 'Visits logged: 1'), await count(page, 'Visits logged: 0')]
}

const observations = [
  {
    name: 'active menu', expected: [atBrook, 'clicked', atRidge, 'clicked', atBrook],
    run: async page => [await routeLooks(page), await press(page, 'Ridge watch'), await routeLooks(page),
      await press(page, 'Brook watch'), await routeLooks(page)],
  },
  {
    name: 'arrow navigation', expected: ['clicked', atBrook, atRidge, atBrook],
    async run(page) {
      const hit = await press(page, 'Brook watch')
      const initial = await routeLooks(page)
      await page.keyboard.press('ArrowRight')
      const right = await routeLooks(page)
      await page.keyboard.press('ArrowLeft')
      return [hit, initial, right, await routeLooks(page)]
    },
  },
  {
    name: 'specimen filter', expected: [1, 1, 'clicked', 0, 1],
    run: async page => [await count(page, 'Silver birch'), await count(page, 'Copper fern'),
      await typeIn(page, 'Find a specimen', 'copper'), await count(page, 'Silver birch'), await count(page, 'Copper fern')],
  },
  {
    name: 'radio quiz', expected: [1, 'clicked', 'clicked', 1, 0],
    run: async page => [await count(page, 'No bearing checked'),
      await aim(page, frame => frame.getByRole('radio', { name: 'Eastern slope', exact: true })),
      await press(page, 'Check bearing'), await count(page, 'Bearing confirmed'), await count(page, 'No bearing checked')],
  },
  {
    name: 'visits until reload on the platform', expected: [1, 'clicked', 1, 0, 1], run: recordVisitAndReload,
  },
  {
    name: 'visits after reload on a custom domain', publication: 'custom-domain', expected: [1, 'clicked', 1, 1, 0], run: recordVisitAndReload,
  },
  {
    name: 'rope calculator', expected: [1, 'clicked', 1, 0],
    run: async page => [await count(page, 'Double length: 0 m'), await typeIn(page, 'Rope length', '7'),
      await count(page, 'Double length: 14 m'), await count(page, 'Double length: 0 m')],
  },
]

const knownObservations = {
  'active menu': [atBrook, 'clicked', atBrook, 'clicked', atBrook],
  'arrow navigation': ['clicked', atBrook, atBrook, atBrook],
  'specimen filter': [1, 1, 'missing', 1, 1],
  'radio quiz': [1, 'missing', 'clicked', 0, 1],
  'visits until reload on the platform': [1, 'clicked', 0, 0, 1],
  'visits after reload on a custom domain': [1, 'clicked', 0, 0, 1],
  'rope calculator': [1, 'missing', 0, 1],
}

// Conversion is the expensive part. Reuse its immutable text, never a visitor's document.
const corpus = new Map()
const readFixture = name => fs.readFile(new URL('./fixtures/behaviour/' + name + '.html', import.meta.url), 'utf8')
async function fixture(page, name) {
  if (!corpus.has(name)) {
    const source = await readFixture(name)
    const converted = await convertFidelityPage(page, source)
    expect(converted.blocks).toBeGreaterThan(0)
    corpus.set(name, { source, html: converted.html })
  }
  return corpus.get(name)
}

test.describe('field station behaviour', () => {
  for (const scenario of observations) {
    test(scenario.name, async ({ browser, page }, info) => {
      const { source, html } = await fixture(page, 'field-station')
      const reference = await withDocument(browser, source, scenario.run, scenario.publication)
      expect(reference, 'original must satisfy the authored outcomes').toEqual(scenario.expected)
      const observation = await withDocument(browser, html, scenario.run, scenario.publication)
      await info.attach(scenario.name, { body: JSON.stringify({ reference, observation }), contentType: 'application/json' })
      if (Object.hasOwn(knownObservations, scenario.name)) {
        expect(observation, 'conversion improved: remove the known gap').not.toEqual(scenario.expected)
        expect(observation, 'conversion changed: investigate this exact observation').toEqual(knownObservations[scenario.name])
      } else {
        expect(observation).toEqual(scenario.expected)
      }
    })
  }
})

// Capture a small, authored patch of each painted surface, away from the text.
const surfaces = [
  { name: 'hover transition', top: 83, colors: [[32, 32, 32], [128, 128, 128], [224, 224, 224]] },
  { name: 'step keyframes', top: 163, colors: [[255, 255, 255], [143, 175, 207], [31, 95, 159]] },
  { name: 'canvas pulse', top: 243, colors: [[32, 48, 96], [128, 48, 96], [224, 48, 96]] },
]

async function pixels(decoder, png) {
  return decoder.evaluate(async (data) => {
    const image = new Image()
    image.src = 'data:image/png;base64,' + data
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    const pen = canvas.getContext('2d')
    pen.drawImage(image, 0, 0)
    return [...pen.getImageData(0, 0, image.width, image.height).data].filter((_, index) => index % 4 !== 3)
  }, png.toString('base64'))
}

async function sampleFrames(page, decoder, surface) {
  const previous = new Map(await Promise.all(page.frames().map(async frame =>
    [frame, await frame.evaluateHandle(() => document.getAnimations())])))
  const hover = surface.name === 'hover transition'
  let hit
  if (surface.name === 'canvas pulse') {
    hit = await press(page, 'Light bench')
    if (hit === 'clicked') {
      await page.keyboard.press('p')
      hit = 'key p'
    }
  } else {
    hit = await aim(page, words(hover ? 'Lamp surface' : 'Start pulse'), hover ? 'hover' : 'click')
  }
  // Only seek playback that this input actually started. Seeking a paused or
  // pre-existing effect could make a disconnected trigger look functional.
  const playback = await Promise.all(page.frames().map(frame => frame.evaluateHandle(async earlier => {
    const started = document.getAnimations().filter(animation => animation.playState === 'running' && !earlier.includes(animation))
    for (const animation of started) animation.pause()
    await Promise.all(started.map(animation => animation.ready))
    return started.map(animation => ({ animation, rate: animation.playbackRate }))
  }, previous.get(frame) || [])))
  const frames = []
  for (const ms of [0, 500, 1000]) {
    if (ms) await page.clock.runFor(500)
    // Playwright owns the JS/rAF clock; CSS animations have a separate timeline.
    await Promise.all(playback.map(handle => handle.evaluate((entries, time) => {
      for (const { animation, rate } of entries) animation.currentTime = time * rate
    }, ms)))
    const png = await page.screenshot({ clip: { x: 192, y: surface.top, width: 8, height: 8 }, animations: 'allow' })
    frames.push(await pixels(decoder, png))
  }
  return { hit, frames }
}

const delta = (left, right) => Math.max(...left.map((value, index) => Math.abs(value - right[index])))
const knownPaint = {
  'hover transition': { hit: 'hovered', phases: [true, false, false] },
  'step keyframes': { hit: 'clicked', phases: [false, false, true] },
  'canvas pulse': { hit: 'key p', phases: [true, false, false] },
}

test('the visitor can operate and see a working module inside a sandboxed frame', async ({ browser, page }) => {
  const frame = source => '<iframe sandbox="allow-scripts" style="position:fixed;inset:0;width:100%;height:100%;border:0" srcdoc="' +
    source.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"></iframe>'
  const workshop = frame(await readFixture('field-station'))
  for (const scenario of observations.filter(s => ['arrow navigation', 'rope calculator'].includes(s.name))) {
    expect(await withDocument(browser, workshop, scenario.run), scenario.name).toEqual(scenario.expected)
  }
  const step = surfaces.find(s => s.name === 'step keyframes')
  const sample = await withDocument(browser, frame(await readFixture('light-bench')), p => sampleFrames(p, page, step))
  expect(sample.hit).toBe('clicked')
  for (const [phase, pixels] of sample.frames.entries()) {
    expect(delta(pixels, pixels.map((_, i) => step.colors[phase][i % 3]))).toBeLessThanOrEqual(4)
  }
})

test.describe('light bench: calibrated paint', () => {
  for (const surface of surfaces) {
    test(surface.name, async ({ browser, page }, info) => {
      const { source, html } = await fixture(page, 'light-bench')
      const sample = doc => withDocument(browser, doc, p => sampleFrames(p, page, surface))
      const ref = await sample(source)
      const repeat = await sample(source)
      const action = { 'hover transition': 'hovered', 'step keyframes': 'clicked', 'canvas pulse': 'key p' }[surface.name]
      expect([ref.hit, repeat.hit]).toEqual([action, action])
      const drift = ref.frames.map((frame, index) => delta(frame, repeat.frames[index]))
      expect(Math.max(...drift), 'unstable reference; do not loosen the threshold').toBeLessThanOrEqual(2)
      const tolerance = 2 + Math.max(...drift)
      for (const [index, frame] of ref.frames.entries()) {
        const expected = frame.map((_, i) => surface.colors[index][i % 3])
        expect(delta(frame, expected), 'authored RGB at phase ' + index).toBeLessThanOrEqual(4)
      }
      const result = await sample(html)
      const errors = ref.frames.map((frame, index) => delta(frame, result.frames[index]))
      const phases = errors.map(error => error <= tolerance)
      const actual = { hit: result.hit, phases }
      const expected = { hit: action, phases: [true, true, true] }
      await info.attach(surface.name, { body: JSON.stringify({ drift, tolerance, errors, actual }), contentType: 'application/json' })
      if (Object.hasOwn(knownPaint, surface.name)) {
        expect(actual, 'paint improved: remove the known gap').not.toEqual(expected)
        expect(actual).toEqual(knownPaint[surface.name])
      } else {
        expect(actual).toEqual(expected)
      }
    })
  }
})
