import client from './client.js'

// Public runtime config (the PUBLIC feature keys the superadmin sets on the
// Settings page) — Google client id, reCAPTCHA site key and what the AI
// assistant may offer. Fetched once and memoised for the page session so the
// auth pages don't refetch it; `fresh` asks again (the editor does, so a
// switch flipped on the Settings page reaches a tab that was already open).
let cached = null
let inflight = null

export function getPublicConfig({ fresh = false } = {}) {
  if (cached && !fresh) return Promise.resolve(cached)
  if (!inflight || fresh) {
    const request = client
      .get('/public/config/')
      .then((r) => {
        cached = r.data
        return cached
      })
      .catch(() => cached || { google_client_id: '', recaptcha_site_key: '' })
      .finally(() => { if (inflight === request) inflight = null })
    inflight = request
  }
  return inflight
}
