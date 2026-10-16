import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import { useEditorStore } from '../../store/editorStore.js'
import { ContainerEditor } from './FlowCanvasItem.jsx'
import { RenderComponent } from '../renderer/Renderer.jsx'
import { schemaToSingleHtml } from '../../utils/schemaToFiles.js'
import { builderInteractiveJs } from '../../utils/htmlRuntime.js'

const state = () => useEditorStore.getState()

function load() {
  state().loadSchema({ pages: [
    {
      id: 'wide', name: 'Wide', canvasWidth: 1000, mobileWidth: 1000,
      mobileManual: true, components: [{
        id: 'parent', type: 'container', props: {}, styles: {},
        layout: { x: 0, y: 0, w: 800, h: 200 },
        mobileLayout: { x: 0, y: 0, w: 800, h: 200 },
        children: [{
          id: 'edge', type: 'heading', props: { text: 'Edge content', level: 'h1', fit: 'off' },
          styles: { fontSize: '44px' },
          layout: { x: 650, y: 40, w: 100, h: 60 },
        }],
      }],
    },
    {
      id: 'narrow', name: 'Narrow', canvasWidth: 500, mobileWidth: 500,
      mobileManual: true, components: [],
    },
  ] })
}

function transfer(method) {
  load()
  if (method === 'paste') {
    state().selectComponent('parent')
    state().copySelection()
    state().selectPage('narrow')
    state().pasteClipboard()
  } else {
    state().copyComponentToPage('parent', 'narrow')
    if (method === 'copy and reload') state().loadSchema(structuredClone(state().schema))
    state().selectPage('narrow')
  }
  return state().schema.pages[1].components[0]
}

function expectFittedChild(child, boundary, width = 500) {
  let scale = 1
  for (let node = child.parentElement; node && node !== boundary; node = node.parentElement) {
    const value = node.style.transform.match(/^scale\(([\d.]+)\)$/)
    if (value) scale *= Number(value[1])
  }
  expect(scale).toBeLessThan(1)
  expect((Number.parseFloat(child.style.left) + Number.parseFloat(child.style.width)) * scale).toBeLessThanOrEqual(width)
  let heading = child.querySelector('h1')
  while (heading && heading !== child && heading.style.fontSize !== '44px') heading = heading.parentElement
  expect(heading?.style.fontSize).toBe('44px')
}

function CurrentContainer() {
  const component = useEditorStore((s) => s.schema.pages[1].components[0])
  return <ContainerEditor component={component} />
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

beforeEach(() => vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} }))

