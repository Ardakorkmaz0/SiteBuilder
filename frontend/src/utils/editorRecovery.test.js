import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearEditorRecovery, readEditorRecovery, writeEditorRecovery } from './editorRecovery.js'

const project = { schema: { pages: [{ id: 'home', html: '<h1>Unsaved</h1>' }] }, title: 'Draft' }
afterEach(() => { vi.restoreAllMocks(); sessionStorage.clear() })

describe('editor recovery storage', () => {
  it('isolates drafts by account and site and preserves all page HTML', () => {
    const draft = writeEditorRecovery(7, 2, project)
    expect(readEditorRecovery(7, 2)).toEqual(draft)
    expect(readEditorRecovery(8, 2)).toBeNull()
    expect(readEditorRecovery(7, 3)).toBeNull()
    expect(draft.schema.pages[0].html).toContain('Unsaved')
  })

  it('does not clear a newer draft from another tab', () => {
    const first = writeEditorRecovery(7, 2, project)
    const newer = writeEditorRecovery(7, 2, { ...project, title: 'Newer' })
    clearEditorRecovery(7, 2, first.id)
    expect(readEditorRecovery(7, 2)?.id).toBe(newer.id)
    clearEditorRecovery(7, 2, newer.id)
    expect(readEditorRecovery(7, 2)).toBeNull()
  })

  it('falls back to tab storage when persistent storage is full', () => {
    const old = writeEditorRecovery(7, 2, { ...project, title: 'Old draft' })
    const setItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (this === localStorage) throw new DOMException('Full', 'QuotaExceededError')
      return setItem.call(this, key, value)
    })
    const latest = writeEditorRecovery(7, 2, project)
    expect(latest.savedAt).toBeGreaterThan(old.savedAt)
    expect(readEditorRecovery(7, 2)?.title).toBe('Draft')
    clearEditorRecovery(7, 2, latest.id)
    expect(readEditorRecovery(7, 2)).toBeNull()
  })

  it('reports complete storage failure instead of promising a backup', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Full') })
    expect(writeEditorRecovery(7, 2, project)).toBeNull()
  })
})
