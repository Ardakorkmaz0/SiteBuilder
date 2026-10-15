import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import { useDocumentTitle } from './useDocumentTitle.js'

function Screen({ title }) {
  useDocumentTitle(title)
  return null
}

afterEach(cleanup)

describe('useDocumentTitle', () => {
  it('names the tab after the screen, and in the reader\'s language without one', () => {
    localStorage.setItem('pwb_language', 'tr')
    const { rerender, unmount } = render(<LanguageProvider><Screen title="Favoriler" /></LanguageProvider>)
    expect(document.title).toBe('Favoriler · Sitebuilder')

    rerender(<LanguageProvider><Screen title={null} /></LanguageProvider>)
    expect(document.title).toBe('Sitebuilder: web siteleri oluşturun ve yayınlayın')

    rerender(<LanguageProvider><Screen title="Profil ve projeler" /></LanguageProvider>)
    unmount()
    expect(document.title).toBe('Sitebuilder: web siteleri oluşturun ve yayınlayın')
  })
})
