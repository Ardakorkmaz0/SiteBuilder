// Pending or in-flight AI patches belong strictly to the component that
// requested them. Switching selection to another component must clear stale
// pending edits so accepting cannot overwrite the newly selected block.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

const aiEditComponent = vi.fn()
vi.mock('../../utils/aiAssistant.js', async () => {
  const actual = await vi.importActual('../../utils/aiAssistant.js')
  return {
    ...actual,
    aiEditComponent: (...args) => aiEditComponent(...args),
  }
})
vi.mock('../../utils/aiProviders.js', async () => {
  const actual = await vi.importActual('../../utils/aiProviders.js')
  return {
    ...actual,
    useAiAvailable: () => true,
  }
})

import AiComponentEdit from './AiComponentEdit.jsx'
import PropertiesPanel from './PropertiesPanel.jsx'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../../ui/UiThemeProvider.jsx'
import { useEditorStore } from '../../store/editorStore.js'

const BLOCK_A = {
  id: 'cmp_a',
  type: 'heading',
  props: { text: 'First heading' },
  styles: { color: '#111111' },
  layout: { x: 0, y: 0, w: 300, h: 60 },
}

const BLOCK_B = {
  id: 'cmp_b',
  type: 'button',
  props: { text: 'Second button' },
  styles: { backgroundColor: '#222222' },
  layout: { x: 0, y: 100, w: 180, h: 48 },
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  aiEditComponent.mockReset()
  useEditorStore.getState().loadSchema({
    theme: {},
    pages: [{ id: 'p1', name: 'Home', components: [structuredClone(BLOCK_A), structuredClone(BLOCK_B)] }],
  })
  useEditorStore.getState().selectComponent('cmp_a')
})

describe('AiComponentEdit target isolation', () => {
  it('clears a pending AI change when switching to another component', async () => {
    aiEditComponent.mockResolvedValueOnce({ props: { text: 'AI Changed First' }, styles: {} })
    const onApply = vi.fn()

    const { rerender } = render(
      <UiThemeProvider>
        <LanguageProvider>
          <AiComponentEdit component={BLOCK_A} onApply={onApply} />
        </LanguageProvider>
      </UiThemeProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Make it pop' }))
    await screen.findByText('Review AI change')

    rerender(
      <UiThemeProvider>
        <LanguageProvider>
          <AiComponentEdit component={BLOCK_B} onApply={onApply} />
        </LanguageProvider>
      </UiThemeProvider>,
    )

    expect(screen.queryByText('Review AI change')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull()
    expect(onApply).not.toHaveBeenCalled()
  })

  it('discards an in-flight AI result if the selected component changes before it arrives', async () => {
    let resolveAi
    aiEditComponent.mockImplementationOnce(() => new Promise((resolve) => {
      resolveAi = resolve
    }))
    const onApply = vi.fn()

    const { rerender } = render(
      <UiThemeProvider>
        <LanguageProvider>
          <AiComponentEdit component={BLOCK_A} onApply={onApply} />
        </LanguageProvider>
      </UiThemeProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Make it pop' }))
    rerender(
      <UiThemeProvider>
        <LanguageProvider>
          <AiComponentEdit component={BLOCK_B} onApply={onApply} />
        </LanguageProvider>
      </UiThemeProvider>,
    )

    await act(async () => {
      resolveAi({ props: { text: 'Stale patch from A' }, styles: {} })
    })

    expect(screen.queryByText('Review AI change')).toBeNull()
    expect(onApply).not.toHaveBeenCalled()
  })

  it('unmounts pending AI review inside PropertiesPanel when switching selected block', async () => {
    aiEditComponent.mockResolvedValueOnce({ props: { text: 'AI Changed First' }, styles: {} })

    render(
      <UiThemeProvider>
        <LanguageProvider>
          <PropertiesPanel />
        </LanguageProvider>
      </UiThemeProvider>,
    )

    fireEvent.click(screen.getByTitle('Ask AI to edit this'))
    fireEvent.click(screen.getByRole('button', { name: 'Make it pop' }))
    await screen.findByText('Review AI change')

    await act(async () => {
      useEditorStore.getState().selectComponent('cmp_b')
    })

    await waitFor(() => expect(screen.queryByText('Review AI change')).toBeNull())
    expect(useEditorStore.getState().schema.pages[0].components[1].props.text).toBe('Second button')
  })
})
