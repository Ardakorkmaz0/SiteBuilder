import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, within } from '@testing-library/react'
import { JSDOM } from 'jsdom'
import { ContainerEditor, TabsEditor } from '../editor/FlowCanvasItem.jsx'
import { RenderComponent } from './Renderer.jsx'
import { useEditorStore } from '../../store/editorStore.js'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import { schemaToSingleHtml } from '../../utils/schemaToFiles.js'
import { builderInteractiveJs } from '../../utils/htmlRuntime.js'

const documents = []
let measuredWidth

beforeEach(() => {
  measuredWidth = () => 320
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function () {
    return this.closest('[role="tabpanel"][hidden]') ? 0 : measuredWidth(this)
  })
  useEditorStore.getState().loadSchema({ pages: [{ id: 'home', name: 'Home', components: [] }] })
  useEditorStore.getState().setViewport('mobile')
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  documents.splice(0).forEach((dom) => dom.window.close())
})

function tabsComponent() {
  return {
    id: 'tabs', type: 'tabs',
    props: {
      tabs: [{ id: 'one', label: 'One' }], activeId: 'one', panelPadding: '12px', panelBorderColor: 'red',
    }, styles: {},
    layout: { x: 0, y: 0, w: 600, h: 200 },
    mobileLayout: { x: 0, y: 0, w: 320, h: 200 },
    children: [{
      id: 'edge', tabId: 'one', type: 'heading', props: { text: 'Edge heading', fit: 'off' }, styles: { fontSize: '44px' },
      layout: { x: 500, y: 20, w: 100, h: 60 },
    }],
  }
}

function rightEdge(child) {
  let edge = Number.parseFloat(child.style.left) + Number.parseFloat(child.style.width)
  for (let node = child.parentElement; node; node = node.parentElement) {
    const match = node.style.transform.match(/^scale\(([\d.]+)\)$/)
    if (match) edge *= Number(match[1])
    if (node.style.position === 'absolute') edge += Number.parseFloat(node.style.left) || 0
  }
  return edge
}

function exportedPage(component) {
  const html = schemaToSingleHtml({ pages: [{ id: 'home', name: 'Home', components: [component] }] }, 'Tabs geometry')
  const dom = new JSDOM(html, { url: 'https://example.test/', runScripts: 'outside-only' })
  documents.push(dom)
  // Measurements are the platform boundary; rendering and activation use the
  // real exported runtime, without a ResizeObserver to hide missing refits.
  Object.defineProperty(dom.window.HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get() { return this.closest('[role="tabpanel"][hidden]') ? 0 : measuredWidth(this) },
  })
  dom.window.eval(builderInteractiveJs())
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'))
  return dom.window.document
}

