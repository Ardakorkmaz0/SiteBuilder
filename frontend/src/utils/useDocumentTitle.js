// The browser tab's title, per screen and in the reader's language. Every
// screen used to keep index.html's English "Sitebuilder: build and publish
// websites": a Turkish tab read English, and ten open tabs read the same.
import { useEffect } from 'react'
import { useLanguage } from '../i18n/useLanguage.js'

export const APP_TITLE = 'Sitebuilder: build and publish websites'

export function useDocumentTitle(title) {
  const { t } = useLanguage()
  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    document.title = title ? `${title} · Sitebuilder` : t(APP_TITLE)
    return () => { document.title = t(APP_TITLE) }
  }, [title, t])
}
