import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import { Renderer } from './Renderer.jsx'
import { flowItemStyle } from './layout.js'

function show(ui) {
  return render(<LanguageProvider>{ui}</LanguageProvider>)
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Renderer component regressions', () => {
  it('updates controlled FormField switch, check, range, and select inputs when props change on rerender', () => {
    const makePage = (props) => [{
      id: 'f1', type: 'input', props, styles: {}, layout: { x: 20, y: 20, w: 320, h: 60 },
    }]
    const view = show(<Renderer components={makePage({ inputType: 'switch', label: 'Notify', checked: 'off' })} width={1000} />)
    const sw = view.container.querySelector('input[type="checkbox"][role="switch"]')
    expect(sw.checked).toBe(false)

    view.rerender(<LanguageProvider><Renderer components={makePage({ inputType: 'switch', label: 'Notify', checked: 'on' })} width={1000} /></LanguageProvider>)
    expect(sw.checked).toBe(true)

    view.rerender(<LanguageProvider><Renderer components={makePage({ inputType: 'range', label: 'Volume', rangeMin: 0, rangeMax: 100, rangeStep: 1, rangeValue: 20 })} width={1000} /></LanguageProvider>)
    const rng = view.container.querySelector('input[type="range"]')
    expect(rng.value).toBe('20')

    view.rerender(<LanguageProvider><Renderer components={makePage({ inputType: 'range', label: 'Volume', rangeMin: 0, rangeMax: 100, rangeStep: 1, rangeValue: 85 })} width={1000} /></LanguageProvider>)
    expect(rng.value).toBe('85')

    view.rerender(<LanguageProvider><Renderer components={makePage({ inputType: 'checkbox', label: 'Agree', checked: 'off' })} width={1000} /></LanguageProvider>)
    const cb = view.container.querySelector('input[type="checkbox"]:not([role="switch"])')
    expect(cb.checked).toBe(false)
    view.rerender(<LanguageProvider><Renderer components={makePage({ inputType: 'checkbox', label: 'Agree', checked: 'on' })} width={1000} /></LanguageProvider>)
    expect(cb.checked).toBe(true)

    view.rerender(<LanguageProvider><Renderer components={[{ id: 's1', type: 'select', props: { label: 'Plan', options: 'Free\nPro' }, styles: {}, layout: { x: 20, y: 20, w: 320, h: 60 } }]} width={1000} /></LanguageProvider>)
    const sel = view.container.querySelector('select')
    expect(sel.value).toBe('Free')

    view.rerender(<LanguageProvider><Renderer components={[{ id: 's1', type: 'select', props: { label: 'Plan', options: 'Starter\nEnterprise' }, styles: {}, layout: { x: 20, y: 20, w: 320, h: 60 } }]} width={1000} /></LanguageProvider>)
    expect(sel.value).toBe('Starter')

    view.rerender(<LanguageProvider><Renderer components={[{ id: 's1', type: 'select', props: { label: 'Plan', placeholder: 'Choose...', options: 'Starter\nEnterprise' }, styles: {}, layout: { x: 20, y: 20, w: 320, h: 60 } }]} width={1000} /></LanguageProvider>)
    expect(sel.value).toBe('')
  })

  it('lets Accordion body inherit custom text color and falls back to #4b5563 when unset', () => {
    show(
      <Renderer
        width={1000}
        components={[
          { id: 'a1', type: 'accordion', props: { title: 'Q1', text: 'Custom answer' }, styles: { color: '#ff0000' }, layout: { x: 20, y: 20, w: 400, h: 90 } },
          { id: 'a2', type: 'accordion', props: { title: 'Q2', text: 'Default answer' }, styles: {}, layout: { x: 20, y: 120, w: 400, h: 90 } },
        ]}
      />,
    )
    expect(screen.getByText('Custom answer').style.color).toBe('inherit')
    expect(screen.getByText('Default answer').style.color).toBe('rgb(75, 85, 99)')
  })

  it('prefers child.tabId over props.tabId in TabsRender and treats themeToggle as inline in flow layout', () => {
    const view = show(
      <Renderer
        width={1000}
        components={[{
          id: 'tabs1', type: 'tabs',
          props: { tabs: [{ id: 't1', label: 'First' }, { id: 't2', label: 'Second' }], activeId: 't2' },
          styles: {}, layout: { x: 20, y: 20, w: 600, h: 240 },
          children: [
            { id: 'c_top', type: 'text', tabId: 't2', props: { text: 'Top level tabId', tabId: 't1' }, styles: {}, layout: { x: 10, y: 10, w: 200, h: 40 } },
            { id: 'c_prop', type: 'text', props: { text: 'Props fallback tabId', tabId: 't2' }, styles: {}, layout: { x: 10, y: 60, w: 200, h: 40 } },
          ],
        }]}
      />,
    )
    const panels = view.container.querySelectorAll('[role="tabpanel"]')
    expect(panels[1].textContent).toContain('Top level tabId')
    expect(panels[1].textContent).toContain('Props fallback tabId')

    const toggleStyle = flowItemStyle({ id: 'tt', type: 'themeToggle', props: {}, layout: { w: 44, h: 44 } }, 'pc', 1000)
    expect(toggleStyle.flex).toBe('0 0 auto')
    expect(toggleStyle.width).toBe('min(44px, 100%)')
  })

  it('insets a fixed top navbar beside a fixed vertical side rail in flowMode too', () => {
    const view = show(
      <Renderer
        flowMode
        width={1000}
        components={[
          { id: 'rail', type: 'navbar', props: { navLayout: 'vertical', scrollBehavior: 'fixed', pinX: 'left', links: [] }, styles: {}, layout: { w: 240, h: 600 } },
          { id: 'topbar', type: 'navbar', props: { navLayout: 'horizontal', widthMode: 'full', scrollBehavior: 'fixed', links: [] }, styles: {}, layout: { w: 1000, h: 64 } },
        ]}
      />,
    )
    const topbarWrapper = view.container.querySelector('#topbar')
    expect(topbarWrapper.style.left).toBe('240px')
  })
})
