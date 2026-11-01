import { useLanguage } from '../../i18n/useLanguage.js'
import client from '../../api/client.js'

// Where a site's live pages are served: the API's own origin, which in
// production is the app's (the proxy serves /s/ beside it) and in development
// is the backend's. The pages are cached for a minute, so the time it was
// sent live is in the address: a new send shows at once.
function liveSiteUrl(slug, liveAt) {
  if (!slug) return ''
  const origin = new URL(client.defaults.baseURL, window.location.href).origin
  const version = liveAt ? `?live=${encodeURIComponent(liveAt)}` : ''
  return `${origin}/s/${slug}/${version}`
}

function formatWhen(value, language) {
  const date = new Date(value || 0)
  if (!value || Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

// "Live" in the editor: the pages visitors see right now, read-only, in a
// sandboxed frame (scripts run as they do for visitors, never with the app's
// origin). From here the live version can be copied back into the draft.
export default function LiveVersionView({ slug, liveAt, draftAhead, busy, onCopyToDraft, onBackToDraft }) {
  const { language, t } = useLanguage()
  const when = formatWhen(liveAt, language)
  return (
    <section aria-labelledby="live-version-title" className="absolute inset-0 z-40 flex flex-col bg-[var(--studio-shell)]">
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--studio-border)] bg-[var(--studio-panel-raised)] px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <h2 id="live-version-title" className="text-sm font-semibold text-[var(--studio-text)]">{t('Live version')}</h2>
          <p className="text-xs text-[var(--studio-text-muted)]">
            {when ? t('What visitors see now. Sent live on {date}.', { date: when }) : t('What visitors see now.')}
            {draftAhead ? ` ${t('The draft has changes that are not live yet.')}` : ''}
          </p>
        </div>
        <button type="button" onClick={onBackToDraft} className="studio-btn studio-btn-secondary">{t('Back to draft')}</button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (window.confirm(t('Replace the draft with the live version? The current draft is kept in History, so you can get it back.'))) onCopyToDraft()
          }}
          className="studio-btn studio-btn-secondary"
        >
          {t('Copy live to draft')}
        </button>
      </div>
      <iframe
        key={liveAt || 'live'}
        title={t('Live version')}
        src={liveSiteUrl(slug, liveAt)}
        sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
        className="min-h-0 w-full flex-1 border-0 bg-white"
      />
    </section>
  )
}
