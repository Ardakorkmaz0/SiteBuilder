import { afterEach, describe, expect, it } from 'vitest'
import { dropCoordinates } from './dropCoordinates.js'

let root
function fixture() {
  root = document.createElement('div')
  root.dataset.builderFitScale = '0.125'
  root.innerHTML = '<div id="canvas" data-builder-canvas-scale="0.5" data-builder-fit-scale="0.2"><div data-builder-fit-scale="0.5"><div id="plain"><div id="target" data-builder-fit-scale="0.5333333333333333"></div></div></div></div>'
  document.body.appendChild(root)
  const canvas = root.querySelector('#canvas')
  const target = root.querySelector('#target')
  target.getBoundingClientRect = () => ({ left: 50, top: 10 })
  return { canvas, target, plain: root.querySelector('#plain') }
}
afterEach(() => root?.remove())

describe('nested canvas drop coordinates', () => {
  it('combines local fits and zoom once, crossing plain wrappers and stopping at the canvas', () => {
    const { canvas, target } = fixture()
    expect(dropCoordinates(target, 90, 18, canvas)).toEqual({ x: 300, y: 60 })
  })

  it('uses a caller-provided canvas zoom instead of multiplying its stored value again', () => {
    const { canvas, target } = fixture()
    canvas.dataset.builderCanvasScale = '0.25'
    expect(dropCoordinates(target, 90, 18, canvas, 0.5)).toEqual({ x: 300, y: 60 })
  })

  for (const value of ['0', '-2', 'invalid', 'Infinity']) {
    it(`ignores an invalid nested fit of ${value}`, () => {
      const { canvas, target, plain } = fixture()
      plain.dataset.builderFitScale = value
      expect(dropCoordinates(target, 90, 18, canvas)).toEqual({ x: 300, y: 60 })
    })
  }

  it('falls back to one for invalid canvas zoom values', () => {
    const { canvas, target } = fixture()
    for (const value of ['0', '-2', 'invalid', 'Infinity']) {
      canvas.dataset.builderCanvasScale = value
      expect(dropCoordinates(target, 130, 26, canvas)).toEqual({ x: 300, y: 60 })
    }
  })

  it('does not collect fit markers from a target outside the supplied canvas', () => {
    const { canvas } = fixture()
    const outside = document.createElement('div')
    outside.dataset.builderFitScale = '2'
    outside.getBoundingClientRect = () => ({ left: 50, top: 10 })
    root.appendChild(outside)
    expect(dropCoordinates(outside, 90, 18, canvas)).toEqual({ x: 80, y: 16 })
  })
})
