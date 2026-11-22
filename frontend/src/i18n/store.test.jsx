import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

afterEach(() => {
  cleanup()
  vi.resetModules()
  localStorage.clear()
})

describe('lazy Turkish translation store', () => {
  it('starts without the base Turkish dictionary and loads it on demand when switching to Turkish', async () => {
    vi.resetModules()
    localStorage.setItem('pwb_language', 'en')

    const store = await import('./store.js')
    expect(store.hasBaseTurkishTranslations()).toBe(false)

    // Library extensions added before translations.js loads stay registered,
    // and base dictionary entries still win once translations.js loads.
    store.extendTranslations({ 'Card view': 'Overridden by library', 'Custom label': 'Özel etiket' })

    const { default: LanguageProvider } = await import('./LanguageProvider.jsx')
    const { useLanguage } = await import('./useLanguage.js')

    function Demo() {
      const { language, setLanguage, t } = useLanguage()
      return (
        <div>
          <span data-testid="lang">{language}</span>
          <span data-testid="card">{t('Card view')}</span>
          <span data-testid="custom">{t('Custom label')}</span>
          <button type="button" onClick={() => setLanguage('tr')}>Switch to TR</button>
        </div>
      )
    }

    render(
      <LanguageProvider>
        <Demo />
      </LanguageProvider>,
    )

    expect(screen.getByTestId('lang')).toHaveTextContent('en')
    expect(screen.getByTestId('card')).toHaveTextContent('Card view')
    expect(store.hasBaseTurkishTranslations()).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Switch to TR' }))

    await waitFor(() => expect(screen.getByTestId('lang')).toHaveTextContent('tr'))
    expect(store.hasBaseTurkishTranslations()).toBe(true)
    expect(screen.getByTestId('card')).toHaveTextContent('Kart görünümü')
    expect(screen.getByTestId('custom')).toHaveTextContent('Özel etiket')
  })
})
