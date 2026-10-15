// The element panel edits live DOM nodes through these helpers — a bug here
// means clicking "Move up" reorders the wrong node or a colour patch wipes
// the element's text. Pure DOM in/out, so jsdom covers them directly.
import { beforeEach, describe, expect, it } from 'vitest'
import {
  applyElementPatch,
  applyMobileElementPatch,
  bindLinkToTarget,
  clearMobileElementStyles,
  cssColorToHex,
  describeElement,
  duplicateElement,
  elementLinkHref,
  ensureAnchor,
  ensureElementId,
  linkSectionsInDocument,
  moveElement,
  nearestAnchor,
  reorderToPoint,
  resolveSelectableElement,
  selectableParent,
  setElementLink,
} from './htmlElementEdit.js'
import { closestPlaceableBlock, insertPositionForY, serializeDocument } from './htmlPlacement.js'

beforeEach(() => {
  document.head.querySelector('style[data-pwb-responsive-overrides]')?.remove()
  document.body.innerHTML = `
    <section id="hero">
      <h1 id="title">Hello <strong id="bold">world</strong></h1>
      <p id="para">Some text</p>
      <a id="link" href="#contact">Contact</a>
      <img id="pic" src="a.png" alt="A picture" />
    </section>
    <section id="second"><p>2nd</p></section>
  `
})

describe('resolveSelectableElement', () => {
  it('returns the clicked element itself for normal elements', () => {
    const p = document.getElementById('para')
    expect(resolveSelectableElement(p, document.body)).toBe(p)
  })

  it('climbs out of inline formatting wrappers to the content element', () => {
    const bold = document.getElementById('bold')
    expect(resolveSelectableElement(bold, document.body)).toBe(document.getElementById('title'))
  })

  it('returns null for body / html / null', () => {
    expect(resolveSelectableElement(document.body, document.body)).toBeNull()
    expect(resolveSelectableElement(document.documentElement, document.body)).toBeNull()
    expect(resolveSelectableElement(null, document.body)).toBeNull()
  })
})

describe('cssColorToHex', () => {
  it('converts rgb() to hex', () => {
    expect(cssColorToHex('rgb(37, 99, 235)')).toBe('#2563eb')
    expect(cssColorToHex('rgb(0, 0, 0)')).toBe('#000000')
  })

  it('treats transparent values as empty', () => {
    expect(cssColorToHex('rgba(0, 0, 0, 0)')).toBe('')
    expect(cssColorToHex('transparent')).toBe('')
    expect(cssColorToHex('')).toBe('')
  })

  it('passes hex values through', () => {
    expect(cssColorToHex('#ff0000')).toBe('#ff0000')
  })
})

describe('describeElement', () => {
  it('describes a link with href and editable text', () => {
    const info = describeElement(document.getElementById('link'))
    expect(info.tag).toBe('a')
    expect(info.href).toBe('#contact')
    expect(info.canEditText).toBe(true)
    expect(info.text).toBe('Contact')
  })

  it('describes an image with src/alt and no text editing', () => {
    const info = describeElement(document.getElementById('pic'))
    expect(info.tag).toBe('img')
    expect(info.src).toBe('a.png')
    expect(info.alt).toBe('A picture')
    expect(info.canEditText).toBe(false)
  })

  it('treats inline-formatting-only children as text-editable', () => {
    // <h1>Hello <strong>world</strong></h1> → editing flattens the strong,
    // which beats hiding the text field for the most common heading shape.
    const info = describeElement(document.getElementById('title'))
    expect(info.canEditText).toBe(true)
    expect(info.text).toBe('Hello world')
  })

  it('marks elements with block children as not text-editable', () => {
    const info = describeElement(document.getElementById('hero'))
    expect(info.canEditText).toBe(false)
  })

  it('reports the selectable parent + ancestor trail', () => {
    const para = describeElement(document.getElementById('para'))
    expect(para.hasParent).toBe(true)
    expect(para.parentTag).toBe('section')
    expect(para.ancestors).toEqual(['section'])
    // A top-level section's parent is <body> → no selectable parent.
    const hero = describeElement(document.getElementById('hero'))
    expect(hero.hasParent).toBe(false)
    expect(hero.ancestors).toEqual([])
  })

  it('reports the active phone values for effects and stacking without changing PC inspector values', () => {
    const p = document.getElementById('para')
    applyElementPatch(p, { opacity: 0.8, boxShadow: '0 1px 3px rgba(0,0,0,0.15)', overflow: 'hidden', borderStyle: 'solid', zIndex: 3 })
    applyMobileElementPatch(p, { opacity: 0.4, boxShadow: 'none', overflow: 'visible', borderStyle: 'none', zIndex: 9 })
    const winAtWidth = (width) => ({ innerWidth: width, getComputedStyle: (el) => window.getComputedStyle(el) })
    const phone = describeElement(p, winAtWidth(390))
    expect([phone.opacity, phone.boxShadow, phone.overflow, phone.borderStyle, phone.zIndex]).toEqual([0.4, 'none', 'visible', 'none', 9])
    const pc = describeElement(p, winAtWidth(1024))
    expect([pc.opacity, pc.boxShadow, pc.overflow, pc.borderStyle, pc.zIndex]).toEqual([0.8, '0 1px 3px rgba(0,0,0,0.15)', 'hidden', 'solid', 3])
  })
})

