// "Section on this page" used to be a bare text box. Element ids on the canvas
// are generated component ids, so what people typed (#about, #contact — what a
// new navbar ships with) matched nothing and the link went nowhere, silently.
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import { LinkTargetControl } from './controls.jsx'

const sections = [
  { id: 'region_ab12cd', label: 'Section · About us' },
  { id: 'heading_9zz', label: 'Heading · Pricing' },
]

function renderControl(value, extra = {}) {
  const onChange = vi.fn()
  localStorage.setItem('pwb_language', 'en')
  render(
    <LanguageProvider>
      <LinkTargetControl label="Link" value={value} onChange={onChange} pages={[{ id: 'p1', name: 'Home' }]} sections={sections} {...extra} />
    </LanguageProvider>,
  )
  return onChange
}

describe('section links on the component canvas', () => {
  it('offers the page blocks by name and writes their real id', () => {
    const onChange = renderControl('#region_ab12cd')
    const picker = screen.getByRole('combobox', { name: 'Section on this page' })
    expect(picker).toHaveValue('region_ab12cd')
    fireEvent.change(picker, { target: { value: 'heading_9zz' } })
    expect(onChange).toHaveBeenLastCalledWith('#heading_9zz')
    // No free-text box and no warning for a link that works.
    expect(screen.queryByPlaceholderText(/section id/)).toBeNull()
    expect(screen.queryByText(/goes nowhere/)).toBeNull()
  })

  it('says so when the id matches no block — the default navbar #about', () => {
    renderControl('#about')
    expect(screen.getByText(/No block on this page is called "#about"/)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/section id/)).toHaveValue('about')
  })

  it('switching to "Section" picks a real block rather than a made-up id', () => {
    const onChange = renderControl('#top')
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'section' } })
    expect(onChange).toHaveBeenLastCalledWith('#region_ab12cd')
  })

  it('still takes a typed id where there is no list (HTML pages)', () => {
    const onChange = renderControl('#contact', { sections: null })
    const box = screen.getByPlaceholderText(/section id/)
    fireEvent.change(box, { target: { value: 'team' } })
    expect(onChange).toHaveBeenLastCalledWith('#team')
    expect(screen.queryByText(/goes nowhere/)).toBeNull()
  })
})

// Picking "External URL" used to write "https://" into the link on the spot: a
// link to nowhere, saved (and published) if the person then looked elsewhere.
describe('choosing "External URL"', () => {
  const pickUrl = () => fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'url' } })

  it('opens an empty address box and leaves the link as it was until something is typed', () => {
    const onChange = renderControl('#top')

    pickUrl()

    expect(onChange).not.toHaveBeenCalled()
    const box = screen.getByPlaceholderText('https://…')
    expect(box).toHaveValue('')
    fireEvent.change(box, { target: { value: 'example.com' } })
    expect(onChange).toHaveBeenLastCalledWith('example.com')
  })

  it('goes back to what the link was when the box is left empty', () => {
    const onChange = renderControl('')

    pickUrl()
    fireEvent.blur(screen.getByPlaceholderText('https://…'))

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getAllByRole('combobox')[0]).toHaveValue('none')
    expect(screen.queryByPlaceholderText('https://…')).toBeNull()
  })

  it('keeps an address the link already has', () => {
    const onChange = renderControl('https://example.com/a')
    pickUrl()
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByPlaceholderText('https://…')).toHaveValue('https://example.com/a')
  })
})
