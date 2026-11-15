import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import Sidebar from './Sidebar.jsx'
import { useEditorStore } from '../../store/editorStore.js'

describe('Sidebar regressions', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('pwb_language', 'en')
    localStorage.setItem(
      'pwb_custom_blocks',
      JSON.stringify([{ id: 'hero', label: 'Hero banner', html: '<section>Hi</section>' }]),
    )
    useEditorStore.setState((state) => ({
      schema: { ...state.schema, theme: undefined },
    }))
  })

  it('renders BlockThumb inside CustomBlockPanel without crashing when schema.theme is undefined', () => {
    render(
      <LanguageProvider>
        <DndContext>
          <Sidebar />
        </DndContext>
      </LanguageProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: /Custom HTML/ }))
    expect(screen.getByText('Hero banner')).toBeInTheDocument()
  })
})