describe('narrow native tabs preserve their editor geometry', () => {
  it.each([
    ['View', 'pc', 600], ['export runtime', 'pc', 600],
    ['View', 'mobile', 320], ['export runtime', 'mobile', 320],
  ])('keeps the right-edge child visible in %s on %s as in Edit', (mode, viewport, width) => {
    measuredWidth = () => width
    useEditorStore.getState().setViewport(viewport)
    const tabs = tabsComponent()
    const edit = render(<LanguageProvider><TabsEditor component={tabs} /></LanguageProvider>)
    const editedChild = edit.container.querySelector('[data-cid="edge"]')
    expect(rightEdge(editedChild)).toBe(width)

    let publicChild, root
    if (mode === 'View') {
      const viewer = render(<RenderComponent component={tabs} viewport={viewport} />)
      root = viewer.container
      publicChild = viewer.container.querySelector('#edge')
    } else {
      root = exportedPage(tabs)
      publicChild = root.getElementById('edge')
    }
    expect(rightEdge(publicChild)).toBe(width)
    expect(publicChild.querySelector('[style*="font-size: 44px"]')).not.toBeNull()
    const panel = root.querySelector('[role="tabpanel"]')
    expect(panel.style.minHeight).toBe(width === 600 ? '120px' : '64px')
    expect(panel.style.padding || root.querySelector('[data-builder-tabs]').style.getPropertyValue('--builder-panel-padding')).toBe('12px')
    const strip = root.querySelector('[role="tablist"]')
    for (let node = strip; node?.style; node = node.parentElement) {
      expect(node.style.transform).not.toContain('scale(')
    }
  })

  it.each(['View', 'export runtime'])('fits a newly opened panel in %s while keeping the previous panel hidden', (mode) => {
    const tabs = tabsComponent()
    tabs.props.tabs.push({ id: 'two', label: 'Second' })
    tabs.children.push({
      id: 'second-edge', tabId: 'two', type: 'container', props: { flow: 'column' }, styles: {},
      layout: { x: 500, y: 20, w: 100, h: 60 },
      children: [{ id: 'flow-child', type: 'text', props: { text: 'Flow content' }, styles: {}, layout: { w: 100, h: 40 } }],
    })
    let root
    if (mode === 'View') root = render(<RenderComponent component={tabs} viewport="mobile" />).container
    else root = exportedPage(tabs)
    const first = root.querySelector('[data-builder-panel="one"]')
    const second = root.querySelector('[data-builder-panel="two"]')
    expect(first.hidden).toBe(false)
    expect(second.hidden).toBe(true)
    fireEvent.click(within(root).getByRole('tab', { name: 'Second', exact: true }))

    expect(first.hidden).toBe(true)
    expect(second.hidden).toBe(false)
    expect(within(root).getByRole('tab', { name: 'Second', exact: true })).toHaveAttribute('aria-selected', 'true')
    expect(rightEdge(root.querySelector('#second-edge'))).toBe(320)
    expect(root.querySelector('#second-edge').textContent).toContain('Flow content')
    expect(root.querySelector('#second-edge [data-pwb-container-root]')).toBeNull()
    fireEvent.click(within(root).getByRole('tab', { name: 'One', exact: true }))
    expect(first.hidden).toBe(false)
    expect(second.hidden).toBe(true)
    expect(rightEdge(root.querySelector('#edge'))).toBe(320)
  })

  it.each(['View', 'export runtime'])('keeps nested mobile tabs in their parent design space in %s', (mode) => {
    const tabs = tabsComponent()
    tabs.layout = { x: 100, y: 20, w: 600, h: 200 }
    const outer = {
      id: 'outer', type: 'container', props: {}, styles: {},
      layout: { x: 0, y: 0, w: 800, h: 240 }, mobileLayout: { x: 0, y: 0, w: 320, h: 240 },
      children: [tabs],
    }
    measuredWidth = (element) => element.getAttribute('data-builder-droppable-id') === 'tabs' || element.getAttribute('role') === 'tabpanel' ? 600 : 320
    const edit = render(<LanguageProvider><ContainerEditor component={outer} /></LanguageProvider>)
    expect(rightEdge(edit.container.querySelector('[data-cid="edge"]'))).toBe(280)

    const root = mode === 'View'
      ? render(<RenderComponent component={outer} viewport="mobile" />).container
      : exportedPage(outer)
    expect(rightEdge(root.querySelector('#edge'))).toBe(280)
  })

  it.each(['View', 'export runtime'])('refits a free canvas inside a newly opened panel in %s without ResizeObserver', (mode) => {
    vi.stubGlobal('ResizeObserver', undefined)
    const tabs = tabsComponent()
    tabs.props.tabs.push({ id: 'two', label: 'Second' })
    tabs.children.push({
      id: 'nested-free', tabId: 'two', type: 'container', props: {}, styles: {},
      layout: { x: 0, y: 0, w: 400, h: 120 },
      children: [{
        id: 'nested-edge', type: 'text', props: { text: 'Far edge', fit: 'off' }, styles: {},
        layout: { x: 900, y: 20, w: 100, h: 40 },
      }],
    })
    measuredWidth = (element) => element.getAttribute('data-pwb-container-width') === '1000' ? 400 : 320
    const root = mode === 'View'
      ? render(<RenderComponent component={tabs} viewport="mobile" />).container
      : exportedPage(tabs)
    expect(root.querySelector('[data-builder-panel="two"]').hidden).toBe(true)
    fireEvent.click(within(root).getByRole('tab', { name: 'Second', exact: true }))
    expect(root.querySelector('[data-builder-panel="two"]').hidden).toBe(false)
    expect(rightEdge(root.querySelector('#nested-edge'))).toBeCloseTo(213.33333333333334, 8)
  })
})
