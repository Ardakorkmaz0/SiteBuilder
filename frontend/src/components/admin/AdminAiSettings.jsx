// Server settings → AI assistant. What every editor on this server may offer:
// the whole assistant, each provider, each suggested model, the provider a new
// user starts on, and a line shown in the AI panel.
//
// Every switch saves the moment it is flipped, on its own (one field per
// request), and is live for everyone at once: the editor asks again when it
// opens, when its tab comes back into focus, and when its AI panel opens. The
// notice is text, so it has its own Save.
import { useId, useState } from 'react'
import { updateSettings } from '../../api/admin.js'
import { useLanguage } from '../../i18n/useLanguage.js'
import { AI_PROVIDERS, suggestedModelsFor } from '../../utils/aiProviders.js'
import { apiError } from '../../utils/errors.js'

const MODEL_ID = /^[A-Za-z0-9._:/-]{1,160}$/

function Switch({ on, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-5 w-9 shrink-0 rounded-full border transition disabled:cursor-not-allowed disabled:opacity-50 ${
        on
          ? 'border-[var(--studio-success)] bg-[var(--studio-success)]'
          : 'border-[var(--studio-border-strong)] bg-[var(--studio-panel-raised)]'
      }`}
    >
      <span className={`absolute top-px h-4 w-4 rounded-full bg-white shadow-sm transition-[left] ${on ? 'left-[17px]' : 'left-px'}`} />
    </button>
  )
}

export default function AdminAiSettings({ data, onSaved }) {
  const { t } = useLanguage()
  // "Local AI (Ollama / LM Studio)" → "Yerel AI": the label in the UI's
  // language, without its parenthesis.
  const providerName = (p) => t(p.label).replace(/ \(.*\)$/, '')
  const [busy, setBusy] = useState('')
  const [status, setStatus] = useState(null) // { tone, text }
  const [notice, setNotice] = useState(data.ai_notice || '')
  const [extraModel, setExtraModel] = useState({}) // provider → typed id
  const [open, setOpen] = useState('') // provider whose models are listed
  const id = useId()

  const enabled = data.ai_enabled !== false
  const disabled = data.ai_disabled_providers || []
  const hidden = data.ai_hidden_models || {}

  async function save(field, value, label) {
    setBusy(field)
    setStatus(null)
    try {
      const updated = await updateSettings({ [field]: value })
      onSaved(updated)
      setStatus({ tone: 'success', text: t('{change} — live for everyone now.', { change: label }) })
    } catch (e) {
      setStatus({ tone: 'danger', text: apiError(e) })
    } finally {
      setBusy('')
    }
  }

  const providerOn = (p) => !disabled.includes(p.id)
  const serverCanServe = (p) => p.id !== 'local' || data.ai_local_available
  const toggleProvider = (p, on) => save(
    'ai_disabled_providers',
    on ? disabled.filter((id) => id !== p.id) : [...disabled, p.id],
    on ? t('{provider} switched on', { provider: providerName(p) }) : t('{provider} switched off', { provider: providerName(p) }),
  )
  const setHidden = (providerId, ids, label) => save('ai_hidden_models', { ...hidden, [providerId]: ids }, label)
  const toggleModel = (providerId, modelId, show) => {
    const current = hidden[providerId] || []
    setHidden(
      providerId,
      show ? current.filter((id) => id !== modelId) : [...current, modelId],
      show ? t('{model} shown again', { model: modelId }) : t('{model} hidden', { model: modelId }),
    )
  }
  const offered = AI_PROVIDERS.filter((p) => providerOn(p) && serverCanServe(p))

  return (
    <section className="ms-card space-y-4 p-6" aria-labelledby="admin-ai-heading">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="admin-ai-heading" className="text-base font-semibold text-[var(--studio-text)]">{t('AI assistant')}</h2>
          <p className="mt-1 text-xs text-[var(--studio-text-faint)]">
            {t('Every switch here is saved the moment you flip it and reaches open editors within moments. Users bring their own keys; switching a provider off removes it from the editor (and the server refuses NVIDIA and the local runtime outright).')}
          </p>
        </div>
        <Switch
          on={enabled}
          disabled={!!busy}
          label={t('AI assistant')}
          onChange={(on) => save('ai_enabled', on, on ? t('AI assistant switched on') : t('AI assistant switched off'))}
        />
      </div>

      {status && (
        <p role="status" className="text-xs font-medium" style={{ color: `var(--studio-${status.tone})` }}>{status.text}</p>
      )}

      <div className={enabled ? 'space-y-2' : 'pointer-events-none space-y-2 opacity-50'} aria-disabled={!enabled}>
        {!enabled && (
          <p className="text-xs text-[var(--studio-text-muted)]">{t('The assistant is off: no AI button, panel, wizard or AI edit in the editor.')}</p>
        )}
        {AI_PROVIDERS.map((p) => {
          const models = suggestedModelsFor(p.id)
          const hiddenIds = hidden[p.id] || []
          const extraHidden = hiddenIds.filter((id) => !models.some((m) => m.id === id))
          const allHidden = models.length > 0 && models.every((m) => hiddenIds.includes(m.id))
          const canServe = serverCanServe(p)
          return (
            <div key={p.id} className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-panel)]">
              <div className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--studio-text)]">{providerName(p)}</p>
                  <p className="text-[11px] text-[var(--studio-text-faint)]">
                    {!canServe
                      ? t('Not available on this server: it only works when the app runs on your own computer.')
                      : providerOn(p)
                        ? t('Shown in the editor.')
                        : t('Hidden from the editor.')}
                    {hiddenIds.length > 0 && ` ${t('{count} model(s) hidden.', { count: hiddenIds.length })}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(open === p.id ? '' : p.id)}
                  aria-expanded={open === p.id}
                  className="text-xs font-medium text-[var(--studio-text-muted)] hover:text-[var(--studio-text)]"
                >
                  {t('Models')}
                </button>
                <Switch
                  on={providerOn(p) && canServe}
                  disabled={!!busy || !canServe}
                  label={providerName(p)}
                  onChange={(on) => toggleProvider(p, on)}
                />
              </div>
              {open === p.id && (
                <div className="space-y-2 border-t border-[var(--studio-border)] px-3 py-2.5">
                  {models.map((m) => {
                    const shown = !hiddenIds.includes(m.id)
                    return (
                      <div key={m.id} className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs text-[var(--studio-text)]">{t(m.label)}</p>
                          <p className="truncate font-mono text-[10px] text-[var(--studio-text-faint)]">{m.id}</p>
                        </div>
                        <Switch on={shown} disabled={!!busy} label={m.id} onChange={(on) => toggleModel(p.id, m.id, on)} />
                      </div>
                    )
                  })}
                  {allHidden && !p.customModel && (
                    <p className="text-[11px] text-[var(--studio-warning)]">{t('Every model of this provider is hidden, so it has nothing to offer. Switch the provider off instead, or show one model.')}</p>
                  )}
                  {extraHidden.map((id) => (
                    <div key={id} className="flex items-center gap-3">
                      <p className="min-w-0 flex-1 truncate font-mono text-[11px] text-[var(--studio-text-muted)]">{id}</p>
                      <button type="button" disabled={!!busy} onClick={() => toggleModel(p.id, id, true)} className="text-xs font-medium text-[var(--studio-text-muted)] hover:text-[var(--studio-text)]">
                        {t('Show again')}
                      </button>
                    </div>
                  ))}
                  {p.customModel && (
                    <form
                      className="flex gap-2"
                      onSubmit={(e) => {
                        e.preventDefault()
                        const id = (extraModel[p.id] || '').trim()
                        if (!MODEL_ID.test(id) || hiddenIds.includes(id)) return
                        setExtraModel((x) => ({ ...x, [p.id]: '' }))
                        toggleModel(p.id, id, false)
                      }}
                    >
                      <input
                        className="ms-input w-full font-mono text-xs"
                        value={extraModel[p.id] || ''}
                        onChange={(e) => setExtraModel((x) => ({ ...x, [p.id]: e.target.value }))}
                        placeholder={t('Hide another model id, e.g. vendor/model-name')}
                        aria-label={t('Model id to hide')}
                      />
                      <button type="submit" disabled={!!busy || !MODEL_ID.test((extraModel[p.id] || '').trim())} className="ms-btn shrink-0 px-3 text-xs">
                        {t('Hide')}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )
        })}

        <div className="pt-2">
          <label htmlFor={`${id}-start`} className="mb-1 block text-sm font-medium text-[var(--studio-text)]">{t('Start provider')}</label>
          <select
            id={`${id}-start`}
            aria-describedby={`${id}-start-hint`}
            className="ms-input w-full"
            value={offered.some((p) => p.id === data.ai_default_provider) ? data.ai_default_provider : ''}
            disabled={!!busy}
            onChange={(e) => save('ai_default_provider', e.target.value, t('Start provider saved'))}
          >
            <option value="">{t('The first one listed')}</option>
            {offered.map((p) => <option key={p.id} value={p.id}>{providerName(p)}</option>)}
          </select>
          <span id={`${id}-start-hint`} className="mt-1 block text-xs text-[var(--studio-text-faint)]">{t('Where a user who has not chosen a provider starts, and where someone lands when their provider is switched off.')}</span>
        </div>
      </div>

      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault()
          save('ai_notice', notice.trim(), t('Notice saved'))
        }}
      >
        <div>
          <label htmlFor={`${id}-notice`} className="mb-1 block text-sm font-medium text-[var(--studio-text)]">{t('Notice in the AI panel')}</label>
          <textarea
            id={`${id}-notice`}
            aria-describedby={`${id}-notice-hint`}
            className="ms-input w-full"
            rows={2}
            maxLength={300}
            value={notice}
            onChange={(e) => setNotice(e.target.value)}
            placeholder={t('e.g. Gemini is slow today — OpenRouter works best right now.')}
          />
          <span id={`${id}-notice-hint`} className="mt-1 block text-xs text-[var(--studio-text-faint)]">{t('Shown at the top of every AI panel. Leave it empty to show nothing.')} {notice.length}/300</span>
        </div>
        <button type="submit" disabled={!!busy || notice.trim() === (data.ai_notice || '')} className="ms-btn px-4 py-2 text-sm">
          {t('Save notice')}
        </button>
      </form>
    </section>
  )
}
