import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import { AccountChips } from './adminUi.jsx'

beforeEach(() => { localStorage.setItem('pwb_language', 'tr') })

// 'Admin' is also the console's own name ("Yönetim"); the role has its own key.
describe('an account badge', () => {
  it('calls an admin account Admin', () => {
    render(<LanguageProvider><AccountChips account={{ is_staff: true, is_superuser: false, is_active: true }} /></LanguageProvider>)
    expect(screen.getByText('Admin', { exact: true })).toBeInTheDocument()
    expect(screen.queryByText('Yönetim')).not.toBeInTheDocument()
  })
})
