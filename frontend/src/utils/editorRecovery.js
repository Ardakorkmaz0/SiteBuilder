// Only the account that made the draft can recover it. No credentials are
// stored here, and recovery always waits for a successful site-access check.
export const SESSION_EXPIRED_EVENT = 'pwb:session-expired'
const PREFIX = 'pwb_editor_recovery_v1:'

function keyFor(userId, siteId) {
  return `${PREFIX}${userId}:${siteId}`
}

function stores() {
  const result = []
  for (const name of ['localStorage', 'sessionStorage']) {
    try { result.push(window[name]) } catch { /* unavailable in this browser */ }
  }
  return result
}

export function readEditorRecovery(userId, siteId) {
  if (userId == null || siteId == null) return null
  const key = keyFor(userId, siteId)
  const drafts = []
  for (const storage of stores()) {
    try {
      const draft = JSON.parse(storage.getItem(key) || 'null')
      if (draft?.version === 1 && String(draft.userId) === String(userId) &&
          String(draft.siteId) === String(siteId) && Array.isArray(draft.schema?.pages) &&
          typeof draft.id === 'string' && Number.isFinite(draft.savedAt)) drafts.push(draft)
    } catch { /* a corrupt draft must not stop the editor opening */ }
  }
  return drafts.sort((a, b) => b.savedAt - a.savedAt)[0] || null
}

export function writeEditorRecovery(userId, siteId, project) {
  if (userId == null || siteId == null) return null
  const previous = readEditorRecovery(userId, siteId)
  const draft = {
    ...project, version: 1, userId, siteId,
    id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    savedAt: Math.max(Date.now(), (previous?.savedAt || 0) + 1),
  }
  try {
    const value = JSON.stringify(draft)
    for (const storage of stores()) {
      try {
        storage.setItem(keyFor(userId, siteId), value)
        // A fallback must replace the earlier checkpoint too. Otherwise saving
        // the recovered session copy would reveal a stale persistent copy again.
        for (const other of stores()) {
          if (other === storage) continue
          try {
            const old = JSON.parse(other.getItem(keyFor(userId, siteId)) || 'null')
            if (old && old.savedAt < draft.savedAt) other.removeItem(keyFor(userId, siteId))
          } catch { /* never discard the successful backup for cleanup failure */ }
        }
        return draft
      } catch { /* a full persistent store may still have a session fallback */ }
    }
  } catch { /* serialization/storage failure: caller keeps the editor open */ }
  return null
}

export function clearEditorRecovery(userId, siteId, expectedId) {
  if (userId == null || siteId == null || !expectedId) return
  for (const storage of stores()) {
    try {
      const key = keyFor(userId, siteId)
      if (JSON.parse(storage.getItem(key) || 'null')?.id === expectedId) storage.removeItem(key)
    } catch { /* storage unavailable */ }
  }
}
