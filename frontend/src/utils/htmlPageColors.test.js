import { describe, expect, it } from 'vitest'
import { pageColors, parseColor, replacePageColor } from './htmlPageColors.js'

const page = `<!DOCTYPE html><html><head><style>
  :root { --brand: #e8543f; }
  body { background: #fff; color: rgb(17, 17, 17); font-family: "Red Hat Display", sans-serif; white-space: normal; }
  a:hover { color: #E8543F; }
  .card { background-color: white; box-shadow: 0 4px 12px rgba(17, 17, 17, 0.12); background-image: url(img/bg.png#fff); }
</style></head><body>
  <a href="#add">Add</a>
  <p>Our colour is #fff and we love it.</p>
  <div style="border: 1px solid #ffffff; color: hsl(0, 0%, 6.7%)">Card</div>
  <svg><path fill="#e8543f" stroke-width="2" d="M0 0"/></svg>
</body></html>`

describe('parseColor', () => {
  it('reads hex, rgb, hsl and names into one form', () => {
    expect(parseColor('#FFF')).toEqual({ rgb: '#ffffff', alpha: 1 })
    expect(parseColor('#11111180')).toEqual({ rgb: '#111111', alpha: 128 / 255 })
    expect(parseColor('rgb(255 255 255)')).toEqual({ rgb: '#ffffff', alpha: 1 })
    expect(parseColor('rgba(17, 17, 17, 0.12)')).toEqual({ rgb: '#111111', alpha: 0.12 })
    expect(parseColor('hsl(0, 0%, 100%)')).toEqual({ rgb: '#ffffff', alpha: 1 })
    expect(parseColor('white')).toEqual({ rgb: '#ffffff', alpha: 1 })
    expect(parseColor('rgb(var(--x))')).toBeNull()
  })
})

describe('pageColors', () => {
  it('lists the colours the CSS uses, most used first, one entry per colour', () => {
    expect(pageColors(page)).toEqual([
      { color: '#111111', count: 3 },
      { color: '#e8543f', count: 3 },
      { color: '#ffffff', count: 3 },
    ])
  })

  it('reads nothing outside CSS: links, text, file names and font names', () => {
    const colors = pageColors('<a href="#add">x</a><p>#fff red</p><style>h1{font-family:"Red Hat";background:url(a.png#abc)}</style>')
    expect(colors).toEqual([])
  })
})

describe('replacePageColor', () => {
  it('swaps one colour everywhere it is written, keeping each place its transparency', () => {
    const next = replacePageColor(page, '#111111', '#1e3a8a')
    expect(next).toContain('color: #1e3a8a; font-family')
    expect(next).toContain('rgba(30, 58, 138, 0.12)')
    expect(next).toContain('color: #1e3a8a">Card')
    expect(pageColors(next).find((entry) => entry.color === '#111111')).toBeUndefined()
    expect(pageColors(next)).toContainEqual({ color: '#1e3a8a', count: 3 })
  })

  it('reaches variables and SVG colours, and leaves links, text and other colours alone', () => {
    const next = replacePageColor(page, '#e8543f', '#2563eb')
    expect(next).toContain('--brand: #2563eb')
    expect(next).toContain('a:hover { color: #2563eb')
    expect(next).toContain('<path fill="#2563eb" stroke-width="2"')
    expect(next).toContain('href="#add"')
    expect(next).toContain('Our colour is #fff and we love it.')
    expect(next).toContain('url(img/bg.png#fff)')
    expect(next).toContain('font-family: "Red Hat Display"')
    expect(next).toContain('background: #fff')
  })

  it('treats every spelling of a colour as the same colour', () => {
    const next = replacePageColor(page, '#ffffff', '#fdf6ec')
    expect(next).toContain('background: #fdf6ec')
    expect(next).toContain('background-color: #fdf6ec')
    expect(next).toContain('border: 1px solid #fdf6ec')
  })
})
