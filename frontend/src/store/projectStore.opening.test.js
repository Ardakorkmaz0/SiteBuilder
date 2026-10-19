import { afterEach, describe, expect, it } from 'vitest'
import { readProject } from '../utils/projectFs.js'
import { useProjectStore } from './projectStore.js'

const file = (name, content) => ({
  name, kind: 'file', getFile: async () => ({ text: async () => content }),
})
const directory = (name, children) => ({
  name, kind: 'directory', async *values() { yield* children },
})

afterEach(() => useProjectStore.getState().closeProject())

describe('opening the local project home page', () => {
  it('opens the root home page even when a nested index sorts first', async () => {
    const project = await readProject(directory('site', [
      directory('assets', [file('index.html', '<h1>Asset documentation</h1>')]),
      file('index.html', '<h1>Site home</h1>'),
    ]))
    expect(project.files.map((entry) => entry.path)).toEqual(['assets/index.html', 'index.html'])
    useProjectStore.getState().setProject(project)
    const state = useProjectStore.getState()
    expect(state.activePath).toBe('index.html')
    expect(state.files.get(state.activePath).content).toBe('<h1>Site home</h1>')
    expect(state.dirty.size).toBe(0)
  })
})
