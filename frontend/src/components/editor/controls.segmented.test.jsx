import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import LanguageProvider from '../../i18n/LanguageProvider.jsx'
import { ICON_NODES } from '../iconNodes.js'
import { LabeledAlign, LabeledNumber, SegmentedIconButtons } from './controls.jsx'

describe('SegmentedIconButtons and unit-aware inspector controls', () => {
  it('draws alignment segments from ICON_NODES with accessible names, aria-pressed and clear-on-reclick', () => {
    const onChange = vi.fn()
    const { container, rerender } = render(
      <SegmentedIconButtons
        label="Text align"
        value="center"
        allowClear
        onChange={onChange}
        options={[
          ['left', 'Align text left', 'alignLeft'],
          ['center', 'Align text center', 'alignCenter'],
          ['right', 'Align text right', 'alignRight'],
        ]}
      />,
    )

    const left = screen.getByRole('button', { name: 'Align text left' })
    const center = screen.getByRole('button', { name: 'Align text center' })
    const right = screen.getByRole('button', { name: 'Align text right' })

    expect(left).toHaveAttribute('aria-pressed', 'false')
    expect(center).toHaveAttribute('aria-pressed', 'true')
    expect(right).toHaveAttribute('aria-pressed', 'false')

    const centerPath = center.querySelector('svg path')?.getAttribute('d')
    expect(centerPath).toBe(ICON_NODES.alignCenter[0][1].d)
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/)

    fireEvent.click(right)
    expect(onChange).toHaveBeenLastCalledWith('right')

    // Re-clicking the active segment clears the override back to inherited ('').
    fireEvent.click(center)
    expect(onChange).toHaveBeenLastCalledWith('')

    rerender(
      <SegmentedIconButtons
        label="Text align"
        value="center"
        allowClear={false}
        onChange={onChange}
        options={[
          ['left', 'Align text left', 'alignLeft'],
          ['center', 'Align text center', 'alignCenter'],
          ['right', 'Align text right', 'alignRight'],
        ]}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Align text center' }))
    expect(onChange).toHaveBeenLastCalledWith('center')
  })

  it('renders an inline unit badge on LabeledNumber without polluting the accessible label or losing 0 vs empty', () => {
    const onChange = vi.fn()
    const { container } = render(
      <LabeledNumber
        label="Font size"
        unit="px"
        placeholder="auto"
        value={24}
        allowEmpty
        onChange={onChange}
      />,
    )

    const input = screen.getByRole('spinbutton', { name: 'Font size', exact: true })
    expect(input).toHaveValue(24)
    expect(input).toHaveAttribute('placeholder', 'auto')
    expect(container.textContent).toContain('px')

    fireEvent.change(input, { target: { value: '' } })
    expect(onChange).toHaveBeenLastCalledWith('')

    fireEvent.change(input, { target: { value: '0' } })
    expect(onChange).toHaveBeenLastCalledWith(0)
  })

  it('draws LabeledAlign buttons from shared ICON_NODES without hardcoded hex colours', () => {
    const onChange = vi.fn()
    const { container } = render(
      <LanguageProvider>
        <LabeledAlign
          label="Position"
          value="center"
          onChange={onChange}
          options={[
            ['left', 'Left'],
            ['center', 'Center'],
            ['right', 'Right'],
          ]}
        />
      </LanguageProvider>,
    )

    const center = screen.getByRole('button', { name: 'Center' })
    expect(center).toHaveAttribute('aria-pressed', 'true')
    expect(center.querySelector('svg rect')).not.toBeNull()
    expect(ICON_NODES.alignBoxCenter).toBeDefined()
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/)
  })
})
