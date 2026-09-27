import { afterEach, describe, expect, it, vi } from 'vitest'
import { JSDOM } from 'jsdom'
import { builderInteractiveJs, withBuilderRuntimeHtml } from './htmlRuntime.js'

const documents = []
function page(body, { preview = false, endpoint = true, readonly = false } = {}) {
  const metadata = endpoint ? '<meta name="pwb-form-endpoint" content="/__sitebuilder/form/">' : ''
  const source = `<html><head>${metadata}</head><body>${body}</body></html>`
  const dom = new JSDOM(readonly ? withBuilderRuntimeHtml(source) : source, {
    url: preview ? 'about:blank' : 'https://portfolio.example/about/', runScripts: 'outside-only',
  })
  documents.push(dom)
  const win = dom.window
  win.fetch = vi.fn().mockResolvedValue({ ok: true })
  win.scrollTo = vi.fn()
  const parent = preview ? { postMessage: vi.fn() } : win
  if (preview) Object.defineProperty(win, 'parent', { value: parent })
  if (readonly) {
    win.document.querySelectorAll('script').forEach((script) => win.eval(script.textContent))
  } else win.eval(builderInteractiveJs())
  win.document.dispatchEvent(new win.Event('DOMContentLoaded'))
  return { win, doc: win.document, parent }
}

function clickWasPrevented(win, element) {
  let prevented
  // Observe runtime behavior and cancel actual jsdom navigation afterwards.
  win.document.addEventListener('click', (event) => {
    prevented = event.defaultPrevented
    event.preventDefault()
  }, { once: true })
  element.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }))
  return prevented
}
function submit(win, form) {
  const event = new win.Event('submit', { bubbles: true, cancelable: true })
  form.dispatchEvent(event)
  return event.defaultPrevented
}
afterEach(() => documents.splice(0).forEach((dom) => dom.window.close()))

describe('standalone published navigation', () => {
  it.each(['/about/', '../contact/', 'contact.html', '//external.example/work'])('allows normal navigation to %s', (href) => {
    const { win, doc } = page(`<a href="${href}">Go</a>`)
    expect(clickWasPrevented(win, doc.querySelector('a'))).toBe(false)
  })

  it('keeps a relative path from blanking a srcdoc preview', () => {
    const { win, doc } = page('<a href="/about/">Go</a>', { preview: true })
    expect(clickWasPrevented(win, doc.querySelector('a'))).toBe(true)
  })

  it.each(['javascript:alert(1)', 'java&#x09;script:alert(1)', 'data:text/html,hello'])('blocks unsafe navigation %s', (href) => {
    const { win, doc } = page(`<a href="${href}">Go</a>`)
    expect(clickWasPrevented(win, doc.querySelector('a'))).toBe(true)
  })

  it('does not turn a home link in an uploaded published page into scroll-to-top', () => {
    const { win, doc } = page('<a href="/">Home</a>', { readonly: true })
    expect(clickWasPrevented(win, doc.querySelector('a'))).toBe(false)
    expect(win.scrollTo).not.toHaveBeenCalled()
  })

  it('ignores malformed hash encoding without crashing the runtime', () => {
    const { win, doc } = page('<a href="#%broken">Go</a>')
    expect(clickWasPrevented(win, doc.querySelector('a'))).toBe(true)
  })
})

describe('standalone published inbox', () => {
  const formMarkup = '<form><input name="name" value="Ada"><input type="password" name="password" value="secret"><input type="hidden" name="website" value=""><button>Send</button></form>'

  it('sends to the bound same-origin inbox without platform credentials', async () => {
    const { win, doc } = page(formMarkup)
    const form = doc.querySelector('form')
    expect(submit(win, form)).toBe(true)
    submit(win, form)
    expect(win.fetch).toHaveBeenCalledTimes(1)
    const [url, request] = win.fetch.mock.calls[0]
    expect(url).toBe('https://portfolio.example/__sitebuilder/form/')
    expect(request).toMatchObject({ method: 'POST', credentials: 'omit', mode: 'same-origin' })
    expect(JSON.parse(request.body)).toEqual({ data: { name: 'Ada' }, page: '/about/', website: '' })
    await vi.waitFor(() => expect(form.textContent).toContain('Message sent.'))
    expect(form.hasAttribute('data-pwb-submitting')).toBe(false)
  })

  it('shows an honest failure and permits a retry after a network error', async () => {
    const { win, doc } = page(formMarkup)
    win.fetch.mockRejectedValueOnce(new Error('offline'))
    const form = doc.querySelector('form')
    submit(win, form)
    await vi.waitFor(() => expect(form.textContent).toContain('Message could not be sent.'))
    submit(win, form)
    await vi.waitFor(() => expect(form.textContent).toContain('Message sent.'))
    expect(win.fetch).toHaveBeenCalledTimes(2)
  })

  it('never claims success for a downloaded export with no inbox configuration', () => {
    const { win, doc } = page(formMarkup, { endpoint: false })
    const form = doc.querySelector('form')
    submit(win, form)
    expect(win.fetch).not.toHaveBeenCalled()
    expect(form.textContent).toContain('Message could not be sent.')
  })

  it.each(['/custom-handler', 'https://forms.example/submit'])('preserves an authored form action %s', (action) => {
    const { win, doc } = page(`<form action="${action}"><input name="name" value="Ada"></form>`)
    expect(submit(win, doc.querySelector('form'))).toBe(false)
    expect(win.fetch).not.toHaveBeenCalled()
  })

  it('keeps the parent bridge for the isolated preview iframe', () => {
    const { win, doc, parent } = page(formMarkup, { preview: true })
    const form = doc.querySelector('form')
    submit(win, form)
    expect(win.fetch).not.toHaveBeenCalled()
    expect(parent.postMessage).toHaveBeenCalledWith({ type: 'pwb-form-submit', data: { name: 'Ada' }, page: '' }, '*')
    win.dispatchEvent(new win.MessageEvent('message', { source: {}, data: { type: 'pwb-form-result', ok: true } }))
    expect(form.querySelector('[data-pwb-form-status]')).toBeNull()
    win.dispatchEvent(new win.MessageEvent('message', { source: parent, data: { type: 'pwb-form-result', ok: true } }))
    expect(form.textContent).toContain('Message sent.')
  })
})
