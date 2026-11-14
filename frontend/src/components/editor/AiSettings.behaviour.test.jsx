// The AI settings list only what the server offers, keep the user's own
// behaviour settings, and can check a key and model with one small request.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import AiSettings from './AiSettings.jsx'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../../ui/UiThemeProvider.jsx'
import { OPEN_POLICY, setAiPolicy, useAiPolicy, useAiPolicyStore } from '../../utils/aiPolicy.js'
import { getAiPreferences } from '../../utils/aiPreferences.js'
import { runAiPrompt } from '../../utils/aiAssistant.js'

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
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
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

describe('the creativity choice', () => {
  it('changes with the arrow keys, and is one Tab stop', () => {
    renderSettings()
    const checked = screen.getAllByRole('radio').filter((radio) => radio.getAttribute('aria-checked') === 'true')
    expect(checked).toHaveLength(1)
    expect(screen.getAllByRole('radio').filter((radio) => radio.getAttribute('tabindex') === '0')).toEqual(checked)

    fireEvent.click(screen.getByRole('radio', { name: 'Creative' }))
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Creative' }), { key: 'ArrowLeft' })

    expect(getAiPreferences().creativity).not.toBe('creative')
    expect(screen.getByRole('radio', { name: 'Creative' })).toHaveAttribute('tabindex', '-1')
  })
})

describe('the connection test', () => {
  it('reports a working key with how long it took', async () => {
    localStorage.setItem('pwb_ai_provider', 'groq')
    localStorage.setItem('pwb_groq_key', 'test-key')
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'OK' } }] }) })))
    renderSettings()

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Test connection' })) })

    await waitFor(() => expect(screen.getByText(/^Working — answered in/)).toBeTruthy())
    expect(String(globalThis.fetch.mock.calls[0][0])).toContain('groq')
  })

  it('reports a rejected key in the user\'s language', async () => {
    localStorage.setItem('pwb_language', 'tr')
    localStorage.setItem('pwb_ai_provider', 'groq')
    localStorage.setItem('pwb_groq_key', 'test-key')
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 401, text: async () => '{"error":{"message":"Invalid API Key"}}' })))
    renderSettings()

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Bağlantıyı test et' })) })

    await waitFor(() => expect(screen.getByText(/API anahtarınız reddedildi \(401\)/)).toBeTruthy())
  })
})

describe('render purity and local status errors', () => {
  it('switches away from a disabled provider in an effect rather than mutating storage inside render', async () => {
    setAiPolicy({ enabled: true, providers: ['openrouter', 'groq', 'gemini'] })
    localStorage.setItem('pwb_ai_provider', 'groq')
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
    let writesDuringRender = 0

    function Probe() {
      useAiPolicy()
      // During commit phase of render, effects have not executed yet. Any
      // pwb_ai_provider write observed here came from inside render().
      writesDuringRender = setItemSpy.mock.calls.filter(([k]) => k === 'pwb_ai_provider').length
      return null
    }

    const { container } = render(
      <UiThemeProvider>
        <LanguageProvider>
          <AiSettings />
          <Probe />
        </LanguageProvider>
      </UiThemeProvider>,
    )
    expect(writesDuringRender).toBe(0)
    setItemSpy.mockClear()
    writesDuringRender = 0

    act(() => {
      setAiPolicy({ enabled: true, providers: ['openrouter', 'gemini'] })
    })

    await waitFor(() => {
      expect(container.querySelector('select').value).toBe('openrouter')
    })
    expect(writesDuringRender).toBe(0)
    expect(localStorage.getItem('pwb_ai_provider')).toBe('openrouter')
  })

  it('reports a failed local refresh and enables another attempt', async () => {
    vi.stubEnv('VITE_API_URL', '/api')
    setAiPolicy({ enabled: true, providers: ['local', 'openrouter'] })
    localStorage.setItem('pwb_ai_provider', 'local')
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(localResponse(['llama3.1']))
      .mockRejectedValueOnce(new Error('Runtime offline')))
    renderSettings()
    await screen.findByText('1 model ready')

    fireEvent.click(screen.getByRole('button', { name: 'Refresh', exact: true }))

    await screen.findByText('Cannot reach the local runtime')
    expect(screen.getByText('Make sure Ollama is running. (Runtime offline)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled()
    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
  })
})

function localResponse(models) {
  return { ok: true, json: async () => ({ ok: true, runtime: 'ollama', models }) }
}

describe('local status request ownership', () => {
  it.each(['selection', 'server policy'])('ignores a refresh after %s changes the provider', async (change) => {
    setAiPolicy({ enabled: true, providers: ['local', 'groq'] })
    localStorage.setItem('pwb_ai_provider', 'local')
    localStorage.setItem('pwb_groq_model', 'llama-3.3-70b-versatile')
    let resolveRefresh
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(localResponse(['gemma3:4b']))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveRefresh = resolve })))
    renderSettings()
    await screen.findByText('1 model ready')
    fireEvent.click(screen.getByRole('button', { name: 'Refresh', exact: true }))

    if (change === 'selection') {
      fireEvent.change(screen.getByRole('combobox', { name: /^Provider/ }), { target: { value: 'groq' } })
    } else {
      act(() => setAiPolicy({ enabled: true, providers: ['groq'] }))
    }
    await act(async () => { resolveRefresh(localResponse(['qwen2.5:7b'])) })

    expect(screen.getByRole('combobox', { name: /^Provider/ })).toHaveValue('groq')
    expect(localStorage.getItem('pwb_groq_model')).toBe('llama-3.3-70b-versatile')
    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
  })

  it('keeps the new endpoint status and model when an older refresh arrives later', async () => {
    setAiPolicy({ enabled: true, providers: ['local'] })
    localStorage.setItem('pwb_ai_provider', 'local')
    let resolveRefresh
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(localResponse(['gemma3:4b']))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveRefresh = resolve }))
      .mockResolvedValueOnce(localResponse(['llama3.1:8b']))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [{ message: { content: 'Hello' } }] }) }))
    renderSettings()
    await screen.findByText('1 model ready')
    fireEvent.click(screen.getByRole('button', { name: 'Refresh', exact: true }))
    fireEvent.change(screen.getByRole('textbox', { name: /^Base URL \(advanced\)/ }), {
      target: { value: 'http://localhost:1234/v1' },
    })
    await waitFor(() => expect(localStorage.getItem('pwb_local_model')).toBe('llama3.1:8b'))
    await act(async () => { resolveRefresh(localResponse(['qwen2.5:7b'])) })

    expect(localStorage.getItem('pwb_local_model')).toBe('llama3.1:8b')
    expect(screen.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled()
    expect(globalThis.fetch).toHaveBeenCalledTimes(3)
    expect(new URL(globalThis.fetch.mock.calls[2][0], window.location.origin).searchParams.get('base')).toBe('http://localhost:1234/v1')

    await act(async () => { await runAiPrompt('Hello', { maxRounds: 1 }) })
    expect(globalThis.fetch).toHaveBeenCalledTimes(4)
    expect(JSON.parse(globalThis.fetch.mock.calls[3][1].body)).toMatchObject({
      _localBase: 'http://localhost:1234/v1', model: 'llama3.1:8b',
    })
  })
})
