// The file list says of each page whether it is live, and a right click offers
// what can be done with it.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import PageFilesPanel from './PageFilesPanel.jsx'
import { useEditorStore } from '../../store/editorStore.js'

const pages = [
  { id: 'home', name: 'Home', mode: 'html', components: [] },
  { id: 'about', name: 'About', mode: 'html', components: [] },
  { id: 'team', name: 'Team', mode: 'html', components: [] },
]

function renderPanel(props = {}) {
  return render(
    <LanguageProvider>
      <PageFilesPanel
        htmlMap={{ home: '<h1>x</h1>', about: '<h1>x</h1>', team: '<h1>x</h1>' }}
        liveStates={{ home: 'live', about: 'older', team: 'none' }}
        onSendLive={vi.fn()}
        onSetHidden={vi.fn()}
        {...props}
      />
    </LanguageProvider>,
  )
}

const fileRow = (name) => screen.getByRole('button', { name, exact: true }).parentElement
const openMenu = (name) => {
  fireEvent.contextMenu(fileRow(name), { clientX: 40, clientY: 50 })
  return screen.getByRole('menu', { name: `Options for ${name}` })
}

beforeEach(() => {
  localStorage.setItem('pwb_language', 'en')
  useEditorStore.setState({ schema: { theme: {}, pages }, currentPageId: 'home' })
})

describe('the colour of a file', () => {
  it('is green when live, blue when an older version is live, red when not live, and says so in words', () => {
    renderPanel()

    expect(screen.getByRole('button', { name: 'index.html' })).toHaveClass('text-[var(--studio-success)]')
    expect(screen.getByRole('button', { name: 'about.html' })).toHaveClass('text-[var(--studio-info)]')
    expect(screen.getByRole('button', { name: 'team.html' })).toHaveClass('text-[var(--studio-danger)]')
    expect(within(fileRow('index.html')).getByText('Live')).toHaveClass('sr-only')
    expect(within(fileRow('about.html')).getByText('Older version live')).toHaveClass('sr-only')
    expect(within(fileRow('team.html')).getByText('Not live')).toHaveClass('sr-only')
  })

  it('marks a page kept off the public site', () => {
    renderPanel({ privatePages: ['team'] })

    expect(within(fileRow('team.html')).getByText('hidden')).toBeInTheDocument()
    expect(within(fileRow('about.html')).queryByText('hidden')).not.toBeInTheDocument()
  })
})

describe('right-clicking a file', () => {
  it('sends that file live', () => {
    const onSendLive = vi.fn()
    renderPanel({ onSendLive })

    fireEvent.click(within(openMenu('about.html')).getByRole('menuitem', { name: 'Go live' }))

    expect(onSendLive).toHaveBeenCalledTimes(1)
    expect(onSendLive).toHaveBeenCalledWith('about')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('offers nothing to send when the file is live as it stands', () => {
    renderPanel()

    expect(within(openMenu('index.html')).getByRole('menuitem', { name: 'Go live' })).toBeDisabled()
  })

  it('keeps a file off the public site, and lets it back', () => {
    const onSetHidden = vi.fn()
    const { unmount } = renderPanel({ onSetHidden })
    const shown = within(openMenu('about.html')).getByRole('menuitemcheckbox', { name: 'Do not show in public' })
    expect(shown).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(shown)
    expect(onSetHidden).toHaveBeenLastCalledWith('about', true)
    unmount()

    renderPanel({ onSetHidden, privatePages: ['about'] })
    const hidden = within(openMenu('about.html')).getByRole('menuitemcheckbox', { name: 'Do not show in public' })
    expect(hidden).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(hidden)
    expect(onSetHidden).toHaveBeenLastCalledWith('about', false)
  })

  it('does not let the home page be hidden', () => {
    const onSetHidden = vi.fn()
    renderPanel({ onSetHidden })
    const item = within(openMenu('index.html')).getByRole('menuitemcheckbox', { name: 'Do not show in public' })

    expect(item).toBeDisabled()
    expect(item).toHaveAttribute('title', 'The home page cannot be hidden.')
  })

  it('offers renaming and deleting that file', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderPanel()

    fireEvent.click(within(openMenu('team.html')).getByRole('menuitem', { name: 'Rename page' }))
    expect(screen.getByRole('textbox', { name: 'Page name' })).toHaveValue('Team')
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Page name' }), { key: 'Escape' })

    fireEvent.click(within(openMenu('team.html')).getByRole('menuitem', { name: 'Delete page' }))
    expect(useEditorStore.getState().schema.pages.map((page) => page.id)).toEqual(['home', 'about'])
  })

  it('closes on Esc and returns the keyboard to the file', () => {
    renderPanel()
    openMenu('about.html')

    fireEvent.keyDown(document.activeElement, { key: 'Escape' })

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'about.html' })).toHaveFocus()
  })

  it('moves with the arrow keys, past what is disabled', () => {
    renderPanel()
    const menu = openMenu('index.html')
    // "Go live" and the hide choice are both off for a home page that is live.
    expect(within(menu).getByRole('menuitem', { name: 'Rename page' })).toHaveFocus()

    fireEvent.keyDown(document.activeElement, { key: 'ArrowDown' })

    expect(within(menu).getByRole('menuitem', { name: 'Import an HTML file into this page' })).toHaveFocus()
  })
})
