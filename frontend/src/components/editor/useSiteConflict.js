import { useRef, useState } from 'react'

// The server's answer to a save made from an out-of-date copy of the site:
// another tab or device saved in between, and nothing was written.
export function isSiteChanged(error) {
  return error?.response?.status === 409 && error.response.data?.code === 'site_changed'
}

// Two tabs on one site. Every save sends the revision this editor works from
// (`baseRevisionRef`, Site.revision on the server). When another tab or device
// has saved since, the server refuses and the conflict dialog asks which
// version wins: before, the later save silently replaced the other one's work.
export function useSiteConflict() {
  const [open, setOpen] = useState(false)
  const baseRevisionRef = useRef(null)
  // An explicit publish or unpublish that was refused. "Save mine anyway"
  // sends it again; a queued ordinary save must not replace it.
  const publicationRef = useRef(undefined)
  // Counts refusals, so a save that failed can tell a conflict from any other
  // failure.
  const countRef = useRef(0)
  // What the refused save was for (leaving the editor). "Save mine anyway"
  // finishes it, instead of asking all over again.
  const afterOverwriteRef = useRef(null)

  function refuse({ publish } = {}) {
    if (typeof publish === 'boolean') publicationRef.current = publish
    countRef.current += 1
    setOpen(true)
  }

  // A save went through: whatever was in conflict is settled.
  function resolve() {
    setOpen(false)
    publicationRef.current = undefined
  }

  async function saveThen(saveFn, then) {
    const before = countRef.current
    const saved = await saveFn()
    if (saved) then()
    else afterOverwriteRef.current = countRef.current !== before ? then : null
  }

  // "Save mine anyway": saved without the revision, so the server takes it.
  async function overwrite(saveFn) {
    setOpen(false)
    const then = afterOverwriteRef.current
    afterOverwriteRef.current = null
    const saved = await saveFn(publicationRef.current)
    if (saved && then) then()
  }

  return { open, baseRevisionRef, refuse, resolve, saveThen, overwrite }
}
