// Client-side delta encoder for revision-guarded site saves.
//
// Large multi-page sites (converted HTML pages with htmlBackup + embedded
// base64 images + custom @font-face rules) can exceed 20 MB of JSON. Re-sending
// every unchanged page, backup and image on each 2.5s auto-save stalls uploads
// for tens of seconds. When `base_revision` matches the revision last loaded or
// saved for this site, `prepareSiteSave` replaces `schema` with a compact
// `schema_patch` referencing unchanged pages and components by id.

const compJsonCache = new WeakMap()
const syncedSites = new Map()

const TOP_STRING_KEYS = ['customCss', 'customJs', 'fontFaces']

export function stableJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  const keys = Object.keys(value).sort()
  let out = '{'
  for (let i = 0; i < keys.length; i += 1) {
    const val = value[keys[i]]
    if (val === undefined) continue
    if (out.length > 1) out += ','
    out += `${JSON.stringify(keys[i])}:${stableJson(val)}`
  }
  return `${out}}`
}

function componentJson(comp) {
  if (!comp || typeof comp !== 'object') return stableJson(comp)
  let cached = compJsonCache.get(comp)
  if (cached === undefined) {
    cached = stableJson(comp)
    compJsonCache.set(comp, cached)
  }
  return cached
}

function extractPageMeta(page) {
  const meta = {}
  for (const key of Object.keys(page || {})) {
    if (key === 'components' || key === 'html' || key === 'htmlBackup') continue
    meta[key] = page[key]
  }
  return meta
}

function indexPage(page) {
  const comps = Array.isArray(page?.components) ? page.components : []
  const compsById = new Map()
  const compIds = []
  let orderedUnique = true
  const seen = new Set()
  for (const comp of comps) {
    const cid = typeof comp?.id === 'string' && comp.id ? comp.id : null
    if (!cid || seen.has(cid)) {
      orderedUnique = false
      if (cid) compsById.delete(cid)
      continue
    }
    seen.add(cid)
    compIds.push(cid)
    compsById.set(cid, componentJson(comp))
  }
  return {
    metaJson: stableJson(extractPageMeta(page)),
    html: typeof page?.html === 'string' ? page.html : '',
    htmlBackup: typeof page?.htmlBackup === 'string' ? page.htmlBackup : '',
    compIds: orderedUnique ? compIds : null,
    compsById,
  }
}

export function indexSchema(schema) {
  if (!schema || typeof schema !== 'object') return null
  const pages = Array.isArray(schema.pages) ? schema.pages : []
  const pagesById = new Map()
  const seenPages = new Set()
  for (const page of pages) {
    const pid = typeof page?.id === 'string' && page.id ? page.id : null
    if (!pid) continue
    if (seenPages.has(pid)) {
      pagesById.delete(pid)
      continue
    }
    seenPages.add(pid)
    pagesById.set(pid, indexPage(page))
  }
  return {
    themeJson: stableJson(schema.theme || {}),
    colorModeJson: schema.colorMode ? stableJson(schema.colorMode) : '',
    customCss: typeof schema.customCss === 'string' ? schema.customCss : '',
    customJs: typeof schema.customJs === 'string' ? schema.customJs : '',
    fontFaces: typeof schema.fontFaces === 'string' ? schema.fontFaces : '',
    pagesById,
  }
}

