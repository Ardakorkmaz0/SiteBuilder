// Read and write editable element copy while treating <br> as a textarea
// newline. Writes use DOM text nodes, so text such as "<script>" remains
// harmless user copy instead of becoming executable HTML.
export function readElementMultilineText(element) {
  if (!element) return ''

  const readNode = (node) => {
    if (node.nodeType === 3) return node.nodeValue || ''
    if (node.nodeType !== 1) return ''
    if (node.tagName === 'BR') return '\n'
    return [...node.childNodes].map(readNode).join('')
  }

  return [...element.childNodes].map(readNode).join('')
}

export function writeElementMultilineText(element, value) {
  if (!element?.ownerDocument) return
  const document = element.ownerDocument
  const text = String(value ?? '').replace(/\r\n?/g, '\n')
  // Textareas are raw-text form controls: a BR is not a line break there and
  // becomes literal "<br>" after a saved HTML parse. Update the live value as
  // well as the default, because prior interaction separates the two.
  if (element.tagName === 'TEXTAREA') {
    element.defaultValue = text
    element.value = text
    return
  }
  // Words with formatting inside them (a <sub>, a bold lead, a styled blank)
  // keep it: only the part of the copy that changed is written, into the text
  // it replaces. Rewriting the whole element used to flatten a formula such as
  // f(x<sub>n</sub>) to "f(xn)" the moment one letter was corrected.
  // Inside <pre> a newline is copy, not a <br>.
  const raw = !!element.closest('pre')
  if ([...element.children].some((child) => child.tagName !== 'BR')) {
    spliceElementText(element, readElementMultilineText(element), text, raw)
    return
  }
  element.replaceChildren(...lineNodes(document, text, raw))
}

function lineNodes(document, text, raw = false) {
  if (raw) return text ? [document.createTextNode(text)] : []
  const nodes = []
  text.split('\n').forEach((line, index) => {
    if (index > 0) nodes.push(document.createElement('br'))
    if (line) nodes.push(document.createTextNode(line))
  })
  return nodes
}

// The text nodes and <br>s of an element in reading order, each with the
// range of the copy (as readElementMultilineText reads it) that it holds.
function textPieces(element) {
  const pieces = []
  let at = 0
  const walk = (node) => {
    for (const child of node.childNodes) {
      if (child.nodeType === 3) {
        const length = (child.nodeValue || '').length
        pieces.push({ node: child, br: false, start: at, end: at + length })
        at += length
      } else if (child.nodeType === 1) {
        if (child.tagName === 'BR') {
          pieces.push({ node: child, br: true, start: at, end: at + 1 })
          at += 1
        } else {
          walk(child)
        }
      }
    }
  }
  walk(element)
  return pieces
}

function spliceElementText(element, before, after, raw) {
  if (before === after) return
  const document = element.ownerDocument
  let head = 0
  while (head < before.length && head < after.length && before[head] === after[head]) head++
  let tail = 0
  while (
    tail < before.length - head
    && tail < after.length - head
    && before[before.length - 1 - tail] === after[after.length - 1 - tail]
  ) tail++
  const from = head
  const to = before.length - tail
  const insert = after.slice(head, after.length - tail)

  const pieces = textPieces(element)
  const texts = pieces.filter((piece) => !piece.br && piece.start <= from && from <= piece.end)
  // A deletion starts in the piece holding its first character; an insertion
  // at a boundary joins the copy before it.
  let anchor = (to > from ? texts.find((piece) => from < piece.end) : null) || texts[0] || null
  if (!anchor) {
    const node = document.createTextNode('')
    const next = pieces.find((piece) => piece.start >= from)
    if (next) next.node.parentNode.insertBefore(node, next.node)
    else element.appendChild(node)
    anchor = { node, br: false, start: from, end: from }
  }

  // Drop the old copy the edit replaced, after the anchor.
  for (const piece of pieces) {
    if (piece === anchor || piece.end <= from || piece.start >= to || piece.start < anchor.start) continue
    if (piece.br || (piece.start >= from && piece.end <= to)) {
      piece.node.remove()
    } else {
      piece.node.nodeValue = piece.node.nodeValue.slice(to - piece.start)
    }
  }

  const value = anchor.node.nodeValue || ''
  const keepBefore = value.slice(0, from - anchor.start)
  const keepAfter = value.slice(Math.min(to, anchor.end) - anchor.start)
  const lines = raw ? [insert] : insert.split('\n')
  if (lines.length === 1) {
    anchor.node.nodeValue = keepBefore + insert + keepAfter
  } else {
    anchor.node.nodeValue = keepBefore + lines[0]
    // lineNodes starts with the first new line; a <br> goes before it.
    const nodes = [document.createElement('br'), ...lineNodes(document, lines.slice(1).join('\n'))]
    const last = lines[lines.length - 1]
    if (keepAfter) {
      if (last && nodes[nodes.length - 1].nodeType === 3) nodes[nodes.length - 1].nodeValue += keepAfter
      else nodes.push(document.createTextNode(keepAfter))
    }
    anchor.node.after(...nodes)
  }
  if (!anchor.node.nodeValue) anchor.node.remove()
}
