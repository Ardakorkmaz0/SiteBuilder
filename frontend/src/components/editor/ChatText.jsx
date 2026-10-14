// The assistant's replies, with the little Markdown models write: **bold**,
// `code`, headings and bullet or numbered lists. Shown raw, a reply was a wall
// of asterisks and dashes. Built as React elements from plain text, never as
// HTML, so nothing in a reply can become markup.

const BULLET = /^\s*[-*•]\s+(.*)$/
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/
const HEADING = /^\s*#{1,6}\s+(.*)$/

// **bold** and `code` inside one line.
function inline(text, keyBase) {
  const out = []
  const pattern = /\*\*([^*]+)\*\*|`([^`]+)`/g
  let last = 0
  let match
  let n = 0
  while ((match = pattern.exec(text))) {
    if (match.index > last) out.push(text.slice(last, match.index))
    if (match[1] !== undefined) out.push(<strong key={`${keyBase}-b${n}`}>{match[1]}</strong>)
    else out.push(<code key={`${keyBase}-c${n}`} className="rounded bg-[var(--studio-control)] px-1 font-mono text-[0.92em]">{match[2]}</code>)
    last = match.index + match[0].length
    n += 1
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export default function ChatText({ text }) {
  const lines = String(text || '').split('\n')
  const blocks = []
  let list = null
  const closeList = () => {
    if (list) blocks.push(list)
    list = null
  }
  lines.forEach((line, i) => {
    const bullet = line.match(BULLET)
    const numbered = !bullet && line.match(NUMBERED)
    if (bullet || numbered) {
      const kind = bullet ? 'ul' : 'ol'
      if (!list || list.kind !== kind) {
        closeList()
        list = { kind, key: `l${i}`, items: [] }
      }
      list.items.push(<li key={`i${i}`}>{inline((bullet || numbered)[1], `i${i}`)}</li>)
      return
    }
    closeList()
    const heading = line.match(HEADING)
    if (heading) {
      blocks.push(<p key={`h${i}`} className="font-semibold">{inline(heading[1], `h${i}`)}</p>)
    } else if (line.trim()) {
      blocks.push(<p key={`p${i}`}>{inline(line, `p${i}`)}</p>)
    } else if (blocks.length) {
      blocks.push(<div key={`s${i}`} className="h-1.5" aria-hidden />)
    }
  })
  closeList()
  return blocks.map((block) => {
    if (!block.kind) return block
    const List = block.kind
    return (
      <List key={block.key} className={`my-0.5 space-y-0.5 pl-4 ${block.kind === 'ul' ? 'list-disc' : 'list-decimal'}`}>
        {block.items}
      </List>
    )
  })
}
