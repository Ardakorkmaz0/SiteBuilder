import { beforeEach, describe, expect, it, vi } from 'vitest'

const fsMocks = vi.hoisted(() => ({
  writeFileToHandle: vi.fn(),
  copyProjectTo: vi.fn(),
}))

vi.mock('../utils/projectFs.js', () => ({
  buildTree: vi.fn(() => ({ children: [] })),
  compactTree: vi.fn((tree) => tree),
  copyProjectTo: fsMocks.copyProjectTo,
  rememberProjectRoot: vi.fn(),
  clearProjectRoot: vi.fn(),
  isTextKind: (kind) => ['html', 'css', 'js'].includes(kind),
  writeFileToHandle: fsMocks.writeFileToHandle,
}))

import { useProjectStore } from './projectStore.js'

function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function openProject(files) {
  useProjectStore.getState().setProject({
    rootHandle: { name: 'demo' },
    files: files.map(({ path, content }) => ({
      path,
      name: path.split('/').at(-1),
      kind: 'html',
      content,
      handle: { path },
    })),
  })
}

describe('project save revisions', () => {
  beforeEach(() => {
    fsMocks.writeFileToHandle.mockReset()
    fsMocks.copyProjectTo.mockReset()
    useProjectStore.setState({
      rootHandle: null,
      rootName: '',
      files: new Map(),
      tree: null,
      dirty: new Set(),
      activePath: null,
      saving: false,
      error: '',
    })
  })

  it('keeps edits made while saveFile is in flight dirty', async () => {
    const write = deferred()
    fsMocks.writeFileToHandle.mockReturnValueOnce(write.promise)
    openProject([{ path: 'index.html', content: 'initial' }])
    useProjectStore.getState().updateFile('index.html', 'sent')

    const saving = useProjectStore.getState().saveFile('index.html')
    await vi.waitFor(() => expect(fsMocks.writeFileToHandle).toHaveBeenCalledTimes(1))
    expect(fsMocks.writeFileToHandle).toHaveBeenCalledWith({ path: 'index.html' }, 'sent')
    useProjectStore.getState().updateFile('index.html', 'typed later')
    write.resolve()
    await saving

    const state = useProjectStore.getState()
    expect(state.files.get('index.html')).toMatchObject({
      content: 'typed later',
      original: 'sent',
    })
    expect(state.dirty.has('index.html')).toBe(true)
  })

  it('acknowledges each saveAll snapshot without overwriting newer text', async () => {
    const first = deferred()
    const second = deferred()
    fsMocks.writeFileToHandle
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    openProject([
      { path: 'a.html', content: 'a0' },
      { path: 'b.html', content: 'b0' },
    ])
    useProjectStore.getState().updateFile('a.html', 'a1')
    useProjectStore.getState().updateFile('b.html', 'b1')

    const saving = useProjectStore.getState().saveAll()
    useProjectStore.getState().updateFile('a.html', 'a2')
    useProjectStore.getState().updateFile('b.html', 'b2')
    first.resolve()
    await vi.waitFor(() => expect(fsMocks.writeFileToHandle).toHaveBeenCalledTimes(2))
    second.resolve()
    await saving

    const state = useProjectStore.getState()
    expect(state.files.get('a.html')).toMatchObject({ content: 'a2', original: 'a1' })
    expect(state.files.get('b.html')).toMatchObject({ content: 'b2', original: 'b1' })
    expect([...state.dirty].sort()).toEqual(['a.html', 'b.html'])
  })

  it('keeps successful earlier writes accurate when a later write fails', async () => {
    fsMocks.writeFileToHandle
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('disk full'))
    openProject([
      { path: 'a.html', content: 'a0' },
      { path: 'b.html', content: 'b0' },
    ])
    useProjectStore.getState().updateFile('a.html', 'a1')
    useProjectStore.getState().updateFile('b.html', 'b1')

    await useProjectStore.getState().saveAll()

    const state = useProjectStore.getState()
    expect(state.dirty.has('a.html')).toBe(false)
    expect(state.dirty.has('b.html')).toBe(true)
    expect(state.error).toBe('disk full')
  })

  it('serializes saves so an older write cannot replace the latest document on disk', async () => {
    const first = deferred()
    let disk = 'initial'
    fsMocks.writeFileToHandle.mockImplementation(async (_handle, content) => {
      if (content === 'first edit') await first.promise
      disk = content
    })
    openProject([{ path: 'index.html', content: disk }])
    useProjectStore.getState().updateFile('index.html', 'first edit')
    const firstSave = useProjectStore.getState().saveFile('index.html')
    await vi.waitFor(() => expect(fsMocks.writeFileToHandle).toHaveBeenCalledTimes(1))
    useProjectStore.getState().updateFile('index.html', 'latest edit')
    const secondSave = useProjectStore.getState().saveFile('index.html')

    await Promise.resolve()
    expect(fsMocks.writeFileToHandle).toHaveBeenCalledTimes(1)
    first.resolve()
    await Promise.all([firstSave, secondSave])

    expect(disk).toBe('latest edit')
    expect(useProjectStore.getState().files.get('index.html').original).toBe('latest edit')
    expect(useProjectStore.getState().dirty.size).toBe(0)
    expect(useProjectStore.getState().saving).toBe(false)
  })

  it('keeps saving true while a later save is queued and clears an earlier failure after retry', async () => {
    const first = deferred()
    const second = deferred()
    fsMocks.writeFileToHandle.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    openProject([{ path: 'index.html', content: 'initial' }])
    useProjectStore.getState().updateFile('index.html', 'edited')
    const failed = useProjectStore.getState().saveAll()
    const retried = useProjectStore.getState().saveFile('index.html')
    first.reject(new Error('temporary permission failure'))
    await failed
    await vi.waitFor(() => expect(fsMocks.writeFileToHandle).toHaveBeenCalledTimes(2))
    expect(useProjectStore.getState().saving).toBe(true)
    second.resolve()
    await retried
    expect(useProjectStore.getState().saving).toBe(false)
    expect(useProjectStore.getState().error).toBe('')
    expect(useProjectStore.getState().dirty.size).toBe(0)
  })

  it('saves a reverted document when Save All is requested behind a pending write', async () => {
    const first = deferred()
    fsMocks.writeFileToHandle.mockReturnValueOnce(first.promise).mockResolvedValueOnce()
    openProject([{ path: 'index.html', content: 'original' }])
    useProjectStore.getState().updateFile('index.html', 'pending edit')
    const saving = useProjectStore.getState().saveFile('index.html')
    await vi.waitFor(() => expect(fsMocks.writeFileToHandle).toHaveBeenCalledTimes(1))
    useProjectStore.getState().updateFile('index.html', 'original')
    expect(useProjectStore.getState().dirty.size).toBe(0)
    const reverted = useProjectStore.getState().saveAll()
    first.resolve()
    await Promise.all([saving, reverted])

    expect(fsMocks.writeFileToHandle).toHaveBeenLastCalledWith({ path: 'index.html' }, 'original')
    expect(useProjectStore.getState().files.get('index.html').original).toBe('original')
    expect(useProjectStore.getState().dirty.size).toBe(0)
  })

  it('does not apply an old folder save to a new folder with the same file path', async () => {
    const write = deferred()
    fsMocks.writeFileToHandle.mockReturnValueOnce(write.promise)
    openProject([{ path: 'index.html', content: 'old folder' }])
    const oldSession = useProjectStore.getState().projectSessionId
    useProjectStore.getState().updateFile('index.html', 'old edits')
    const saving = useProjectStore.getState().saveFile('index.html')
    await vi.waitFor(() => expect(fsMocks.writeFileToHandle).toHaveBeenCalledTimes(1))
    openProject([{ path: 'index.html', content: 'new folder' }])
    useProjectStore.getState().updateFile('index.html', 'new edits')
    expect(useProjectStore.getState().saving).toBe(false)
    expect(useProjectStore.getState().projectSessionId).toBeGreaterThan(oldSession)
    write.resolve()
    await expect(saving).resolves.toBe(false)

    expect(useProjectStore.getState().files.get('index.html')).toMatchObject({
      content: 'new edits', original: 'new folder',
    })
    expect(useProjectStore.getState().dirty.has('index.html')).toBe(true)
  })

  it('does not publish an old folder failure over a new folder save in progress', async () => {
    const oldWrite = deferred()
    const newWrite = deferred()
    fsMocks.writeFileToHandle.mockReturnValueOnce(oldWrite.promise).mockReturnValueOnce(newWrite.promise)
    openProject([{ path: 'index.html', content: 'old' }])
    const oldSave = useProjectStore.getState().saveFile('index.html')
    await vi.waitFor(() => expect(fsMocks.writeFileToHandle).toHaveBeenCalledTimes(1))
    openProject([{ path: 'index.html', content: 'new' }])
    const newSave = useProjectStore.getState().saveFile('index.html')
    await vi.waitFor(() => expect(fsMocks.writeFileToHandle).toHaveBeenCalledTimes(2))
    oldWrite.reject(new Error('old folder denied'))
    await oldSave

    expect(useProjectStore.getState().saving).toBe(true)
    expect(useProjectStore.getState().error).toBe('')
    newWrite.resolve()
    await newSave
  })

  it('stops remaining saveAll writes after its folder is closed', async () => {
    const write = deferred()
    fsMocks.writeFileToHandle.mockReturnValueOnce(write.promise)
    openProject([{ path: 'a.html', content: 'a0' }, { path: 'b.html', content: 'b0' }])
    useProjectStore.getState().updateFile('a.html', 'a1')
    useProjectStore.getState().updateFile('b.html', 'b1')
    const save = useProjectStore.getState().saveAll()
    await vi.waitFor(() => expect(fsMocks.writeFileToHandle).toHaveBeenCalledTimes(1))
    useProjectStore.getState().closeProject()
    expect(useProjectStore.getState().saving).toBe(false)
    write.resolve()
    await save

    expect(fsMocks.writeFileToHandle).toHaveBeenCalledTimes(1)
    expect(useProjectStore.getState().files.size).toBe(0)
  })

  it('does not start a queued save after its folder is replaced', async () => {
    const write = deferred()
    fsMocks.writeFileToHandle.mockReturnValueOnce(write.promise)
    openProject([{ path: 'index.html', content: 'initial' }])
    const save = useProjectStore.getState().saveFile('index.html')
    await vi.waitFor(() => expect(fsMocks.writeFileToHandle).toHaveBeenCalledTimes(1))
    useProjectStore.getState().updateFile('index.html', 'queued edits')
    const queued = useProjectStore.getState().saveFile('index.html')
    openProject([{ path: 'index.html', content: 'another folder' }])
    write.resolve()
    await Promise.all([save, queued])

    expect(fsMocks.writeFileToHandle).toHaveBeenCalledTimes(1)
    expect(useProjectStore.getState().files.get('index.html').original).toBe('another folder')
  })

  it('never saves an asset handle as an empty text file', async () => {
    useProjectStore.getState().setProject({
      rootHandle: { name: 'images' },
      files: [{ path: 'logo.png', name: 'logo.png', kind: 'asset', content: null, handle: {} }],
    })
    useProjectStore.getState().updateFile('logo.png', 'accidental text')
    await useProjectStore.getState().saveFile('logo.png')
    await useProjectStore.getState().saveAll()

    expect(fsMocks.writeFileToHandle).not.toHaveBeenCalled()
    expect(useProjectStore.getState().files.get('logo.png').content).toBeNull()
    expect(useProjectStore.getState().dirty.size).toBe(0)
  })

  it('copies the content requested at invocation and keeps its source dirty', async () => {
    const copy = deferred()
    fsMocks.copyProjectTo.mockReturnValueOnce(copy.promise)
    openProject([{ path: 'index.html', content: 'initial' }])
    useProjectStore.getState().updateFile('index.html', 'copy snapshot')
    const result = useProjectStore.getState().saveCopy({ name: 'copy' })
    useProjectStore.getState().updateFile('index.html', 'later edits')
    await vi.waitFor(() => expect(fsMocks.copyProjectTo).toHaveBeenCalledTimes(1))
    expect(fsMocks.copyProjectTo.mock.calls[0][1][0].content).toBe('copy snapshot')
    copy.resolve()

    await expect(result).resolves.toBe(true)
    expect(useProjectStore.getState().files.get('index.html').original).toBe('initial')
    expect(useProjectStore.getState().dirty.has('index.html')).toBe(true)
  })

  it('reports an old folder copy as stale after a different folder was opened', async () => {
    const copy = deferred()
    fsMocks.copyProjectTo.mockReturnValueOnce(copy.promise)
    openProject([{ path: 'index.html', content: 'old project' }])
    const result = useProjectStore.getState().saveCopy({ name: 'copy' })
    await vi.waitFor(() => expect(fsMocks.copyProjectTo).toHaveBeenCalledOnce())
    openProject([{ path: 'index.html', content: 'new project' }])
    copy.resolve()
    await expect(result).resolves.toBe(false)
  })
})
