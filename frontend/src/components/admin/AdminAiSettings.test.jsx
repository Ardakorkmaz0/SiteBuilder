// Server settings → AI assistant: one click per switch, saved at once and on
// its own, so the superadmin can take a provider (or the whole assistant) out
// of every editor the moment it misbehaves.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'

vi.mock('../../api/admin.js', () => ({
  updateSettings: vi.fn(async (payload) => payload),
}))

import AdminAiSettings from './AdminAiSettings.jsx'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import { updateSettings } from '../../api/admin.js'

const BASE = {
  ai_enabled: true,
  ai_disabled_providers: [],
  ai_hidden_models: {},
  ai_default_provider: '',
  ai_notice: '',
  ai_local_available: false,
}

function renderSection(data = BASE) {
  let current = { ...data }
  const onSaved = vi.fn((updated) => { current = { ...current, ...updated }; view.rerender(ui(current)) })
  const ui = (d) => (
    <LanguageProvider>
      <AdminAiSettings data={d} onSaved={onSaved} />
    </LanguageProvider>
  )
  const view = render(ui(current))
  return { onSaved }
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  updateSettings.mockClear()
})

describe('the AI switches', () => {
  it('turns the whole assistant off with one click', async () => {
    renderSection()
    await act(async () => { fireEvent.click(screen.getByRole('switch', { name: 'AI assistant' })) })
    expect(updateSettings).toHaveBeenCalledWith({ ai_enabled: false })
    expect(screen.getByRole('status').textContent).toMatch(/AI assistant switched off — live for everyone now/)
  })

  it('takes one provider off the list, and brings it back', async () => {
    renderSection()
    await act(async () => { fireEvent.click(screen.getByRole('switch', { name: 'Groq · Llama' })) })
    expect(updateSettings).toHaveBeenLastCalledWith({ ai_disabled_providers: ['groq'] })

    await act(async () => { fireEvent.click(screen.getByRole('switch', { name: 'Groq · Llama' })) })
    expect(updateSettings).toHaveBeenLastCalledWith({ ai_disabled_providers: [] })
  })

  it('cannot switch on the local runtime where the server cannot serve it', () => {
    renderSection()
    const local = screen.getByRole('switch', { name: 'Local AI' })
    expect(local.disabled).toBe(true)
    expect(local.getAttribute('aria-checked')).toBe('false')
    expect(screen.getByText(/only works when the app runs on your own computer/)).toBeTruthy()
  })

  it('hides one suggested model, and any other id typed in', async () => {
    renderSection()
    fireEvent.click(screen.getAllByRole('button', { name: 'Models' })[0])
    await act(async () => { fireEvent.click(screen.getByRole('switch', { name: 'qwen/qwen3-coder:free' })) })
    expect(updateSettings).toHaveBeenLastCalledWith({ ai_hidden_models: { openrouter: ['qwen/qwen3-coder:free'] } })

    fireEvent.change(screen.getByLabelText('Model id to hide'), { target: { value: 'vendor/broken-model:free' } })
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Hide' })) })
    expect(updateSettings).toHaveBeenLastCalledWith({
      ai_hidden_models: { openrouter: ['qwen/qwen3-coder:free', 'vendor/broken-model:free'] },
    })
    expect(screen.getByText('vendor/broken-model:free')).toBeTruthy()
  })

  it('saves the start provider and the notice', async () => {
    renderSection()
    await act(async () => { fireEvent.change(screen.getByLabelText('Start provider'), { target: { value: 'gemini' } }) })
    expect(updateSettings).toHaveBeenLastCalledWith({ ai_default_provider: 'gemini' })

    fireEvent.change(screen.getByLabelText('Notice in the AI panel'), { target: { value: '  Gemini yavaş.  ' } })
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save notice' })) })
    expect(updateSettings).toHaveBeenLastCalledWith({ ai_notice: 'Gemini yavaş.' })
  })
})
