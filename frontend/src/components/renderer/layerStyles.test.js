import { describe, expect, it } from 'vitest'
import { layerStyles } from './layerStyles.js'

describe('layerStyles', () => {
  it('lets a value the owner wrote take the place of the look', () => {
    expect(layerStyles(
      { borderWidth: '1px', borderStyle: 'solid', borderColor: '#60a5fa', color: '#1e40af' },
      { borderColor: '#ff0000', opacity: '0.5' },
    )).toEqual({ borderWidth: '1px', borderStyle: 'solid', borderColor: '#ff0000', color: '#1e40af', opacity: '0.5' })
  })

  it('drops the parts of the look a shorthand of the owner covers', () => {
    expect(layerStyles(
      { margin: 0, paddingLeft: '1.4em', borderLeftWidth: '4px', borderLeftStyle: 'solid', borderLeftColor: 'currentColor' },
      { padding: '8px', border: '2px dashed red' },
    )).toEqual({ margin: 0, padding: '8px', border: '2px dashed red' })
  })

  it('drops only the side values a border width, style or colour covers', () => {
    expect(layerStyles(
      { borderLeftWidth: '4px', borderLeftStyle: 'solid', borderLeftColor: 'currentColor' },
      { borderColor: '#0000ff' },
    )).toEqual({ borderLeftWidth: '4px', borderLeftStyle: 'solid', borderColor: '#0000ff' })
  })

  it('takes an emptied value for no value at all', () => {
    const look = { rowGap: '6px', paddingLeft: '1.4em', color: '#1e40af' }
    expect(layerStyles(look, undefined)).toEqual({ rowGap: '6px', paddingLeft: '1.4em', color: '#1e40af' })
    const layered = layerStyles(look, { padding: '', gap: undefined, color: null, opacity: 0 })
    expect(layered).toEqual({ rowGap: '6px', paddingLeft: '1.4em', color: '#1e40af', opacity: 0 })
    expect(Object.keys(layered)).toEqual(['rowGap', 'paddingLeft', 'color', 'opacity'])
  })

  it('leaves the look it was given as it was', () => {
    const look = { paddingLeft: '1.4em' }
    layerStyles(look, { padding: '8px' })
    expect(look).toEqual({ paddingLeft: '1.4em' })
  })
})
