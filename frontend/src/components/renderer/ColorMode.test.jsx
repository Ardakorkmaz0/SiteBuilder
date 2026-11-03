// The switch inside the app: the in-app viewer draws it through this root.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ColorModeRoot } from './ColorMode.jsx'
import { Image, ThemeToggle } from './components.jsx'

const light = { base: 'light', alt: 'dark', followDevice: false, light: {}, other: {} }
const root = () => document.querySelector('[data-pwb-color-root]')
const palette = () => root().getAttribute('data-pwb-theme')
const radio = (name) => screen.getByRole('radio', { name })
const three = { label: 'Color theme', states: 'three', lightLabel: 'Light', darkLabel: 'Dark', deviceLabel: 'Device' }

let listeners
let deviceDark

function setDevice(dark) {
  deviceDark = dark
  act(() => listeners.forEach((listener) => listener()))
}

beforeEach(() => {
  listeners = new Set()
  deviceDark = false
  window.matchMedia = vi.fn(() => ({
    get matches() { return deviceDark },
    addEventListener: (type, listener) => listeners.add(listener),
    removeEventListener: (type, listener) => listeners.delete(listener),
  }))
})

afterEach(() => {
  cleanup()
  delete window.matchMedia
})

function show(mode, props = three, extra = {}) {
  return render(<ColorModeRoot mode={mode} {...extra}><ThemeToggle props={props} style={{}} /></ColorModeRoot>)
}

describe('where a page opens', () => {
  it('in the palette it is designed in, or what the owner chose, or the device', () => {
    show(light)
    expect(palette()).toBe('light')
    cleanup()
    show({ ...light, initial: 'dark' })
    expect(palette()).toBe('dark')
    cleanup()
    deviceDark = true
    show({ ...light, followDevice: true })
    expect(palette()).toBe('dark')
    expect(radio('Device')).toHaveAttribute('aria-checked', 'true')
  })

  it('in the device when the visitor chose it on the page before', () => {
    deviceDark = true
    show({ ...light, initial: 'system' })
    expect(palette()).toBe('dark')
    expect(radio('Device')).toHaveAttribute('aria-checked', 'true')
  })
})

describe('when what the page opens in changes while it is open', () => {
  const tree = (mode) => <ColorModeRoot mode={mode}><ThemeToggle props={three} style={{}} /></ColorModeRoot>

  it('follows the owner while the visitor has not chosen', () => {
    const { rerender } = render(tree({ ...light, initial: 'light' }))
    expect(palette()).toBe('light')
    rerender(tree({ ...light, initial: 'dark' }))
    expect(palette()).toBe('dark')
    expect(radio('Dark')).toHaveAttribute('aria-checked', 'true')
  })

  it('keeps what the visitor chose', () => {
    const { rerender } = render(tree({ ...light, initial: 'light' }))
    fireEvent.click(radio('Device'))
    rerender(tree({ ...light, initial: 'dark' }))
    expect(radio('Device')).toHaveAttribute('aria-checked', 'true')
  })

  it('starts properly when the site gains its second palette while open', () => {
    const { rerender } = render(<ColorModeRoot mode={null}><span>page</span></ColorModeRoot>)
    rerender(tree({ ...light, initial: 'dark' }))
    expect(palette()).toBe('dark')
  })
})

describe('an image with a version for the other palette', () => {
  const picture = { src: 'https://a.test/light.png', _otherSrc: 'https://a.test/dark.png', _otherMode: 'dark', alt: 'Logo' }
  const src = () => screen.getByRole('img', { name: 'Logo' }).getAttribute('src')

  it('shows the one for the palette on, and changes with it', () => {
    render(<ColorModeRoot mode={light}><Image props={picture} style={{}} /><ThemeToggle props={{ label: 'Theme' }} style={{}} /></ColorModeRoot>)
    expect(src()).toBe('https://a.test/light.png')
    fireEvent.click(screen.getByRole('button', { name: 'Theme' }))
    expect(src()).toBe('https://a.test/dark.png')
  })

  it('shows its own without a second palette', () => {
    render(<Image props={picture} style={{}} />)
    expect(src()).toBe('https://a.test/light.png')
  })
})

describe('the two-way switch', () => {
  it('flips the palette on screen, also from the device', () => {
    deviceDark = true
    show({ ...light, followDevice: true }, { label: 'Theme' })
    const button = screen.getByRole('button', { name: 'Theme' })
    expect(button).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(button)
    expect(palette()).toBe('light')
    // It is a choice now: the device no longer decides.
    setDevice(true)
    expect(palette()).toBe('light')
  })
})

describe('the three-way switch', () => {
  it('chooses, and marks the choice as the one Tab stop', () => {
    show(light)
    expect(radio('Light')).toHaveAttribute('tabindex', '0')
    expect(radio('Dark')).toHaveAttribute('tabindex', '-1')
    fireEvent.click(radio('Dark'))
    expect(palette()).toBe('dark')
    expect(radio('Dark')).toHaveAttribute('aria-checked', 'true')
    expect(radio('Dark')).toHaveAttribute('tabindex', '0')
    expect(root()).toHaveAttribute('data-pwb-theme-pick', 'dark')
  })

  it('follows the device while the device is the choice', () => {
    show(light)
    fireEvent.click(radio('Device'))
    expect(palette()).toBe('light')
    setDevice(true)
    expect(palette()).toBe('dark')
    fireEvent.click(radio('Light'))
    setDevice(true)
    expect(palette()).toBe('light')
  })

  it('moves and chooses with the arrow keys', () => {
    show(light)
    fireEvent.keyDown(radio('Light'), { key: 'ArrowLeft' })
    expect(radio('Device')).toHaveFocus()
    expect(radio('Device')).toHaveAttribute('aria-checked', 'true')
  })

  it('tells the page around it, which hands the choice on', () => {
    const onChoose = vi.fn()
    render(<ColorModeRoot mode={light} onChoose={onChoose}><ThemeToggle props={three} style={{}} /></ColorModeRoot>)
    fireEvent.click(radio('Device'))
    expect(onChoose.mock.calls).toEqual([['system']])
    cleanup()
    onChoose.mockClear()
    render(<ColorModeRoot mode={light} onChoose={onChoose}><ThemeToggle props={{ label: 'Theme' }} style={{}} /></ColorModeRoot>)
    fireEvent.click(screen.getByRole('button', { name: 'Theme' }))
    expect(onChoose.mock.calls).toEqual([['dark']])
  })

  it('does nothing on the canvas, where a click selects it', () => {
    const { rerender } = show(light, three, { forced: 'dark' })
    fireEvent.click(radio('Device'))
    expect(palette()).toBe('dark')
    // Nothing was chosen behind the preview either.
    rerender(<ColorModeRoot mode={light}><ThemeToggle props={three} style={{}} /></ColorModeRoot>)
    expect(radio('Light')).toHaveAttribute('aria-checked', 'true')
  })

  it('stops listening to the device when it leaves the page', () => {
    const { unmount } = show(light)
    expect(listeners.size).toBe(1)
    unmount()
    expect(listeners.size).toBe(0)
  })
})
