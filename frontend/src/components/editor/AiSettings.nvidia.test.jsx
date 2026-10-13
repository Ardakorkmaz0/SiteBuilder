// The settings panel tells people where their key goes. For every provider
// but one that is "straight to the provider, never to our server". NVIDIA
// refuses browser calls, so its key passes through this app's server — and the
// panel has to say that, not repeat a sentence that is not true for it.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AiSettings from './AiSettings.jsx'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../../ui/UiThemeProvider.jsx'
import { useAuthStore } from '../../store/authStore.js'

function renderSettings() {
  return render(
    <UiThemeProvider>
      <LanguageProvider>
        <AiSettings />
      </LanguageProvider>
    </UiThemeProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  useAuthStore.setState({ token: 'app-token', user: { id: 1, username: 'me' } })
  globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, models: ['z-ai/glm-5.3', 'vendor/brand-new-model'] }) }))
})

describe('choosing NVIDIA in the AI settings', () => {
  it('says the key passes through this app’s server, and stores it under its own name', async () => {
    const { container } = renderSettings()
    expect(screen.getByText(/never to our server/)).toBeTruthy()

    fireEvent.change(container.querySelector('select'), { target: { value: 'nvidia' } })

    expect(screen.queryByText(/never to our server/)).toBeNull()
    expect(screen.getByText(/sent through this app’s server/)).toBeTruthy()
    const key = screen.getByPlaceholderText('nvapi-...')
    fireEvent.change(key, { target: { value: 'nvapi-test-key-0123456789' } })
    expect(localStorage.getItem('pwb_nvidia_key')).toBe('nvapi-test-key-0123456789')
    expect(localStorage.getItem('pwb_ai_provider')).toBe('nvidia')
  })

  it('offers what NVIDIA has right now beside the short list', async () => {
    const { container } = renderSettings()
    fireEvent.change(container.querySelector('select'), { target: { value: 'nvidia' } })

    await waitFor(() => {
      const offered = [...container.querySelectorAll('datalist option')].map((option) => option.value)
      expect(offered).toContain('vendor/brand-new-model')
      expect(offered.filter((id) => id === 'z-ai/glm-5.3')).toHaveLength(1)
    })
  })
})
