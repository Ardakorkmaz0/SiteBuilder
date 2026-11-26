// What a canvas page shows only once something shows it: a chapter, the
// steps of a solution, the back of a card, what a closed box holds.
//
// It is kept as keys. A block is shown while every key in its `shownBy` is on.
// A page lists the keys that are off when it opens (`hiddenKeys`) and its
// parts (`parts`, its chapters): one part is on at a time, the first when the
// page opens, and a "#id" link to a block of another part turns that part on.
// A click on a block runs its `onClick` actions on keys:
//
//   show / hide / toggle   each key
//   next                   the first key of the list that is off goes on
//   prev                   the last key of the list that is on goes off
//
// Blocks stand where they were drawn with everything shown. When some are
// hidden, what stood below them in their column moves up and the box around
// them gets shorter, as the page they came from did (reflowLevel). Mirrors
// SHOW_KEY_RE and sanitize_show_actions in backend/builder/validators.py.

export const SHOW_KEY = /^[a-z0-9_-]{1,40}$/
export const SHOW_ACTIONS = ['show', 'hide', 'toggle', 'next', 'prev']

const keysOf = (value, limit) => {
  const seen = new Set()
  for (const key of Array.isArray(value) ? value : []) {
    if (typeof key === 'string' && SHOW_KEY.test(key) && !seen.has(key)) {
      seen.add(key)
      if (seen.size >= limit) break
    }
  }
  return [...seen]
}

export function shownBy(props) {
  return [...new Set(keysOf(props?.shownBy, 16))]
}

function stepEntrance(value) {
  if (!value || typeof value !== 'object') return null
  const { fromOpacity, fromY, durationMs, easing, delayMs = 0 } = value
  if (!Number.isFinite(fromOpacity) || fromOpacity < 0 || fromOpacity > 1 ||
      !Number.isFinite(fromY) || Math.abs(fromY) > 120 ||
      !Number.isFinite(durationMs) || durationMs <= 0 || durationMs > 10000 ||
      !Number.isFinite(delayMs) || delayMs < 0 || delayMs > 2000 ||
      !['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out'].includes(easing)) return null
  return { fromOpacity, fromY, durationMs, easing, ...(delayMs ? { delayMs } : {}) }
}

// The room each key's element took, on the block that stands for it:
// [key, from the element's top to the block's, room].
export function showRooms(props) {
  return (Array.isArray(props?.rooms) ? props.rooms : [])
    .filter((room) => Array.isArray(room) && SHOW_KEY.test(room[0] || '') && Number.isFinite(Number(room[1])) && Number.isFinite(Number(room[2])))
    .slice(0, 16)
    .map(([key, above, room]) => [key, Math.max(0, Number(above)), Math.max(0, Number(room))])
}

export function clickActions(props) {
  return (Array.isArray(props?.onClick) ? props.onClick : [])
    .slice(0, 8)
    .filter((action) => action && SHOW_ACTIONS.includes(action.do))
    .map((action) => {
      const keys = keysOf(action.keys, 400)
      const quietKeys = keysOf(action.quietKeys, 400).filter(key => keys.includes(key))
      return { do: action.do, keys, ...(quietKeys.length ? { quietKeys } : {}) }
    })
    .filter((action) => action.keys.length)
}

export function pageParts(page) {
  return (Array.isArray(page?.parts) ? page.parts : []).filter((part) => part && SHOW_KEY.test(part.key || ''))
}

// Whether anything on the page is shown or hidden by a key.
export function pageHasShow(page) {
  if (!page) return false
  if (pageParts(page).length || keysOf(page.hiddenKeys, 1).length) return true
  const visit = (list) => (list || []).some((c) => (
    (c.props?.shownBy && shownBy(c.props).length) || (c.props?.onClick && clickActions(c.props).length) || visit(c.children)
  ))
  return visit(page.components)
}

