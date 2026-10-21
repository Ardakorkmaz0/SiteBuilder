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

const replacement = (text = 'Mark unread') => {
  const control = document.createElement('button')
  control.textContent = text
  return control
}

// Round 10 review: a control removed straight away, with no disabled phase
// first, left focus on the page body (a link list's Remove did that).
describe('a focused control removed without being disabled first', () => {
  it('hands focus to the control that took its place', async () => {
    const mark = document.getElementById('mark')
    mark.focus()
    const unread = replacement()
    mark.replaceWith(unread)
    await settle()
    expect(document.activeElement).toBe(unread)
  })

  it('goes up to the part of the page that is still there when its whole row went', async () => {
    const close = replacement('Close')
    document.querySelector('[role=dialog]').prepend(close)
    document.getElementById('mark').focus()
    document.getElementById('row').remove()
    await settle()
    expect(document.activeElement).toBe(close)
  })
})

describe('choosing where focus goes', () => {
  it('tries the closest part of the page first', async () => {
    document.querySelector('[role=dialog]').prepend(replacement('Close'))
    const mark = document.getElementById('mark')
    mark.focus()
    lose(mark)
    await settle()
    const unread = replacement()
    mark.replaceWith(unread)
    await settle()
    expect(document.activeElement).toBe(unread)
  })

  it.each(['hidden', 'inert', 'aria-hidden', 'display', 'visibility', 'disabled'])('skips a candidate that cannot take focus (%s)', async (kind) => {
    const mark = document.getElementById('mark')
    mark.focus()
    lose(mark)
    await settle()
    const trap = replacement('Unavailable')
    trap.tabIndex = 0
    if (kind === 'hidden') trap.hidden = true
    if (kind === 'inert') trap.setAttribute('inert', '')
    if (kind === 'aria-hidden') trap.setAttribute('aria-hidden', 'true')
    if (kind === 'display') trap.style.display = 'none'
    if (kind === 'visibility') trap.style.visibility = 'hidden'
    if (kind === 'disabled') trap.disabled = true
    const unread = replacement()
    mark.replaceWith(trap, unread)
    await settle()
    expect(document.activeElement).toBe(unread)
  })

  it('does not hand focus to a control whose part of the page was made inert meanwhile', async () => {
    const mark = document.getElementById('mark')
    mark.focus()
    lose(mark)
    await settle()
    const focus = vi.spyOn(mark, 'focus')
    document.getElementById('row').setAttribute('inert', '')
    mark.disabled = false
    await settle()
    expect(focus).not.toHaveBeenCalled()
  })

  it('does not hand focus into a part of the page hidden further up', async () => {
    const mark = document.getElementById('mark')
    mark.focus()
    lose(mark)
    await settle()
    document.querySelector('[role=dialog]').style.display = 'none'
    const unread = replacement()
    const focus = vi.spyOn(unread, 'focus')
    mark.replaceWith(unread)
    await settle()
    expect(focus).not.toHaveBeenCalled()
  })
})

describe('focus the person let go of on purpose', () => {
  it('is not taken back when that control is later disabled and enabled again', async () => {
    const mark = document.getElementById('mark')
    mark.focus()
    mark.blur() // a click on the page background
    await settle()
    mark.disabled = true // some later update of the page
    await settle()
    mark.disabled = false
    await settle()
    expect(document.activeElement).toBe(document.body)
  })

  it('stays let go after focus moved elsewhere and left there too', async () => {
    const mark = document.getElementById('mark')
    mark.focus()
    lose(mark)
    await settle()
    const outside = document.getElementById('outside')
    outside.focus()
    outside.blur()
    await settle()
    mark.disabled = false
    await settle()
    expect(document.activeElement).toBe(document.body)
  })
})


// A header tab took the person to another page, and went with the page it was
// on. Focus handed to the new page's first control put "Skip to content" on
// screen after every click on a tab. A new page starts fresh, as a load does.
describe('a control that took the person to another page', () => {
  it('leaves focus to the new page', async () => {
    const start = window.location.href
    try {
      document.getElementById('mark').focus()
      history.pushState(null, '', '/elsewhere')
      document.querySelector('[role=dialog]').innerHTML = '<a href="#main">Skip to content</a><button>New page</button>'
      await settle()
      expect(document.activeElement).toBe(document.body)
    } finally {
      history.replaceState(null, '', start)
    }
  })
})

describe('a control drawn only for screen readers', () => {
  it('is never where focus is handed', async () => {
    const dialog = document.querySelector('[role=dialog]')
    const skip = document.createElement('a')
    skip.href = '#main'
    skip.className = 'sr-only focus:not-sr-only'
    skip.textContent = 'Skip to content'
    dialog.prepend(skip)
    const close = replacement('Close')
    dialog.append(close)
    document.getElementById('mark').focus()
    document.getElementById('row').remove()
    await settle()
    expect(document.activeElement).toBe(close)
  })
})
