import { afterEach, describe, expect, it, vi } from 'vitest'
import { isPickerCancel, openLocalHtmlFile, saveAsLocalHtmlFile, supportsLocalFiles, writeHtmlToHandle } from './localFile.js'

afterEach(() => vi.unstubAllGlobals())

function writableFile() {
  const writable = { write: vi.fn().mockResolvedValue(), close: vi.fn().mockResolvedValue(), abort: vi.fn().mockResolvedValue() }
  const handle = { name: 'index.html', createWritable: vi.fn().mockResolvedValue(writable) }
  return { handle, writable }
}

describe('linked local HTML files', () => {
  it('detects native picker support and reads the selected file without writing to it', async () => {
    expect(supportsLocalFiles()).toBe(false)
    const handle = { name: 'about.htm', getFile: vi.fn().mockResolvedValue({ text: async () => '<p>About</p>' }) }
    const picker = vi.fn().mockResolvedValue([handle])
    vi.stubGlobal('showOpenFilePicker', picker)
    expect(supportsLocalFiles()).toBe(true)
    await expect(openLocalHtmlFile()).resolves.toEqual({ handle, name: 'about.htm', html: '<p>About</p>' })
    expect(picker).toHaveBeenCalledWith(expect.objectContaining({ multiple: false }))
  })

  it('opens a page saved in the Turkish Windows encoding with its letters intact', async () => {
    // '<meta charset="windows-1254"><p>şığİ</p>' as that encoding writes it.
    const saved = new Uint8Array([
      ...[...'<meta charset="windows-1254"><p>'].map((letter) => letter.charCodeAt(0)),
      0xfe, 0xfd, 0xf0, 0xdd,
      ...[...'</p>'].map((letter) => letter.charCodeAt(0)),
    ])
    const onDisk = { arrayBuffer: async () => saved.buffer, text: async () => new TextDecoder().decode(saved) }
    const handle = { name: 'eski.html', getFile: vi.fn().mockResolvedValue(onDisk) }
    vi.stubGlobal('showOpenFilePicker', vi.fn().mockResolvedValue([handle]))

    // Save writes this text back to the same file as UTF-8, so it has to say so.
    await expect(openLocalHtmlFile()).resolves.toEqual({
      handle, name: 'eski.html', html: '<meta charset="utf-8"><p>şığİ</p>',
    })
  })

  it('propagates cancellation so callers can distinguish it from file read errors', async () => {
    const cancelled = new DOMException('Cancelled', 'AbortError')
    vi.stubGlobal('showOpenFilePicker', vi.fn().mockRejectedValue(cancelled))
    await expect(openLocalHtmlFile()).rejects.toBe(cancelled)
    expect(isPickerCancel(cancelled)).toBe(true)
    expect(isPickerCancel(new DOMException('Denied', 'NotAllowedError'))).toBe(false)
  })

  it('does not treat an unreadable file as an empty document', async () => {
    vi.stubGlobal('showOpenFilePicker', vi.fn().mockResolvedValue([{ getFile: vi.fn().mockRejectedValue(new Error('file removed')) }]))
    await expect(openLocalHtmlFile()).rejects.toThrow('file removed')
  })

  it('returns a Save As handle only after the replacement was committed', async () => {
    const { handle, writable } = writableFile()
    let finishClose
    writable.close.mockReturnValue(new Promise((resolve) => { finishClose = resolve }))
    const picker = vi.fn().mockResolvedValue(handle)
    vi.stubGlobal('showSaveFilePicker', picker)
    let finished = false
    const result = saveAsLocalHtmlFile('<h1>New</h1>', 'new-page.html').then((value) => { finished = true; return value })
    await vi.waitFor(() => expect(writable.close).toHaveBeenCalledOnce())
    expect(finished).toBe(false)
    expect(picker).toHaveBeenCalledWith(expect.objectContaining({ suggestedName: 'new-page.html' }))
    finishClose()
    await expect(result).resolves.toEqual({ handle, name: 'index.html' })
  })

  it('does not offer a linked Save As handle after a write failure', async () => {
    const { handle, writable } = writableFile()
    writable.write.mockRejectedValue(new Error('disk full'))
    vi.stubGlobal('showSaveFilePicker', vi.fn().mockResolvedValue(handle))
    await expect(saveAsLocalHtmlFile('new')).rejects.toThrow('disk full')
    expect(writable.abort).toHaveBeenCalledOnce()
    expect(writable.close).not.toHaveBeenCalled()
  })

  it('does not open the file for writing when permission stays denied', async () => {
    const { handle } = writableFile()
    handle.queryPermission = vi.fn().mockResolvedValue('prompt')
    handle.requestPermission = vi.fn().mockResolvedValue('denied')
    await expect(writeHtmlToHandle(handle, 'new')).rejects.toThrow('linked file was declined')
    expect(handle.requestPermission).toHaveBeenCalledWith({ mode: 'readwrite' })
    expect(handle.createWritable).not.toHaveBeenCalled()
  })

  it('re-requests permission and writes the requested document exactly', async () => {
    const { handle, writable } = writableFile()
    handle.queryPermission = vi.fn().mockResolvedValue('prompt')
    handle.requestPermission = vi.fn().mockResolvedValue('granted')
    await writeHtmlToHandle(handle, '<p>Türkçe &amp; HTML</p>')
    expect(writable.write).toHaveBeenCalledWith('<p>Türkçe &amp; HTML</p>')
    expect(writable.close).toHaveBeenCalledOnce()
    expect(writable.abort).not.toHaveBeenCalled()
  })

  it('clears a file with an intentionally empty document without requesting an existing grant', async () => {
    const { handle, writable } = writableFile()
    handle.queryPermission = vi.fn().mockResolvedValue('granted')
    handle.requestPermission = vi.fn()
    await writeHtmlToHandle(handle, null)
    expect(writable.write).toHaveBeenCalledWith('')
    expect(handle.requestPermission).not.toHaveBeenCalled()
  })

  it.each(['write', 'close'])('aborts a failing %s and preserves the original error even when abort fails', async (phase) => {
    const { handle, writable } = writableFile()
    const failure = new Error(`${phase} failed`)
    writable[phase].mockRejectedValue(failure)
    writable.abort.mockRejectedValue(new Error('already errored'))
    await expect(writeHtmlToHandle(handle, 'new')).rejects.toBe(failure)
    expect(writable.abort).toHaveBeenCalledOnce()
    if (phase === 'write') expect(writable.close).not.toHaveBeenCalled()
  })
})
