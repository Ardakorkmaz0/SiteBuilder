// An assistant error in the user's language. The assistant builds its errors
// in English with their key and values kept (aiError in aiAssistant.js); the
// values are translated too, so "Local AI" reads "Yerel AI" inside a Turkish
// sentence. Any other error is shown as it came (a provider's own words).
export function aiErrorText(error, t) {
  if (!error) return ''
  if (error.i18n) {
    const vars = Object.fromEntries(
      Object.entries(error.i18n.vars || {}).map(([name, value]) => [name, typeof value === 'string' ? t(value) : value]),
    )
    return t(error.i18n.key, vars)
  }
  return t(error.message || String(error))
}
