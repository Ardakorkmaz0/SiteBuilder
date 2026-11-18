import { expect } from '@playwright/test'
import { pointerAt, visitorMatches } from './behaviourActions.js'
import { openLesson } from './lessonDocument.js'

const text = (page, value) => visitorMatches(page, frame => frame.getByText(value, { exact: true }))
const visible = async (page, value) => (await visitorMatches(page, frame => frame.getByText(value, { exact: true }).filter({ visible: true }))).length
async function click(page, target) {
  const hit = await pointerAt(page, target)
  if (hit === 'clicked') await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))))
  return hit
}
const clickText = async (page, value) => click(page, await text(page, value))
async function enter(page, find, value) {
  const fields = await visitorMatches(page, find)
  const hit = await pointerAt(page, fields)
  if (hit !== 'clicked') return { hit, value: null }
  await page.keyboard.type(value)
  return { hit, value: await fields[0].inputValue() }
}

const journeys = {
  article: {
    expected: { hit: 'clicked', reachedSurvey: true },
    async run(page) {
      const link = await visitorMatches(page, frame => frame.getByRole('link', { name: 'survey of regular passengers', exact: true }))
      const hit = await click(page, link)
      const headings = await text(page, 'What the numbers say')
      const rect = headings.length === 1 && await headings[0].boundingBox()
      return { hit, reachedSurvey: Boolean(rect && rect.y >= 0 && rect.y + rect.height <= page.viewportSize().height && new URL(page.url()).hash === '#survey') }
    },
  },
  dashboard: {
    knownGap: { tomatoes: 1 },
    expected: { input: { hit: 'clicked', value: 'basil' }, basil: 1, tomatoes: 0 },
    async run(page) {
      const input = await enter(page, frame => frame.getByPlaceholder('Filter beds', { exact: true }), 'basil')
      return { input, basil: await visible(page, 'Basil'), tomatoes: await visible(page, 'Tomatoes') }
    },
  },
  docs: {
    expected: { before: 0, hit: 'clicked', windows: 1, mac: 0 },
    async run(page) {
      const command = 'winget install Tidepool.CLI'
      const before = await visible(page, command)
      const hit = await clickText(page, 'Windows')
      return { before, hit, windows: await visible(page, command), mac: await visible(page, 'brew install tidepool') }
    },
  },
  landing: {
    expected: { before: 0, open: 'clicked', shown: 1, close: 'clicked', after: 0 },
    async run(page) {
      const question = await visitorMatches(page, frame => frame.getByText('Can I keep my current accountant?', { exact: false }))
      const answer = 'Yes. Invite them with read access and they see the same books you do.'
      const before = await visible(page, answer)
      const open = await click(page, question)
      const shown = await visible(page, answer)
      const close = await click(page, question)
      return { before, open, shown, close, after: await visible(page, answer) }
    },
  },
  portfolio: {
    expected: { hit: 'clicked', value: 'June' },
    run: (page) => enter(page, frame => frame.getByRole('textbox', { name: 'Your name', exact: true }), 'June'),
  },
  'study-notes': {
    expected: { before: 0, first: 'clicked', secondStep: 1, thirdBefore: 0, next: 'clicked', thirdStep: 1 },
    async run(page) {
      const second = 'Sağlıklı kişilerin yüzde beşinde de test yanlışlıkla pozitif çıkıyor.'
      const third = 'Pozitif çıkan birinin gerçekten hasta olma olasılığı yaklaşık yüzde on beştir.'
      const before = await visible(page, second)
      const first = await clickText(page, 'Sonraki adım')
      const secondStep = await visible(page, second)
      const thirdBefore = await visible(page, third)
      const next = await clickText(page, 'Sonraki adım')
      return { before, first, secondStep, thirdBefore, next, thirdStep: await visible(page, third) }
    },
  },
}

async function exercise(browser, html, run) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, storageState: { cookies: [], origins: [] } })
  try {
    await openLesson(page, html)
    return await run(page)
  } finally { await page.close() }
}

export async function assertFidelityJourney(browser, name, source, converted) {
  const { run, expected, knownGap } = journeys[name]
  expect(await exercise(browser, source, run), `${name}: original must meet the hand-written contract`).toEqual(expected)
  expect(await exercise(browser, converted, run), `${name}: conversion (remove a known gap when fixed)`).toEqual(knownGap ? { ...expected, ...knownGap } : expected)
}
