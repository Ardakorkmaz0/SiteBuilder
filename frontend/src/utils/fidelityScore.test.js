import { describe, expect, it } from 'vitest'
import { scoreFidelity } from './fidelityScore.js'

const word = (t, x, y, run = 0, w = 40) => ({ t, x, y, w, h: 20, run })

describe('scoreFidelity', () => {
  it('counts every word in place when the converted page draws it where the original did', () => {
    const page = { words: [word('Fresh', 10, 10), word('bread', 60, 10), word('daily', 110, 10)] }
    const moved = { words: [word('Fresh', 12, 11), word('bread', 62, 11), word('daily', 112, 11)] }

    expect(scoreFidelity(page, moved)).toMatchObject({ words: 3, found: 1, near: 1, close: 1, median: 2, missing: [], worst: [] })
  })

  it('tells words that moved a little from words that moved far, and names the far ones', () => {
    const page = { words: [word('One', 0, 0), word('two', 50, 0), word('three', 100, 0), word('four', 150, 0)] }
    const drawn = { words: [word('One', 0, 0), word('two', 60, 0), word('three', 100, 40), word('four', 150, 0)] }

    const score = scoreFidelity(page, drawn)
    expect(score).toMatchObject({ near: 0.5, close: 0.75, found: 1 })
    expect(score.worst).toEqual([{ t: 'three', from: [100, 0], to: [100, 40] }])
  })

  it('pairs a repeated word by the words around it, not by whichever copy is nearest', () => {
    // "the" twice. The first one moved down to where the second used to be;
    // matched by its neighbours it is out of place, matched by nearness alone
    // the page would look perfect.
    const page = { words: [word('in', 0, 0, 1), word('the', 30, 0, 1), word('end', 70, 0, 1), word('of', 0, 40, 2), word('the', 30, 40, 2), word('day', 70, 40, 2)] }
    const drawn = { words: [word('in', 0, 40, 1), word('the', 30, 40, 1), word('end', 70, 40, 1), word('of', 0, 80, 2), word('the', 30, 80, 2), word('day', 70, 80, 2)] }

    expect(scoreFidelity(page, drawn).near).toBe(0)
  })

  it('counts a word the converted page lost as missing', () => {
    const page = { words: [word('Kept', 0, 0), word('Lost', 50, 0)] }
    const drawn = { words: [word('Kept', 0, 0)] }

    expect(scoreFidelity(page, drawn)).toMatchObject({ found: 0.5, near: 0.5, missing: ['Lost'] })
  })

  it('does not count a word drawn in another size as in place', () => {
    const page = { words: [word('Title', 0, 0, 0, 100)] }
    const drawn = { words: [word('Title', 0, 0, 0, 60)] }

    expect(scoreFidelity(page, drawn)).toMatchObject({ found: 1, near: 0, close: 1 })
  })

  it('does not count a picture drawn at another size as in place', () => {
    const page = { words: [], images: [{ src: 'a.png', x: 0, y: 0, w: 300, h: 200 }] }
    const drawn = { words: [], images: [{ src: 'a.png', x: 0, y: 0, w: 1, h: 1 }] }

    expect(scoreFidelity(page, drawn).imagesNear).toBe(0)
  })

  it('checks each picture by its source and place', () => {
    const page = { words: [], images: [{ src: 'a.png', x: 0, y: 0, w: 100, h: 100 }, { src: 'b.png', x: 0, y: 200, w: 100, h: 100 }] }
    const drawn = { words: [], images: [{ src: 'a.png', x: 2, y: 2, w: 100, h: 100 }, { src: 'b.png', x: 0, y: 400, w: 100, h: 100 }] }

    expect(scoreFidelity(page, drawn)).toMatchObject({ images: 2, imagesNear: 0.5 })
  })
})
