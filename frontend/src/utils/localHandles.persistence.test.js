import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearLocalFileHandle, loadLocalFileHandle, storeLocalFileHandle } from './localFile.js'
import { clearProjectRoot, loadProjectRoot, rememberProjectRoot } from './projectFs.js'

const stores = [
  {
    name: 'linked HTML handle', key: '42',
    save: (handle) => storeLocalFileHandle(42, handle),
    load: () => loadLocalFileHandle(42),
    clear: () => clearLocalFileHandle(42),
  },
  {
    name: 'project root handle', key: 'code-project-root',
    save: rememberProjectRoot, load: loadProjectRoot, clear: clearProjectRoot,
  },
]

function database() {
  const request = { result: undefined }
  const store = { put: vi.fn(() => request), get: vi.fn(() => request), delete: vi.fn(() => request) }
  const transaction = { objectStore: vi.fn(() => store), error: null }
  const db = { transaction: vi.fn(() => transaction), close: vi.fn(), createObjectStore: vi.fn() }
  const opening = { result: db, error: null }
  const open = vi.fn(() => opening)
  vi.stubGlobal('indexedDB', { open })
  return { request, store, transaction, db, opening, open }
}

async function opened(database) {
  database.opening.onsuccess()
  await vi.waitFor(() => expect(database.db.transaction).toHaveBeenCalled())
}

afterEach(() => vi.unstubAllGlobals())

describe.each(stores)('$name persistence', (api) => {
  it('waits for the write transaction to commit before reporting completion', async () => {
    const db = database()
    const handle = { kind: 'file', name: 'index.html' }
    let finished = false
    const operation = api.save(handle).then(() => { finished = true })
    expect(db.open).toHaveBeenCalledWith('pwb-local-files', 1)
    await opened(db)
    expect(db.db.transaction).toHaveBeenCalledWith('handles', 'readwrite')
    expect(db.store.put).toHaveBeenCalledWith(handle, api.key)
    await Promise.resolve()
    expect(finished).toBe(false)
    expect(db.db.close).not.toHaveBeenCalled()
    db.transaction.oncomplete()
    await operation
    expect(finished).toBe(true)
    expect(db.db.close).toHaveBeenCalledOnce()
  })

  it('returns a loaded handle only after its readonly transaction completes', async () => {
    const db = database()
    const handle = { name: 'saved handle' }
    let finished = false
    const operation = api.load().then((value) => { finished = true; return value })
    await opened(db)
    expect(db.db.transaction).toHaveBeenCalledWith('handles', 'readonly')
    expect(db.store.get).toHaveBeenCalledWith(api.key)
    db.request.result = handle
    await Promise.resolve()
    expect(finished).toBe(false)
    db.transaction.oncomplete()
    await expect(operation).resolves.toBe(handle)
    expect(db.db.close).toHaveBeenCalledOnce()
  })

  it('returns null rather than leaking an uncommitted result when a read transaction aborts', async () => {
    const db = database()
    const operation = api.load()
    await opened(db)
    db.request.result = { name: 'result from an aborted transaction' }
    db.transaction.error = new DOMException('Aborted', 'AbortError')
    db.transaction.onabort()
    await expect(operation).resolves.toBeNull()
    expect(db.db.close).toHaveBeenCalledOnce()
  })

  it('treats a failed write transaction as best effort and closes its connection', async () => {
    const db = database()
    const operation = api.save({ name: 'handle' })
    await opened(db)
    db.transaction.error = new DOMException('Full', 'QuotaExceededError')
    db.transaction.onerror()
    await expect(operation).resolves.toBeUndefined()
    expect(db.db.close).toHaveBeenCalledOnce()
  })

  it('waits for handle removal to commit', async () => {
    const db = database()
    let finished = false
    const operation = api.clear().then(() => { finished = true })
    await opened(db)
    expect(db.store.delete).toHaveBeenCalledWith(api.key)
    expect(finished).toBe(false)
    db.transaction.oncomplete()
    await operation
    expect(db.db.close).toHaveBeenCalledOnce()
  })

  it('falls back to null when the database cannot be opened', async () => {
    const db = database()
    const operation = api.load()
    db.opening.error = new DOMException('Storage disabled', 'SecurityError')
    db.opening.onerror()
    await expect(operation).resolves.toBeNull()
    expect(db.db.transaction).not.toHaveBeenCalled()
  })

  it('closes an opened database after a synchronous structured-clone failure', async () => {
    const db = database()
    db.store.put.mockImplementation(() => { throw new DOMException('Cannot clone', 'DataCloneError') })
    const operation = api.save({ name: 'not cloneable' })
    await opened(db)
    await expect(operation).resolves.toBeUndefined()
    expect(db.db.close).toHaveBeenCalledOnce()
  })

  it('creates the handles store during the first database upgrade', async () => {
    const db = database()
    const operation = api.load()
    db.opening.onupgradeneeded()
    expect(db.db.createObjectStore).toHaveBeenCalledWith('handles')
    await opened(db)
    db.transaction.oncomplete()
    await expect(operation).resolves.toBeNull()
  })

  it('keeps editing available when IndexedDB is unavailable', async () => {
    vi.stubGlobal('indexedDB', undefined)
    await expect(api.save({ name: 'handle' })).resolves.toBeUndefined()
    await expect(api.load()).resolves.toBeNull()
    await expect(api.clear()).resolves.toBeUndefined()
  })
})
