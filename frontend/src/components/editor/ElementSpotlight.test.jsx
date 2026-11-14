import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import ElementSpotlight from './ElementSpotlight.jsx'
import { useEditorStore } from '../../store/editorStore.js'
import { describeElement } from '../../utils/htmlElementEdit.js'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  useEditorStore.getState().setViewport('pc')
})

describe('ElementSpotlight', () => {
  it('follows the HTML workspace viewport instead of the canvas store and syncs width switches with HtmlElementPanel', async () => {
    const doc = new DOMParser().parseFromString(
      '<!doctype html><html><body><h1 id="title" style="font-size:28px;color:#111111">Heading</h1></body></html>',
      'text/html',
    )
    const el = doc.getElementById('title')
    const info = describeElement(el)
    const onChange = vi.fn()

    render(
      <LanguageProvider>
        <ElementSpotlight
          open
          element={el}
          info={info}
          viewport="mobile"
          pages={[]}
          onChange={onChange}
          onClose={vi.fn()}
        />
      </LanguageProvider>,
    )

    expect(screen.getByRole('button', { name: /Phone/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Desktop/ })).toHaveAttribute('aria-pressed', 'false')

    await userEvent.setup().click(screen.getByRole('tab', { name: 'Design' }))
    expect(screen.getByText(/Style edits here apply to MOBILE only/i)).toBeInTheDocument()

    const sizeInput = screen.getByLabelText('Font size (px)')
    fireEvent.change(sizeInput, { target: { value: '19' } })
    expect(onChange).toHaveBeenLastCalledWith({ fontSize: 19 }, { viewport: 'mobile' })

    await userEvent.setup().click(screen.getByRole('button', { name: /Desktop/ }))
    expect(screen.queryByText(/Style edits here apply to MOBILE only/i)).toBeNull()

    fireEvent.change(screen.getByLabelText('Font size (px)'), { target: { value: '36' } })
    expect(onChange).toHaveBeenLastCalledWith({ fontSize: 36 }, { viewport: 'pc' })
  })
})