describe('copied containers on a narrower canvas', () => {
  for (const method of ['paste', 'copy', 'copy and reload']) {
    it(`keeps the right-edge child visible and editable after ${method}`, () => {
      const component = transfer(method)
      vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(500)
      const view = render(<LanguageProvider><ContainerEditor component={component} /></LanguageProvider>)
      const child = view.container.querySelector(`[data-cid="${component.children[0].id}"]`)

      expect(component.layout.w).toBe(500)
      expect(component.mobileLayout.w).toBe(500)
      expect(state().schema.pages[0].components[0].layout.w).toBe(800)
      expect(state().schema.pages[0].components[0].mobileLayout.w).toBe(800)
      expect(component.children[0].layout).toEqual({ x: 650, y: 40, w: 100, h: 60 })
      expectFittedChild(child, view.container)
    })
  }

  for (const [viewport, width] of [['pc', 500], ['mobile', 320]]) {
    it(`fits the same copied design in the ${viewport} viewer`, () => {
      const component = transfer('paste')
      vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(width)
      const view = render(<RenderComponent component={component} viewport={viewport} />)
      const child = view.container.querySelector(`[id="${component.children[0].id}"]`)

      expectFittedChild(child, view.container, width)
    })
  }

  it('fits a 320px mobile measurement when the exported runtime starts', () => {
    const component = transfer('paste')
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(320)
    const html = schemaToSingleHtml({ pages: [state().schema.pages[1]] }, 'Narrow copy')
    const doc = new DOMParser().parseFromString(html, 'text/html')
    new Function('window', 'document', 'ResizeObserver', builderInteractiveJs())(window, doc, ResizeObserver)
    doc.dispatchEvent(new Event('DOMContentLoaded'))
    const child = doc.getElementById(component.children[0].id)

    expectFittedChild(child, doc.body, 320)
  })

  it('translates a pointer drag back into design coordinates without clipping after the fit changes', () => {
    const component = transfer('paste')
    state().setViewport('pc')
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(500)
    const view = render(<LanguageProvider><CurrentContainer /></LanguageProvider>)
    const child = view.container.querySelector(`[data-cid="${component.children[0].id}"]`)

    fireEvent.pointerDown(child, { button: 0, clientX: 440, clientY: 50 })
    fireEvent(window, new MouseEvent('pointermove', { clientX: 430, clientY: 50, bubbles: true }))
    fireEvent(window, new MouseEvent('pointerup', { bubbles: true }))

    const moved = state().schema.pages[1].components[0].children[0]
    expect(moved.layout).toEqual({ x: 635, y: 40, w: 100, h: 60 })
    expectFittedChild(child, view.container)

    fireEvent.pointerDown(child, { button: 0, clientX: 445, clientY: 50 })
    fireEvent(window, new MouseEvent('pointermove', { clientX: 455, clientY: 50, bubbles: true }))
    fireEvent(window, new MouseEvent('pointerup', { bubbles: true }))

    expect(state().schema.pages[1].components[0].children[0].layout.x).toBe(650)
    expectFittedChild(child, view.container)
  })

  it('fits the same shared child coordinates in the 320px mobile editor', () => {
    transfer('paste')
    const schema = structuredClone(state().schema)
    schema.pages[1].mobileWidth = 320
    state().loadSchema(schema)
    state().selectPage('narrow')
    state().setViewport('mobile')
    const component = state().schema.pages[1].components[0]
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(320)
    const view = render(<LanguageProvider><CurrentContainer /></LanguageProvider>)
    const child = view.container.querySelector(`[data-cid="${component.children[0].id}"]`)

    expect(component.mobileLayout.w).toBe(320)
    expectFittedChild(child, view.container, 320)
  })

  it('uses the measured inner border width without altering authored padding or text', () => {
    const component = { ...transfer('paste'), styles: { padding: '24px', border: '5px solid red' } }
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(490)
    const view = render(<RenderComponent component={component} />)
    const canvas = view.container.querySelector('[data-pwb-container-width]')
    const child = view.container.querySelector(`[id="${component.children[0].id}"]`)

    expect(canvas.style.padding).toBe('24px')
    expect(canvas.style.borderWidth).toBe('5px')
    expectFittedChild(child, view.container, 490)
  })

  for (const height of ['', '260px']) {
    it(`uses the same fitted background height in Edit, View and export with ${height || 'automatic height'}`, () => {
      const component = { ...transfer('paste'), styles: height ? { height } : {} }
      vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(500)
      const edit = render(<LanguageProvider><ContainerEditor component={component} /></LanguageProvider>)
      const view = render(<RenderComponent component={component} />)
      const html = schemaToSingleHtml({ pages: [{ ...state().schema.pages[1], components: [component] }] }, 'Narrow copy')
      const doc = new DOMParser().parseFromString(html, 'text/html')
      const nodes = [
        edit.container.querySelector('[data-builder-droppable-id]'),
        view.container.querySelector('[data-pwb-container-width]'),
        doc.querySelector('[data-pwb-container-width]'),
      ]

      for (const node of nodes) {
        expect(node.style.height || 'auto').toBe(height || 'auto')
        expect(node.style.minHeight).toBe('133.33333333333331px')
      }
    })
  }

  for (const editor of [true, false]) {
    it(`fits a nested container independently in ${editor ? 'Edit' : 'View'}`, () => {
      load()
      const heading = state().schema.pages[0].components[0].children[0]
      const component = {
        id: 'outer', type: 'container', props: {}, styles: {}, layout: { x: 0, y: 0, w: 500, h: 200 },
        children: [{
          id: 'nested', type: 'container', props: {}, styles: {}, layout: { x: 50, y: 20, w: 400, h: 120 },
          children: [heading],
        }],
      }
      vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function () {
        return this.getAttribute('data-builder-droppable-id') === 'nested' || this.getAttribute('data-pwb-container-width') === '750' ? 400 : 500
      })
      const view = render(<LanguageProvider>{editor ? <ContainerEditor component={component} /> : <RenderComponent component={component} />}</LanguageProvider>)
      const child = view.container.querySelector(editor ? '[data-cid="edge"]' : '[id="edge"]')

      expectFittedChild(child, view.container, 400)
    })

    it(`keeps auto-layout containers on their existing flow path in ${editor ? 'Edit' : 'View'}`, () => {
      const component = { ...transfer('paste'), props: { flow: 'column', align: 'stretch', gap: 16 } }
      vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(500)
      const view = render(<LanguageProvider>{editor ? <ContainerEditor component={component} /> : <RenderComponent component={component} />}</LanguageProvider>)

      expect(view.container.querySelector('[data-pwb-container-root]')).toBeNull()
      expect(view.container.querySelector('h1').textContent).toBe('Edge content')
      expect(view.container.firstElementChild.style.display).toBe('flex')
      if (editor) expect(view.container.firstElementChild.dataset.builderFitScale).toBe('1')
    })
  }
})
