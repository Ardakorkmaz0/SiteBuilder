import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import { applyElementPatch, describeElement } from '../../utils/htmlElementEdit.js'
import HtmlElementPanel from './HtmlElementPanel.jsx'

async function openGradient(markup = '<section id="hero">Hero</section>') {
  localStorage.clear()
  localStorage.setItem('pwb_language', 'en')
  document.body.innerHTML = markup
  const element = document.getElementById('hero')
  function ConnectedPanel() {
    const [info, setInfo] = useState(() => describeElement(element))
    return (
      <HtmlElementPanel info={info} onChange={(patch) => {
        applyElementPatch(element, patch)
        setInfo(describeElement(element))
      }} />
    )
  }
  render(<LanguageProvider><ConnectedPanel /></LanguageProvider>)
  const user = userEvent.setup()
  await user.click(screen.getByRole('tab', { name: 'Design' }))
  await user.click(screen.getByRole('button', { name: 'Background image & gradient' }))
  return { element, user }
}

describe('connected HTML gradient controls', () => {
  it('applies the first ending-colour selection and keeps the selected swatch', async () => {
    const { element } = await openGradient()
    const picker = screen.getByLabelText('Pick a colour: Gradient to')
    fireEvent.change(picker, { target: { value: '#2563eb' } })

    expect(element.style.backgroundImage).toBe('linear-gradient(160deg, rgb(255, 255, 255), rgb(37, 99, 235))')
    expect(picker).toHaveValue('#2563eb')
    expect(screen.getByRole('textbox', { name: 'Gradient to', exact: true })).toHaveValue('#2563eb')
    expect(screen.getByRole('textbox', { name: 'Gradient from', exact: true })).toHaveValue('#ffffff')
  })

  it('preserves the chosen ending colour while changing the start and angle through a document roundtrip', async () => {
    const { element, user } = await openGradient()
    fireEvent.change(screen.getByLabelText('Pick a colour: Gradient to'), { target: { value: '#2563eb' } })
    const from = screen.getByRole('textbox', { name: 'Gradient from', exact: true })
    await user.click(from)
    await user.keyboard('{Control>}a{/Control}')
    await user.paste('#e11d48')
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Gradient angle (deg)' }), { target: { value: '45' } })

    expect(screen.getByLabelText('Pick a colour: Gradient to')).toHaveValue('#2563eb')
    expect(element.style.getPropertyPriority('background-image')).toBe('important')
    const restored = new DOMParser().parseFromString(element.outerHTML, 'text/html').getElementById('hero')
    expect(describeElement(restored)).toMatchObject({
      gradientFrom: '#e11d48', gradientTo: '#2563eb', gradientAngle: 45,
    })
  })

  it('updates the ending colour of an imported stylesheet gradient without resetting its start or angle', async () => {
    const { element } = await openGradient('<style>#hero { background-image: linear-gradient(35deg, #e11d48, #16a34a) !important; }</style><section id="hero">Hero</section>')
    expect(screen.getByRole('textbox', { name: 'Gradient from', exact: true })).toHaveValue('#e11d48')
    fireEvent.change(screen.getByLabelText('Pick a colour: Gradient to'), { target: { value: '#2563eb' } })

    expect(element.style.backgroundImage).toBe('linear-gradient(35deg, rgb(225, 29, 72), rgb(37, 99, 235))')
    expect(screen.getByRole('textbox', { name: 'Gradient from', exact: true })).toHaveValue('#e11d48')
    expect(screen.getByRole('spinbutton', { name: 'Gradient angle (deg)' })).toHaveValue(35)
  })
})
