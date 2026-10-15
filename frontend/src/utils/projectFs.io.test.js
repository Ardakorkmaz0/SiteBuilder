import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  assetDataUrl,
  copyProjectTo,
  ensureReadPermission,
  openProjectFolder,
  readProject,
  writeFileToHandle,
} from './projectFs.js'

function file(name, contents = '') {
  return { name, kind: 'file', getFile: vi.fn(async () => ({ text: async () => contents })) }
}

function directory(name, children) {
  return { name, kind: 'directory', async *values() { yield* children } }
}

function writableFile() {
  const writable = { write: vi.fn().mockResolvedValue(), close: vi.fn().mockResolvedValue(), abort: vi.fn().mockResolvedValue() }
  const handle = { createWritable: vi.fn().mockResolvedValue(writable) }
  return { writable, handle }
}

afterEach(() => vi.unstubAllGlobals())

describe('opening a local project', () => {
  it('walks included web files recursively, skips noisy folders, and leaves assets unread', async () => {
    const asset = file('logo.PNG')
    const skipped = directory('node_modules', [file('huge.js')])
    skipped.values = vi.fn(() => { throw new Error('must not walk dependencies') })
    const root = directory('site', [
      file('readme.md', 'hidden'),
      directory('.git', [file('config.js')]),
      skipped,
      directory('assets', [asset, file('site.css', 'body{}')]),
      file('index.htm', '<h1>Home</h1>'),
    ])

    const project = await readProject(root)

    expect(project.rootHandle).toBe(root)
    expect(project.files.map(({ path, kind, content }) => ({ path, kind, content }))).toEqual([
      { path: 'assets/logo.PNG', kind: 'asset', content: null },
      { path: 'assets/site.css', kind: 'css', content: 'body{}' },
      { path: 'index.htm', kind: 'html', content: '<h1>Home</h1>' },
    ])
    expect(asset.getFile).not.toHaveBeenCalled()
    expect(skipped.values).not.toHaveBeenCalled()
  })

  it.each(['getFile', 'text'])('rejects an unreadable document at %s instead of replacing it with empty text', async (failureAt) => {
    const blocked = file('protected.html')
    const error = new DOMException('Access denied', 'NotAllowedError')
    if (failureAt === 'getFile') blocked.getFile.mockRejectedValue(error)
    else blocked.getFile.mockResolvedValue({ text: vi.fn().mockRejectedValue(error) })

    await expect(readProject(directory('site', [directory('pages', [blocked])]))).rejects.toMatchObject({
      message: 'Could not read pages/protected.html: Access denied', cause: error,
    })
  })

  it('propagates a directory traversal failure rather than opening a partial project', async () => {
    const root = directory('site', [])
    root.values = async function* () {
      yield file('index.html', 'home')
      throw new DOMException('Folder was removed', 'NotFoundError')
    }
    await expect(readProject(root)).rejects.toThrow('Folder was removed')
  })

  it('requests folder write access and preserves picker cancellation', async () => {
    const root = directory('site', [file('index.html', 'home')])
    const picker = vi.fn().mockResolvedValueOnce(root).mockRejectedValueOnce(new DOMException('Cancelled', 'AbortError'))
    vi.stubGlobal('showDirectoryPicker', picker)
    await expect(openProjectFolder()).resolves.toMatchObject({ rootHandle: root })
    expect(picker).toHaveBeenCalledWith({ mode: 'readwrite' })
    await expect(openProjectFolder()).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('requests a dropped read grant and returns false when access remains denied', async () => {
    const handle = { queryPermission: vi.fn().mockResolvedValue('prompt'), requestPermission: vi.fn().mockResolvedValue('denied') }
    await expect(ensureReadPermission(handle)).resolves.toBe(false)
    expect(handle.queryPermission).toHaveBeenCalledWith({ mode: 'read' })
    expect(handle.requestPermission).toHaveBeenCalledWith({ mode: 'read' })
  })

  it('does not request a new permission when read access is already granted', async () => {
    const handle = { queryPermission: vi.fn().mockResolvedValue('granted'), requestPermission: vi.fn() }
    await expect(ensureReadPermission(handle)).resolves.toBe(true)
    expect(handle.requestPermission).not.toHaveBeenCalled()
  })
})

describe('local project writes', () => {
  it('does not open a writable when readwrite permission is denied', async () => {
    const { handle } = writableFile()
    handle.queryPermission = vi.fn().mockResolvedValue('prompt')
    handle.requestPermission = vi.fn().mockResolvedValue('denied')
    await expect(writeFileToHandle(handle, 'new text')).rejects.toThrow('Write permission for the folder was declined.')
    expect(handle.createWritable).not.toHaveBeenCalled()
  })

  it('re-requests a dropped grant and commits empty text as a valid document', async () => {
    const { handle, writable } = writableFile()
    handle.queryPermission = vi.fn().mockResolvedValue('prompt')
    handle.requestPermission = vi.fn().mockResolvedValue('granted')
    await writeFileToHandle(handle, null)
    expect(handle.requestPermission).toHaveBeenCalledWith({ mode: 'readwrite' })
    expect(writable.write).toHaveBeenCalledWith('')
    expect(writable.close).toHaveBeenCalledOnce()
    expect(writable.abort).not.toHaveBeenCalled()
  })

  it.each(['write', 'close'])('aborts a failed %s so the file lock can be released for retry', async (phase) => {
    const { handle, writable } = writableFile()
    const failure = new Error(`${phase} failed`)
    writable[phase].mockRejectedValue(failure)
    await expect(writeFileToHandle(handle, 'document')).rejects.toBe(failure)
    expect(writable.abort).toHaveBeenCalledOnce()
    if (phase === 'write') expect(writable.close).not.toHaveBeenCalled()
  })

  it('preserves the actual write failure when abort also fails', async () => {
    const { handle, writable } = writableFile()
    const failure = new Error('disk full')
    writable.write.mockRejectedValue(failure)
    writable.abort.mockRejectedValue(new Error('stream is already errored'))
    await expect(writeFileToHandle(handle, 'document')).rejects.toBe(failure)
  })

  it('copies text edits and original binary bytes into the same nested structure', async () => {
    const text = writableFile()
    const image = writableFile()
    const child = { getFileHandle: vi.fn().mockResolvedValue(image.handle) }
    const target = {
      getFileHandle: vi.fn().mockResolvedValue(text.handle),
      getDirectoryHandle: vi.fn().mockResolvedValue(child),
    }
    const bytes = new Blob([Uint8Array.from([0, 255, 128])], { type: 'image/png' })
    const source = { getFile: vi.fn().mockResolvedValue(bytes) }

    await copyProjectTo(target, [
      { path: 'index.html', kind: 'html', content: 'current edits' },
      { path: 'assets/photo.png', kind: 'asset', handle: source },
    ])

    expect(text.writable.write).toHaveBeenCalledWith('current edits')
    expect(target.getDirectoryHandle).toHaveBeenCalledWith('assets', { create: true })
    expect(child.getFileHandle).toHaveBeenCalledWith('photo.png', { create: true })
    expect(image.writable.write).toHaveBeenCalledWith(bytes)
    expect(source.getFile).toHaveBeenCalledOnce()
    expect(text.writable.close).toHaveBeenCalledOnce()
    expect(image.writable.close).toHaveBeenCalledOnce()
  })

  it('does not lock the copy destination when its asset source cannot be read', async () => {
    const { handle } = writableFile()
    const target = { getFileHandle: vi.fn().mockResolvedValue(handle) }
    await expect(copyProjectTo(target, [{
      path: 'missing.png', kind: 'asset', handle: { getFile: vi.fn().mockRejectedValue(new Error('source deleted')) },
    }])).rejects.toThrow('source deleted')
    expect(handle.createWritable).not.toHaveBeenCalled()
  })

  it('does not create target files when folder write permission is declined', async () => {
    const target = {
      queryPermission: vi.fn().mockResolvedValue('prompt'),
      requestPermission: vi.fn().mockResolvedValue('denied'),
      getFileHandle: vi.fn(),
    }
    await expect(copyProjectTo(target, [{ path: 'index.html', kind: 'html', content: 'home' }])).rejects.toThrow('target folder was declined')
    expect(target.getFileHandle).not.toHaveBeenCalled()
  })

  it('aborts the failed destination and stops copying later files', async () => {
    const { handle, writable } = writableFile()
    writable.write.mockRejectedValue(new Error('disk full'))
    const target = { getFileHandle: vi.fn().mockResolvedValue(handle) }
    await expect(copyProjectTo(target, [
      { path: 'a.html', kind: 'html', content: 'a' },
      { path: 'b.html', kind: 'html', content: 'b' },
    ])).rejects.toThrow('disk full')
    expect(writable.abort).toHaveBeenCalledOnce()
    expect(writable.close).not.toHaveBeenCalled()
    expect(target.getFileHandle).toHaveBeenCalledTimes(1)
  })
})

describe('asset previews', () => {
  it('encodes large non-ASCII binary assets without truncating a chunk boundary', async () => {
    const bytes = Uint8Array.from({ length: 0x8000 + 11 }, (_, index) => index % 256)
    const url = await assetDataUrl({ getFile: async () => ({ type: 'image/png', arrayBuffer: async () => bytes.buffer }) })
    expect(url.startsWith('data:image/png;base64,')).toBe(true)
    const binary = atob(url.split(',')[1])
    expect(Uint8Array.from(binary, (character) => character.charCodeAt(0))).toEqual(bytes)
  })

  it('falls back to an empty preview URL when an asset disappears', async () => {
    await expect(assetDataUrl({ getFile: vi.fn().mockRejectedValue(new Error('deleted')) })).resolves.toBe('')
  })
})
