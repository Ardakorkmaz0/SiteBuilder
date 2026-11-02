// The colour of each file in the editor's list: 'live' (green), 'older' (blue:
// what visitors get is older than this file) or 'none' (red: not live).
//
// The server knows how each SAVED page compares with what is live. Work not
// saved yet is older-than-the-file too, so a page that differs from its last
// saved form never shows as live. Pages and documents are compared by identity
// and by value: an edit replaces the object, so this stays cheap on every render.
export function pageLiveStates(pages, serverStates = {}, saved = null, html = {}, typingPageId = null) {
  const savedPages = new Map((saved?.pages || []).map((page) => [page.id, page]))
  const states = {}
  for (const page of pages || []) {
    const server = serverStates[page.id]
    if (!server) {
      states[page.id] = 'none'
      continue
    }
    const edited = page.id === typingPageId
      || (saved && (savedPages.get(page.id) !== page || (saved.html?.[page.id] ?? '') !== (html?.[page.id] ?? '')))
    states[page.id] = edited ? 'older' : server
  }
  return states
}