describe('applyElementPatch', () => {
  it('updates text for leaf and inline-formatted elements, never blocks', () => {
    const p = document.getElementById('para')
    applyElementPatch(p, { text: 'New text' })
    expect(p.textContent).toBe('New text')
    const h1 = document.getElementById('title')
    applyElementPatch(h1, { text: 'Flat headline' })
    expect(h1.textContent).toBe('Flat headline')
    const hero = document.getElementById('hero')
    applyElementPatch(hero, { text: 'nope' })
    expect(hero.querySelector('p')).not.toBeNull() // block children survived
  })

  it('round-trips textarea newlines as safe br elements', () => {
    const p = document.getElementById('para')
    applyElementPatch(p, { text: 'First line\nSecond <line>' })

    expect(p.innerHTML).toBe('First line<br>Second &lt;line&gt;')
    expect(describeElement(p).text).toBe('First line\nSecond <line>')
  })

  it('updates href / src / alt on the right tags only', () => {
    const a = document.getElementById('link')
    applyElementPatch(a, { href: '/about' })
    expect(a.getAttribute('href')).toBe('/about')
    const img = document.getElementById('pic')
    applyElementPatch(img, { src: 'b.png', alt: 'B' })
    expect(img.getAttribute('src')).toBe('b.png')
    expect(img.getAttribute('alt')).toBe('B')
  })

  it('alignBlock sets auto side margins and round-trips via describeElement', () => {
    const p = document.getElementById('para')
    applyElementPatch(p, { alignBlock: 'right' })
    expect(p.style.marginLeft).toBe('auto')
    expect(p.style.marginRight).toBe('0px')
    expect(describeElement(p).alignBlock).toBe('right')

    applyElementPatch(p, { alignBlock: 'center' })
    expect(p.style.marginLeft).toBe('auto')
    expect(p.style.marginRight).toBe('auto')
    expect(describeElement(p).alignBlock).toBe('center')

    applyElementPatch(p, { alignBlock: 'left' })
    expect(p.style.marginRight).toBe('auto')
    expect(describeElement(p).alignBlock).toBe('left')

    applyElementPatch(p, { alignBlock: '' })
    expect(p.style.marginLeft).toBe('')
    expect(p.style.marginRight).toBe('')
    expect(describeElement(p).alignBlock).toBe('')
  })

  it('alignBlock promotes inline elements to a shrink-wrapped block', () => {
    const a = document.getElementById('link') // <a> computes as inline in jsdom
    applyElementPatch(a, { alignBlock: 'center' })
    expect(a.style.display).toBe('block')
    expect(a.style.width).toBe('fit-content')
  })

  it('sets and clears inline styles', () => {
    const p = document.getElementById('para')
    applyElementPatch(p, { fontSize: 24, color: '#ff0000', textAlign: 'center', fontWeight: '700' })
    expect(p.style.fontSize).toBe('24px')
    expect(p.style.textAlign).toBe('center')
    expect(p.style.fontWeight).toBe('700')
    applyElementPatch(p, { fontSize: 0, color: '', textAlign: '' })
    expect(p.style.fontSize).toBe('')
    expect(p.style.color).toBe('')
    expect(p.style.textAlign).toBe('')
  })

  it('leaves keys that are not in the patch untouched', () => {
    const p = document.getElementById('para')
    applyElementPatch(p, { color: '#00ff00' })
    expect(p.textContent).toBe('Some text')
    expect(p.style.color).toBeTruthy()
  })

  it('lets the basic panel controls override an imported important rule', () => {
    const p = document.getElementById('para')
    applyElementPatch(p, {
      fontSize: 32, fontWeight: '700', textAlign: 'center', color: '#ff0000',
      background: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    })
    // Template styles commonly use !important. A normal inline declaration
    // loses to them, so the input immediately jumps back to its previous value.
    for (const name of ['font-size', 'font-weight', 'text-align', 'color', 'background-color', 'display', 'justify-content', 'align-items']) {
      expect(p.style.getPropertyPriority(name), name).toBe('important')
    }
  })
})

describe('duplicateElement / moveElement', () => {
  it('duplicates an element right after itself', () => {
    const p = document.getElementById('para')
    const clone = duplicateElement(p)
    expect(p.nextElementSibling).toBe(clone)
    expect(clone.textContent).toBe('Some text')
  })

  it('moves an element up and down among its siblings', () => {
    const p = document.getElementById('para')
    expect(moveElement(p, 'up')).toBe(true)
    expect(p.nextElementSibling?.id).toBe('title')
    expect(moveElement(p, 'down')).toBe(true)
    expect(p.previousElementSibling?.id).toBe('title')
  })

  it('returns false at the edges', () => {
    const title = document.getElementById('title')
    expect(moveElement(title, 'up')).toBe(false)
    const pic = document.getElementById('pic')
    expect(moveElement(pic, 'down')).toBe(false)
  })
})

