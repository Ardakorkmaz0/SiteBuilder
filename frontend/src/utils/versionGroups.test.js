import { describe, expect, it } from 'vitest'
import { groupSiteVersions } from './versionGroups.js'

describe('site history grouping', () => {
  it('never presents restore or legacy recovery rows as automatic saves', () => {
    const grouped = groupSiteVersions([
      { id: 1, source: 'manual' },
      { id: 2, source: 'auto' },
      { id: 3, source: 'restore' },
      { id: 4, source: 'save' },
      { id: 5, source: 'publish' },
    ])

    expect(grouped.manualSaves.map((row) => row.id)).toEqual([1])
    expect(grouped.autosaves.map((row) => row.id)).toEqual([2])
    expect(grouped.recoverySaves.map((row) => row.id)).toEqual([3, 4])
    expect(grouped.liveSaves.map((row) => row.id)).toEqual([5])
  })
})