export function buildSchemaPatch(prevSnapshot, nextSchema) {
  const patch = {}
  const nextThemeJson = stableJson(nextSchema?.theme || {})
  if (nextThemeJson !== prevSnapshot.themeJson) {
    patch.theme = nextSchema?.theme || {}
  }
  const nextColorModeJson = nextSchema?.colorMode ? stableJson(nextSchema.colorMode) : ''
  if (nextColorModeJson !== prevSnapshot.colorModeJson) {
    patch.colorMode = nextSchema?.colorMode || null
  }
  for (const key of TOP_STRING_KEYS) {
    const nextVal = typeof nextSchema?.[key] === 'string' ? nextSchema[key] : ''
    if (nextVal !== prevSnapshot[key]) {
      patch[key] = nextVal
    }
  }

  const nextPages = Array.isArray(nextSchema?.pages) ? nextSchema.pages : []
  const nextPageIdCounts = new Map()
  for (const p of nextPages) {
    if (typeof p?.id === 'string' && p.id) {
      nextPageIdCounts.set(p.id, (nextPageIdCounts.get(p.id) || 0) + 1)
    }
  }

  patch.pages = nextPages.map((page) => {
    const pid = typeof page?.id === 'string' && page.id ? page.id : null
    const prevPage = pid && nextPageIdCounts.get(pid) === 1 ? prevSnapshot.pagesById.get(pid) : null
    if (!prevPage) return { op: 'full', page }

    const nextMeta = extractPageMeta(page)
    const metaChanged = stableJson(nextMeta) !== prevPage.metaJson
    const nextHtml = typeof page.html === 'string' ? page.html : ''
    const htmlChanged = nextHtml !== prevPage.html
    const nextBackup = typeof page.htmlBackup === 'string' ? page.htmlBackup : ''
    const backupChanged = nextBackup !== prevPage.htmlBackup

    const nextComps = Array.isArray(page.components) ? page.components : []
    let compsChanged = prevPage.compIds === null || nextComps.length !== prevPage.compIds.length
    if (!compsChanged) {
      for (let i = 0; i < nextComps.length; i += 1) {
        const comp = nextComps[i]
        if (comp?.id !== prevPage.compIds[i] || prevPage.compsById.get(comp.id) !== componentJson(comp)) {
          compsChanged = true
          break
        }
      }
    }

    if (!metaChanged && !htmlChanged && !backupChanged && !compsChanged) {
      return { op: 'keep', id: pid }
    }

    const entry = { op: 'patch', id: pid }
    if (metaChanged) entry.meta = nextMeta
    if (htmlChanged) entry.html = nextHtml
    if (backupChanged) entry.htmlBackup = nextBackup
    if (compsChanged) {
      const compCounts = new Map()
      for (const comp of nextComps) {
        if (typeof comp?.id === 'string' && comp.id) {
          compCounts.set(comp.id, (compCounts.get(comp.id) || 0) + 1)
        }
      }
      entry.components = nextComps.map((comp) => {
        const cid = typeof comp?.id === 'string' && comp.id ? comp.id : null
        if (cid && compCounts.get(cid) === 1 && prevPage.compsById.get(cid) === componentJson(comp)) {
          return { keep: cid }
        }
        return { set: comp }
      })
    }
    return entry
  })

  return patch
}

export function rememberSyncedSite(siteData) {
  if (!siteData || siteData.id == null || !Number.isInteger(siteData.revision) || !siteData.schema) return
  const snapshot = indexSchema(siteData.schema)
  if (!snapshot) return
  syncedSites.set(String(siteData.id), {
    revision: siteData.revision,
    snapshot,
    html: typeof siteData.html === 'string' ? siteData.html : '',
  })
}

export function advanceSyncedRevision(siteId, fromRevision, toRevision) {
  const key = String(siteId)
  const entry = syncedSites.get(key)
  if (!entry) return
  if (Number.isInteger(fromRevision) && toRevision === fromRevision + 1 && entry.revision === fromRevision) {
    entry.revision = toRevision
  } else {
    syncedSites.delete(key)
  }
}

export function forgetSyncedSite(siteId) {
  syncedSites.delete(String(siteId))
}

export function prepareSiteSave(siteId, payload) {
  const key = String(siteId)
  const entry = syncedSites.get(key)
  const nextSnapshot = payload?.schema ? indexSchema(payload.schema) : null
  const nextHtml = typeof payload?.html === 'string' ? payload.html : (entry?.html ?? '')

  const commit = (newRevision) => {
    if (Number.isInteger(newRevision) && nextSnapshot) {
      syncedSites.set(key, { revision: newRevision, snapshot: nextSnapshot, html: nextHtml })
    }
  }

  if (
    entry &&
    nextSnapshot &&
    Number.isInteger(payload?.base_revision) &&
    entry.revision === payload.base_revision &&
    Array.isArray(payload?.schema?.pages) &&
    payload.schema.pages.length > 0
  ) {
    const patch = buildSchemaPatch(entry.snapshot, payload.schema)
    const body = {}
    for (const field of Object.keys(payload)) {
      if (field === 'schema') continue
      if (field === 'html' && typeof payload.html === 'string' && payload.html === entry.html) continue
      body[field] = payload[field]
    }
    body.schema_patch = patch
    return { method: 'patch', body, commit }
  }

  return { method: 'put', body: payload, commit }
}
