import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import TemplatePicker from './TemplatePicker.jsx'
import { TEMPLATE_LIBRARY, TEMPLATE_LIBRARY_GROUPS } from '../../utils/templateLibrary.js'

const ALL = TEMPLATE_LIBRARY.flatMap((category) => category.variants)

function renderPicker() {
  return render(
    <LanguageProvider>
      <TemplatePicker open title="Test" onPick={vi.fn()} onClose={vi.fn()} />
    </LanguageProvider>,
  )
}

const resultCount = () => Number(screen.getByText(/\d+ results/).textContent.match(/\d+/)[0])

describe('TemplatePicker with the full catalogue', () => {
  beforeAll(() => {
    globalThis.ResizeObserver = class {
      observe() {}
      disconnect() {}
    }
  })

  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('pwb_language', 'en')
  })

  it('lists every category under its gallery group', () => {
    renderPicker()
    const rail = screen.getByRole('complementary', { name: 'Template categories' })
    for (const group of TEMPLATE_LIBRARY_GROUPS) {
      const section = within(rail).getByRole('group', { name: group.name })
      expect(within(section).getAllByRole('button')).toHaveLength(group.categories.length)
    }
  })

  it('narrows the whole gallery to one layout', () => {
    renderPicker()
    fireEvent.click(screen.getByRole('button', { name: 'All templates' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Template layout' }), { target: { value: 'bento' } })
    expect(resultCount()).toBe(ALL.filter((template) => template.layout === 'bento').length)
    expect(screen.getAllByText('Bento grid').length).toBeGreaterThan(0)
  })

  it('filters light and dark pages', () => {
    renderPicker()
    fireEvent.click(screen.getByRole('button', { name: 'All templates' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Light or dark pages' }), { target: { value: 'dark' } })
    expect(resultCount()).toBe(ALL.filter((template) => template.dark).length)
  })

  it('offers to clear filters that leave a category empty', () => {
    renderPicker()
    // The CV collection is hand-written, so no CV starter is a bento grid.
    fireEvent.change(screen.getByRole('combobox', { name: 'Template layout' }), { target: { value: 'bento' } })
    expect(screen.getByText('No templates match this view.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(resultCount()).toBe(TEMPLATE_LIBRARY[0].variants.length)
  })

  it('opens a random template from the current view', () => {
    renderPicker()
    fireEvent.click(screen.getByRole('button', { name: 'Surprise me' }))
    expect(screen.getByTitle('Full-screen template preview')).toBeInTheDocument()
  })

  it('finds templates by layout name', () => {
    renderPicker()
    fireEvent.change(screen.getByRole('textbox', { name: 'Search templates' }), { target: { value: 'split screen' } })
    expect(resultCount()).toBeGreaterThanOrEqual(ALL.filter((template) => template.layout === 'split').length)
  })
})
