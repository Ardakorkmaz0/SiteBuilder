import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import Sidebar from './Sidebar.jsx'

function renderSidebar(props = {}) {
  return render(
    <LanguageProvider>
      <DndContext>
        <Sidebar {...props} />
      </DndContext>
    </LanguageProvider>,
  )
}

const navbarRow = () => screen.getByRole('button', { name: /^☰Navbar\d+▸$/ })
const flyout = () => document.querySelector('[data-palette-flyout]')
const wait = (ms) => act(() => { vi.advanceTimersByTime(ms) })
const hover = (element) => fireEvent.pointerEnter(element)
const key = (value, target = window) => fireEvent.keyDown(target, { key: value })

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
})

afterEach(() => {
  vi.useRealTimers()
})

describe('the quick-add flyout of a palette row', () => {
  it('opens when the pointer rests on a row, with four numbered variants', () => {
    renderSidebar({ onArmPlacement: vi.fn() })
    hover(navbarRow())
    expect(flyout()).toBeNull()
    wait(200)
    const panel = within(flyout())
    expect(panel.getByRole('button', { name: 'Bootstrap Navbar: press 1 to add it' })).toHaveAttribute('aria-keyshortcuts', '1')
    expect(panel.getAllByRole('button', { name: /press \d to add it/ }).map((b) => b.getAttribute('aria-label'))).toEqual([
      'Bootstrap Navbar: press 1 to add it',
      'Dark: press 2 to add it',
      'Light: press 3 to add it',
      'With button: press 4 to add it',
    ])
  })

  it('adds a variant by its number, into view, and remembers it', () => {
    const onArm = vi.fn()
    renderSidebar({ onArmPlacement: onArm })
    hover(navbarRow())
    wait(200)
    key('2')
    expect(onArm).toHaveBeenCalledTimes(1)
    expect(onArm.mock.calls[0][0]).toMatchObject({ type: 'navbar', preset: 'dark', label: 'Dark' })
    expect(onArm.mock.calls[0][1]).toEqual({ inView: true })
    expect(JSON.parse(localStorage.getItem('pwb_palette_usage'))).toEqual({ navbar: { dark: 1 } })
    expect(within(flyout()).getByText('Added')).toBeInTheDocument()
  })

  // The flyout opens from the hover timer: React puts it on the page in one
  // task and runs its passive effects in a later one. A number pressed in
  // between, with the four variants already on screen, added nothing (and
  // made EditorPage.quickAdd.test.jsx fail now and then in CI).
  it('takes a number key from the moment its variants are on the page', async () => {
    vi.useRealTimers()
    const onArm = vi.fn()
    renderSidebar({ onArmPlacement: onArm })
    const previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT
    globalThis.IS_REACT_ACT_ENVIRONMENT = false
    try {
      await new Promise((resolve) => {
        const observer = new MutationObserver(() => {
          if (!flyout()) return
          observer.disconnect()
          window.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true, cancelable: true }))
          resolve()
        })
        observer.observe(document.body, { childList: true, subtree: true })
        hover(navbarRow())
      })
    } finally {
      globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment
    }

    expect(onArm).toHaveBeenCalledTimes(1)
    expect(onArm.mock.calls[0][0]).toMatchObject({ type: 'navbar' })
  })

  it('leaves the number keys alone while a field is being typed in', () => {
    const onArm = vi.fn()
    renderSidebar({ onArmPlacement: onArm })
    const field = document.createElement('input')
    document.body.appendChild(field)
    hover(navbarRow())
    wait(200)
    key('2', field)
    key('5')
    expect(onArm).not.toHaveBeenCalled()
    field.remove()
  })

  it('offers the variants this viewer adds most, after the recommended one', () => {
    localStorage.setItem('pwb_palette_usage', JSON.stringify({ navbar: { cta: 3 } }))
    renderSidebar({ onArmPlacement: vi.fn() })
    hover(navbarRow())
    wait(200)
    expect(within(flyout()).getAllByRole('button', { name: /press \d to add it/ }).map((b) => b.getAttribute('aria-label'))).toEqual([
      'Bootstrap Navbar: press 1 to add it',
      'With button: press 2 to add it',
      'Dark: press 3 to add it',
      'Light: press 4 to add it',
    ])
  })

  it('closes a moment after the pointer leaves, unless it moves onto the flyout', () => {
    renderSidebar({ onArmPlacement: vi.fn() })
    hover(navbarRow())
    wait(200)
    fireEvent.pointerLeave(navbarRow())
    fireEvent.pointerEnter(flyout())
    wait(400)
    expect(flyout()).not.toBeNull()
    fireEvent.pointerLeave(flyout())
    wait(100)
    expect(flyout()).not.toBeNull()
    wait(200)
    expect(flyout()).toBeNull()
  })

  it('closes on Esc', () => {
    renderSidebar({ onArmPlacement: vi.fn() })
    hover(navbarRow())
    wait(200)
    key('Escape', document)
    expect(flyout()).toBeNull()
  })

  it('opens the library on the row\'s components from "See all"', async () => {
    renderSidebar({ onArmPlacement: vi.fn() })
    hover(navbarRow())
    wait(200)
    fireEvent.click(within(flyout()).getByRole('button', { name: /^See all \(\d+\)$/ }))
    expect(flyout()).toBeNull()
    vi.useRealTimers()
    const library = await waitFor(() => {
      const node = document.querySelector('[data-block-library]')
      expect(node).not.toBeNull()
      return node
    })
    expect(within(library).getByRole('button', { current: true })).toHaveTextContent(/^Navbar\d+$/)
  })

  it('does not open for a touch, though the tap focuses the row', () => {
    renderSidebar({ onArmPlacement: vi.fn() })
    fireEvent.pointerEnter(navbarRow(), { pointerType: 'touch' })
    fireEvent.pointerDown(navbarRow(), { pointerType: 'touch' })
    fireEvent.focus(navbarRow())
    wait(400)
    expect(flyout()).toBeNull()
  })

  it('opens for a row reached with the keyboard', () => {
    renderSidebar({ onArmPlacement: vi.fn() })
    fireEvent.focus(navbarRow())
    wait(200)
    expect(flyout()).not.toBeNull()
  })

  it('waits for the pointer to rest before opening, so crossing rows opens nothing', () => {
    renderSidebar({ onArmPlacement: vi.fn() })
    hover(navbarRow())
    wait(179)
    expect(flyout()).toBeNull()
    wait(1)
    expect(flyout()).not.toBeNull()
  })
})
