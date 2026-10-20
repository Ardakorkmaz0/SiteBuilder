import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import { LinksEditor } from '../components/editor/controls.jsx'
import { installFocusRescue } from './focusRescue.js'

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))
let uninstall
afterEach(() => uninstall?.())

function Links() {
  const [links, setLinks] = useState([{ label: 'Only link', href: '#top' }])
  return <LanguageProvider><LinksEditor label="Navigation" value={links} onChange={setLinks} /></LanguageProvider>
}

// A real removal path (round 10 review): Remove takes its row away at once,
// and the keyboard landed on the page body although "+ Add link" was right there.
describe('removing the last link with the keyboard', () => {
  it('leaves focus on the link list', async () => {
    localStorage.setItem('pwb_language', 'en')
    render(<Links />)
    uninstall = installFocusRescue(document)
    const user = userEvent.setup()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Remove', exact: true })).toHaveFocus()
    await user.keyboard('{Enter}')
    await settle()
    expect(screen.queryByRole('button', { name: 'Remove', exact: true })).toBeNull()
    expect(screen.getByRole('button', { name: '+ Add link', exact: true })).toHaveFocus()
  })
})
