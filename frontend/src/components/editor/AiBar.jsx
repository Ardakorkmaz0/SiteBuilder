import { useEffect, useState } from 'react'
import {
  AI_PROVIDERS,
  fetchLocalStatus,
  getApiKey,
  getModel,
  getProvider,
  pickBestLocalModel,
  setModel,
} from '../../utils/aiAssistant.js'
import { useLanguage } from '../../i18n/useLanguage.js'
import { useAiPolicy } from '../../utils/aiPolicy.js'

// Compact toolbar button that opens the AI chat panel.
// Replaces the earlier single-line prompt input — the chat panel itself
// holds the input, history, and per-turn tool calls.
// Ready to send: a key for the active provider, or a provider that needs none
// (the local runtime used to show "setup" for ever, having no key to find).
function activeProviderReady() {
  const provider = getProvider()
  if (AI_PROVIDERS.find((p) => p.id === provider)?.needsKey === false) return true
  return !!getApiKey(provider)
}

export default function AiBar({ open = false, onOpenChange }) {
  const { t } = useLanguage()
  // Read on every render; these only make it render again: the window coming
  // back into focus (a key pasted elsewhere), a storage event, and the
  // server's switches (they can change which provider is active).
  const [, setTick] = useState(0)
  useAiPolicy()
  const hasKey = activeProviderReady()

  useEffect(() => {
    const refresh = () => setTick((n) => n + 1)
    window.addEventListener('focus', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  // On app boot, if the user is on the local provider, validate the saved
  // model against whatever Ollama actually has installed and upgrade if a
  // stronger tool-calling model is available. The Settings panel does the
  // same dance, but it only runs after the user opens that section — too late
  // to stop them from sending a chat with a stale default model.
  useEffect(() => {
    if (getProvider() !== 'local') return undefined
    let cancelled = false
    fetchLocalStatus().then((s) => {
      if (cancelled || !s?.ok || !Array.isArray(s.models) || !s.models.length) return
      const saved = getModel('local')
      const best = pickBestLocalModel(s.models, saved)
      if (best && best !== saved) {
        setModel(best, 'local')
        // Notify other listeners (the chat panel uses storage events to
        // refresh the header badge) that the model changed.
        try { window.dispatchEvent(new Event('storage')) } catch { /* ignore */ }
      }
    })
    return () => { cancelled = true }
  }, [])

  return (
    <>
      <button
        type="button"
        data-tour="ai"
        onClick={() => onOpenChange?.(!open)}
        aria-pressed={open}
        aria-label={t('Open AI assistant')}
        title={hasKey ? t('Open AI assistant') : t('Set an AI provider key first')}
        className={`studio-btn studio-btn-secondary h-8 shrink-0 ${
          open ? 'bg-[var(--studio-control-hover)] text-[var(--studio-text)]' : ''
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 2l2.6 6.4L21 11l-6.4 2.6L12 20l-2.6-6.4L3 11l6.4-2.6L12 2z"
            fill="currentColor"
            opacity="0.9"
          />
        </svg>
        <span className="hidden lg:inline">AI</span>
        {!hasKey && <span className="ml-0.5 rounded bg-white/20 px-1 text-[9px]">{t('setup')}</span>}
      </button>
    </>
  )
}
