// "Refine it: add a pricing section". Weaker models answer that with the new
// section alone instead of the whole page. The chat panel already knows: it
// puts such a fragment into the page. The wizard took the answer as the page,
// so the site that had just been generated was replaced by one lone section.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

const answers = vi.hoisted(() => ({ queue: [] }))

vi.mock('../../utils/aiAssistant.js', async (importOriginal) => {
  const real = await importOriginal()
  return {
    ...real,
    runAiHtmlPrompt: vi.fn(async () => ({ html: answers.queue.shift(), providerUsed: 'gemini' })),
  }
})

import AiWizard from './AiWizard.jsx'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../../ui/UiThemeProvider.jsx'

const SITE = '<!DOCTYPE html><html><head><title>Nova</title></head><body><header>Nova Studio</header><section id="hero"><h1>We design apps</h1></section></body></html>'
const preview = () => document.querySelector('iframe')?.getAttribute('srcdoc') || ''

async function generateSite() {
  render(
    <UiThemeProvider>
      <LanguageProvider>
        <AiWizard open initialBrand="Nova Studio" onClose={() => {}} onApply={() => {}} />
      </LanguageProvider>
    </UiThemeProvider>,
  )
  // Walk the steps to the Generate button.
  for (let i = 0; i < 6 && !screen.queryByText('✨ Generate my site'); i += 1) {
    fireEvent.click(screen.getByText('Next →'))
  }
  await act(async () => { fireEvent.click(screen.getByText('✨ Generate my site')) })
  await waitFor(() => expect(preview()).toContain('We design apps'))
}

async function refine(wish) {
  fireEvent.change(screen.getByPlaceholderText(/Refine it/), { target: { value: wish } })
  await act(async () => { fireEvent.click(screen.getByText('Refine')) })
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  answers.queue = [SITE]
})

describe('refining the generated site', () => {
  it('adds a section the model sent back on its own to the page, instead of replacing the page with it', async () => {
    await generateSite()
    answers.queue.push('<section id="pricing"><h2>Pricing</h2></section>')

    await refine('add a pricing section')

    await waitFor(() => expect(preview()).toContain('Pricing'))
    expect(preview()).toContain('We design apps')
    expect(preview()).toContain('Nova Studio')
  })

  it('keeps the site and says so when the model sends back nothing usable', async () => {
    await generateSite()
    answers.queue.push('Sure! I will add that for you.')

    await refine('add a pricing section')

    await waitFor(() => expect(screen.getByText(/did not return usable HTML/i)).toBeTruthy())
    expect(preview()).toContain('We design apps')
  })
})
