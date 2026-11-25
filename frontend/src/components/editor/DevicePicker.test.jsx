// The device picker: cards for every screen, grouped by type, with a foldable
// as one card and a switch between its screens.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import DevicePicker from './DevicePicker.jsx'
import { DEVICES } from '../../utils/htmlDevices.js'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
})
afterEach(cleanup)

function renderPicker(props) {
  const onPick = vi.fn()
  render(
    <LanguageProvider>
      <DevicePicker items={DEVICES} value="iphone15pro" onPick={onPick} {...props} />
    </LanguageProvider>,
  )
  return onPick
}
const trigger = () => screen.getByRole('button', { name: /^Screen size:/ })
const dialog = () => screen.getByRole('dialog', { name: 'Screen size' })
const open = () => { fireEvent.click(trigger()); return dialog() }

describe('DevicePicker', () => {
  it('names the screen in use on its button, with its size', () => {
    renderPicker()
    expect(trigger()).toHaveAccessibleName('Screen size: iPhone 15 Pro 393×852')
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
  })

  it('opens on the screen in use: its card is pressed and has the keyboard', () => {
    renderPicker()
    const picker = open()
    const card = within(picker).getByRole('button', { name: 'iPhone 15 Pro 393×852' })
    expect(card).toHaveAttribute('aria-pressed', 'true')
    expect(card).toHaveFocus()
    expect(within(picker).getByRole('button', { name: 'Galaxy S24 360×780' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('shows every type in its own section, desktops first', () => {
    renderPicker()
    const picker = open()
    expect(within(picker).getAllByRole('region').map((section) => section.getAttribute('aria-label')))
      .toEqual(['Desktop', 'Tablet', 'Phone', 'Foldable'])
  })

  it('hands the picked screen over and closes', () => {
    const onPick = renderPicker()
    fireEvent.click(within(open()).getByRole('button', { name: 'Galaxy S24 360×780' }))
    expect(onPick).toHaveBeenCalledTimes(1)
    expect(onPick).toHaveBeenCalledWith('galaxys24')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('says the responsive size follows the area instead of giving a size', () => {
    renderPicker({ value: 'fit' })
    expect(trigger()).toHaveAccessibleName('Screen size: Responsive')
    expect(within(open()).getByRole('button', { name: 'Responsive Follows the area' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('makes a foldable one card with a switch between its outer and inner screens', () => {
    const onPick = renderPicker({ value: 'zfold6-cover' })
    expect(trigger()).toHaveAccessibleName('Screen size: Galaxy Z Fold6 369×905 · Outer screen')
    const fold = within(open()).getByRole('group', { name: 'Galaxy Z Fold6' })
    const states = within(fold).getAllByRole('button')
    expect(states.map((button) => button.textContent)).toEqual(['Outer screen', 'Inner screen'])
    expect(states[0]).toHaveAttribute('aria-pressed', 'true')
    expect(states[0]).toHaveFocus()
    fireEvent.click(states[1])
    expect(onPick).toHaveBeenCalledWith('zfold6-inner')
  })

  it('gives the tri-fold three panels and shows iPhone Duo without a concept badge', () => {
    renderPicker()
    const picker = open()
    expect(within(within(picker).getByRole('group', { name: 'Huawei Mate XT' })).getAllByRole('button')
      .map((button) => button.textContent)).toEqual(['One panel', 'Two panels', 'Fully open'])
    const iphoneFold = picker.querySelector('[data-device-group="iphone-fold"]')
    expect(iphoneFold).toHaveTextContent('iPhone Duo')
    expect(iphoneFold).not.toHaveTextContent('Concept')
    expect(picker.querySelector('[data-device-group="galaxy-zfold6"]')).not.toHaveTextContent('Concept')
  })

  it('keeps a foldable together, and its screens in order, when its states come from two lists', () => {
    // A canvas lists PC sizes before Mobile ones: the Pixel's wide inner
    // screen is on the PC list, its cover on the Mobile list.
    const items = [
      { id: 'pc:pixel9fold-inner', name: 'Pixel 9 Pro Fold', w: 791, h: 820, category: 'foldable', group: 'pixel9-pro-fold', state: 'inner', hinge: 'vertical' },
      { id: 'mobile:zfold6-cover', name: 'Galaxy Z Fold6', w: 369, h: 905, category: 'foldable', group: 'galaxy-zfold6', state: 'cover' },
      { id: 'mobile:pixel9fold-cover', name: 'Pixel 9 Pro Fold', w: 410, h: 923, category: 'foldable', group: 'pixel9-pro-fold', state: 'cover' },
    ]
    renderPicker({ items, value: 'pc:pixel9fold-inner' })
    const picker = open()
    expect([...picker.querySelectorAll('[data-device-group]')].map((card) => card.dataset.deviceGroup))
      .toEqual(['galaxy-zfold6', 'pixel9-pro-fold'])
    expect(within(within(picker).getByRole('group', { name: 'Pixel 9 Pro Fold' })).getAllByRole('button')
      .map((button) => button.textContent)).toEqual(['Outer screen', 'Inner screen'])
  })

  it('narrows the list to one type, and back to all', () => {
    renderPicker()
    const picker = open()
    fireEvent.click(within(picker).getByRole('button', { name: 'Foldable' }))
    expect(within(picker).getAllByRole('region').map((section) => section.getAttribute('aria-label'))).toEqual(['Foldable'])
    expect(within(picker).queryByRole('button', { name: 'iPhone 15 Pro 393×852' })).toBeNull()
    fireEvent.click(within(picker).getByRole('button', { name: 'All' }))
    expect(within(picker).getAllByRole('region')).toHaveLength(4)
  })

  it('opens on every type again, so the screen in use is never filtered away', () => {
    renderPicker()
    fireEvent.click(within(open()).getByRole('button', { name: 'Foldable' }))
    fireEvent.click(trigger())
    expect(screen.queryByRole('dialog')).toBeNull()
    const picker = open()
    expect(within(picker).getAllByRole('region')).toHaveLength(4)
    expect(within(picker).getByRole('button', { name: 'iPhone 15 Pro 393×852' })).toHaveFocus()
  })

  it('closes on Escape and gives the keyboard back to its button', async () => {
    const onPick = renderPicker()
    trigger().focus()
    open()
    expect(document.activeElement).not.toBe(trigger())
    fireEvent.keyDown(document.activeElement, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(trigger()).toHaveFocus())
    expect(onPick).not.toHaveBeenCalled()
  })

  it('closes on a click beside it, picking nothing', () => {
    const onPick = renderPicker()
    open()
    fireEvent.click(document.querySelector('.fixed.inset-0'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(onPick).not.toHaveBeenCalled()
  })

  // In a narrow window, with the rails open, the list hung off the right end of
  // the stage, which cut it off: the cards on its right, and their switches,
  // were out of reach.
  it('opens inside the area that would cut it off, moved left as far as it must', () => {
    const box = (left, width) => ({ left, right: left + width, top: 0, bottom: 500, width, height: 500, x: left, y: 0 })
    render(
      <LanguageProvider>
        <div data-testid="stage" style={{ overflow: 'hidden' }}>
          <DevicePicker items={DEVICES} value="iphone15pro" onPick={() => {}} />
        </div>
      </LanguageProvider>,
    )
    const stage = screen.getByTestId('stage')
    const root = trigger().parentElement
    let stageBox = box(240, 512)
    let rootBox = box(600, 160)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function measured() {
      if (this === stage) return stageBox
      if (this === root) return rootBox
      if (this.getAttribute('role') === 'dialog') return box(rootBox.left, 440)
      return box(0, 0)
    })
    const picker = open()
    // The stage ends at 752, 8px of it kept free: the 440px list ends at 744,
    // so it starts at 304, 296px left of its button at 600.
    expect(picker.style.left).toBe('-296px')
    expect(picker.style.width).toBe('')
    fireEvent.click(trigger())

    // A stage narrower than the list (240 to 540): the list takes its width,
    // less 8px at each end, 284px from 248, 152px left of its button at 400.
    stageBox = box(240, 300)
    rootBox = box(400, 120)
    const narrow = open()
    expect(narrow.style.width).toBe('284px')
    expect(narrow.style.left).toBe('-152px')
    fireEvent.click(trigger())

    // With room, it stays where it was: left-aligned with its button.
    stageBox = box(0, 1400)
    rootBox = box(300, 160)
    const roomy = open()
    expect(roomy.style.left).toBe('')
    expect(roomy.style.width).toBe('')
  })

  // innerWidth counts a vertical scrollbar's room: the page itself is narrower.
  it('keeps inside the page\'s own width when the window counts a scrollbar\'s room too', () => {
    const box = (left, width) => ({ left, right: left + width, top: 0, bottom: 500, width, height: 500, x: left, y: 0 })
    const innerWidth = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { value: 1055, configurable: true })
    Object.defineProperty(document.documentElement, 'clientWidth', { get: () => 1040, configurable: true })
    try {
      renderPicker()
      const root = trigger().parentElement
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function measured() {
        if (this === root) return box(647, 48)
        if (this.getAttribute('role') === 'dialog') return box(647, 440)
        return box(0, 0)
      })
      // 1040 less 8px is 1032: the 440px list starts at 592, 55px left of its button.
      expect(open().style.left).toBe('-55px')
    } finally {
      Object.defineProperty(window, 'innerWidth', { value: innerWidth, configurable: true })
      delete document.documentElement.clientWidth
    }
  })

  // The menu opens with an animation from scale .97: measured on screen at
  // that moment the list was 427px wide, so it was placed for 427, grew to 440
  // and ran 13px past the window's edge (CI, Chromium and Firefox, 2026-11-25).
  it('is placed for the width it lays out at, not its smaller box while it opens', () => {
    const box = (left, width) => ({ left, right: left + width, top: 0, bottom: 500, width, height: 500, x: left, y: 0 })
    renderPicker()
    const root = trigger().parentElement
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function measured() {
      if (this === root) return box(647, 48)
      // On screen, mid-animation: 440 × .97.
      if (this.getAttribute('role') === 'dialog') return box(654, 427)
      return box(0, 0)
    })
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function laidOut() {
      return this.getAttribute('role') === 'dialog' ? 440 : 0
    })
    // jsdom's window is 1024px: less 8px, the 440px list ends at 1016 and
    // starts at 576, 71px left of its button.
    expect(open().style.left).toBe('-71px')
  })

  it('moves again when the window is resized while it is open', () => {
    const box = (left, width) => ({ left, right: left + width, top: 0, bottom: 500, width, height: 500, x: left, y: 0 })
    render(
      <LanguageProvider>
        <div data-testid="stage" style={{ overflow: 'hidden' }}>
          <DevicePicker items={DEVICES} value="iphone15pro" onPick={() => {}} />
        </div>
      </LanguageProvider>,
    )
    const stage = screen.getByTestId('stage')
    const root = trigger().parentElement
    // jsdom's window is 1024px wide: the list at 300 ends at 740, inside it.
    let stageBox = box(0, 1400)
    let rootBox = box(300, 160)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function measured() {
      if (this === stage) return stageBox
      if (this === root) return rootBox
      if (this.getAttribute('role') === 'dialog') return box(rootBox.left, 440)
      return box(0, 0)
    })
    const picker = open()
    expect(picker.style.left).toBe('')

    // The stage narrows to end at 752 and the bar puts the button at 600: the
    // list ends at 744, 296px left of its button.
    stageBox = box(240, 512)
    rootBox = box(600, 160)
    fireEvent(window, new Event('resize'))
    expect(picker.style.left).toBe('-296px')
  })

  it('names a size no card has with the caller\'s words', () => {
    renderPicker({ value: null, fallbackLabel: 'Custom · 1111px' })
    expect(trigger()).toHaveAccessibleName('Screen size: Custom · 1111px')
    expect(within(open()).queryAllByRole('button', { pressed: true })
      .filter((button) => button.dataset.device)).toEqual([])
  })

  it('speaks Turkish with a Turkish user', () => {
    localStorage.setItem('pwb_language', 'tr')
    renderPicker({ value: 'zfold6-inner' })
    const button = screen.getByRole('button', { name: /^Ekran boyutu:/ })
    expect(button).toHaveAccessibleName('Ekran boyutu: Galaxy Z Fold6 707×823 · İç ekran')
    fireEvent.click(button)
    const picker = screen.getByRole('dialog', { name: 'Ekran boyutu' })
    expect(within(picker).getAllByRole('region').map((section) => section.getAttribute('aria-label')))
      .toEqual(['Masaüstü', 'Tablet', 'Telefon', 'Katlanabilir'])
    expect(within(within(picker).getByRole('group', { name: 'Galaxy Z Fold6' })).getAllByRole('button')
      .map((state) => state.textContent)).toEqual(['Dış ekran', 'İç ekran'])
    expect(within(picker).getByRole('button', { name: 'Duyarlı Alana uyar' })).toBeInTheDocument()
  })
})
