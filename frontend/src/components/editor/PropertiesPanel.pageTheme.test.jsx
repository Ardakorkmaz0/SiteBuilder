// "Whole site" / "This page only": a theme chosen for one page stays on that
// page, and the site theme stops reaching it.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../../ui/UiThemeProvider.jsx'
import PropertiesPanel from './PropertiesPanel.jsx'
import { useEditorStore } from '../../store/editorStore.js'
import { THEME_PRESETS, applyThemeToSchema, pageTheme, presetTheme } from '../../utils/theme.js'

vi.mock('../../api/profile.js', () => ({
  getSavedThemes: vi.fn(() => new Promise(() => {})),
  putSavedThemes: vi.fn(),
}))

const heading = (id) => ({ id, type: 'heading', props: { text: 'Hi' }, styles: {}, layout: { x: 0, y: 0, w: 300, h: 60 } })
const colorOf = (pageId) => useEditorStore.getState().schema.pages.find((p) => p.id === pageId).components[0].styles.color

function renderThemeTab(props = {}) {
  localStorage.setItem('pwb_language', 'en')
  localStorage.setItem('pwb_page_tab', 'theme')
  return render(
    <UiThemeProvider>
      <LanguageProvider>
        <PropertiesPanel {...props} />
      </LanguageProvider>
    </UiThemeProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  const s = useEditorStore.getState()
  s.loadSchema({
    theme: { textColor: '#111111' },
    pages: [
      { id: 'home', name: 'Home', components: [heading('h1')] },
      { id: 'about', name: 'About', components: [heading('h2')] },
    ],
  })
  s.selectPage('about')
  s.selectComponent(null)
})

describe('the theme scope', () => {
  it('starts on the whole site', () => {
    renderThemeTab()

    expect(screen.getByRole('radio', { name: 'Whole site' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('Changes here reach every page.')).toBeInTheDocument()
  })

  it('keeps a preset on this page when "This page only" is chosen', () => {
    renderThemeTab()
    const noir = THEME_PRESETS.find((p) => p.id === 'noir')

    fireEvent.click(screen.getByRole('radio', { name: 'This page' }))
    fireEvent.click(screen.getByRole('button', { name: /Noir Gold/ }))

    const { schema } = useEditorStore.getState()
    // This page wears the preset...
    expect(colorOf('about')).toBe(presetTheme(noir).textColor)
    expect(schema.pages.find((p) => p.id === 'about').theme.primaryColor).toBe(noir.theme.primaryColor)
    // ...and neither the other page nor the site theme moved.
    expect(colorOf('home')).not.toBe(presetTheme(noir).textColor)
    expect(schema.theme.primaryColor).not.toBe(noir.theme.primaryColor)
  })

  it('shields that page from the site theme afterwards', () => {
    const s = useEditorStore.getState()
    s.setPageThemeScope('about', 'page')
    s.updatePageTheme('about', { textColor: '#c2410c' })
    s.applyPageTheme('about')

    s.updateTheme({ textColor: '#1e3a8a' })
    s.applyTheme()

    expect(colorOf('home')).toBe('#1e3a8a')
    expect(colorOf('about')).toBe('#c2410c')
  })

  it('says how many pages the site theme skips', () => {
    useEditorStore.getState().setPageThemeScope('home', 'page')
    renderThemeTab()

    expect(screen.getByText('Changes here reach every page except 1 that keep their own theme.')).toBeInTheDocument()
  })

  it('puts the page back on the site theme without restyling it', () => {
    const s = useEditorStore.getState()
    s.setPageThemeScope('about', 'page')
    s.updatePageTheme('about', { textColor: '#c2410c' })
    s.applyPageTheme('about')
    renderThemeTab()

    fireEvent.click(screen.getByRole('radio', { name: 'Whole site' }))

    const about = useEditorStore.getState().schema.pages.find((p) => p.id === 'about')
    expect(about.theme).toBeUndefined()
    expect(colorOf('about')).toBe('#c2410c')
  })

  it('sends HTML pages the page-only flag', () => {
    const onApplyThemeToHtml = vi.fn()
    useEditorStore.getState().setPageThemeScope('about', 'page')
    renderThemeTab({ htmlMode: true, onApplyThemeToHtml })

    fireEvent.click(screen.getByRole('button', { name: 'Apply to this page' }))

    expect(onApplyThemeToHtml).toHaveBeenCalledWith(expect.any(Object), { pageOnly: true })
  })
})

describe('new blocks on a page with its own theme', () => {
  it('take that page\'s theme, not the site\'s', () => {
    const s = useEditorStore.getState()
    s.setPageThemeScope('about', 'page')
    s.updatePageTheme('about', { textColor: '#c2410c' })

    s.addComponent('heading', 20, 20)

    const about = useEditorStore.getState().schema.pages.find((p) => p.id === 'about')
    expect(about.components.at(-1).styles.color).toBe('#c2410c')
  })
})

describe('the writers', () => {
  it('leave a page with its own theme alone when the site theme is applied', () => {
    const schema = {
      theme: { textColor: '#1e3a8a' },
      pages: [
        { id: 'a', components: [heading('x')] },
        { id: 'b', theme: { textColor: '#c2410c' }, components: [heading('y')] },
      ],
    }

    const out = applyThemeToSchema(schema)

    expect(out.pages[0].components[0].styles.color).toBe('#1e3a8a')
    expect(out.pages[1].components[0].styles).toEqual({})
    expect(pageTheme(out, out.pages[1]).textColor).toBe('#c2410c')
  })
})
