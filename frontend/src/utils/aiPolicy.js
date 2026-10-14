// What the AI assistant may offer, as the server's superadmin set it on the
// Settings page (backend ai_policy.py): the whole assistant on or off, which
// providers are listed, which suggested models are hidden, where a new user
// starts, and a notice for the AI panel.
//
// Until the server has answered (or when it cannot be reached) everything is
// open, as it was before these switches existed: a network hiccup must not
// take the assistant away. The local runtime is the exception the server
// decides alone — on a public server it can never work — so it is offered
// only once the server lists it.
import { create } from 'zustand'
import { getPublicConfig } from '../api/config.js'

export const OPEN_POLICY = Object.freeze({
  loaded: false,
  enabled: true,
  providers: null, // null: every provider a browser can reach by itself
  hiddenModels: {},
  defaultProvider: '',
  notice: '',
})

export function normaliseAiPolicy(raw) {
  if (!raw || typeof raw !== 'object') return OPEN_POLICY
  const providers = Array.isArray(raw.providers) ? raw.providers.filter((p) => typeof p === 'string') : null
  const hidden = {}
  if (raw.hidden_models && typeof raw.hidden_models === 'object') {
    for (const [provider, ids] of Object.entries(raw.hidden_models)) {
      if (Array.isArray(ids)) hidden[provider] = ids.filter((id) => typeof id === 'string')
    }
  }
  return {
    loaded: true,
    enabled: raw.enabled !== false,
    providers,
    hiddenModels: hidden,
    defaultProvider: typeof raw.default_provider === 'string' ? raw.default_provider : '',
    notice: typeof raw.notice === 'string' ? raw.notice.trim() : '',
  }
}

export const useAiPolicyStore = create(() => ({ policy: OPEN_POLICY }))

export function readAiPolicy() {
  return useAiPolicyStore.getState().policy
}

export function setAiPolicy(raw) {
  useAiPolicyStore.setState({ policy: normaliseAiPolicy(raw) })
}

// Ask the server. `fresh` skips the page-session memo.
export async function loadAiPolicy({ fresh = false } = {}) {
  const config = await getPublicConfig({ fresh })
  if (config && config.ai) setAiPolicy(config.ai)
  return readAiPolicy()
}

export function useAiPolicy() {
  return useAiPolicyStore((state) => state.policy)
}
