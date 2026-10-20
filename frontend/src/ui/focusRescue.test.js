import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installFocusRescue } from './focusRescue.js'

// jsdom does not take focus off a control that gets disabled; a browser does
// ("focus fixup"). `lose` does what the browser does.
const lose = (button) => { button.blur(); button.disabled = true }
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

let uninstall
beforeEach(() => {
  document.body.innerHTML = `
    <button id="outside">Outside</button>
    <div role="dialog"><div id="row"><button id="mark">Mark read</button><button id="delete">Delete</button></div></div>`
  uninstall = installFocusRescue(document)
})
afterEach(() => uninstall())

describe('a control that loses focus because an action runs', () => {
  it('gets it back once it is enabled again', async () => {
    const mark = document.getElementById('mark')
    mark.focus()
    lose(mark)
    await settle()
    expect(document.activeElement).toBe(document.body)
    mark.disabled = false
    await settle()
    expect(document.activeElement).toBe(mark)
  })

  it('hands it to the control that took its place', async () => {
    const mark = document.getElementById('mark')
    mark.focus()
    lose(mark)
    await settle()
    const unread = document.createElement('button')
    unread.textContent = 'Mark unread'
    mark.replaceWith(unread)
    await settle()
    expect(document.activeElement).toBe(unread)
  })

  it('goes up to the closest part of the page that still has a control', async () => {
    const mark = document.getElementById('mark')
    mark.focus()
    lose(mark)
    await settle()
    // The last message was deleted: its row and both buttons are gone.
    document.getElementById('row').replaceChildren()
    const close = document.createElement('button')
    close.textContent = 'Close'
    document.querySelector('[role=dialog]').prepend(close)
    await settle()
    expect(document.activeElement).toBe(close)
  })

  it('is left alone when the person moved focus elsewhere meanwhile', async () => {
    const mark = document.getElementById('mark')
    mark.focus()
    lose(mark)
    await settle()
    document.getElementById('outside').focus()
    mark.disabled = false
    await settle()
    expect(document.activeElement).toBe(document.getElementById('outside'))
  })
})

// Chrome takes focus away at the next paint, after the attribute changed.
describe('when the browser takes focus away later than the change', () => {
  it('still gives it back once the control is enabled again', async () => {
    uninstall()
    const mark = document.getElementById('mark')
    let active = mark
    const view = {
      body: document.body,
      get activeElement() { return active },
      addEventListener: (...args) => document.addEventListener(...args),
      removeEventListener: (...args) => document.removeEventListener(...args),
    }
    uninstall = installFocusRescue(view)
    mark.focus()
    mark.disabled = true
    await settle()
    active = document.body // the paint: focus is gone
    // jsdom keeps its own focus on the button, so watch the hand-back itself.
    const focus = vi.spyOn(mark, 'focus')
    mark.disabled = false
    await settle()
    expect(focus).toHaveBeenCalledTimes(1)
  })
})

describe('focus that leaves an enabled control', () => {
  it('is not pulled back: clicking the page background is a choice', async () => {
    const mark = document.getElementById('mark')
    mark.focus()
    mark.blur()
    // Something re-renders afterwards, as the page does all the time.
    document.getElementById('row').append(document.createElement('span'))
    await settle()
    expect(document.activeElement).toBe(document.body)
  })
})