// An id names one element: a link to "#contact" goes to the first of two.
describe('a copy of a block has ids of its own', () => {
  it('renames the ids in the copy, and what points at them from inside the copy follows', () => {
    document.body.innerHTML = `
      <section id="hero"><h1>Hi</h1></section>
      <section id="contact">
        <label for="email">E-mail</label><input id="email" aria-describedby="hint email">
        <p id="hint">We never share it</p>
        <a id="again" href="#contact">Back to the form</a>
        <a id="up" href="#hero">Up</a>
        <svg><defs><linearGradient id="g"></linearGradient></defs><rect fill="url(#g)"></rect></svg>
      </section>`
    const original = document.getElementById('contact')
    const copy = duplicateElement(original)

    expect(copy.id).toBe('contact-2')
    expect(copy.querySelector('input').id).toBe('email-2')
    expect(copy.querySelector('label').getAttribute('for')).toBe('email-2')
    expect(copy.querySelector('input').getAttribute('aria-describedby')).toBe('hint-2 email-2')
    expect(copy.querySelector('a').getAttribute('href')).toBe('#contact-2')
    expect(copy.querySelector('rect').getAttribute('fill')).toBe('url(#g-2)')
    // A link out of the copy still goes where it went.
    expect(copy.querySelectorAll('a')[1].getAttribute('href')).toBe('#hero')
    // The original is as it was, and no id is on the page twice.
    expect(original.querySelector('label').getAttribute('for')).toBe('email')
    const ids = [...document.querySelectorAll('[id]')].map((node) => node.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('counts on for a second copy', () => {
    const p = document.getElementById('para')
    expect(duplicateElement(p).id).toBe('para-2')
    expect(duplicateElement(p).id).toBe('para-3')
  })

  it('keeps an id the page styles the block by, so the copy arrives with its design', () => {
    document.head.insertAdjacentHTML('beforeend', '<style id="page-css">#hero { padding: 80px } .x #hero-wide { margin: 0 }</style>')
    const copy = duplicateElement(document.getElementById('hero'))
    expect(copy.id).toBe('hero')
    expect(copy.querySelector('h1').id).toBe('title-2')
    document.getElementById('page-css').remove()
  })
})

describe('Move up / Move down step over what cannot be seen', () => {
  beforeEach(() => {
    document.body.innerHTML = '<section id="a">A</section><style>.x{}</style><script type="text/plain"></script><section id="b">B</section><style>.y{}</style>'
  })

  it('swaps with the block on the other side of a <style>', () => {
    expect(moveElement(document.getElementById('b'), 'up')).toBe(true)
    expect([...document.querySelectorAll('section')].map((node) => node.id)).toEqual(['b', 'a'])
    expect(moveElement(document.getElementById('b'), 'down')).toBe(true)
    expect([...document.querySelectorAll('section')].map((node) => node.id)).toEqual(['a', 'b'])
  })

  it('is at the edge when only a <style> is left on that side', () => {
    expect(moveElement(document.getElementById('b'), 'down')).toBe(false)
    expect(document.body.lastElementChild.tagName).toBe('STYLE')
  })
})

describe('selectableParent', () => {
  it('returns the containing element', () => {
    expect(selectableParent(document.getElementById('para'))).toBe(document.getElementById('hero'))
  })

  it('skips inline wrappers', () => {
    expect(selectableParent(document.getElementById('bold'))).toBe(document.getElementById('title'))
  })

  it('returns null at the top level (parent is body)', () => {
    expect(selectableParent(document.getElementById('hero'))).toBeNull()
  })
})

describe('applyElementPatch — box styles', () => {
  it('sets and clears padding and radius', () => {
    const p = document.getElementById('para')
    applyElementPatch(p, { padding: 24, radius: 12 })
    expect(p.style.padding).toBe('24px')
    expect(p.style.borderRadius).toBe('12px')
    applyElementPatch(p, { padding: 0, radius: '' })
    expect(p.style.padding).toBe('0px')
    applyElementPatch(p, { padding: '' })
    expect(p.style.padding).toBe('')
    expect(p.style.borderRadius).toBe('')
  })
})

describe('applyElementPatch — size & spacing', () => {
  it('sets automatic width at 0 and restores the template only when empty', () => {
    const p = document.getElementById('para')
    applyElementPatch(p, { width: 320 })
    expect(p.style.width).toBe('320px')
    applyElementPatch(p, { width: 0 })
    expect(p.style.width).toBe('auto')
    applyElementPatch(p, { width: '' })
    expect(p.style.width).toBe('')
  })

  it('always writes margins, including 0', () => {
    const p = document.getElementById('para')
    applyElementPatch(p, { marginTop: 16, marginBottom: 24 })
    expect(p.style.marginTop).toBe('16px')
    expect(p.style.marginBottom).toBe('24px')
    applyElementPatch(p, { marginTop: 0 })
    expect(p.style.marginTop).toBe('0px')
  })

  it('sets and clears display', () => {
    const p = document.getElementById('para')
    applyElementPatch(p, { display: 'flex' })
    expect(p.style.display).toBe('flex')
    applyElementPatch(p, { display: '' })
    expect(p.style.display).toBe('')
  })

  it('sets automatic height at 0 and restores the template only when empty', () => {
    const p = document.getElementById('para')
    applyElementPatch(p, { height: 120 })
    expect(p.style.height).toBe('120px')
    applyElementPatch(p, { height: 0 })
    expect(p.style.height).toBe('auto')
    applyElementPatch(p, { height: '' })
    expect(p.style.height).toBe('')
  })

  it('sets a solid border from width + colour and removes it at 0', () => {
    const p = document.getElementById('para')
    applyElementPatch(p, { borderWidth: 2, borderColor: '#ff0000' })
    expect(p.style.getPropertyValue('border-width')).toBe('2px')
    expect(p.style.getPropertyValue('border-style')).toBe('solid')
    // jsdom normalises hex to rgb(); just confirm a red border colour landed.
    expect(p.style.getPropertyValue('border-color')).toMatch(/#ff0000|rgb\(255, 0, 0\)/)
    applyElementPatch(p, { borderWidth: 0 })
    expect(p.style.getPropertyValue('border-width')).toBe('0px')
    applyElementPatch(p, { borderWidth: '' })
    expect(p.style.getPropertyValue('border-width')).toBe('')
    expect(p.style.getPropertyValue('border-style')).toBe('')
  })

  it('sets flex layout (justify / align / gap)', () => {
    const p = document.getElementById('para')
    applyElementPatch(p, { justifyContent: 'space-between', alignItems: 'center', gap: 16 })
    expect(p.style.justifyContent).toBe('space-between')
    expect(p.style.alignItems).toBe('center')
    expect(p.style.getPropertyValue('gap')).toBe('16px')
  })
})

describe('applyElementPatch — effects (parity with component mode)', () => {
  it('distinguishes hiding a border from restoring the template default', () => {
    const p = document.getElementById('para')
    applyElementPatch(p, { borderStyle: 'dashed' })
    expect(p.style.getPropertyValue('border-style')).toBe('dashed')
    expect(p.style.getPropertyValue('border-width')).toBe('1px') // seeds a width so it shows
    applyElementPatch(p, { borderStyle: 'none' })
    expect(p.style.getPropertyValue('border-style')).toBe('none')
    expect(p.style.getPropertyValue('border-width')).toBe('1px')
    applyElementPatch(p, { borderStyle: '' })
    expect(p.style.getPropertyValue('border-style')).toBe('')
    expect(p.style.getPropertyValue('border-width')).toBe('')
  })

  it('sets and clears box shadow', () => {
    const p = document.getElementById('para')
    applyElementPatch(p, { boxShadow: '0 4px 12px rgba(0,0,0,0.15)' })
    expect(p.style.getPropertyValue('box-shadow')).toContain('4px')
    applyElementPatch(p, { boxShadow: 'none' })
    expect(p.style.getPropertyValue('box-shadow')).toBe('none')
    applyElementPatch(p, { boxShadow: '' })
    expect(p.style.getPropertyValue('box-shadow')).toBe('')
  })

  it('sets full opacity explicitly and clears only an empty value', () => {
    const p = document.getElementById('para')
    applyElementPatch(p, { opacity: 0.5 })
    expect(p.style.getPropertyValue('opacity')).toBe('0.5')
    applyElementPatch(p, { opacity: 1 })
    expect(p.style.getPropertyValue('opacity')).toBe('1')
    applyElementPatch(p, { opacity: '' })
    expect(p.style.getPropertyValue('opacity')).toBe('')
  })

  it('sets and clears overflow', () => {
    const p = document.getElementById('para')
    applyElementPatch(p, { overflow: 'hidden' })
    expect(p.style.getPropertyValue('overflow')).toBe('hidden')
    applyElementPatch(p, { overflow: 'visible' })
    expect(p.style.getPropertyValue('overflow')).toBe('visible')
    applyElementPatch(p, { overflow: '' })
    expect(p.style.getPropertyValue('overflow')).toBe('')
  })
})

describe('applyMobileElementPatch', () => {
  it('stores visual edits in a mobile media override without changing desktop inline styles', () => {
    const p = document.getElementById('para')
    applyMobileElementPatch(p, { width: 320, color: '#ff0000', marginTop: 0 })

    expect(p.style.width).toBe('')
    expect(p.style.getPropertyValue('--pwb-mobile-width')).toBe('320px')
    expect(p).toHaveAttribute('data-pwb-mobile-width')
    expect(p.style.getPropertyValue('--pwb-mobile-margin-top')).toBe('0px')
    const style = document.querySelector('style[data-pwb-responsive-overrides]')
    expect(style?.textContent).toContain('@media (max-width: 767px)')
    expect(style?.textContent).toContain('var(--pwb-mobile-width)')
  })

  it('keeps content edits shared across screens', () => {
    const p = document.getElementById('para')
    applyMobileElementPatch(p, { text: 'Mobile-friendly text' })
    expect(p.textContent).toBe('Mobile-friendly text')
    expect(document.querySelector('style[data-pwb-responsive-overrides]')).toBeNull()
  })

  it('keeps font, text case, italic and underline on the phone instead of dropping them', () => {
    const p = document.getElementById('para')
    applyMobileElementPatch(p, { fontFamily: 'Lora', textTransform: 'uppercase', italic: true, underline: true })

    expect(p.style.fontFamily).toBe('')
    expect(p.style.getPropertyValue('--pwb-mobile-font-family')).toContain('Lora')
    expect(p.style.getPropertyValue('--pwb-mobile-text-transform')).toBe('uppercase')
    expect(p.style.getPropertyValue('--pwb-mobile-font-style')).toBe('italic')
    expect(p.style.getPropertyValue('--pwb-mobile-text-decoration')).toBe('underline')
    expect(document.head.querySelector('link[data-pwb-font="Lora"]')).not.toBeNull()
    const rule = document.head.querySelector('style[data-pwb-responsive-overrides]').textContent
    expect(rule).toContain('[data-pwb-mobile-font-family]')
    expect(rule).toContain('[data-pwb-mobile-text-transform]')
    expect(describeElement(p).mobileFontFamily).toBe('Lora')

    // Back to the page font: the phone falls back to the PC value again.
    applyMobileElementPatch(p, { fontFamily: '' })
    expect(p).not.toHaveAttribute('data-pwb-mobile-font-family')
    expect(describeElement(p).mobileFontFamily).toBe('')
  })

  it('writes the plain value when italic or underline is unticked on the phone', () => {
    const p = document.getElementById('para')
    applyElementPatch(p, { italic: true, underline: true })
    applyMobileElementPatch(p, { italic: false, underline: false })
    expect(p.style.getPropertyValue('--pwb-mobile-font-style')).toBe('normal')
    expect(p.style.getPropertyValue('--pwb-mobile-text-decoration')).toBe('none')
  })

  it('brings an older override stylesheet up to date', () => {
    const old = document.createElement('style')
    old.setAttribute('data-pwb-responsive-overrides', '')
    old.textContent = '@media (max-width: 767px) { [data-pwb-mobile-width] { width: var(--pwb-mobile-width) !important; } }'
    document.head.appendChild(old)

    applyMobileElementPatch(document.getElementById('para'), { textTransform: 'uppercase' })
    const styles = document.head.querySelectorAll('style[data-pwb-responsive-overrides]')
    expect(styles).toHaveLength(1)
    expect(styles[0].textContent).toContain('[data-pwb-mobile-text-transform]')
  })

  it('clears only mobile overrides and removes the stylesheet when unused', () => {
    const p = document.getElementById('para')
    p.style.width = '640px'
    applyMobileElementPatch(p, { width: 320, padding: 16 })
    clearMobileElementStyles(p)

    expect(p.style.width).toBe('640px')
    expect(p.style.getPropertyValue('--pwb-mobile-width')).toBe('')
    expect(p).not.toHaveAttribute('data-pwb-mobile-width')
    expect(document.querySelector('style[data-pwb-responsive-overrides]')).toBeNull()
  })
})

describe('ensureElementId / bindLinkToTarget / nearestAnchor', () => {
  it('derives a stable, unique id from text and reuses an existing one', () => {
    const fresh = document.querySelector('#second p') // no id in the fixture
    expect(fresh.id).toBe('')
    const id = ensureElementId(fresh)
    expect(id).toBe('2nd')
    expect(ensureElementId(fresh)).toBe('2nd') // reuses
    // an element that already has an id keeps it
    expect(ensureElementId(document.getElementById('para'))).toBe('para')
  })

  it('names a Turkish heading the way it reads', () => {
    document.body.innerHTML = '<h2 id="">Özellikler ve Fiyatlandırma</h2>'
    expect(ensureElementId(document.querySelector('h2'))).toBe('ozellikler-ve-fiyatlandirma')
  })

  it('points a link at a target, giving the target an id', () => {
    const link = document.getElementById('link')
    const hero = document.getElementById('hero')
    const href = bindLinkToTarget(link, hero)
    expect(href).toBe('#' + hero.id)
    expect(link.getAttribute('href')).toBe(href)
  })

  it('only binds when the source is an anchor', () => {
    expect(bindLinkToTarget(document.getElementById('para'), document.getElementById('hero'))).toBe('')
  })

  it('finds the nearest anchor above an element', () => {
    document.body.innerHTML = '<a id="a1"><span id="s1">x</span></a>'
    expect(nearestAnchor(document.getElementById('s1'), document.body)).toBe(document.getElementById('a1'))
  })
})

describe('ensureAnchor / elementLinkHref / setElementLink', () => {
  it('wraps a non-anchor in an <a> and reuses that wrapper', () => {
    const p = document.getElementById('para')
    const a = ensureAnchor(p)
    expect(a.tagName).toBe('A')
    expect(a.firstElementChild).toBe(p)
    expect(ensureAnchor(p)).toBe(a) // reuses the builder wrapper
  })

  it('returns an existing anchor unchanged', () => {
    const link = document.getElementById('link')
    expect(ensureAnchor(link)).toBe(link)
  })

  it('reads the effective link of any element', () => {
    expect(elementLinkHref(document.getElementById('link'))).toBe('#contact')
    expect(elementLinkHref(document.getElementById('para'))).toBe('') // none yet
  })

  it('sets a link by wrapping and clears it by unwrapping', () => {
    const p = document.getElementById('para')
    setElementLink(p, '#page_about')
    expect(elementLinkHref(p)).toBe('#page_about')
    expect(p.parentElement.tagName).toBe('A')
    setElementLink(p, '') // "No link" → unwrap the builder anchor
    expect(p.parentElement.tagName).toBe('SECTION')
    expect(elementLinkHref(p)).toBe('')
  })
})

// The file is read back by the HTML parser, and the parser does not allow an
// <a> inside an <a>: it ends the outer link where the inner one starts.
describe('a link never ends up inside another link', () => {
  const reread = () => new DOMParser().parseFromString(serializeDocument(document), 'text/html')

  it('a link set on the label inside a button-link changes that button, and the button keeps its label', () => {
    document.body.innerHTML = '<a id="btn" class="btn" href="/pricing"><span id="label">Get started</span></a>'
    const label = document.getElementById('label')
    expect(describeElement(label).href).toBe('/pricing')

    applyElementPatch(label, { href: '/signup' })

    const after = reread()
    expect(after.querySelectorAll('a')).toHaveLength(1)
    expect(after.getElementById('btn').getAttribute('href')).toBe('/signup')
    expect(after.getElementById('btn').textContent).toBe('Get started')
  })

  it('"No link" on that label takes the address off the button without taking the button apart', () => {
    document.body.innerHTML = '<a id="btn" class="btn" href="/pricing"><span id="label">Get started</span></a>'
    applyElementPatch(document.getElementById('label'), { href: '' })
    const btn = document.getElementById('btn')
    expect(btn.hasAttribute('href')).toBe(false)
    expect(btn.querySelector('#label')).not.toBeNull()
  })

  it('"No link" on something inside a wrapper the editor added removes that wrapper', () => {
    document.body.innerHTML = '<section id="s"><div id="card"><h3 id="t">Title</h3></div></section>'
    setElementLink(document.getElementById('card'), '/about')
    expect(elementLinkHref(document.getElementById('t'))).toBe('/about')
    setElementLink(document.getElementById('t'), '')
    expect(document.querySelector('a')).toBeNull()
    expect(document.getElementById('card').parentElement.id).toBe('s')
  })

  it('a block that holds a link of its own is not offered a link and cannot be wrapped in one', () => {
    document.body.innerHTML = '<div id="card"><h3>Title</h3><a id="more" href="/more">Read more</a></div>'
    const card = document.getElementById('card')
    expect(describeElement(card).href).toBeNull()
    setElementLink(card, '/about')
    expect(ensureAnchor(card)).toBeNull()
    expect(card.parentElement).toBe(document.body)
    expect(reread().querySelectorAll('a')).toHaveLength(1)
  })

  it('a table cell is not offered a link: the parser would move the wrapper out of the table', () => {
    document.body.innerHTML = '<table><tbody><tr><td id="cell">Price</td></tr></tbody></table>'
    const cell = document.getElementById('cell')
    expect(describeElement(cell).href).toBeNull()
    setElementLink(cell, '/about')
    expect(document.querySelector('a')).toBeNull()
  })
})

describe('reorderToPoint', () => {
  it('moves a node before/after the block under the point', () => {
    // jsdom has no layout, so stub getBoundingClientRect for a deterministic
    // "after" decision and elementFromPoint to return the target.
    const a = document.getElementById('hero')
    const b = document.getElementById('second')
    b.getBoundingClientRect = () => ({ top: 100, height: 200, left: 0, width: 100, bottom: 300, right: 100 })
    document.elementFromPoint = () => b
    const moved = reorderToPoint(document, a, 50, 290, { closestPlaceableBlock, insertPositionForY })
    expect(moved).toBe(b)
    expect(b.nextElementSibling).toBe(a) // a moved to after b (lower 60%)
  })

  it('returns null when dropped on itself', () => {
    const a = document.getElementById('hero')
    document.elementFromPoint = () => a
    expect(reorderToPoint(document, a, 0, 0, { closestPlaceableBlock, insertPositionForY })).toBeNull()
  })
})

// The customisation surface an imported page actually needs: type that is not
// just a size, spacing that is not one number for all four sides, a background
// that can be a gradient, a row that becomes a column on a phone.
describe('typography controls', () => {
  it('writes a real font stack and fetches the family with it', () => {
    const el = document.getElementById('title')
    applyElementPatch(el, { fontFamily: 'Playfair Display' })

    expect(el.style.fontFamily).toContain('Playfair Display')
    // A serif family must not fall back to a sans stack.
    expect(el.style.fontFamily).toContain('serif')
    const link = document.querySelector('link[data-pwb-font="Playfair Display"]')
    expect(link, 'the family has to arrive with the page').toBeTruthy()
    expect(link.getAttribute('href')).toContain('family=Playfair+Display')

    // Choosing it again must not add a second link.
    applyElementPatch(el, { fontFamily: 'Playfair Display' })
    expect(document.querySelectorAll('link[data-pwb-font="Playfair Display"]')).toHaveLength(1)
  })

  it('round-trips the picker value and falls back to inherit for anything else', () => {
    const el = document.getElementById('para')
    applyElementPatch(el, { fontFamily: 'Inter' })
    expect(describeElement(el).fontFamily).toBe('Inter')

    applyElementPatch(el, { fontFamily: 'system' })
    expect(describeElement(el).fontFamily).toBe('system')

    // A stack the page itself set is not one of ours — show "inherit", do not
    // pretend it matches an option.
    el.style.fontFamily = '"Comic Sans MS", cursive'
    expect(describeElement(el).fontFamily).toBe('')

    applyElementPatch(el, { fontFamily: '' })
    expect(el.style.fontFamily).toBe('')
  })

  it('keeps line height unitless so it survives a font-size change', () => {
    const el = document.getElementById('para')
    applyElementPatch(el, { lineHeight: 1.6 })
    expect(el.style.lineHeight).toBe('1.6')
    expect(el.style.lineHeight).not.toContain('px')
    applyElementPatch(el, { lineHeight: 0 })
    expect(el.style.lineHeight).toBe('')
  })

  it('writes tracking in em, and 0 is a real value that kills inherited tracking', () => {
    const el = document.getElementById('title')
    applyElementPatch(el, { letterSpacing: 0.08 })
    expect(el.style.letterSpacing).toBe('0.08em')
    applyElementPatch(el, { letterSpacing: 0 })
    expect(el.style.letterSpacing).toBe('0em')
    applyElementPatch(el, { letterSpacing: '' })
    expect(el.style.letterSpacing).toBe('')
  })

  it('turns italic and underline on and off', () => {
    const el = document.getElementById('link')
    applyElementPatch(el, { italic: true, underline: false })
    expect(el.style.fontStyle).toBe('italic')
    // 'none' rather than empty: a link is underlined by the browser, so
    // removing the underline needs a real declaration.
    expect(el.style.textDecoration).toBe('none')

    applyElementPatch(el, { italic: false, underline: true })
    expect(el.style.fontStyle).toBe('normal')
    expect(el.style.textDecoration).toBe('underline')
  })
})

describe('per-side padding and max width', () => {
  it('writes each side independently, including 0', () => {
    const el = document.getElementById('hero')
    applyElementPatch(el, { paddingTop: 48, paddingRight: 24, paddingBottom: 0, paddingLeft: 24 })
    expect(el.style.getPropertyValue('padding-top')).toBe('48px')
    expect(el.style.getPropertyValue('padding-right')).toBe('24px')
    // 0 must be written — it is how you remove the space a stylesheet asked for.
    expect(el.style.getPropertyValue('padding-bottom')).toBe('0px')
    expect(el.style.getPropertyValue('padding-left')).toBe('24px')
  })

  it('beats template CSS, which is the whole reason these are !important', () => {
    const el = document.getElementById('hero')
    applyElementPatch(el, { paddingTop: 12, maxWidth: 720 })
    expect(el.style.getPropertyPriority('padding-top')).toBe('important')
    expect(el.style.getPropertyPriority('max-width')).toBe('important')
  })

  it('treats max width 0 as "no cap"', () => {
    const el = document.getElementById('hero')
    applyElementPatch(el, { maxWidth: 720 })
    expect(el.style.getPropertyValue('max-width')).toBe('720px')
    applyElementPatch(el, { maxWidth: 0 })
    expect(el.style.getPropertyValue('max-width')).toBe('none')
    applyElementPatch(el, { maxWidth: '' })
    expect(el.style.getPropertyValue('max-width')).toBe('')
  })
})

describe('background gradient and image', () => {
  it('builds a two-stop gradient and reads it back into the controls', () => {
    const el = document.getElementById('hero')
    applyElementPatch(el, { gradientFrom: '#ff0000', gradientTo: '#0000ff', gradientAngle: 120 })
    // The browser re-serialises colours its own way (hex becomes rgb), so what
    // matters is that a gradient at the asked-for angle is there — and that it
    // survives the trip back into the controls.
    expect(el.style.backgroundImage).toMatch(/^linear-gradient\(120deg,/)

    const info = describeElement(el)
    expect(info.gradientFrom).toBe('#ff0000')
    expect(info.gradientTo).toBe('#0000ff')
    expect(info.gradientAngle).toBe(120)
  })

  it('changes one gradient stop without being told the others', () => {
    const el = document.getElementById('hero')
    applyElementPatch(el, { gradientFrom: '#ff0000', gradientTo: '#0000ff', gradientAngle: 90 })
    applyElementPatch(el, { gradientAngle: 30 })

    // Only the angle was given, so both colours have to have been read back
    // out of the element rather than lost.
    const info = describeElement(el)
    expect(info.gradientAngle).toBe(30)
    expect(info.gradientFrom).toBe('#ff0000')
    expect(info.gradientTo).toBe('#0000ff')
  })

  it('clears the gradient when a stop is emptied, falling back to the flat colour', () => {
    const el = document.getElementById('hero')
    applyElementPatch(el, { gradientFrom: '#ff0000', gradientTo: '#0000ff' })
    applyElementPatch(el, { gradientFrom: '' })
    expect(el.style.backgroundImage).toBe('')
  })

  it('sets an image with a sensible fit, and clearing it removes the fit too', () => {
    const el = document.getElementById('hero')
    applyElementPatch(el, { backgroundImage: 'https://example.com/a.jpg' })
    expect(el.style.backgroundImage).toBe('url("https://example.com/a.jpg")')
    expect(el.style.getPropertyValue('background-size')).toBe('cover')
    expect(describeElement(el).backgroundImage).toBe('https://example.com/a.jpg')

    applyElementPatch(el, { backgroundImage: '' })
    expect(el.style.backgroundImage).toBe('')
    expect(el.style.getPropertyValue('background-size')).toBe('')
  })

  it('does not read a gradient as an image URL', () => {
    const el = document.getElementById('hero')
    applyElementPatch(el, { gradientFrom: '#ffffff', gradientTo: '#000000' })
    expect(describeElement(el).backgroundImage).toBe('')
  })
})

describe('position and stacking', () => {
  it('gives a sticky element the offset it needs to actually stick', () => {
    const el = document.getElementById('hero')
    applyElementPatch(el, { position: 'sticky' })
    expect(el.style.getPropertyValue('position')).toBe('sticky')
    expect(el.style.getPropertyValue('top')).toBe('0px')
  })

  it('clears the offset when position goes back to default', () => {
    const el = document.getElementById('hero')
    applyElementPatch(el, { position: 'sticky' })
    applyElementPatch(el, { position: '' })
    expect(el.style.getPropertyValue('position')).toBe('')
    expect(el.style.getPropertyValue('top')).toBe('')
  })

  it('writes stack order 0 and restores the template only when empty', () => {
    const el = document.getElementById('hero')
    applyElementPatch(el, { zIndex: 5 })
    expect(el.style.getPropertyValue('z-index')).toBe('5')
    applyElementPatch(el, { zIndex: 0 })
    expect(el.style.getPropertyValue('z-index')).toBe('0')
    applyElementPatch(el, { zIndex: '' })
    expect(el.style.getPropertyValue('z-index')).toBe('')
  })
})

describe('the row that becomes a column on a phone', () => {
  it('stores flex direction as a mobile-only override', () => {
    const el = document.getElementById('hero')
    applyElementPatch(el, { display: 'flex', flexDirection: 'row' })
    applyMobileElementPatch(el, { flexDirection: 'column' })

    // Desktop keeps its row. Not inline any more: an inline !important row
    // outranks every stylesheet rule, the phone's column included.
    expect(el.style.getPropertyValue('flex-direction')).toBe('')
    expect(el.style.getPropertyValue('--pwb-pc-flex-direction')).toBe('row')
    // …and the phone value rides on the guarded custom property.
    expect(el.getAttribute('data-pwb-mobile-flex-direction')).toBe('')
    expect(el.style.getPropertyValue('--pwb-mobile-flex-direction')).toBe('column')

    const rule = document.head.querySelector('style[data-pwb-responsive-overrides]').textContent
    expect(rule).toContain('max-width: 767px')
    expect(rule).toContain('[data-pwb-mobile-flex-direction]')
  })

  it('carries the other responsive properties too', () => {
    const el = document.getElementById('hero')
    applyMobileElementPatch(el, { paddingTop: 16, maxWidth: 320, lineHeight: 1.4, letterSpacing: 0.02 })
    expect(el.style.getPropertyValue('--pwb-mobile-padding-top')).toBe('16px')
    expect(el.style.getPropertyValue('--pwb-mobile-max-width')).toBe('320px')
    expect(el.style.getPropertyValue('--pwb-mobile-line-height')).toBe('1.4')
    expect(el.style.getPropertyValue('--pwb-mobile-letter-spacing')).toBe('0.02em')
    // A mobile edit must never touch the desktop value.
    expect(el.style.getPropertyValue('padding-top')).toBe('')
  })

  it('counts every new override so the panel can offer "reset mobile"', () => {
    const el = document.getElementById('hero')
    applyMobileElementPatch(el, { flexDirection: 'column', paddingTop: 8, maxWidth: 300 })
    expect(describeElement(el).mobileOverrideCount).toBe(3)
    clearMobileElementStyles(el)
    expect(describeElement(el).mobileOverrideCount).toBe(0)
  })
})

// A panel edit on the PC is written inline with !important, so that it beats a
// template that pins the property. Nothing in a stylesheet outranks that, and
// the phone value IS a stylesheet rule: line height 2 on the PC, then 1.2 on
// the phone, was saved and the phone went on showing 2. jsdom does not resolve
// the cascade, so these check what makes the cascade come out right: while a
// phone value exists there is no inline !important left to outrank it.
describe('a phone value is never outranked by the PC value', () => {
  const para = () => document.getElementById('para')
  const inlineImportant = (el, name) => el.style.getPropertyPriority(name) === 'important' && el.style.getPropertyValue(name)
  const rules = () => document.head.querySelector('style[data-pwb-responsive-overrides]').textContent

  it('moves an inline !important PC value into the stylesheet when the phone gets its own', () => {
    const p = para()
    applyElementPatch(p, { lineHeight: 2 })
    expect(inlineImportant(p, 'line-height')).toBe('2')

    applyMobileElementPatch(p, { lineHeight: 1.2 })

    expect(inlineImportant(p, 'line-height')).toBeFalsy()
    expect(p.style.getPropertyValue('--pwb-pc-line-height')).toBe('2')
    expect(p).toHaveAttribute('data-pwb-pc-line-height')
    expect(p.style.getPropertyValue('--pwb-mobile-line-height')).toBe('1.2')
    // The PC rule comes first and the phone rule after it, equally specific.
    expect(rules().indexOf('[data-pwb-pc-line-height]')).toBeLessThan(rules().indexOf('@media (max-width: 767px)'))
    expect(rules()).toContain('[data-pwb-pc-line-height][data-pwb-pc-line-height] { line-height: var(--pwb-pc-line-height) !important; }')
    expect(rules()).toContain('[data-pwb-mobile-line-height][data-pwb-mobile-line-height] { line-height: var(--pwb-mobile-line-height) !important; }')
  })

  it('does the same when the PC value is set after the phone value', () => {
    const p = para()
    applyMobileElementPatch(p, { width: 280 })
    applyElementPatch(p, { width: 640 })

    expect(inlineImportant(p, 'width')).toBeFalsy()
    expect(p.style.getPropertyValue('--pwb-pc-width')).toBe('640px')
    expect(p.style.getPropertyValue('--pwb-mobile-width')).toBe('280px')
  })

  it('puts the PC value back inline once the phone value is cleared', () => {
    const p = para()
    applyElementPatch(p, { lineHeight: 2 })
    applyMobileElementPatch(p, { lineHeight: 1.2 })
    applyMobileElementPatch(p, { lineHeight: '' })

    expect(inlineImportant(p, 'line-height')).toBe('2')
    expect(p).not.toHaveAttribute('data-pwb-pc-line-height')
    expect(p.style.getPropertyValue('--pwb-pc-line-height')).toBe('')
    expect(document.head.querySelector('style[data-pwb-responsive-overrides]')).toBeNull()
  })

  it('"reset mobile styles" returns every PC value too', () => {
    const p = para()
    applyElementPatch(p, { lineHeight: 2, maxWidth: 600 })
    applyMobileElementPatch(p, { lineHeight: 1.2, maxWidth: 300 })
    clearMobileElementStyles(p)

    expect(inlineImportant(p, 'line-height')).toBe('2')
    expect(inlineImportant(p, 'max-width')).toBe('600px')
    expect(p.getAttributeNames().filter((name) => name.startsWith('data-pwb-'))).toEqual([])
  })

  it('treats a shorthand and its sides as one: PC padding against the phone’s top padding', () => {
    const p = para()
    applyElementPatch(p, { padding: 40 })
    applyMobileElementPatch(p, { paddingTop: 8 })

    expect(inlineImportant(p, 'padding-top')).toBeFalsy()
    expect(p.style.getPropertyValue('--pwb-pc-padding-top')).toBe('40px')
    // The other three sides have no phone value and stay where they were.
    expect(inlineImportant(p, 'padding-left')).toBe('40px')

    // And a PC padding written while the phone holds one side goes to the
    // sheet, as the one PC value for all four sides.
    applyElementPatch(p, { padding: 24 })
    expect(inlineImportant(p, 'padding-left')).toBeFalsy()
    expect(p.style.getPropertyValue('--pwb-pc-padding')).toBe('24px')
    expect(p).not.toHaveAttribute('data-pwb-pc-padding-top')
    expect(p.style.getPropertyValue('--pwb-mobile-padding-top')).toBe('8px')
  })

  it('clears a PC value that lives in the stylesheet', () => {
    const p = para()
    applyElementPatch(p, { width: 640 })
    applyMobileElementPatch(p, { width: 280 })
    applyElementPatch(p, { width: '' })

    expect(p).not.toHaveAttribute('data-pwb-pc-width')
    expect(p.style.getPropertyValue('--pwb-pc-width')).toBe('')
    expect(p.style.getPropertyValue('width')).toBe('')
    expect(p.style.getPropertyValue('--pwb-mobile-width')).toBe('280px')
  })

  it('still reports the PC font and placement after they moved', () => {
    const p = para()
    applyElementPatch(p, { fontFamily: 'Lora', alignBlock: 'center' })
    applyMobileElementPatch(p, { fontFamily: 'Inter', alignBlock: 'left' })

    const info = describeElement(p)
    expect(info.fontFamily).toBe('Lora')
    expect(info.mobileFontFamily).toBe('Inter')
    expect(info.alignBlock).toBe('center')
    expect(info.mobileAlignBlock).toBe('left')
  })

  it('leaves a PC value that is not !important inline: the phone rule already wins over it', () => {
    const p = para()
    p.style.fontSize = '26px' // an authored value, rather than a panel override
    applyMobileElementPatch(p, { fontSize: 18 })

    expect(p.style.getPropertyValue('font-size')).toBe('26px')
    expect(p).not.toHaveAttribute('data-pwb-pc-font-size')
  })
})

describe('phone edits the panel offers and used to drop', () => {
  it('keeps a gradient, a background image, position and stacking to the phone', () => {
    const p = document.getElementById('para')
    applyMobileElementPatch(p, { gradientFrom: '#ff0000', gradientTo: '#0000ff', gradientAngle: 90 })
    expect(p.style.getPropertyValue('--pwb-mobile-background-image')).toBe('linear-gradient(90deg, #ff0000, #0000ff)')
    expect(p.style.getPropertyValue('background-image')).toBe('')

    applyMobileElementPatch(p, { backgroundImage: 'https://example.com/a.png' })
    expect(p.style.getPropertyValue('--pwb-mobile-background-image')).toBe('url("https://example.com/a.png")')
    expect(p.style.getPropertyValue('--pwb-mobile-background-size')).toBe('cover')

    applyMobileElementPatch(p, { position: 'sticky', zIndex: 5 })
    expect(p.style.getPropertyValue('--pwb-mobile-position')).toBe('sticky')
    expect(p.style.getPropertyValue('--pwb-mobile-top')).toBe('0px')
    expect(p.style.getPropertyValue('--pwb-mobile-z-index')).toBe('5')
    expect(p.style.getPropertyValue('position')).toBe('')

    applyMobileElementPatch(p, { backgroundImage: '', position: '', zIndex: '' })
    expect(describeElement(p).mobileOverrideCount).toBe(0)
  })
})

// Everything above only counts if it survives the save. This project has lost
// user work at exactly this boundary before: the serializer strips the editor's
// own chrome, and anything new has to be on the right side of that line.
describe('the new customisation survives serialization', () => {
  it('keeps the font link, the mobile rule and the overrides', () => {
    const el = document.getElementById('hero')
    applyElementPatch(el, { fontFamily: 'Inter', paddingTop: 40, maxWidth: 800, position: 'sticky' })
    applyMobileElementPatch(el, { flexDirection: 'column', paddingTop: 12 })

    const html = serializeDocument(document)

    expect(html, 'the chosen family must arrive with the page').toContain('data-pwb-font="Inter"')
    expect(html).toContain('fonts.googleapis.com')
    expect(html, 'the media rule that powers every mobile override').toContain('data-pwb-responsive-overrides')
    expect(html).toContain('data-pwb-mobile-flex-direction')
    expect(html).toContain('--pwb-mobile-flex-direction: column')
    expect(html).toContain('max-width: 800px')
    expect(html).toContain('position: sticky')
  })
})

// A navigation is a set of links, and the panel could only ever edit one at a
// time by clicking it — there was no way to add a menu item at all. The care
// here is in the ADD: a brand-new <a> arrives unstyled and looks broken in
// every template that styles its menu by class, so a new item is cloned from
// the last one instead.
describe('menu links', () => {
  const navHtml = `
    <nav id="nav" class="menu">
      <a class="nav-link" href="#home">Home</a>
      <a class="nav-link" href="#work">Work</a>
    </nav>`
  const listHtml = `
    <ul id="list" class="menu">
      <li class="item"><a class="nav-link" href="#one">One</a></li>
      <li class="item"><a class="nav-link" href="#two">Two</a></li>
    </ul>`

  const mount = (html) => {
    document.body.innerHTML = html
    return document.body.firstElementChild
  }

  it('reads links straight out of a nav', () => {
    const nav = mount(navHtml)
    expect(describeElement(nav).links).toEqual([
      { text: 'Home', href: '#home' },
      { text: 'Work', href: '#work' },
    ])
  })

  it('reads them through list items too', () => {
    const list = mount(listHtml)
    expect(describeElement(list).links).toEqual([
      { text: 'One', href: '#one' },
      { text: 'Two', href: '#two' },
    ])
  })

  it('offers no list for something that is not one', () => {
    document.body.innerHTML = '<p id="p">Text with <a href="#x">one link</a> inside.</p>'
    expect(describeElement(document.getElementById('p')).links).toBeNull()
  })

  it('renames and re-targets without disturbing the markup', () => {
    const nav = mount(navHtml)
    applyElementPatch(nav, {
      links: [{ text: 'Start', href: '#top' }, { text: 'Work', href: '#work' }],
    })
    const anchors = nav.querySelectorAll('a')
    expect(anchors[0].textContent).toBe('Start')
    expect(anchors[0].getAttribute('href')).toBe('#top')
    // The class is the design — editing must never cost it.
    expect(anchors[0].className).toBe('nav-link')
    expect(anchors).toHaveLength(2)
  })

  it('clones the last link when one is added, so it arrives styled', () => {
    const nav = mount(navHtml)
    applyElementPatch(nav, {
      links: [
        { text: 'Home', href: '#home' },
        { text: 'Work', href: '#work' },
        { text: 'Contact', href: '#contact' },
      ],
    })
    const anchors = [...nav.querySelectorAll('a')]
    expect(anchors).toHaveLength(3)
    expect(anchors[2].textContent).toBe('Contact')
    expect(anchors[2].getAttribute('href')).toBe('#contact')
    expect(anchors[2].className, 'a new item must look like the others').toBe('nav-link')
  })

  it('clones the whole list item when the links live in one', () => {
    const list = mount(listHtml)
    applyElementPatch(list, {
      links: [
        { text: 'One', href: '#one' },
        { text: 'Two', href: '#two' },
        { text: 'Three', href: '#three' },
      ],
    })
    const items = [...list.querySelectorAll('li')]
    expect(items).toHaveLength(3)
    expect(items[2].className).toBe('item')
    expect(items[2].querySelector('a').textContent).toBe('Three')
  })

  it('keeps the requested order when several links are added at once', () => {
    const nav = mount(navHtml)
    applyElementPatch(nav, { links: [
      { text: 'Home', href: '#home' }, { text: 'Work', href: '#work' },
      { text: 'Third', href: '#third' }, { text: 'Fourth', href: '#fourth' },
    ] })
    expect([...nav.querySelectorAll('a')].map((a) => a.textContent)).toEqual(['Home', 'Work', 'Third', 'Fourth'])
  })

  it('gives a cloned menu item its own ids and clears the wrapper current marker', () => {
    const list = mount('<ul><li id="item" class="nav-item active" aria-current="page"><a id="nav-link" class="nav-link current" href="#home" aria-labelledby="nav-link">Home</a></li></ul>')
    applyElementPatch(list, { links: [{ text: 'Home', href: '#home' }, { text: 'Contact', href: '#contact' }] })
    const copy = list.lastElementChild
    expect(copy.id).toBe('item-2')
    expect(copy.querySelector('a').id).toBe('nav-link-2')
    expect(copy.querySelector('a').getAttribute('aria-labelledby')).toBe('nav-link-2')
    expect(copy.classList.contains('active')).toBe(false)
    expect(copy.querySelector('a').classList.contains('current')).toBe(false)
    expect(copy.hasAttribute('aria-current')).toBe(false)
    expect(list.firstElementChild.classList.contains('active')).toBe(true)
    expect(copy.classList.contains('nav-item')).toBe(true)
  })

  it('does not carry the current-page marker onto the new item', () => {
    document.body.innerHTML = `
      <nav id="nav"><a class="nav-link on" href="#a" aria-current="page">A</a></nav>`
    const nav = document.getElementById('nav')
    applyElementPatch(nav, { links: [{ text: 'A', href: '#a' }, { text: 'B', href: '#b' }] })
    const anchors = [...nav.querySelectorAll('a')]
    expect(anchors[1].hasAttribute('aria-current')).toBe(false)
    expect(anchors[1].classList.contains('on')).toBe(false)
    // …while keeping the styling class it was cloned from.
    expect(anchors[1].classList.contains('nav-link')).toBe(true)
  })

  it('removes an item, and its wrapper with it', () => {
    const list = mount(listHtml)
    applyElementPatch(list, { links: [{ text: 'One', href: '#one' }] })
    expect(list.querySelectorAll('li')).toHaveLength(1)
    expect(list.textContent.trim()).toBe('One')
  })

  it('reorders by writing the list back in the new order', () => {
    const nav = mount(navHtml)
    applyElementPatch(nav, {
      links: [{ text: 'Work', href: '#work' }, { text: 'Home', href: '#home' }],
    })
    expect([...nav.querySelectorAll('a')].map((a) => a.textContent)).toEqual(['Work', 'Home'])
  })

  it('is content, so a mobile edit writes it to the element itself', () => {
    const nav = mount(navHtml)
    applyMobileElementPatch(nav, { links: [{ text: 'Only', href: '#only' }] })
    // Menus do not differ per breakpoint — no override attribute for this.
    expect(nav.querySelectorAll('a')).toHaveLength(1)
    expect(nav.getAttribute('data-pwb-mobile-links')).toBeNull()
  })
})

// "Section on this page" in the HTML editor offered a text box for an id the
// person had to know; canvas pages list their blocks.
describe('linkSectionsInDocument', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <nav id="menu"><a id="to-contact" href="#">Contact us</a></nav>
      <section id="about"><h2>About   the   team</h2></section>
      <section id="contact"><h2>Contact</h2></section>
      <div data-pwb-selection-toolbar id="pwb-toolbar"></div>
      <style id="theme"></style>
      <p id="about">a second "about" is the same place</p>`
  })

  it('lists every place a link can jump to, in page order, named by id and text', () => {
    const sections = linkSectionsInDocument(document)
    expect(sections.map((s) => s.id)).toEqual(['menu', 'to-contact', 'about', 'contact'])
    expect(sections.find((s) => s.id === 'about').label).toBe('#about · About the team')
  })

  it('leaves out #top, which is "Top of this page" already', () => {
    document.body.insertAdjacentHTML('afterbegin', '<header id="top"><h1>Brand</h1></header>')
    expect(linkSectionsInDocument(document).map((s) => s.id)).not.toContain('top')
  })

  it('leaves out the link itself and what it contains', () => {
    const menu = document.getElementById('menu')
    expect(linkSectionsInDocument(document, menu).map((s) => s.id)).toEqual(['about', 'contact'])
  })

  it('reaches the panel through describeElement', () => {
    const link = document.getElementById('to-contact')
    expect(describeElement(link).sections.map((s) => s.id)).toEqual(['menu', 'about', 'contact'])
  })
})

// A template's <img> carries alternatives the browser or a lazy-loader prefers
// over src; the chosen picture has to be the one shown.
describe('replacing an image', () => {
  it('drops srcset, sizes and lazy-load sources along with the old src', () => {
    document.body.innerHTML = '<img id="i" src="old.jpg" srcset="old-800.jpg 800w, old-1600.jpg 1600w" sizes="100vw" data-src="old-lazy.jpg" alt="Old">'
    const img = document.getElementById('i')

    applyElementPatch(img, { src: 'https://cdn.example/new.jpg' })

    expect(img.getAttribute('src')).toBe('https://cdn.example/new.jpg')
    for (const name of ['srcset', 'sizes', 'data-src']) expect(img.hasAttribute(name)).toBe(false)
    expect(img.getAttribute('alt')).toBe('Old')
  })

  it('drops the <source>s of its <picture>', () => {
    document.body.innerHTML = '<picture><source srcset="old.webp" type="image/webp"><img id="i" src="old.jpg"></picture>'
    const img = document.getElementById('i')

    applyElementPatch(img, { src: 'new.jpg' })

    expect(document.querySelectorAll('source')).toHaveLength(0)
    expect(img.parentElement.tagName).toBe('PICTURE')
  })

  it('leaves an image without alternatives as it was apart from src', () => {
    document.body.innerHTML = '<img id="i" src="old.jpg" class="hero" width="400">'
    const img = document.getElementById('i')
    applyElementPatch(img, { src: 'new.jpg' })
    expect(img.outerHTML).toBe('<img id="i" src="new.jpg" class="hero" width="400">')
  })
})
