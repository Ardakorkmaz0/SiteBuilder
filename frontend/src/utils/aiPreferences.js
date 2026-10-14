// The user's own preferences for the AI assistant, the way a chat app keeps
// them: the language it writes in, how free it is (temperature), standing
// instructions it follows every time, and whether it may move to another
// provider when one is out of quota. Saved per browser, like the keys.
//
// aiSystemAddendum() turns them into the block every system prompt ends with,
// so the chat, HTML mode, the wizard and the one-element edits all follow the
// same rules.
import { detectInitialLanguage } from '../i18n/language.js'

const STORAGE_KEY = 'pwb_ai_prefs'
export const MAX_INSTRUCTIONS = 1000

// `name` is what the model is told; `label` is what the settings show.
export const AI_CONTENT_LANGUAGES = [
  { id: 'auto', label: 'Follow the request' },
  { id: 'tr', label: 'Turkish', name: 'Turkish' },
  { id: 'en', label: 'English', name: 'English' },
  { id: 'de', label: 'German', name: 'German' },
  { id: 'fr', label: 'French', name: 'French' },
  { id: 'es', label: 'Spanish', name: 'Spanish' },
]

export const AI_CREATIVITY = [
  { id: 'precise', label: 'Precise', hint: 'Sticks closely to the request. Best for small, exact edits.' },
  { id: 'balanced', label: 'Balanced', hint: 'The default: careful with your page, still writes fresh copy.' },
  { id: 'creative', label: 'Creative', hint: 'Bolder copy and layouts. Expect more variety between tries.' },
]

// Temperature per kind of call. Tool calling goes wrong first as it rises,
// so it stays lowest; `balanced` is what the assistant always used.
const TEMPERATURE = {
  precise: { tools: 0.1, html: 0.2, edit: 0.2, text: 0.2 },
  balanced: { tools: 0.2, html: 0.4, edit: 0.4, text: 0.4 },
  creative: { tools: 0.4, html: 0.8, edit: 0.7, text: 0.8 },
}

export const DEFAULT_AI_PREFERENCES = Object.freeze({
  contentLanguage: 'auto',
  creativity: 'balanced',
  instructions: '',
  failover: true,
})

function clean(raw) {
  const prefs = { ...DEFAULT_AI_PREFERENCES }
  if (!raw || typeof raw !== 'object') return prefs
  if (AI_CONTENT_LANGUAGES.some((l) => l.id === raw.contentLanguage)) prefs.contentLanguage = raw.contentLanguage
  if (TEMPERATURE[raw.creativity]) prefs.creativity = raw.creativity
  if (typeof raw.instructions === 'string') prefs.instructions = raw.instructions.slice(0, MAX_INSTRUCTIONS)
  if (typeof raw.failover === 'boolean') prefs.failover = raw.failover
  return prefs
}

export function getAiPreferences() {
  try { return clean(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')) }
  catch { return { ...DEFAULT_AI_PREFERENCES } }
}

export function setAiPreferences(patch) {
  const next = clean({ ...getAiPreferences(), ...patch })
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* storage unavailable */ }
  return next
}

export function temperatureFor(kind, prefs = getAiPreferences()) {
  return (TEMPERATURE[prefs.creativity] || TEMPERATURE.balanced)[kind] ?? 0.4
}

function uiLanguageName() {
  return detectInitialLanguage() === 'tr' ? 'Turkish' : 'English'
}

// The rules every system prompt ends with. Written for the model, so in
// English whatever the UI language.
export function aiSystemAddendum(prefs = getAiPreferences()) {
  const ui = uiLanguageName()
  const fixed = AI_CONTENT_LANGUAGES.find((l) => l.id === prefs.contentLanguage && l.name)
  const lines = [
    '',
    'LANGUAGE:',
    `- Write your own messages to the user (replies, plan steps, summaries) in ${ui}, the language of their editor.`,
  ]
  if (fixed) {
    lines.push(
      `- Write every piece of copy a visitor reads (headings, text, buttons, links, alt text, page titles and descriptions) in ${fixed.name}, whatever language the request or the page is in, unless the user's message explicitly asks for another language.`,
    )
  } else {
    lines.push(
      '- Write the copy a visitor reads (headings, text, buttons, links, alt text, page titles and descriptions) in the language the user asks for. When they do not say:',
      '  - adding to or changing a page that already has copy: match the language of that copy, so the page never ends up in two languages;',
      `  - an empty page or a new site: use the language the request is written in. A request marked [editor action] was written by the editor, not typed by the user: there, use ${ui}.`,
      '- Keep names, brands and quoted text exactly as the user wrote them. Never translate the user\'s own text into another language unless they ask.',
    )
  }
  const instructions = (prefs.instructions || '').trim()
  if (instructions) {
    lines.push(
      '',
      'THE USER\'S STANDING INSTRUCTIONS (they apply to every request; follow them unless they conflict with the rules above or with the request itself, which wins):',
      instructions,
    )
  }
  return lines.join('\n')
}

// App-written prompts (quick actions, suggestion cards) carry this marker, so
// the language rule above can tell them from what the user typed.
export function markEditorAction(prompt) {
  return `[editor action] ${prompt}`
}
