import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CodeProjectPage from './CodeProjectPage.jsx'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../ui/UiThemeProvider.jsx'
import { useProjectStore } from '../store/projectStore.js'

// The classification is page logic. Keep the store, filesystem marker scan and
// HTML detection real; the rich editing surface is outside this test's scope.
vi.mock('../components/editor/HtmlWorkspace.jsx', () => ({ default: () => <div /> }))

function openProject(rootHtml, nestedHtml) {
  const entries = [
    { path: 'assets/index.html', name: 'index.html', kind: 'html', content: nestedHtml },
    { path: 'index.html', name: 'index.html', kind: 'html', content: rootHtml },
  ]
  const rootHandle = {
    name: 'classification-site',
    async *values() {},
    async getFileHandle() { throw new DOMException('Missing', 'NotFoundError') },
  }
  useProjectStore.getState().setProject({ rootHandle, files: entries })
  return rootHandle
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
})
afterEach(() => useProjectStore.getState().closeProject())

describe('local project classification', () => {
  it('classifies the root app rather than an earlier static nested index', async () => {
    openProject('<script type="module" src="/src/main.tsx"></script>', '<h1>Static documentation</h1>')
    render(<MemoryRouter><UiThemeProvider><LanguageProvider><CodeProjectPage /></LanguageProvider></UiThemeProvider></MemoryRouter>)
    expect(await screen.findByText('Bundled app project.')).toBeInTheDocument()
  })

  it('keeps a static root classified as static when a nested index is a template', async () => {
    openProject('<h1>Static home</h1>', '<body>{% block content %}{% endblock %}</body>')
    await act(async () => {
      render(<MemoryRouter><UiThemeProvider><LanguageProvider><CodeProjectPage /></LanguageProvider></UiThemeProvider></MemoryRouter>)
    })
    expect(screen.queryByText('Server template project.')).not.toBeInTheDocument()
    expect(screen.queryByText(/Its pages are built\/served at runtime/)).not.toBeInTheDocument()
  })
})
