import { act, render, screen, within } from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
import { beforeEach, describe, expect, it } from 'vitest'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import { useEditorStore } from '../../store/editorStore.js'
import Canvas from './Canvas.jsx'

beforeEach(() => {
  localStorage.setItem('pwb_language', 'en')
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  }
  useEditorStore.getState().loadSchema({
    theme: {},
    pages: [{
      id: 'home',
      name: 'Home',
      canvasWidth: 1000,
      components: [{
        id: 'tabs',
        type: 'tabs',
        props: { tabs: [{ id: 'one', label: 'One' }, { id: 'two', label: 'Two' }], activeId: 'one' },
        styles: {},
        layout: { x: 100, y: 100, w: 600, h: 240 },
        children: [],
      }],
    }],
  })
  useEditorStore.getState().setViewport('pc')
})

// On the canvas the tab strip was a tablist of plain buttons: a screen reader
// could not tell they were tabs, nor which one was being edited. The
// published page always had role="tab" and aria-selected.
describe('tabs on the canvas', () => {
  it('are tabs, and the one being edited is selected', async () => {
    render(
      <LanguageProvider>
        <DndContext>
          <Canvas />
        </DndContext>
      </LanguageProvider>,
    )
    const strip = screen.getByRole('tablist')
    expect(within(strip).getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['One', 'Two'])
    expect(within(strip).getByRole('tab', { name: 'One' })).toHaveAttribute('aria-selected', 'true')
    expect(within(strip).getByRole('tab', { name: 'Two' })).toHaveAttribute('aria-selected', 'false')

    await act(async () => within(strip).getByRole('tab', { name: 'Two' }).click())
    expect(within(strip).getByRole('tab', { name: 'Two' })).toHaveAttribute('aria-selected', 'true')
    expect(within(strip).getByRole('tab', { name: 'One' })).toHaveAttribute('aria-selected', 'false')
  })
})
