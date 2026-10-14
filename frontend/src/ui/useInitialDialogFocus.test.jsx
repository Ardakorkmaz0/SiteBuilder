// A modal dialog takes the keyboard when it opens, unless a field in it did.
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { useInitialDialogFocus } from './useInitialDialogFocus.js'

function Dialog({ open, withField = false }) {
  const ref = useInitialDialogFocus(open)
  if (!open) return null
  return (
    <div ref={ref} tabIndex={-1} role="dialog" aria-label="Settings">
      {withField ? <input aria-label="Name" autoFocus /> : <button type="button">Close</button>}
    </div>
  )
}

function Page(props) {
  return <><button type="button">Open</button><Dialog {...props} /></>
}

afterEach(cleanup)

describe('useInitialDialogFocus', () => {
  it('moves focus from the button behind into the dialog', () => {
    const { getByRole, rerender } = render(<Page open={false} />)
    getByRole('button', { name: 'Open' }).focus()

    rerender(<Page open />)

    expect(document.activeElement).toBe(getByRole('dialog', { name: 'Settings' }))
  })

  it('leaves a field the dialog focused itself alone', () => {
    const { getByRole, rerender } = render(<Page open={false} withField />)
    getByRole('button', { name: 'Open' }).focus()

    rerender(<Page open withField />)

    expect(document.activeElement).toBe(getByRole('textbox', { name: 'Name' }))
  })
})
