// What the site opens in: the owner's choice, shown for a site that never made
// one, and written as the store keeps it.
import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../../ui/UiThemeProvider.jsx'
import ColorModePanel from './ColorModePanel.jsx'
import { useEditorStore } from '../../store/editorStore.js'

const LIGHT = { backgroundColor: '#ffffff' }
const DARK = { backgroundColor: '#0b0c0f' }

function open({ theme = LIGHT, colorMode } = {}) {
  localStorage.setItem('pwb_language', 'en')
  useEditorStore.getState().loadSchema({ theme, ...(colorMode ? { colorMode } : {}), pages: [{ id: 'home', name: 'Home', components: [] }] })
  render(
    <UiThemeProvider>
      <LanguageProvider>
        <ColorModePanel />
      </LanguageProvider>
    </UiThemeProvider>,
  )
}

const choice = (name) => screen.getByRole('radio', { name })
const saved = () => useEditorStore.getState().schema.colorMode

beforeEach(() => localStorage.clear())

describe('the site opens in', () => {
  it('shows the designed palette for a site that never chose, and writes nothing', () => {
    open()
    expect(choice('Light')).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(choice('Light'))
    expect(saved()).toBeUndefined()
    expect(useEditorStore.getState().dirty).toBe(false)
  })

  it('shows a site designed dark as dark', () => {
    open({ theme: DARK })
    expect(choice('Dark')).toHaveAttribute('aria-checked', 'true')
  })

  it('shows the old device box as the device', () => {
    open({ colorMode: { theme: {}, followDevice: true } })
    expect(choice('Device')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('Each visitor gets the setting of their own device.')).toBeInTheDocument()
  })

  it('writes the choice and says when visitors see the other colors first', () => {
    open()
    fireEvent.click(choice('Dark'))
    expect(saved()).toEqual({ theme: {}, followDevice: false, start: 'dark' })
    expect(choice('Dark')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('Visitors see the colors below first; the editor keeps showing the colors you design in.')).toBeInTheDocument()

    fireEvent.click(choice('Device'))
    expect(saved()).toEqual({ theme: {}, followDevice: true, start: 'system' })
    fireEvent.click(choice('Light'))
    expect(saved()).toEqual({ theme: {}, followDevice: false, start: 'light' })
  })

  it('keeps the colors the owner set, and the choice when a color changes', () => {
    open({ colorMode: { theme: { backgroundColor: '#000000' }, followDevice: false } })
    fireEvent.click(choice('Dark'))
    expect(saved().theme).toEqual({ backgroundColor: '#000000' })
    useEditorStore.getState().updateColorMode({ theme: { textColor: '#eeeeee' } })
    expect(saved()).toEqual({ theme: { backgroundColor: '#000000', textColor: '#eeeeee' }, followDevice: false, start: 'dark' })
  })

  it('takes the choice back with undo', () => {
    open()
    fireEvent.click(choice('Dark'))
    useEditorStore.getState().undo()
    expect(saved()).toBeUndefined()
  })
})
