import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import { useEditorStore } from '../../store/editorStore.js'
import CanvasMultiActions from './CanvasMultiActions.jsx'

function loadThree() {
  useEditorStore.getState().loadSchema({
    theme: {},
    pages: [{
      id: 'p1', name: 'Home', components: [
        { id: 'a', type: 'button', props: {}, styles: {}, layout: { x: 0, y: 10, w: 100, h: 40 } },
        { id: 'b', type: 'button', props: {}, styles: {}, layout: { x: 200, y: 90, w: 100, h: 40 } },
        { id: 'c', type: 'button', props: {}, styles: {}, layout: { x: 400, y: 300, w: 100, h: 40 } },
      ],
    }],
  })
  useEditorStore.getState().selectPage('p1')
  useEditorStore.getState().selectMany(['a', 'b', 'c'])
}

const layoutOf = (id) =>
  useEditorStore.getState().schema.pages[0].components.find((c) => c.id === id).layout

describe('CanvasMultiActions', () => {
  it('renders the group tools with the selection count', () => {
    localStorage.setItem('pwb_language', 'en')
    loadThree()
    render(<LanguageProvider><CanvasMultiActions count={3} /></LanguageProvider>)
    expect(screen.getByRole('toolbar', { name: 'Align & distribute' })).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Align left' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete selected' })).toBeInTheDocument()
  })

  it('deletes with a trash can and lets go with an X, as the bar over one block does', () => {
    localStorage.setItem('pwb_language', 'en')
    loadThree()
    render(<LanguageProvider><CanvasMultiActions count={3} /></LanguageProvider>)
    const remove = screen.getByRole('button', { name: 'Delete selected' })
    expect(remove.textContent).toBe('')
    expect(remove.querySelector('path[d="M9 7V4h6v3"]')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Deselect' }))

    expect(useEditorStore.getState().selectedIds).toEqual([])
    expect(useEditorStore.getState().schema.pages[0].components.map((c) => c.id)).toEqual(['a', 'b', 'c'])
  })

  it('aligns every selected item to the left edge', async () => {
    localStorage.setItem('pwb_language', 'en')
    loadThree()
    const user = userEvent.setup()
    render(<LanguageProvider><CanvasMultiActions count={3} /></LanguageProvider>)
    await user.click(screen.getByRole('button', { name: 'Align left' }))
    expect(layoutOf('a').x).toBe(0)
    expect(layoutOf('b').x).toBe(0)
    expect(layoutOf('c').x).toBe(0)
  })

  it('distributes the items evenly (needs 3+), else the buttons are disabled', async () => {
    localStorage.setItem('pwb_language', 'en')
    loadThree()
    const user = userEvent.setup()
    render(<LanguageProvider><CanvasMultiActions count={2} /></LanguageProvider>)
    expect(screen.getByRole('button', { name: 'Distribute horizontally' })).toBeDisabled()

    render(<LanguageProvider><CanvasMultiActions count={3} /></LanguageProvider>)
    const distV = screen.getAllByRole('button', { name: 'Distribute vertically' }).at(-1)
    await user.click(distV)
    // Middle item's top sits halfway between the first and last tops.
    expect(layoutOf('b').y).toBe(Math.round((layoutOf('a').y + layoutOf('c').y) / 2))
  })

  it('deletes the whole selection', async () => {
    localStorage.setItem('pwb_language', 'en')
    loadThree()
    const user = userEvent.setup()
    render(<LanguageProvider><CanvasMultiActions count={3} /></LanguageProvider>)
    await user.click(screen.getByRole('button', { name: 'Delete selected' }))
    expect(useEditorStore.getState().schema.pages[0].components).toHaveLength(0)
  })

  it('preserves counter-scale when positioned above the group with a translateY transform', () => {
    localStorage.setItem('pwb_language', 'en')
    loadThree()
    render(
      <LanguageProvider>
        <CanvasMultiActions
          count={3}
          canvasScale={0.5}
          style={{ left: 100, top: 200, transform: 'translateY(calc(-100% - 8px))' }}
        />
      </LanguageProvider>,
    )
    const toolbar = screen.getByRole('toolbar', { name: 'Align & distribute' })
    expect(toolbar.style.transformOrigin).toBe('top left')
    expect(toolbar.style.transform).toContain('scale(2)')
    expect(toolbar.style.transform).toContain('translateY(calc(-100% - 8px))')
  })
})
