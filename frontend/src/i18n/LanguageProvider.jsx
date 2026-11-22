import { useEffect, useMemo, useState } from 'react'
import { LanguageContext } from './context.js'
import {
  detectInitialLanguage,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  translate,
} from './language.js'
import { hasBaseTurkishTranslations, loadTurkishTranslations } from './store.js'

export default function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(detectInitialLanguage)
  const [trReady, setTrReady] = useState(hasBaseTurkishTranslations)

  const setLanguage = (next) => {
    if (!SUPPORTED_LANGUAGES.includes(next)) return
    try { localStorage.setItem(LANGUAGE_STORAGE_KEY, next) } catch { /* ignore */ }
    if (next === 'tr' && !hasBaseTurkishTranslations()) {
      loadTurkishTranslations()
        .then(() => {
          setTrReady(true)
          setLanguageState('tr')
        })
        .catch(() => {
          setLanguageState('tr')
        })
      return
    }
    setLanguageState(next)
  }

  useEffect(() => {
    document.documentElement.lang = language
    if (language === 'tr' && !hasBaseTurkishTranslations()) {
      let active = true
      loadTurkishTranslations()
        .then(() => {
          if (active) setTrReady(true)
        })
        .catch(() => {})
      return () => { active = false }
    }
    return undefined
  }, [language])

  const value = useMemo(() => {
    void trReady
    return {
      language,
      setLanguage,
      t: (key, variables) => translate(language, key, variables),
    }
  }, [language, trReady])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
