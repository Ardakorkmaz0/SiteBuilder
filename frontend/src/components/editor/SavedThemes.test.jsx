// Saving the current theme to the account, reusing it, replacing and deleting it.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import SavedThemes from './SavedThemes.jsx'
import { getSavedThemes, putSavedThemes } from '../../api/profile.js'
import { normalizeTheme } from '../../utils/theme.js'
import { useEditorStore } from '../../store/editorStore.js'

vi.mock('../../api/profile.js', () => ({
  getSavedThemes: vi.fn(),
  putSavedThemes: vi.fn(async (themes) => ({ themes, limit: 24 })),
}))

const current = normalizeTheme({ primaryColor: '#c2410c', fontFamily: 'Georgia, serif' })
const studio = { id: 't1', name: 'Studio', theme: normalizeTheme({ primaryColor: '#1e3a8a' }) }

function renderSaved(onApply = vi.fn()) {
  localStorage.setItem('pwb_language', 'en')
  render(
    <LanguageProvider>
      <SavedThemes theme={current} onApply={onApply} />
    </LanguageProvider>,
  )
  return onApply
}

beforeEach(() => {
  vi.clearAllMocks()
  getSavedThemes.mockResolvedValue({ themes: [studio], limit: 24 })
})

describe('SavedThemes', () => {
  it('lists the account\'s themes and applies one on click', async () => {
    const user = userEvent.setup()
    const onApply = renderSaved()

    await user.click(await screen.findByRole('button', { name: 'Studio' }))

    expect(onApply).toHaveBeenCalledWith(studio)
  })

  it('saves the current colors and fonts under a name', async () => {
    const user = userEvent.setup()
    renderSaved()
    await screen.findByRole('button', { name: 'Studio' })

    await user.type(screen.getByRole('textbox', { name: 'Name this theme' }), 'Launch')
    await user.click(screen.getByRole('button', { name: 'Save theme' }))

    const [saved] = putSavedThemes.mock.calls[0]
    expect(saved.map((item) => item.name)).toEqual(['Launch', 'Studio'])
    expect(saved[0].theme.primaryColor).toBe('#c2410c')
    expect(await screen.findByRole('button', { name: 'Launch' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('replaces a theme saved under the same name instead of adding a twin', async () => {
    const user = userEvent.setup()
    renderSaved()
    await screen.findByRole('button', { name: 'Studio' })

    await user.type(screen.getByRole('textbox', { name: 'Name this theme' }), 'studio')
    await user.click(screen.getByRole('button', { name: 'Save theme' }))

    const [saved] = putSavedThemes.mock.calls[0]
    expect(saved).toHaveLength(1)
    expect(saved[0].id).toBe('t1')
    expect(saved[0].theme.primaryColor).toBe('#c2410c')
  })

  it('deletes one', async () => {
    const user = userEvent.setup()
    renderSaved()

    await user.click(await screen.findByRole('button', { name: 'Delete the "Studio" theme' }))

    expect(putSavedThemes).toHaveBeenCalledWith([])
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Studio' })).toBeNull())
  })

  it('says so when the list cannot be loaded, and still offers saving', async () => {
    getSavedThemes.mockRejectedValue({ response: { status: 500 } })
    renderSaved()

    expect(await screen.findByRole('alert')).toHaveTextContent('Your saved themes could not be loaded.')
    expect(screen.getByRole('textbox', { name: 'Name this theme' })).toBeInTheDocument()
  })
})

describe('the accent in the editor store', () => {
  it('follows the primary color until someone picks it', () => {
    const store = useEditorStore.getState()
    store.updateTheme({ primaryColor: '#111111', accentColor: '#111111' })

    store.updateTheme({ primaryColor: '#1e3a8a' })
    expect(useEditorStore.getState().schema.theme.accentColor).toBe('#1e3a8a')

    store.updateTheme({ accentColor: '#facc15' })
    store.updateTheme({ primaryColor: '#c2410c' })
    expect(useEditorStore.getState().schema.theme.accentColor).toBe('#facc15')
  })
})
