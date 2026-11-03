// Review-only composition. Production components and API calls are unchanged.
// The extra batch panel keeps the real Theme controls reachable with a block
// selected; the product normally shows its Properties panel in that situation.
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import '../../src/index.css'
import '../../src/ui/motion.css'
import '../../src/ui/app-surface.css'
import LanguageProvider from '../../src/i18n/LanguageProvider.jsx'
import UiThemeProvider from '../../src/ui/UiThemeProvider.jsx'
import { markSurface } from '../../src/ui/surface.js'
import EditorPage from '../../src/pages/EditorPage.jsx'
import PreviewPage from '../../src/pages/PreviewPage.jsx'
import ColorModePanel from '../../src/components/editor/ColorModePanel.jsx'
import { ColorModeRoot } from '../../src/components/renderer/ColorMode.jsx'
import { ThemeToggle } from '../../src/components/renderer/components.jsx'
import { useColorMode } from '../../src/components/renderer/colorModeContext.js'
import { useEditorStore } from '../../src/store/editorStore.js'
import { colorModeFor } from '../../src/utils/colorMode.js'

const params = new URLSearchParams(window.location.search)
const mode = params.get('mode') || 'owner'
const siteId = params.get('siteId') || params.get('site')
const firstSlug = params.get('a') || 'review-a'
const nextSlug = params.get('b') || 'review-b'
markSurface(mode === 'bulk' ? '/editor/review' : '/site/review')

const panelStyle = {
  position: 'fixed', right: 12, top: 82, width: 350, maxHeight: 'calc(100vh - 96px)',
  overflow: 'auto', zIndex: 10000, padding: 16, border: '1px solid var(--studio-border)',
  borderRadius: 8, background: 'var(--studio-panel-raised)', color: 'var(--studio-text)',
}

function stateSummary(state) {
  return {
    currentPageId: state.currentPageId,
    selectedIds: state.selectedIds,
    viewport: state.viewport,
    dirty: state.dirty,
    pastLength: state.past.length,
    pages: state.schema.pages.map((page) => ({
      id: page.id, name: page.name, mode: page.mode, flowMode: !!page.flowMode,
      components: page.components.map((component, order) => ({
        id: component.id, type: component.type, order,
        layout: component.layout, mobileLayout: component.mobileLayout,
      })),
    })),
  }
}

export function ReviewBatchPanel() {
  const state = useEditorStore()
  return (
    <aside aria-label="Review batch panel" style={panelStyle}>
      <h1 style={{ fontSize: 16, fontWeight: 700 }}>Review batch panel</h1>
      <p style={{ fontSize: 12, marginBlock: 10 }}>
        Test composition: this extra real Theme panel stays reachable while the
        original heading is selected. Ctrl+Z belongs to the real editor.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <button type="button" className="studio-btn studio-btn-secondary" onClick={() => {
          state.selectPage('home')
          state.selectComponent('selected-heading')
        }}>Select original heading</button>
        <button type="button" className="studio-btn studio-btn-secondary" onClick={() => state.selectPage('flow')}>Select flow page</button>
      </div>
      <ColorModePanel />
      <h2 style={{ fontSize: 13, marginTop: 12 }}>Real editor store summary</h2>
      <pre data-testid="review-state" style={{ fontSize: 10, maxHeight: 190, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
        {JSON.stringify(stateSummary(state), null, 2)}
      </pre>
    </aside>
  )
}

export function BulkReview() {
  return <MemoryRouter initialEntries={[`/editor/${siteId}`]}>
    <Routes><Route path="/editor/:id" element={<EditorPage />} /></Routes>
    <ReviewBatchPanel />
  </MemoryRouter>
}

const visitorProps = {
  label: 'Review visitor theme', states: 'three', showLabel: 'on',
  lightLabel: 'Light', darkLabel: 'Dark', deviceLabel: 'Device',
}

export function OwnerState({ ownerStart }) {
  const context = useColorMode()
  return <pre data-testid="review-owner-state">{JSON.stringify({ ownerStart, palette: context.current, pick: context.pick }, null, 2)}</pre>
}

export function OwnerReview() {
  const [ownerStart, setOwnerStart] = useState('light')
  const page = { id: 'owner', components: [{ id: 'switch', type: 'themeToggle', props: visitorProps }] }
  const schema = { theme: { backgroundColor: '#ffffff' }, colorMode: { start: ownerStart }, pages: [page] }
  const paletteMode = colorModeFor(schema, page)
  return <main style={{ padding: 32 }}>
    <h1>Real ColorModeRoot and visitor switch</h1>
    <fieldset aria-label="Review owner controls" style={{ display: 'flex', gap: 12, marginBlock: 20 }}>
      <legend>Change the owner's start through UI</legend>
      <button type="button" className="studio-btn studio-btn-secondary" onClick={() => setOwnerStart('light')}>Owner starts light</button>
      <button type="button" className="studio-btn studio-btn-secondary" onClick={() => setOwnerStart('dark')}>Owner starts dark</button>
      <button type="button" className="studio-btn studio-btn-secondary" onClick={() => setOwnerStart('system')}>Owner starts device</button>
    </fieldset>
    <div data-testid="review-owner-preview" style={{ padding: 24, border: '1px solid var(--studio-border)' }}>
      <ColorModeRoot mode={paletteMode}>
        <ThemeToggle props={visitorProps} style={{ width: 320, height: 48 }} />
        <OwnerState ownerStart={ownerStart} />
      </ColorModeRoot>
    </div>
  </main>
}

export function ViewerControls() {
  const location = useLocation()
  return <aside aria-label="Review viewer controls" style={{ ...panelStyle, top: 'auto', bottom: 16, left: 16, right: 'auto', width: 240 }}>
    <p>Real PreviewPage, same mounted route</p>
    <output aria-label="Review route">{location.pathname}</output>
    <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
      <Link to={`/site/${nextSlug}`}>Review next site</Link>
      <Link to={`/site/${firstSlug}`}>Review previous site</Link>
    </div>
  </aside>
}

export function ViewerReview() {
  return <MemoryRouter initialEntries={[`/site/${firstSlug}`]}>
    <ViewerControls />
    <Routes><Route path="/site/:slug" element={<PreviewPage />} /></Routes>
  </MemoryRouter>
}

createRoot(document.getElementById('root')).render(
  <UiThemeProvider><LanguageProvider>
    {mode === 'bulk' ? <BulkReview /> : mode === 'viewer' ? <ViewerReview /> : <OwnerReview />}
  </LanguageProvider></UiThemeProvider>,
)
