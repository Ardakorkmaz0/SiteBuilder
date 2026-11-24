import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DndContext } from '@dnd-kit/core'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import Sidebar from './Sidebar.jsx'
import { paletteItems } from '../registry.jsx'
import { HTML_VARIANTS } from '../../utils/htmlVariants.js'

function renderSidebar(props = {}) {
  return render(
    <LanguageProvider>
      <DndContext>
        <Sidebar {...props} />
      </DndContext>
    </LanguageProvider>,
  )
}

describe('Sidebar component recommendations', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('pwb_language', 'en')
  })

  it('shows the recommended Bootstrap navbar inside the Navbar variants', async () => {
    const user = userEvent.setup()
    renderSidebar()

    // Discovery moved to the BlockLibrary overlay; the rail opens it from here.
    expect(screen.getByRole('button', { name: /Browse all blocks/ })).toBeInTheDocument()
    expect(screen.queryByText('Bootstrap Navbar')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^Navbar\d+$/ }))

    expect(screen.getAllByText('Bootstrap Navbar')).toHaveLength(2)
    expect(screen.getByText('Recommended')).toBeInTheDocument()

    const navbarItem = paletteItems.find((item) => item.type === 'navbar')
    expect(navbarItem).toMatchObject({ type: 'navbar', label: 'Navbar' })
    // The shared line drawing of a menu, not the ☰ character.
    const { container: iconHost } = render(navbarItem.icon)
    expect(iconHost.querySelector('path').getAttribute('d')).toBe('M4 6h16M4 12h16M4 18h16')
    expect(HTML_VARIANTS.navbar[0]).toMatchObject({
      id: 'bootstrap',
      label: 'Bootstrap Navbar',
      foundation: 'bootstrap',
      recommended: true,
    })
    expect(HTML_VARIANTS.navbar[0].html).toContain('class="navbar navbar-expand-lg')
  })

  it('adds one recommended Bootstrap choice to every compatible component category', () => {
    const compatibleTypes = [
      'navbar', 'heading', 'text', 'button', 'linkbutton', 'image', 'section', 'card', 'list',
      'quote', 'badge', 'input', 'select', 'alert', 'accordion', 'container', 'tabs', 'divider', 'spacer',
    ]

    for (const type of compatibleTypes) {
      expect(HTML_VARIANTS[type][0]).toMatchObject({
        id: 'bootstrap',
        foundation: 'bootstrap',
        recommended: true,
      })
      expect(HTML_VARIANTS[type].filter((variant) => variant.recommended)).toHaveLength(1)
    }

    for (const type of ['icon', 'html']) {
      expect(HTML_VARIANTS[type].some((variant) => variant.recommended)).toBe(false)
    }
  })

  it('exposes the Section (region) as the leading structural block', () => {
    renderSidebar()

    // Region is the Wix-like Section — now addable, labelled "Section", and
    // listed first as the primary page-structure block.
    expect(paletteItems.some((item) => item.type === 'region')).toBe(true)
    expect(screen.getAllByText('Section').length).toBeGreaterThan(0)
    expect(screen.queryByText('Region')).not.toBeInTheDocument()
  })

  it('switches Files, Components, and Animation directly with one click', async () => {
    const user = userEvent.setup()
    const { unmount } = renderSidebar({ filesPanel: <div>Explorer ready</div> })
    const filesTab = screen.getByRole('tab', { name: 'Files' })
    const componentsTab = screen.getByRole('tab', { name: 'Components' })
    const animationTab = screen.getByRole('tab', { name: 'Animation' })

    expect(filesTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Explorer ready')).toBeInTheDocument()

    await user.click(componentsTab)
    expect(componentsTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByText('Explorer ready')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Browse all blocks/ })).toBeInTheDocument()
    expect(localStorage.getItem('pwb_rail_tab')).toBe('components')

    await user.click(animationTab)
    expect(animationTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: 'Entrance (on scroll)' })).toBeInTheDocument()
    expect(localStorage.getItem('pwb_rail_tab')).toBe('animation')

    unmount()
    renderSidebar({ filesPanel: <div>Explorer ready</div> })
    expect(screen.getByRole('tab', { name: 'Animation' })).toHaveAttribute('aria-selected', 'true')
  })

  it('deletes a saved custom block accessibly and can undo the deletion', async () => {
    const user = userEvent.setup()
    localStorage.setItem('pwb_custom_blocks', JSON.stringify([{
      id: 'custom-test',
      label: 'Reusable hero',
      desc: 'Saved custom HTML',
      html: '<section>Hero</section>',
    }]))
    renderSidebar()

    await user.click(screen.getByRole('button', { name: /Custom HTML/ }))
    await user.click(screen.getByRole('button', { name: 'Delete saved block: Reusable hero' }))

    expect(screen.queryByText('Reusable hero')).not.toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('pwb_custom_blocks'))).toEqual([])
    expect(screen.getByText('Saved block deleted: Reusable hero').closest('[role="status"]')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(screen.getByText('Reusable hero')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('pwb_custom_blocks'))).toHaveLength(1)
  })
})

