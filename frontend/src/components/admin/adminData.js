// Formatting and loading for the admin console, kept apart from the
// components so fast refresh can treat adminUi.jsx as components only.
import { useCallback, useEffect, useState } from 'react'
import { apiError } from '../../utils/errors.js'
import { useLanguage } from '../../i18n/useLanguage.js'

export const localeFor = (language) => (language === 'tr' ? 'tr-TR' : 'en-US')

export function formatNumber(value, language) {
  return Number(value || 0).toLocaleString(localeFor(language))
}

export function formatDate(value, language, { time = false } = {}) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(localeFor(language), time
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' }).format(date)
}

const UNITS = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

export function formatRelative(value, language) {
  if (!value) return ''
  const seconds = (new Date(value).getTime() - Date.now()) / 1000
  if (Number.isNaN(seconds)) return ''
  const format = new Intl.RelativeTimeFormat(localeFor(language), { numeric: 'auto' })
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit)
  }
  return format.format(0, 'minute')
}

export function formatBytes(bytes, language) {
  const value = Number(bytes || 0)
  const units = ['B', 'KB', 'MB', 'GB']
  let size = value
  let unit = 0
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024
    unit += 1
  }
  return `${size.toLocaleString(localeFor(language), { maximumFractionDigits: unit ? 1 : 0 })} ${units[unit]}`
}

// Loads once per `key`, and again on reload(). `data` stays with the key it
// was loaded for, so a stale response never shows under a new filter.
export function useAdminData(loader, key) {
  const { t } = useLanguage()
  const [state, setState] = useState({ key: null, data: null, error: '' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let alive = true
    loader()
      .then((data) => alive && setState({ key, data, error: '' }))
      .catch((error) => alive && setState({ key, data: null, error: apiError(error, t('Could not load this section.')) }))
    return () => { alive = false }
    // `loader` is rebuilt every render; `key` is what it depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt])

  const current = state.key === key
  const setData = useCallback((update) => setState((prev) => ({
    ...prev,
    data: typeof update === 'function' ? update(prev.data) : update,
  })), [])
  return {
    data: current ? state.data : null,
    error: current ? state.error : '',
    loading: !current,
    reload: () => setAttempt((n) => n + 1),
    setData,
  }
}

export function useDebounced(value, delay = 300) {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return settled
}
