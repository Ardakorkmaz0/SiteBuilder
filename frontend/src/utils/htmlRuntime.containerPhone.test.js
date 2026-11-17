// The published page's fit script draws a container with phone layouts at
// its phone design size on a phone, unscaled, and at its desktop one,
// scaled to fit, anywhere wider.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { schemaToSingleHtml } from './schemaToFiles.js'
import { builderInteractiveJs } from './htmlRuntime.js'

const page = {
  id: 'p1', name: 'Home', mode: 'empty', mobileWidth: 390,
  components: [{
    id: 'card', type: 'container', props: { phoneLayout: true }, styles: {},
    layout: { x: 0, y: 0, w: 300, h: 120 }, mobileLayout: { x: 16, y: 16, w: 180, h: 200 },
    children: [{ id: 'title', type: 'text', props: { text: 'Humidity' }, styles: {}, layout: { x: 18, y: 20, w: 260, h: 40 }, mobileLayout: { x: 10, y: 10, w: 160, h: 80 } }],
  }],
}

function fitted(phone) {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(180)
  const html = schemaToSingleHtml({ theme: {}, pages: [page] }, 'Site')
  const doc = new DOMParser().parseFromString(html, 'text/html')
  vi.stubGlobal('matchMedia', (query) => ({ matches: phone && query === '(max-width: 768px)' }))
  new Function('window', 'document', 'ResizeObserver', builderInteractiveJs())(window, doc, undefined)
  doc.dispatchEvent(new Event('DOMContentLoaded'))
  return doc.querySelector('[data-pwb-container-root]')
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('a container with phone layouts on the published page', () => {
  it('is drawn at its phone design size on a phone, unscaled', () => {
    const root = fitted(true)
    expect(root.style.width).toBe('180px')
    expect(root.style.height).toBe('200px')
    expect(root.style.transform).toBe('')
  })

  it('is drawn at its desktop design size, scaled, where the screen is wider', () => {
    const root = fitted(false)
    expect(root.style.width).toBe('300px')
    expect(root.style.transform).toBe('scale(0.6)')
  })
})