const escAttr = (value) => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// The attributes a block's box carries on the published page.
export function showAttrs(props) {
  if (!props?.shownBy && !props?.onClick && !props?.showEntrance) return ''
  const keys = shownBy(props)
  const actions = clickActions(props)
  const rooms = keys.length ? showRooms(props) : []
  const entrance = stepEntrance(props.showEntrance)
  return (keys.length ? ` data-pwb-show="${keys.join(' ')}"` : '')
    + (entrance ? ` data-pwb-show-entrance="${escAttr(JSON.stringify(entrance))}"` : '')
    + (rooms.length ? ` data-pwb-room="${rooms.map((room) => room.join(':')).join(' ')}"` : '')
    + (actions.length ? ` data-pwb-do="${escAttr(JSON.stringify(actions))}"` : '')
}

// The attributes the page itself carries: the keys that are off when it opens,
// and its parts.
export function pageShowAttrs(page) {
  if (!pageHasShow(page)) return ''
  const hidden = keysOf(page.hiddenKeys, 20000)
  const parts = pageParts(page).map((part) => part.key)
  return ` data-pwb-keys="${hidden.join(' ')}"${parts.length ? ` data-pwb-parts="${parts.join(' ')}"` : ''}${page.flowMode ? ' data-pwb-flow' : ''}`
}

// The keys that are on after `actions` ran, from `on` (key -> false when off).
export function runActions(actions, on) {
  const next = Object.assign(Object.create(null), on)
  const isOn = (key) => next[key] !== false
  for (const action of actions) {
    const keys = action.keys
    if (action.do === 'show') keys.forEach((key) => { next[key] = true })
    else if (action.do === 'hide') keys.forEach((key) => { next[key] = false })
    else if (action.do === 'toggle') keys.forEach((key) => { next[key] = !isOn(key) })
    else if (action.do === 'next') {
      const key = keys.find((item) => !isOn(item))
      if (key) next[key] = true
    } else if (action.do === 'prev') {
      const key = [...keys].reverse().find((item) => isOn(item))
      if (key) next[key] = false
    }
  }
  return next
}

