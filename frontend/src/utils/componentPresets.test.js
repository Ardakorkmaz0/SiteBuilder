import { describe, expect, it } from 'vitest'
import { COMPONENT_PRESET_PROPS, componentPresetProps } from './componentPresets.js'

const labels = (items) => items.map((item) => item.label)

// On a Turkish screen a navigation bar from the palette said
// "Brand · Home · About · Contact", and tabs "Home · Profile · Contact".
describe('preset words on a Turkish screen', () => {
  it('translates tab names and keeps their ids', () => {
    const props = componentPresetProps('tabs', 'bootstrap', 'tr')
    expect(labels(props.tabs)).toEqual(['Ana sayfa', 'Profil', 'İletişim'])
    expect(props.tabs.map((tab) => tab.id)).toEqual(['home', 'profile', 'contact'])
    expect(props.activeId).toBe('home')
    expect(labels(componentPresetProps('tabs', 'simple', 'tr').tabs)).toEqual(['Genel bakış', 'Ayrıntılar', 'SSS'])
  })

  it('translates a navigation bar brand and links and keeps where they go', () => {
    const props = componentPresetProps('navbar', 'dark', 'tr')
    expect(props.brand).toBe('Marka')
    expect(labels(props.links)).toEqual(['Ana sayfa', 'Hakkında', 'İletişim'])
    expect(props.links.map((link) => link.href)).toEqual(['#', '#about', '#contact'])
    expect(labels(componentPresetProps('navbar', 'cta', 'tr').links)).toEqual(['Özellikler', 'Fiyatlar', 'Kaydolun'])
    expect(componentPresetProps('navbar', 'centered', 'tr').brand).toBe('MARKA')
  })

  it('leaves no English word in any navigation bar or tabs preset', () => {
    const sameInTurkish = new Set(['Blog'])
    for (const type of ['navbar', 'tabs']) {
      for (const [id, english] of Object.entries(COMPONENT_PRESET_PROPS[type])) {
        const turkish = componentPresetProps(type, id, 'tr')
        const pairs = [
          ...(english.brand ? [[english.brand, turkish.brand]] : []),
          ...(english.links || []).map((link, i) => [link.label, turkish.links[i].label]),
          ...(english.tabs || []).map((tab, i) => [tab.label, turkish.tabs[i].label]),
        ]
        for (const [en, tr] of pairs) {
          if (!sameInTurkish.has(en)) expect(tr, `${type}.${id}: ${en}`).not.toBe(en)
        }
      }
    }
  })

  it('keeps the field presets their own Turkish', () => {
    expect(componentPresetProps('input', 'email', 'tr')).toMatchObject({ label: 'E-posta', placeholder: 'ornek@eposta.com' })
  })

  it('changes nothing on an English screen, nor the presets themselves', () => {
    expect(labels(componentPresetProps('tabs', 'bootstrap', 'en').tabs)).toEqual(['Home', 'Profile', 'Contact'])
    componentPresetProps('navbar', 'dark', 'tr')
    expect(COMPONENT_PRESET_PROPS.navbar.dark.brand).toBe('Brand')
    expect(labels(COMPONENT_PRESET_PROPS.navbar.dark.links)).toEqual(['Home', 'About', 'Contact'])
  })
})
