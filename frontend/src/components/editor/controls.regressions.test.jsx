import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import {
  LabeledColor,
  LabeledNumber,
  LabeledPx,
  LabeledSelect,
  LinksEditor,
  TabsEditorControl,
} from './controls.jsx'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
})

afterEach(() => cleanup())

describe('controls regressions', () => {
  it('normalizes rgb() values for the native color picker and resets typing state across subject changes', () => {
    const view = render(
      <LanguageProvider>
        <LabeledColor label="Tint" value="rgb(255, 0, 128)" subject="comp-1" onChange={() => {}} />
      </LanguageProvider>,
    )
    const picker = () => view.container.querySelector('input[type="color"]')
    const input = () => screen.getByRole('textbox', { name: 'Tint', exact: true })

    expect(picker()).toHaveValue('#ff0080')

    view.rerender(
      <LanguageProvider>
        <LabeledColor label="Tint" value="rgba(10, 20, 30, 0.5)" subject="comp-1" onChange={() => {}} />
      </LanguageProvider>,
    )
    expect(input()).toHaveValue('rgba(10, 20, 30, 0.5)')
    expect(picker()).toHaveValue('#0a141e')

    fireEvent.focus(input())
    fireEvent.change(input(), { target: { value: '#abc' } })
    expect(input()).toHaveValue('#abc')

    view.rerender(
      <LanguageProvider>
        <LabeledColor label="Tint" value="#112233" subject="comp-2" onChange={() => {}} />
      </LanguageProvider>,
    )
    expect(input()).toHaveValue('#112233')
    expect(picker()).toHaveValue('#112233')
  })

  it('preserves active CSS length unit when LabeledPx is cleared and resets unit on subject change', () => {
    const onChange = vi.fn()
    function Harness({ subject, initialValue }) {
      const [val, setVal] = useState(initialValue)
      const [prevSubj, setPrevSubj] = useState(subject)
      if (subject !== prevSubj) {
        setPrevSubj(subject)
        setVal(initialValue)
      }
      return (
        <LanguageProvider>
          <LabeledPx
            label="Padding"
            value={val}
            subject={subject}
            onChange={(next) => {
              onChange(next)
              setVal(next)
            }}
          />
        </LanguageProvider>
      )
    }

    const view = render(<Harness subject="a" initialValue="1.5rem" />)
    const numInput = () => view.container.querySelector('input[type="number"]')

    expect(numInput().value).toBe('1.5')
    expect(screen.getByText('rem')).toBeInTheDocument()

    fireEvent.change(numInput(), { target: { value: '' } })
    expect(screen.getByText('rem')).toBeInTheDocument()

    fireEvent.change(numInput(), { target: { value: '2' } })
    expect(onChange).toHaveBeenLastCalledWith('2rem')
    expect(screen.getByText('rem')).toBeInTheDocument()

    view.rerender(<Harness subject="b" initialValue="12px" />)
    expect(screen.getByText('px')).toBeInTheDocument()
  })

  it('supports allowEmpty on LabeledNumber and clears draft when subject changes', () => {
    const view = render(
      <LanguageProvider>
        <LabeledNumber label="Max" value="" allowEmpty subject="c1" onChange={() => {}} />
      </LanguageProvider>,
    )
    const input = () => screen.getByRole('spinbutton', { name: 'Max', exact: true })
    expect(input().value).toBe('')

    fireEvent.focus(input())
    fireEvent.change(input(), { target: { value: '99' } })
    expect(input().value).toBe('99')

    view.rerender(
      <LanguageProvider>
        <LabeledNumber label="Max" value={12} allowEmpty subject="c2" onChange={() => {}} />
      </LanguageProvider>,
    )
    expect(input().value).toBe('12')
  })

  it('keeps an unmatched custom option visible in LabeledSelect', () => {
    render(
      <LanguageProvider>
        <LabeledSelect
          label="Weight"
          value="900"
          onChange={() => {}}
          options={[['400', 'Regular'], ['700', 'Bold']]}
        />
      </LanguageProvider>,
    )
    const select = screen.getByRole('combobox', { name: 'Weight', exact: true })
    expect(select.value).toBe('900')
    expect(screen.getByRole('option', { name: '900' })).toBeInTheDocument()
  })

  it('clears props.tabId as well as child.tabId when deleting a tab in TabsEditorControl', () => {
    const onChange = vi.fn()
    const onChildrenChange = vi.fn()
    const onActiveChange = vi.fn()
    render(
      <LanguageProvider>
        <TabsEditorControl
          label="Tabs"
          value={[{ id: 't1', label: 'First' }, { id: 't2', label: 'Second' }]}
          activeId="t2"
          onChange={onChange}
          onActiveChange={onActiveChange}
          children={[
            { id: 'c1', type: 'text', props: { text: 'In Two', tabId: 't2' } },
          ]}
          onChildrenChange={onChildrenChange}
        />
      </LanguageProvider>,
    )

    const removeButtons = screen.getAllByRole('button', { name: 'Remove', exact: true })
    fireEvent.click(removeButtons[1])

    expect(onChange).toHaveBeenCalledWith([{ id: 't1', label: 'First' }])
    expect(onActiveChange).toHaveBeenCalledWith('t1')
    expect(onChildrenChange).toHaveBeenCalledWith([
      { id: 'c1', type: 'text', tabId: 't1', props: { text: 'In Two' } },
    ])
  })

  it('keeps LinkTargetControl state scoped to subject inside LinksEditor when removing links', () => {
    function Harness() {
      const [links, setLinks] = useState([
        { label: 'One', href: '#top' },
        { label: 'Two', href: '#top' },
      ])
      return (
        <LanguageProvider>
          <LinksEditor label="Menu links" value={links} onChange={setLinks} pages={[]} subject="nav-1" />
        </LanguageProvider>
      )
    }

    render(<Harness />)
    const selectsBefore = screen.getAllByRole('combobox')
    fireEvent.change(selectsBefore[0], { target: { value: 'url' } })
    expect(selectsBefore[0].value).toBe('url')

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0])
    const remainingSelect = screen.getByRole('combobox')
    expect(remainingSelect.value).toBe('top')
  })
})
