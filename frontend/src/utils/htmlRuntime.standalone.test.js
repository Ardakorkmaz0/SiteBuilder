import { afterEach, describe, expect, it, vi } from 'vitest'
import { JSDOM } from 'jsdom'
import { builderInteractiveJs, withBuilderRuntimeHtml } from './htmlRuntime.js'

const documents = []
function page(body, { preview = false, endpoint = true, readonly = false } = {}) {
  const path = endpoint === true ? '/__sitebuilder/form/' : endpoint
  const metadata = path ? `<meta name="pwb-form-endpoint" content="${path}">` : ''
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
    // cors, not same-origin: the /s/ page runs in an opaque origin, where a
    // same-origin request to its own host is refused. Still no credentials.
    expect(request).toMatchObject({ method: 'POST', credentials: 'omit', mode: 'cors' })
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

  it('sends a page on the shared address to that site\'s inbox', async () => {
    const { win, doc } = page(formMarkup, { endpoint: '/s/ada-studio/__sitebuilder/form/' })
    const form = doc.querySelector('form')
    submit(win, form)
    const [url, request] = win.fetch.mock.calls[0]
    expect(url).toBe('https://portfolio.example/s/ada-studio/__sitebuilder/form/')
    expect(request).toMatchObject({ credentials: 'omit', mode: 'cors' })
    await vi.waitFor(() => expect(form.textContent).toContain('Message sent.'))
  })

  it.each(['https://collector.example/__sitebuilder/form/', '//collector.example/__sitebuilder/form/', '/api/public/anything/', '/s/../__sitebuilder/form/'])(
    'never sends form contents to an address an imported tag names: %s', (endpoint) => {
      const { win, doc } = page(formMarkup, { endpoint })
      const form = doc.querySelector('form')
      submit(win, form)
      expect(win.fetch).not.toHaveBeenCalled()
      expect(form.textContent).toContain('Message could not be sent.')
    },
  )

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

// A form inside an HTML block posts to the page around it: the block has no
// address of its own. The page used to drop that message, so a contact form in
// a block reached no inbox on the published site or in the viewer.
describe('a form in an HTML block', () => {
  const blockPage = (options) => {
    const opened = page('<iframe srcdoc="<p>block</p>"></iframe><iframe src="https://video.example/embed"></iframe>', options)
    const [block, foreign] = [...opened.doc.querySelectorAll('iframe')].map((frame) => frame.contentWindow)
    vi.spyOn(block, 'postMessage')
    return { ...opened, block, foreign }
  }
  const post = (win, source, data) => win.dispatchEvent(new win.MessageEvent('message', { source, data }))

  it('is sent to the inbox by the published page, which tells the block how it went', async () => {
    const { win, block } = blockPage()
    post(win, block, { type: 'pwb-form-submit', data: { name: 'Ada', message: 'Hi' }, page: '' })
    expect(win.fetch).toHaveBeenCalledTimes(1)
    const [url, request] = win.fetch.mock.calls[0]
    expect(url).toBe('https://portfolio.example/__sitebuilder/form/')
    expect(request).toMatchObject({ method: 'POST', credentials: 'omit', mode: 'cors' })
    expect(JSON.parse(request.body)).toEqual({ data: { name: 'Ada', message: 'Hi' }, page: '/about/', website: '' })
    await vi.waitFor(() => expect(block.postMessage).toHaveBeenCalledWith({ type: 'pwb-form-result', ok: true }, '*'))
  })

  it('reports a failure to the block when the inbox cannot be reached', async () => {
    const { win, block } = blockPage({ endpoint: false })
    post(win, block, { type: 'pwb-form-submit', data: { name: 'Ada' }, page: '' })
    expect(win.fetch).not.toHaveBeenCalled()
    await vi.waitFor(() => expect(block.postMessage).toHaveBeenCalledWith({ type: 'pwb-form-result', ok: false }, '*'))
  })

  it('is only taken from blocks on the page itself, and only as short text', () => {
    const { win, foreign, block } = blockPage()
    post(win, foreign, { type: 'pwb-form-submit', data: { name: 'Spam' }, page: '' })
    post(win, {}, { type: 'pwb-form-submit', data: { name: 'Spam' }, page: '' })
    expect(win.fetch).not.toHaveBeenCalled()
    post(win, block, { type: 'pwb-form-submit', data: { name: { nested: true }, long: 'x'.repeat(3000) }, page: '' })
    expect(JSON.parse(win.fetch.mock.calls[0][1].body).data).toEqual({ name: '[object Object]', long: 'x'.repeat(2000) })
  })

  it('is passed up by a page shown inside the viewer, and the answer passed back down', () => {
    const { win, block, parent } = blockPage({ preview: true })
    post(win, block, { type: 'pwb-form-submit', data: { name: 'Ada' }, page: '' })
    expect(win.fetch).not.toHaveBeenCalled()
    expect(parent.postMessage).toHaveBeenCalledWith({ type: 'pwb-form-submit', data: { name: 'Ada' }, page: '' }, '*')
    post(win, parent, { type: 'pwb-form-result', ok: true })
    expect(block.postMessage).toHaveBeenCalledWith({ type: 'pwb-form-result', ok: true }, '*')
  })
})
