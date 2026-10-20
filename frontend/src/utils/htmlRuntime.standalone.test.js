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

describe('the mobile menu button', () => {
  const nav = '<div data-builder-mobile-nav><button data-builder-mobile-nav-toggle aria-label="Open navigation menu" aria-expanded="false">☰</button><div class="links"><a href="#x">X</a></div></div>'

  it('is named in Turkish on a Turkish page, closed and open', () => {
    const dom = new JSDOM(`<html lang="tr"><head></head><body>${nav}</body></html>`, { url: 'https://portfolio.example/', runScripts: 'outside-only' })
    documents.push(dom)
    dom.window.eval(builderInteractiveJs())
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'))
    const button = dom.window.document.querySelector('button')

    expect(button.getAttribute('aria-label')).toBe('Gezinme menüsünü aç')
    button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(button.getAttribute('aria-label')).toBe('Gezinme menüsünü kapat')
  })

  it('keeps its English name elsewhere', () => {
    const { win, doc } = page(nav)
    const button = doc.querySelector('button')
    expect(button.getAttribute('aria-label')).toBe('Open navigation menu')
    button.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(button.getAttribute('aria-label')).toBe('Close navigation menu')
  })
})

describe('a password field\'s eye', () => {
  const field = (label) => `<div class="pwb-password"><input type="password"><button type="button" data-pwb-reveal aria-label="${label}" aria-pressed="false"></button></div>`

  function turkishPage(body) {
    const dom = new JSDOM(`<html lang="tr"><head></head><body>${body}</body></html>`, { url: 'https://portfolio.example/', runScripts: 'outside-only' })
    documents.push(dom)
    dom.window.eval(builderInteractiveJs())
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'))
    return dom.window.document
  }

  it('is named in Turkish on a Turkish page, unless its author named it', () => {
    const doc = turkishPage(field('Show password') + field('Parolayı göster'))
    const [standard, renamed] = doc.querySelectorAll('button')
    expect(standard.getAttribute('aria-label')).toBe('Şifreyi göster')
    expect(renamed.getAttribute('aria-label')).toBe('Parolayı göster')
  })

  it('keeps its English name elsewhere', () => {
    const { doc } = page(field('Show password'))
    expect(doc.querySelector('button').getAttribute('aria-label')).toBe('Show password')
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

  // The visitor of a Turkish site read "Message sent." under a Turkish form.
  it('answers in Turkish on a page whose language is Turkish', async () => {
    const { win, doc } = page(formMarkup)
    doc.documentElement.setAttribute('lang', 'tr')
    win.fetch.mockRejectedValueOnce(new Error('offline'))
    const form = doc.querySelector('form')
    submit(win, form)
    await vi.waitFor(() => expect(form.textContent).toContain('Mesaj gönderilemedi.'))
    submit(win, form)
    await vi.waitFor(() => expect(form.textContent).toContain('Mesajınız gönderildi.'))
    expect(form.textContent).not.toContain('Message')
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

// A link in an HTML block cannot take the visitor anywhere: the block is a
// sandboxed frame. It asks the page around it, which used to ignore the
// request, so a block's link to another page of a published site did nothing.
describe('a link in an HTML block', () => {
  const post = (win, source, data) => win.dispatchEvent(new win.MessageEvent('message', { source, data }))
  // The links the page followed, and whether the runtime let each one go.
  function followed(doc) {
    const links = []
    doc.addEventListener('click', (event) => {
      const link = event.target.closest?.('a')
      if (link) links.push([link.getAttribute('href'), event.defaultPrevented])
      event.preventDefault()
    })
    return links
  }

  it('to a page of the site is followed by the published page, from its own blocks only', () => {
    const { win, doc } = page('<iframe srcdoc="<p>block</p>"></iframe><iframe src="https://video.example/embed"></iframe>')
    const [block, foreign] = [...doc.querySelectorAll('iframe')].map((frame) => frame.contentWindow)
    const links = followed(doc)
    post(win, foreign, { type: 'pwb-navigate', href: '/s/demo/about-us/' })
    post(win, block, { type: 'pwb-navigate', href: '//elsewhere.example/' })
    post(win, block, { type: 'pwb-navigate', href: 'javascript:alert(1)' })
    post(win, block, { type: 'pwb-navigate', href: '/s/demo/about-us/' })
    expect(links).toEqual([['https://portfolio.example/s/demo/about-us/', false]])
  })

  // The URL parser reads a backslash as a slash and drops line breaks, so
  // these name another site although they start with one slash.
  it.each(['/\\elsewhere.example/', '/\n/elsewhere.example/', '/\t/elsewhere.example/'])('to another site written as a path (%j) is not followed', (href) => {
    const { win, doc } = page('<iframe srcdoc="<p>block</p>"></iframe>')
    const links = followed(doc)
    post(win, doc.querySelector('iframe').contentWindow, { type: 'pwb-navigate', href })
    expect(links).toEqual([])
  })

  // Resolved, these are paths of this site that begin with "//": written back
  // as a relative link, the browser read them as another site.
  it.each(['/safe/..//elsewhere.example/', '/%2e//elsewhere.example/', '/safe/%2e%2e//elsewhere.example/'])('to a path that resolves to "//…" (%j) stays on this site', (href) => {
    const { win, doc } = page('<iframe srcdoc="<p>block</p>"></iframe>')
    const destinations = []
    doc.addEventListener('click', (event) => {
      const link = event.target.closest?.('a')
      if (link) destinations.push(new URL(link.href).origin)
      event.preventDefault()
    })
    post(win, doc.querySelector('iframe').contentWindow, { type: 'pwb-navigate', href })
    expect(destinations).toEqual(['https://portfolio.example'])
  })

  it('is followed to the address it resolves to, with its query and fragment', () => {
    const { win, doc } = page('<iframe srcdoc="<p>block</p>"></iframe>')
    const links = followed(doc)
    post(win, doc.querySelector('iframe').contentWindow, { type: 'pwb-navigate', href: '/s/demo/../about/?from=block#details' })
    expect(links).toEqual([['https://portfolio.example/s/about/?from=block#details', false]])
  })

  it('is not followed by a page that is not on the web (a file opened from disk)', () => {
    const dom = new JSDOM('<html><body><iframe srcdoc="<p>block</p>"></iframe></body></html>', { url: 'file:///home/ada/site/about.html', runScripts: 'outside-only' })
    documents.push(dom)
    const win = dom.window
    win.eval(builderInteractiveJs())
    win.document.dispatchEvent(new win.Event('DOMContentLoaded'))
    const links = followed(win.document)
    post(win, win.document.querySelector('iframe').contentWindow, { type: 'pwb-navigate', href: '/about/' })
    expect(links).toEqual([])
  })

  it('to a part of the page scrolls the page there', () => {
    const { win, doc } = page('<section id="contact"></section><iframe srcdoc="<p>block</p>"></iframe>')
    const section = doc.getElementById('contact')
    section.scrollIntoView = vi.fn()
    post(win, doc.querySelector('iframe').contentWindow, { type: 'pwb-navigate', hash: '#contact' })
    expect(section.scrollIntoView).toHaveBeenCalledTimes(1)
  })

  it('is passed up by a page shown inside the viewer, where a page link switches the page', () => {
    const { win, doc, parent } = page('<iframe srcdoc="<p>block</p>"></iframe>', { preview: true })
    post(win, doc.querySelector('iframe').contentWindow, { type: 'pwb-navigate', hash: '#page_about' })
    expect(parent.postMessage).toHaveBeenCalledWith({ type: 'pwb-navigate', hash: '#page_about' }, '*')
  })

  it('to a path of the site is passed up once by a page shown inside the viewer, as it is', () => {
    const { win, doc, parent } = page('<iframe srcdoc="<p>block</p>"></iframe>', { preview: true })
    const links = followed(doc)
    post(win, doc.querySelector('iframe').contentWindow, { type: 'pwb-navigate', href: '/s/demo/about/' })
    expect(links).toEqual([])
    expect(parent.postMessage).toHaveBeenCalledTimes(1)
    expect(parent.postMessage).toHaveBeenCalledWith({ type: 'pwb-navigate', href: '/s/demo/about/' }, '*')
  })

  it('in the block itself asks the page around it to go to a path of the site', () => {
    const { win, doc, parent } = page('<a href="/s/demo/about-us/">About</a>', { preview: true })
    expect(clickWasPrevented(win, doc.querySelector('a'))).toBe(true)
    expect(parent.postMessage).toHaveBeenCalledWith({ type: 'pwb-navigate', href: '/s/demo/about-us/' }, '*')
  })
})
