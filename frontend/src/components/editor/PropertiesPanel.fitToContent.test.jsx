// "Fit to content" hands a block sized by hand back to automatic sizing: from
// then on its box follows its text again. The button in the selection toolbar
// did; the same button in the Properties panel fitted the box once and left
// the block marked as hand-sized, so the next longer label was cut off.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'

vi.mock('../../utils/htmlEmbedMeasure.js', async (importOriginal) => {
  const real = await importOriginal()
  return {
    ...real,
    fitHtmlEmbedLayout: vi.fn(async (component, width, apply) => {
      apply({ w: 180, h: 44 })
      return true
    }),
  }
})

import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../../ui/UiThemeProvider.jsx'
import PropertiesPanel from './PropertiesPanel.jsx'
import { useEditorStore } from '../../store/editorStore.js'

const s = () => useEditorStore.getState()
const block = () => s().schema.pages[0].components[0]

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('pwb_props_tab', 'layout')
  s().loadSchema({
    theme: {},
    pages: [{
      id: 'p1',
      name: 'Home',
      components: [{ id: 'embed', type: 'html', props: { code: '<a class="btn">Go</a>' }, styles: {}, layout: { x: 20, y: 20, w: 320, h: 120 } }],
    }],
  })
  s().selectComponent('embed')
  // Sized by hand: the editor stops fitting it on its own.
  s().setLayout('embed', { w: 400, h: 200 })
})

describe('"Fit to content" in the Properties panel', () => {
  it('fits the box and gives the block back to automatic sizing', async () => {
    expect(block().props._boxManual).toBe(true)
    render(
      <UiThemeProvider>
        <LanguageProvider>
          <PropertiesPanel />
        </LanguageProvider>
      </UiThemeProvider>,
    )

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Fit to content' })) })

    expect(block().layout).toMatchObject({ w: 180, h: 44 })
    expect(block().props._boxManual).toBe(false)
  })
})
