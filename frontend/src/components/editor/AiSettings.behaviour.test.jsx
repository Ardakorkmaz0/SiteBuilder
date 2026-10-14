// The AI settings list only what the server offers, keep the user's own
// behaviour settings, and can check a key and model with one small request.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import AiSettings from './AiSettings.jsx'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../../ui/UiThemeProvider.jsx'
import { OPEN_POLICY, setAiPolicy, useAiPolicyStore } from '../../utils/aiPolicy.js'
import { getAiPreferences } from '../../utils/aiPreferences.js'

function renderSettings() {
  return render(
    <UiThemeProvider>
      <LanguageProvider>
        <AiSettings />
      </LanguageProvider>
    </UiThemeProvider>,
  )
}

const providerOptions = (container) => [...container.querySelector('select').options].map((o) => o.value)

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  useAiPolicyStore.setState({ policy: OPEN_POLICY })
})

afterEach(() => {
  vi.restoreAllMocks()
  useAiPolicyStore.setState({ policy: OPEN_POLICY })
})

describe('what the server offers', () => {
  it('lists only the providers it leaves on, and follows a switch flipped while open', () => {
    setAiPolicy({ enabled: true, providers: ['openrouter', 'groq', 'gemini'] })
    localStorage.setItem('pwb_ai_provider', 'groq')
    const { container } = renderSettings()
    expect(providerOptions(container)).toEqual(['openrouter', 'groq', 'gemini'])

    act(() => setAiPolicy({ enabled: true, providers: ['openrouter', 'gemini'] }))

    expect(providerOptions(container)).toEqual(['openrouter', 'gemini'])
    expect(container.querySelector('select').value).toBe('openrouter')
  })

  it('says so when the assistant is switched off, and offers nothing', () => {
    setAiPolicy({ enabled: false, providers: [], notice: 'Bakımdayız.' })
    const { container } = renderSettings()
    expect(container.querySelector('select')).toBeNull()
    expect(screen.getByText('Bakımdayız.')).toBeTruthy()
  })
})

describe('the behaviour settings', () => {
  it('save language, creativity, instructions and failover as they change', () => {
    renderSettings()
    fireEvent.change(screen.getByLabelText('Language of the site copy'), { target: { value: 'tr' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Creative' }))
    fireEvent.change(screen.getByLabelText('Standing instructions'), { target: { value: 'Resmi yaz.' } })
    fireEvent.click(screen.getByLabelText(/Switch to another provider/))

    expect(getAiPreferences()).toEqual({ contentLanguage: 'tr', creativity: 'creative', instructions: 'Resmi yaz.', failover: false })
  })
})

describe('the connection test', () => {
  it('reports a working key with how long it took', async () => {
    localStorage.setItem('pwb_ai_provider', 'groq')
    localStorage.setItem('pwb_groq_key', 'test-key')
    globalThis.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'OK' } }] }) }))
    renderSettings()

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Test connection' })) })

    await waitFor(() => expect(screen.getByText(/^Working — answered in/)).toBeTruthy())
    expect(String(globalThis.fetch.mock.calls[0][0])).toContain('groq')
  })

  it('reports a rejected key in the user\'s language', async () => {
    localStorage.setItem('pwb_language', 'tr')
    localStorage.setItem('pwb_ai_provider', 'groq')
    localStorage.setItem('pwb_groq_key', 'test-key')
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 401, text: async () => '{"error":{"message":"Invalid API Key"}}' }))
    renderSettings()

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Bağlantıyı test et' })) })

    await waitFor(() => expect(screen.getByText(/API anahtarınız reddedildi \(401\)/)).toBeTruthy())
  })
})