describe('Sidebar variants in Turkish', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('pwb_language', 'tr')
  })

  it('previews and places the Turkish build of a bilingual variant', async () => {
    const user = userEvent.setup()
    const armed = []
    renderSidebar({ onArmPlacement: (data) => armed.push(data) })
    await user.click(screen.getByRole('button', { name: /^Düğme\d+$/ }))
    const variant = HTML_VARIANTS.button.find((item) => item.id === 'arrow-dark-pill')
    const swatch = screen.getByText('Oklu koyu hap').closest('[title]')
    expect(swatch.innerHTML).toContain('Sonraki adım')
    expect(swatch.innerHTML).not.toContain('Next step')
    // A plain click: the test DndContext has no activation distance, so a
    // pointer-driven click would start a drag instead.
    fireEvent.click(swatch)
    expect(armed.at(-1)).toMatchObject({ type: 'button', preset: 'arrow-dark-pill', html: variant.htmlTr })
  })
})


// The keyboard has no spot to click on the canvas: Enter or Space on a swatch
// asks for the end of the page instead of arming a placement.
describe('Sidebar from the keyboard', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('pwb_language', 'en')
  })

  it('adds a component at the end of the page on Enter or Space', async () => {
    const user = userEvent.setup()
    const calls = []
    renderSidebar({ onArmPlacement: (data, options) => calls.push([data, options]) })
    const category = screen.getByRole('button', { name: /^Button\d+$/ })
    expect(category).toHaveAttribute('aria-expanded', 'false')
    await user.click(category)
    expect(screen.getByRole('button', { name: /^Button\d+$/ })).toHaveAttribute('aria-expanded', 'true')
    const swatch = screen.getAllByRole('button', { name: /: Enter adds it at the end of the page$/ })[0]

    fireEvent.keyDown(swatch, { key: 'Enter' })
    fireEvent.keyDown(swatch, { key: ' ' })
    fireEvent.keyDown(swatch, { key: 'Enter', repeat: true })
    fireEvent.keyDown(swatch, { key: 'a' })

    expect(calls).toHaveLength(2)
    expect(calls[0][0]).toMatchObject({ type: 'button' })
    expect(calls.every(([, options]) => options?.atEnd === true)).toBe(true)
  })

  it('reaches an HTML page\'s swatches by keyboard and asks for the end there too', async () => {
    const user = userEvent.setup()
    const picks = []
    renderSidebar({ onPickComponent: (type, html, options) => picks.push([type, options]) })
    await user.click(screen.getByRole('button', { name: /^Button\d+$/ }))
    const swatch = screen.getAllByRole('button', { name: /: Enter adds it at the end of the page$/ })[0]

    expect(swatch).toHaveAttribute('tabindex', '0')
    fireEvent.keyDown(swatch, { key: 'Enter' })

    expect(picks).toEqual([['button', { atEnd: true }]])
  })
})

describe('CustomBlockPanel placement', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('pwb_language', 'en')
  })

  it('places custom HTML below existing blocks on whichever viewport is active', async () => {
    const { selectCurrentPage, useEditorStore } = await import('../../store/editorStore.js')
    useEditorStore.getState().loadSchema({
      theme: {},
      pages: [{
        id: 'home',
        name: 'Home',
        mobileManual: true,
        components: [{
          id: 'b1',
          type: 'text',
          props: { text: 'Top' },
          styles: {},
          layout: { x: 24, y: 24, w: 300, h: 176 },
          mobileLayout: { x: 16, y: 40, w: 358, h: 360 },
        }],
      }],
    })

    const user = userEvent.setup()
    renderSidebar()
    await user.click(screen.getByRole('button', { name: /Custom HTML/ }))
    await user.click(screen.getByRole('button', { name: 'Place', exact: true }))

    const comps = selectCurrentPage(useEditorStore.getState()).components
    expect(comps).toHaveLength(2)
    expect(comps[1].layout.y).toBe(224)

    useEditorStore.getState().setViewport('mobile')
    await user.click(screen.getByRole('button', { name: 'Place', exact: true }))
    const afterMobile = selectCurrentPage(useEditorStore.getState()).components
    expect(afterMobile).toHaveLength(3)
    // PC place auto-stacked comps[1].mobileLayout at 416..776, so mobile Place stacks below it at 800.
    expect(afterMobile[2].mobileLayout.y).toBe(800)
  })
})
