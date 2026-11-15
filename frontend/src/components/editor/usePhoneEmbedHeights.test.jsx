import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEditorStore, selectCurrentPage } from '../../store/editorStore.js'
import { usePhoneEmbedHeights } from './usePhoneEmbedHeights.js'
import { embedPhoneKey, measureEmbedHeight } from '../../utils/htmlEmbedMeasure.js'

vi.mock('../../utils/htmlEmbedMeasure.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    measureEmbedHeight: vi.fn(async () => 420),
  }
})

function Harness() {
  usePhoneEmbedHeights()
  return null
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('usePhoneEmbedHeights', () => {
  it('measures unmeasured html embeds nested inside container and tabs', async () => {
    const htmlInContainer = {
      id: 'h_cont',
      type: 'html',
      props: { code: '<p>Nested in container</p>' },
      styles: {},
      layout: { x: 0, y: 0, w: 600, h: 100 },
      mobileLayout: { x: 0, y: 0, w: 320, h: 100 },
    }
    const htmlInTabs = {
      id: 'h_tabs',
      type: 'html',
      props: { code: '<p>Nested in tabs</p>' },
      styles: {},
      layout: { x: 0, y: 0, w: 500, h: 90 },
      mobileLayout: { x: 0, y: 0, w: 300, h: 90 },
    }
    useEditorStore.getState().loadSchema({
      pages: [{
        id: 'home',
        name: 'Home',
        flowMode: false,
        mobileManual: false,
        components: [
          {
            id: 'cont_1',
            type: 'container',
            props: {},
            styles: {},
            layout: { x: 0, y: 0, w: 700, h: 200 },
            children: [htmlInContainer],
          },
          {
            id: 'tabs_1',
            type: 'tabs',
            props: { tabs: [{ id: 't1', label: 'Tab 1' }], activeId: 't1' },
            styles: {},
            layout: { x: 0, y: 220, w: 700, h: 200 },
            children: [htmlInTabs],
          },
        ],
      }],
    })

    await act(async () => {
      render(<Harness />)
    })

    expect(measureEmbedHeight).toHaveBeenCalledTimes(2)
    const page = selectCurrentPage(useEditorStore.getState())
    expect(page.components[0].children[0].props._phoneH).toEqual({
      w: 320,
      h: 420,
      key: embedPhoneKey(htmlInContainer),
    })
    expect(page.components[1].children[0].props._phoneH).toEqual({
      w: 300,
      h: 420,
      key: embedPhoneKey(htmlInTabs),
    })
  })
})
