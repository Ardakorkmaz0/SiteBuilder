// A site with a sharing image shows it on its card, as a shared link does;
// without one, or when the image fails, the card keeps the live thumbnail.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import SitePreview from './SitePreview.jsx'
import { getSite } from '../../api/sites.js'

vi.mock('../../api/sites.js', () => ({
  getSite: vi.fn(() => new Promise(() => {})),
  getPublicSite: vi.fn(() => new Promise(() => {})),
}))

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.setItem('pwb_language', 'en')
  // Every card is on screen at once in a test.
  globalThis.IntersectionObserver = class {
    constructor(callback) { this.callback = callback }
    observe() { this.callback([{ isIntersecting: true }]) }
    disconnect() {}
  }
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  }
})

function renderPreview(site) {
  return render(
    <LanguageProvider>
      <SitePreview site={{ id: 1, slug: 'ada', ...site }} />
    </LanguageProvider>,
  )
}

describe('SitePreview', () => {
  it('shows the sharing image instead of building a live thumbnail', () => {
    const { container } = renderPreview({ share_image: 'https://cdn.example/card.png' })

    expect(container.querySelector('img')).toHaveAttribute('src', 'https://cdn.example/card.png')
    expect(getSite).not.toHaveBeenCalled()
  })

  it('falls back to the live thumbnail when the image does not load', () => {
    const { container } = renderPreview({ share_image: 'https://cdn.example/gone.png' })

    fireEvent.error(container.querySelector('img'))

    expect(container.querySelector('img')).toBeNull()
    expect(getSite).toHaveBeenCalledWith(1)
    expect(screen.getByText('Loading preview…')).toBeInTheDocument()
  })

  it('ignores anything that is not a web address or a site path', () => {
    const { container } = renderPreview({ share_image: 'javascript:alert(1)' })

    expect(container.querySelector('img')).toBeNull()
  })
})
