import { create } from 'zustand'
import {
  buildTree,
  compactTree,
  copyProjectTo,
  rememberProjectRoot,
  clearProjectRoot,
  isTextKind,
  projectHomeFile,
  writeFileToHandle,
} from '../utils/projectFs.js'
import { createSaveQueue } from '../utils/saveQueue.js'

function acknowledgeWrittenContent(state, path, writtenContent) {
  const current = state.files.get(path)
  if (!current) return {}
  const files = new Map(state.files)
  files.set(path, { ...current, original: writtenContent })
  const dirty = new Set(state.dirty)
  if (current.content === writtenContent) dirty.delete(path)
  else dirty.add(path)
  return { files, dirty }
}

// In-memory model of an opened local folder (the "Code project" editor). The
// document model is a path -> file map, NOT the schema/pages model — nothing
// here touches the server Site flow. Each text file keeps `original` (as loaded
// from disk) alongside `content` (current) so we can mark it dirty (green) and
// write only the changes back. Assets keep just their handle (data-URL'd on
// demand by the preview assembler).

export const useProjectStore = create((set, get) => {
  const newSession = () => ({ queue: createSaveQueue(), pending: 0, pendingPaths: new Map() })
  let session = newSession()

  // Saves share a queue within one opened folder. A new folder gets its own
  // queue, and results from the previous folder cannot change its state.
  const runSave = async (task, paths = []) => {
    const owner = session
    owner.pending += 1
    for (const path of paths) owner.pendingPaths.set(path, (owner.pendingPaths.get(path) || 0) + 1)
    set({ saving: true })
    try {
      return await owner.queue.run(async () => {
        if (owner !== session) return false
        set({ error: '' })
        try {
          await task(() => owner === session)
          return owner === session
        } catch (e) {
          if (owner === session) set({ error: e?.message || String(e) })
          return false
        }
      })
    } finally {
      owner.pending -= 1
      for (const path of paths) {
        const remaining = owner.pendingPaths.get(path) - 1
        if (remaining) owner.pendingPaths.set(path, remaining)
        else owner.pendingPaths.delete(path)
      }
      if (owner === session) set({ saving: owner.pending > 0 })
    }
  }

  return {
    rootHandle: null,
    projectSessionId: 0,
    rootName: '',
    files: new Map(), // path -> { path, name, kind, handle, content|null, original|null }
    tree: null,
    dirty: new Set(), // paths whose content !== original
    activePath: null,
    saving: false,
    error: '',

    // Load a freshly opened folder ({ rootHandle, files }) into the store.
    setProject: ({ rootHandle, files }) => {
      const map = new Map()
      for (const f of files) {
        map.set(f.path, { ...f, original: f.content })
      }
      // Open the home page first if present, else the first file.
      const home = projectHomeFile(map.values())?.path || null
      rememberProjectRoot(rootHandle)
      session = newSession()
      set({
        rootHandle,
        projectSessionId: get().projectSessionId + 1,
        rootName: rootHandle?.name || 'project',
        files: map,
        tree: compactTree(buildTree(files)),
        dirty: new Set(),
        activePath: home,
        saving: false,
        error: '',
      })
    },

    closeProject: () => {
      clearProjectRoot()
      session = newSession()
      set({
        rootHandle: null,
        projectSessionId: get().projectSessionId + 1,
        rootName: '',
        files: new Map(),
        tree: null,
        dirty: new Set(),
        activePath: null,
        saving: false,
        error: '',
      })
    },

    setActive: (path) => set({ activePath: path }),

    // Edit a text file's content; track dirty membership only when it flips so
    // the file tree doesn't re-render on every keystroke.
    updateFile: (path, content) =>
      set((state) => {
        const f = state.files.get(path)
        if (!f || !isTextKind(f.kind) || f.content === content) return {}
        const files = new Map(state.files)
        files.set(path, { ...f, content })
        const wasDirty = state.dirty.has(path)
        const nowDirty = content !== f.original
        if (wasDirty === nowDirty) return { files }
        const dirty = new Set(state.dirty)
        if (nowDirty) dirty.add(path)
        else dirty.delete(path)
        return { files, dirty }
      }),

    // Write one file back to disk and clear its dirty flag.
    saveFile: async (path) => {
      const f = get().files.get(path)
      if (!f || !f.handle || !isTextKind(f.kind)) return false
      const writtenContent = f.content ?? ''
      return runSave(async (isCurrent) => {
        await writeFileToHandle(f.handle, writtenContent)
        if (isCurrent()) set((state) => acknowledgeWrittenContent(state, path, writtenContent))
      }, [path])
    },

    // Write every changed file back to its folder. Each completed write is
    // acknowledged against the snapshot actually sent to disk, so typing while
    // Save All is running never gets overwritten or incorrectly marked clean.
    saveAll: async () => {
      const state = get()
      // A user can revert to the old baseline while a different snapshot is
      // still being written. Include pending paths even when currently clean so
      // a trailing Save All also persists that requested reversion.
      const paths = new Set([...state.dirty, ...session.pendingPaths.keys()])
      const snapshots = [...paths].map((path) => {
        const file = state.files.get(path)
        return { path, handle: file?.handle, content: file?.content ?? '' }
      })
      if (!snapshots.length) return true
      return runSave(async (isCurrent) => {
        for (const snapshot of snapshots) {
          if (!isCurrent()) return
          if (!snapshot.handle) throw new Error(`Cannot write ${snapshot.path}: file handle is unavailable.`)
          await writeFileToHandle(snapshot.handle, snapshot.content)
          // Update after every successful file. If a later write fails, files
          // already persisted still have an accurate baseline and dirty state.
          if (isCurrent()) set((current) => acknowledgeWrittenContent(current, snapshot.path, snapshot.content))
        }
      }, [...paths])
    },

    // Write a full copy of the project (current edits applied) into a folder the
    // user picks — the original on disk is left untouched. Returns true on success.
    saveCopy: async (targetDir) => {
      if (!targetDir) return false
      const files = [...get().files.values()]
      return runSave(() => copyProjectTo(targetDir, files))
    },
  }
})

if (typeof window !== 'undefined' && import.meta.env?.DEV) {
  window.__projectStore = useProjectStore
}
