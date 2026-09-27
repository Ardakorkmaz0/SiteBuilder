// Who may open this project — the owner's side of it.
//
// The link used to be the whole story: holding the address was permission,
// and there was no way back short of replacing it and telling everyone the
// new one. These pin the three states, and that naming people is a list the
// owner can add to and take from.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../../ui/UiThemeProvider.jsx'
import SharePanel from './SharePanel.jsx'
import { getShareState, setShareState } from '../../api/sites.js'

vi.mock('../../api/sites.js', () => ({
  getShareState: vi.fn(),
  setShareState: vi.fn(),
}))

const LINK = 'https://sitebuilder.test/review/abc'

// The answer arrives after the panel draws; until then no choice is shown as
// made, so a slow network cannot show "Not shared" for a shared project.
it('shows no choice as made until the sharing state has loaded', async () => {
  let resolve
  getShareState.mockReturnValue(new Promise((done) => { resolve = done }))
  renderPanel()

  expect(screen.getAllByRole('radio').filter((radio) => radio.checked)).toHaveLength(0)

  resolve({ mode: 'link', review_token: 'abc', people: [] })
  await waitFor(() => expect(screen.getByRole('radio', { name: /Anyone with the link/ })).toBeChecked())
})

function renderPanel() {
  return render(
    <UiThemeProvider>
      <LanguageProvider>
        <SharePanel siteId={7} reviewUrl={LINK} onCopy={vi.fn()} copied="" />
      </LanguageProvider>
    </UiThemeProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  getShareState.mockResolvedValue({ mode: 'link', review_token: 'abc', people: [] })
  setShareState.mockImplementation(async (_id, payload) => ({
    mode: payload.mode || 'people',
    review_token: 'abc',
    people: payload.add ? [{ id: 3, username: 'bob', display_name: 'Bob' }] : [],
  }))
})

describe('the owner choosing who gets in', () => {
  it('shows the link and the state it is in', async () => {
    renderPanel()

    expect(await screen.findByLabelText('Share link')).toHaveValue(LINK)
    await waitFor(() => expect(screen.getByRole('radio', { name: /Anyone with the link/ })).toBeChecked())
  })

  it('narrows it to named people, and only then asks for names', async () => {
    renderPanel()
    await waitFor(() => expect(screen.getByRole('radio', { name: /Anyone with the link/ })).toBeChecked())

    // The invite box belongs to that mode; showing it earlier would suggest
    // the names mean something while the link is open to everyone.
    expect(screen.queryByLabelText('Add someone by username')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: /Only people you name/ }))

    await waitFor(() => expect(setShareState).toHaveBeenCalledWith(7, { mode: 'people' }))
    expect(await screen.findByLabelText('Add someone by username')).toBeInTheDocument()
    expect(screen.getByText('Nobody yet — only you can open it.')).toBeInTheDocument()
  })

  it('adds a person by username and lists them', async () => {
    getShareState.mockResolvedValue({ mode: 'people', review_token: 'abc', people: [] })
    renderPanel()

    fireEvent.change(await screen.findByLabelText('Add someone by username'), { target: { value: 'bob' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() => expect(setShareState).toHaveBeenCalledWith(7, { add: 'bob' }))
    expect(await screen.findByText(/Bob/)).toBeInTheDocument()
  })

  it('takes a person back off the list', async () => {
    getShareState.mockResolvedValue({
      mode: 'people', review_token: 'abc', people: [{ id: 3, username: 'bob', display_name: 'Bob' }],
    })
    renderPanel()

    fireEvent.click(await screen.findByRole('button', { name: 'Remove' }))

    await waitFor(() => expect(setShareState).toHaveBeenCalledWith(7, { remove: 3 }))
  })

  it('closes sharing without touching the address', async () => {
    renderPanel()
    // The link field is there at once; the choice is only real once loaded.
    await waitFor(() => expect(screen.getByRole('radio', { name: /Anyone with the link/ })).toBeChecked())

    fireEvent.click(screen.getByRole('radio', { name: /Not shared/ }))

    await waitFor(() => expect(setShareState).toHaveBeenCalledWith(7, { mode: 'off' }))
    // Still the same link, ready for when they turn it back on.
    expect(screen.getByLabelText('Share link')).toHaveValue(LINK)
  })

  // The server's own words when it has them — "no account with that username"
  // is worth more than a generic failure.
  it('says what the server said when the change did not go through', async () => {
    setShareState.mockRejectedValue({ response: { data: { detail: 'No account with that username.' } } })
    getShareState.mockResolvedValue({ mode: 'people', review_token: 'abc', people: [] })
    renderPanel()

    fireEvent.change(await screen.findByLabelText('Add someone by username'), { target: { value: 'nobody' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No account with that username.')
  })
})