// Where the blocks of one box stand once some of them are hidden.
//
// `items` are the boxes in it as drawn with everything shown: { x, y, w, h }
// with `hidden` (hidden, its room is given up), `gone` (another part's: not
// counted at all), `stretch` (the box's own edge or background, as tall as
// the box: not counted, it gets shorter with the box), `cut` (shown, but that
// much shorter at its bottom, as a box with hidden blocks inside is) and
// `bands` (for a hidden block, the room its element took as the reading
// measured it, [top, bottom]; without them, from its top down to the next
// block under it). A shown block moves up by the room given up above it in
// its column, less what a shown block beside it still fills (a tall picture
// next to the steps keeps the row as tall as it was). The box gets shorter
// by what its bottom edge would move up. Returns each block's new top and
// how much shorter the box gets.
export function reflowLevel(items) {
  // Spans of height, as [top, bottom] pairs. Kept inside, as the published
  // page gets this function as text.
  const union = (spans) => {
    if (!spans.length) return spans
    let ordered = true
    for (let i = 1; i < spans.length; i++) {
      if (spans[i][0] < spans[i - 1][0]) {
        ordered = false
        break
      }
    }
    const sorted = ordered ? spans : spans.slice().sort((p, q) => p[0] - q[0])
    const out = []
    for (let i = 0; i < sorted.length; i++) {
      const a = sorted[i][0]
      const b = sorted[i][1]
      if (b <= a) continue
      const last = out[out.length - 1]
      if (last && a <= last[1]) {
        if (b > last[1]) last[1] = b
      } else {
        out.push([a, b])
      }
    }
    return out
  }
  const without = (spans, holes) => {
    if (!spans.length || !holes.length) return spans
    const out = []
    let j = 0
    for (let i = 0; i < spans.length; i++) {
      let a = spans[i][0]
      const b = spans[i][1]
      while (j < holes.length && holes[j][1] <= a) j++
      let k = j
      while (k < holes.length && holes[k][0] < b && a < b) {
        if (holes[k][0] > a) out.push([a, Math.min(b, holes[k][0])])
        a = Math.max(a, holes[k][1])
        k++
      }
      if (a < b) out.push([a, b])
    }
    return out
  }
  // Within the box: from its top down to `limit`.
  const below = (spans, limit) => {
    let sum = 0
    for (let i = 0; i < spans.length; i++) {
      const v = Math.min(spans[i][1], limit) - Math.max(spans[i][0], 0)
      if (v > 0) sum += v
    }
    return sum
  }
  const live = items.map((item, index) => ({ ...item, index, cut: Math.max(0, item.cut || 0) })).filter((item) => !item.gone && !item.stretch)
  const ys = items.map((item) => item.y)
  // Nothing hidden and nothing shorter: nothing moves.
  const changes = live.filter((item) => item.hidden || item.cut)
  if (!changes.length) return { ys, cut: 0 }
  // What stands above the first change cannot move.
  const firstChange = Math.min(...changes.map((item) => item.y))
  const across = (a, b) => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5
  const byY = live.slice().sort((p, q) => p.y - q.y)
  // What each hidden block gives up: its measured room, or down to the
  // next block under it in its column.
  const given = new Map()
  for (let i = 0; i < byY.length; i++) {
    const a = byY[i]
    if (!a.hidden) continue
    if (Array.isArray(a.bands)) {
      given.set(a, a.bands)
      continue
    }
    const minNext = a.y + a.h - 0.5
    let next = Infinity
    for (let j = 0; j < byY.length; j++) {
      const c = byY[j]
      if (c.y < minNext || c === a) continue
      if (across(c, a)) {
        next = c.y
        break
      }
    }
    given.set(a, [[a.y, Math.max(a.y + a.h, next)]])
  }
  const bottom = live.length ? Math.max(...live.map((item) => item.y + item.h)) : 0
  const shift = (b) => {
    const removed = []
    const kept = []
    const maxY = b.y + 0.5
    for (let i = 0; i < byY.length; i++) {
      const a = byY[i]
      if (a.y > maxY) break
      if (a === b || !across(a, b) || a.y + a.h > maxY) continue
      if (a.hidden) {
        const spans = given.get(a)
        for (let s = 0; s < spans.length; s++) {
          const top = spans[s][0]
          const end = Math.min(spans[s][1], b.y)
          if (end > top) removed.push([top, end])
        }
      } else {
        if (a.cut > 0) removed.push([a.y + a.h - a.cut, a.y + a.h])
        if (a.h - a.cut > 0) kept.push([a.y, a.y + a.h - a.cut])
      }
    }
    return below(without(union(removed), union(kept)), b.y)
  }
  for (const b of live) if (!b.hidden && b.y > firstChange) ys[b.index] = b.y - shift(b)
  // The box's bottom edge, as wide as the box.
  const edge = { x: -1e9, w: 2e9, y: bottom, h: 0 }
  return { ys, cut: live.length ? Math.max(0, shift(edge)) : 0 }
}

