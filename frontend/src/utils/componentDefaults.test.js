// A component starts with text in the editor's language: a navigation bar or
// tabs dropped in the Turkish editor, or a block the AI adds, used to arrive in
// English.
import { afterEach, describe, expect, it } from 'vitest'
import { DEFAULT_PROPS_TR, defaultPropsFor } from './componentDefaults.js'
import { registry } from '../components/registry.jsx'
import { useEditorStore } from '../store/editorStore.js'

const s = () => useEditorStore.getState()

afterEach(() => localStorage.clear())

describe('the text a component starts with', () => {
  it('is Turkish in the Turkish editor, and only where there is text', () => {
    const nav = defaultPropsFor('navbar', 'tr')
    expect(nav.brand).toBe('Kişisel Sitem')
    expect(nav.links.map((l) => l.label)).toEqual(['Ana sayfa', 'Hakkımda', 'İletişim'])
    // Everything that is not text stays as the registry has it.
    expect(nav.navLayout).toBe(registry.navbar.defaultProps.navLayout)
    expect(defaultPropsFor('tabs', 'tr').tabs.map((t) => t.label)).toEqual(['Birinci sekme', 'İkinci sekme', 'Üçüncü sekme'])
    expect(defaultPropsFor('navbar', 'en').brand).toBe('My Personal Site')
  })

  it('is a fresh copy every time', () => {
    defaultPropsFor('navbar', 'tr').links.push({ label: 'x' })
    expect(defaultPropsFor('navbar', 'tr').links).toHaveLength(3)
    expect(DEFAULT_PROPS_TR.navbar.links).toHaveLength(3)
  })

  it('reaches a component added in the Turkish editor', () => {
    localStorage.setItem('pwb_language', 'tr')
    s().loadSchema({ theme: {}, pages: [{ id: 'p1', name: 'Ana Sayfa', components: [] }] })
    s().addComponent('navbar', 0, 0)
    s().addComponent('button', 40, 200)
    const [nav, button] = s().schema.pages[0].components
    expect(nav.props.brand).toBe('Kişisel Sitem')
    expect(button.props.text).toBe('Bana ulaşın')
  })

  it('no longer greets everyone in the author\'s name', () => {
    expect(registry.text.defaultProps.text).not.toMatch(/Arda/)
  })
})
