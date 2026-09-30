// A form field's box is its field part: the theme colours that part and puts
// no second frame around the whole block (label included).
import { beforeEach, describe, expect, it } from 'vitest'
import { useEditorStore } from './editorStore.js'
import { THEME_PRESETS, presetTheme } from '../utils/theme.js'

const field = () => useEditorStore.getState().schema.pages[0].components.find((c) => c.type === 'input')

beforeEach(() => {
  useEditorStore.getState().loadSchema({ theme: presetTheme(THEME_PRESETS.find((p) => p.id === 'forest')), pages: [{ id: 'home', name: 'Home', components: [] }] })
})

describe('a form field and the theme', () => {
  it('drops in with one frame: the field, in the theme\'s colours', () => {
    useEditorStore.getState().addComponent('input', 40, 40)
    const { styles, props } = field()
    expect([styles.borderWidth, styles.backgroundColor]).toEqual(['0px', 'transparent'])
    expect([props.fieldBorderColor, props.fieldColor]).toEqual([presetTheme(THEME_PRESETS.find((p) => p.id === 'forest')).mutedColor, '#1a2e1f'])
  })

  it('keeps a preset\'s own field look over the theme\'s', () => {
    useEditorStore.getState().addComponent('input', 40, 40, null, 'filled')
    expect(field().props.fieldBackgroundColor).not.toBe('#ffffff')
  })

  it('takes the second frame off an older field when the theme is applied', () => {
    useEditorStore.getState().loadSchema({ theme: {}, pages: [{ id: 'home', name: 'Home', components: [{
      id: 'f', type: 'input', props: { label: 'Email' },
      styles: { backgroundColor: '#ffffff', borderColor: '#d2d2d7', borderWidth: '1px', borderStyle: 'solid', borderRadius: '18px' },
      layout: { x: 0, y: 0, w: 320, h: 70 },
    }] }] })
    useEditorStore.getState().applyTheme()
    expect([field().styles.borderWidth, field().props.fieldBorderColor]).toEqual(['0px', '#d2d2d7'])
  })
})