// The script the published page runs. It is written into the page as the text
// of these functions, so it uses nothing from outside them.
export function pageShowRuntime(reflow, act, validateEntrance) {
  var page = document.querySelector('[data-pwb-keys]')
  if (!page || window.__pwbShowReady) return
  window.__pwbShowReady = true
  var words = function (value) { return String(value || '').split(' ').filter(Boolean) }
  var parts = words(page.getAttribute('data-pwb-parts'))
  // Keyed by the page's own words: no object behind them (a key may be
  // "__proto__").
  var isPart = Object.create(null)
  parts.forEach(function (key) { isPart[key] = true })
  var on = Object.create(null)
  words(page.getAttribute('data-pwb-keys')).forEach(function (key) { on[key] = false })
  // A page laid out in flow moves what follows a hidden block by itself.
  var flowPage = page.hasAttribute('data-pwb-flow')
  var saved = new Map()
  var STYLE = ['top', 'height', 'min-height', 'display']
  // The design height a box is fitted to (utils/containerFit.js) follows
  // the box when it gets shorter, or the fitting would stretch it back. On
  // a phone, a container with phone layouts is fitted to its -mobile one.
  var FIT = 'data-pwb-container-height'
  var FITS = [FIT, FIT + '-mobile']
  function fitOf(el) {
    var phone = el.hasAttribute(FIT + '-mobile') && window.matchMedia && window.matchMedia('(max-width: 768px)').matches
    return phone ? FIT + '-mobile' : FIT
  }
  // Written over what the stylesheet says, whatever it says: a container's
  // blocks are placed on a phone by !important rules (schemaToFiles
  // containerPhoneCss), which a plain inline value would not move.
  function put(el, name, value) { el.style.setProperty(name, value, 'important') }
  function remember(el) {
    if (saved.has(el)) return
    saved.set(el, {
      style: STYLE.map(function (name) { return [el.style.getPropertyValue(name), el.style.getPropertyPriority(name)] }),
      fit: FITS.map(function (name) { return el.getAttribute(name) }),
    })
  }
  function restore() {
    saved.forEach(function (was, el) {
      STYLE.forEach(function (name, i) {
        if (was.style[i][0]) el.style.setProperty(name, was.style[i][0], was.style[i][1])
        else el.style.removeProperty(name)
      })
      FITS.forEach(function (name, i) { if (was.fit[i] !== null) el.setAttribute(name, was.fit[i]) })
    })
  }
  var LEVEL = '.page, [data-pwb-container-root], .region-inner'
  function state(el, values = on) {
    var keys = words(el.getAttribute('data-pwb-show'))
    var gone = keys.some(function (key) { return isPart[key] && values[key] === false })
    var hidden = keys.some(function (key) { return !isPart[key] && values[key] === false })
    return gone ? 'gone' : hidden ? 'hidden' : 'shown'
  }
  // The blocks standing in a box: a link around a block is no box of its own.
  function boxesIn(level) {
    var out = []
    Array.prototype.forEach.call(level.children, function (el) {
      if (el.style.display === 'contents') out.push.apply(out, boxesIn(el))
      else out.push(el)
    })
    return out
  }
  function scaleOf(level) {
    var match = /scale\(([\d.]+)\)/.exec(level.style.transform || '')
    return match ? Number(match[1]) || 1 : 1
  }
  function finish() {
    // Every block a key hides is hidden, wherever it stands: pinned to the
    // screen, or in a box that lays its blocks out by itself. Last, as all
    // the rest is measured as drawn.
    var every = document.querySelectorAll('[data-pwb-show]')
    for (var e = 0; e < every.length; e++) {
      if (state(every[e]) === 'shown') continue
      remember(every[e])
      put(every[e], 'display', 'none')
    }
    if (typeof window.__pwbApplyLayout === 'function') window.__pwbApplyLayout()
  }
  function layout() {
    restore()
    window.__pwbPageCut = 0
    var boxes = page.querySelectorAll('[data-pwb-show]')
    if (!boxes.length) return finish()
    // The boxes holding a hidden block, and every box around them.
    var levels = new Set()
    for (var i = 0; i < boxes.length; i++) {
      if (state(boxes[i]) === 'shown') continue
      for (var level = boxes[i].parentElement; level; level = level.parentElement) {
        if (level.matches(LEVEL)) levels.add(level)
        if (level === page) break
      }
    }
    var depth = function (el) { var n = 0; for (var p = el; p && p !== page; p = p.parentElement) n++; return n }
    var order = Array.from(levels).sort(function (a, b) { return depth(b) - depth(a) })
    // Everything is measured as drawn before anything is written, so the
    // page is laid out once and not once for every box.
    var drawn = new Map()
    order.forEach(function (level) {
      var height = level.offsetHeight
      var width = level.offsetWidth
      var chain = []
      if (level !== page) {
        for (var el = level; el && el.parentElement; el = el.parentElement) {
          chain.push({ el: el, h: el.offsetHeight })
          if (el.parentElement.matches(LEVEL)) break
        }
      }
      drawn.set(level, {
        h: height,
        w: width,
        chain: chain,
        kids: boxesIn(level).map(function (el) {
          return { el: el, x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }
        }),
      })
    })
    // Where each measured room lies on the page, so a box holding part of
    // a split part (a long solution) can give up just the share inside it.
    var scale = page.getBoundingClientRect().width / (page.offsetWidth || 1) || 1
    var pageTop = function (el) { return (el.getBoundingClientRect().top + window.scrollY) / scale }
    var spans = {}
    for (var b = 0; b < boxes.length; b++) {
      words(boxes[b].getAttribute('data-pwb-room')).forEach(function (entry) {
        var bits = entry.split(':')
        if (!Number(bits[2])) return
        var top = pageTop(boxes[b]) - Number(bits[1])
        spans[bits[0]] = [top, top + Number(bits[2])]
      })
    }
    var levelTops = new Map()
    order.forEach(function (level) { levelTops.set(level, pageTop(level)) })
    var cuts = new Map()
    // A box with nothing left to show (the rest of a long solution) is a
    // hidden block to the box around it: its room goes too.
    var empties = new Set()
    order.forEach(function (level) {
      var seen = drawn.get(level)
      var given = {}
      // The keys whose room a block of this box carries. A part split over
      // two boxes (a long solution) has it in one of them only; in the other
      // its blocks give up their room as if none was measured.
      var holders = {}
      seen.kids.forEach(function (kid) {
        words(kid.el.getAttribute('data-pwb-room')).forEach(function (entry) {
          var bits = entry.split(':')
          if (Number(bits[1]) || Number(bits[2])) holders[bits[0]] = true
        })
      })
      var items = seen.kids.map(function (kid) {
        var shown = kid.el.hasAttribute('data-pwb-show') ? state(kid.el) : 'shown'
        var bands
        // A box's own edge or background runs from its top to its bottom:
        // a thin line, or something as wide as the box.
        var stretch = level !== page && shown === 'shown' && kid.y <= 1 && kid.h >= seen.h * 0.9
          && (kid.w <= 12 || kid.w >= seen.w * 0.95)
        // The room measured for the keys that hide it (utils/htmlToCanvas.js marked).
        var rooms = kid.el.getAttribute('data-pwb-room')
        if (shown === 'hidden' && rooms) {
          var entries = words(rooms).map(function (entry) { return entry.split(':') }).filter(function (bits) { return on[bits[0]] === false })
          bands = []
          var known = entries.every(function (bits) {
            if (holders[bits[0]]) {
              if (Number(bits[1]) || Number(bits[2])) bands.push([kid.y - Number(bits[1]), kid.y - Number(bits[1]) + Number(bits[2])])
              return true
            }
            // Measured in another box: its share in this one, once.
            var span = spans[bits[0]]
            if (!span) return false
            if (!given[bits[0]]) {
              given[bits[0]] = true
              var at = levelTops.get(level)
              bands.push([span[0] - at, span[1] - at])
            }
            return true
          })
          if (!known) bands = undefined
        }
        var empty = shown === 'shown' && empties.has(kid.el)
        return { x: kid.x, y: kid.y, w: kid.w, h: kid.h, hidden: shown === 'hidden' || empty, gone: shown === 'gone', stretch: stretch, cut: empty ? 0 : cuts.get(kid.el) || 0, bands: empty ? undefined : bands }
      })
      var result = reflow(items)
      seen.kids.forEach(function (kid, n) {
        remember(kid.el)
        if (items[n].hidden || items[n].gone) put(kid.el, 'display', 'none')
        else if (level === page && flowPage) return
        else if (items[n].stretch) { if (result.cut) put(kid.el, 'height', Math.max(0, kid.h - result.cut) + 'px') }
        else if (Math.abs(result.ys[n] - kid.y) > 0.5) put(kid.el, 'top', result.ys[n] + 'px')
      })
      if (level === page) {
        if (flowPage) return
        // The page gives up what its shown part leaves below it too: another
        // part may reach further down.
        var everything = 0
        var reach = 0
        seen.kids.forEach(function (kid, n) {
          everything = Math.max(everything, kid.y + kid.h)
          if (!items[n].gone) reach = Math.max(reach, kid.y + kid.h)
        })
        window.__pwbPageCut = Math.max(0, everything - reach + result.cut)
        return
      }
      if (!items.some(function (item) { return !item.hidden && !item.gone && !item.stretch }) && seen.chain.length) {
        empties.add(seen.chain[seen.chain.length - 1].el)
      }
      if (!result.cut) return
      // The box gets shorter, and so does each box around it up to the
      // block's own, which is what its neighbours see.
      var scale = scaleOf(level)
      seen.chain.forEach(function (link, n) {
        var cut = n === 0 ? result.cut : result.cut * scale
        remember(link.el)
        put(link.el, 'height', Math.max(0, link.h - cut) + 'px')
        put(link.el, 'min-height', '0px')
        if (link.el.hasAttribute(FIT)) link.el.setAttribute(fitOf(link.el), String(Math.max(0, seen.chain[0].h - result.cut)))
        if (n === seen.chain.length - 1) cuts.set(link.el, cut)
      })
    })
    finish()
  }
  function partOf(target) {
    for (var el = target; el && el !== document.body; el = el.parentElement) {
      if (!el.hasAttribute || !el.hasAttribute('data-pwb-show')) continue
      var keys = words(el.getAttribute('data-pwb-show'))
      for (var k = 0; k < keys.length; k++) if (isPart[keys[k]]) return keys[k]
    }
    return ''
  }
  function showPartOf(id) {
    var target = id && document.getElementById(id)
    var part = target ? partOf(target) : ''
    if (!part || on[part] !== false) return false
    parts.forEach(function (key) { on[key] = key === part ? true : false })
    layout()
    return true
  }
  function hashId(href) {
    try { return decodeURIComponent(String(href || '').replace(/^#/, '')) } catch { return '' }
  }
  var entrances = new Map()
  document.querySelectorAll('[data-pwb-show-entrance]').forEach(function (el) {
    var spec
    try { spec = validateEntrance(JSON.parse(el.getAttribute('data-pwb-show-entrance'))) } catch { return }
    if (!spec || !el.animate) return
    var gates = []
    for (var gate = el.closest('[data-pwb-show]'); gate; gate = gate.parentElement?.closest('[data-pwb-show]')) gates.push(gate)
    if (gates.length) entrances.set(el, { spec: spec, gates: gates, animation: null })
  })
  function entranceState(gates, values) {
    var states = gates.map(function (gate) { return state(gate, values) })
    return states.includes('gone') ? 'gone' : states.includes('hidden') ? 'hidden' : 'shown'
  }
  function playReveals(before, actions) {
    if (!entrances.size) return
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    var quiet = new Set(actions.flatMap(function (action) { return action.quietKeys || [] }))
    entrances.forEach(function (entry, el) {
      var previous = entranceState(entry.gates, before)
      var current = entranceState(entry.gates, on)
      if (previous === current) return
      if (entry.animation) { entry.animation.cancel(); entry.animation = null }
      if (previous !== 'hidden' || current !== 'shown' || reduced || !el.getClientRects().length) return
      if (quiet.size && entry.gates.some(function (gate) {
        return words(gate.getAttribute('data-pwb-show')).some(function (key) { return quiet.has(key) && before[key] === false && on[key] !== false })
      })) return
      var spec = entry.spec
      entry.animation = el.animate([
        { opacity: spec.fromOpacity, translate: '0px ' + spec.fromY + 'px' },
        { opacity: 1, translate: '0px 0px' },
      ], { duration: spec.durationMs, delay: spec.delayMs || 0, easing: spec.easing, fill: 'backwards' })
    })
  }
  document.addEventListener('click', function (event) {
    var link = event.target && event.target.closest && event.target.closest('a[href^="#"]')
    if (link) showPartOf(hashId(link.getAttribute('href')))
    var doer = event.target && event.target.closest && event.target.closest('[data-pwb-do]')
    if (!doer) return
    var actions
    try { actions = JSON.parse(doer.getAttribute('data-pwb-do')) } catch { return }
    var before = on
    on = act(actions, on)
    layout()
    playReveals(before, actions)
  }, true)
  window.addEventListener('hashchange', function () { showPartOf(hashId(location.hash)) })
  var again = 0
  window.addEventListener('resize', function () { cancelAnimationFrame(again); again = requestAnimationFrame(layout) })
  window.addEventListener('load', layout)
  if (!showPartOf(hashId(location.hash))) layout()
}

// The runtime as the text of a script.
export function pageShowScript() {
  return `(${pageShowRuntime.toString()})(${reflowLevel.toString()}, ${runActions.toString()}, ${stepEntrance.toString()});`
}
