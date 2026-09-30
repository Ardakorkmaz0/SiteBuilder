import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EditIcon, EyeIcon, GlobeIcon, LayersIcon } from '../icons.jsx'
import LanguageSwitcher from '../LanguageSwitcher.jsx'
import { useLanguage } from '../../i18n/useLanguage.js'
import { HTML_ALLOW, PUBLIC_HTML_SANDBOX, withBuilderInteractiveHtml, withViewportMeta } from '../../utils/htmlRuntime.js'
import { schemaToSingleHtml } from '../../utils/schemaToFiles.js'
import { colorModeFor, withColorModeHtml } from '../../utils/colorMode.js'

function htmlForPage(page, pages, pageHtmlMap) {
  const live = pageHtmlMap?.[page?.id]
  if (typeof live === 'string') return live
  if (typeof page?.html === 'string') return page.html
  return pages[0]?.id === page?.id ? pageHtmlMap?.[pages[0]?.id] || '' : ''
}

export default function MobileEditorPreview({
  title,
  slug,
  published,
  pages,
  currentPageId,
  pageHtmlMap,
  theme,
  colorModeSetting,
  customCss,
  customJs,
  error,
  onSelectPage,
  onBack,
}) {
  const { t } = useLanguage()
  const [sheet, setSheet] = useState(null)
  const [focused, setFocused] = useState(false)
  const [copied, setCopied] = useState(false)
  const currentPage = useMemo(
    () => pages.find((page) => page.id === currentPageId) || pages[0] || {},
    [currentPageId, pages],
  )
  const currentHtml = htmlForPage(currentPage, pages, pageHtmlMap)
  const currentIsHtml = currentPage.mode === 'html' || !!currentHtml.trim()

  const previewHtml = useMemo(() => {
    // A light/dark switch works here as it does on the published page.
    const colorMode = colorModeFor({ theme, colorMode: colorModeSetting, pages }, currentPage, pageHtmlMap)
    if (currentIsHtml) return withViewportMeta(withBuilderInteractiveHtml(withColorModeHtml(currentHtml, colorMode)))
    return withViewportMeta(schemaToSingleHtml({
      theme,
      customCss,
      customJs,
      pages: [currentPage],
    }, title || currentPage.name || 'My Site', { colorMode }))
  }, [colorModeSetting, currentHtml, currentIsHtml, currentPage, customCss, customJs, pageHtmlMap, pages, theme, title])

  async function copyEditorLink() {
    try {
      await navigator.clipboard?.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  const frame = (
    <iframe
      key={`${currentPage.id || 'page'}-${currentIsHtml ? 'html' : 'components'}`}
      title={t('Previewing {page}', { page: currentPage.name || title || t('Preview') })}
      srcDoc={previewHtml}
      sandbox={PUBLIC_HTML_SANDBOX}
      allow={HTML_ALLOW}
      allowFullScreen
      className="block h-full w-full border-0 bg-white"
    />
  )

  if (focused) {
    return (
      <main className="relative h-[100dvh] overflow-hidden bg-white" aria-label={t('Mobile site preview')} data-testid="mobile-editor-preview">
        {frame}
        <button
          type="button"
          onClick={() => setFocused(false)}
          aria-label={t('Exit focused preview')}
          className="fixed right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-50 grid h-11 w-11 place-items-center rounded-full border border-[var(--studio-border)] bg-[var(--studio-panel-raised)] text-lg font-bold text-[var(--studio-text)] shadow-lg"
        >
          ×
        </button>
      </main>
    )
  }

  return (
    <main className="flex h-[100dvh] flex-col overflow-hidden bg-[var(--studio-shell)] text-[var(--studio-text)]" aria-label={t('Mobile site preview')} data-testid="mobile-editor-preview">
      <header className="shrink-0 border-b border-[var(--studio-border)] bg-[var(--studio-panel)] pt-[env(safe-area-inset-top)]">
        <div className="flex h-14 items-center gap-2 px-3">
          <button
            type="button"
            onClick={onBack}
            aria-label={t('Go back')}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-xl text-[var(--studio-text-muted)] hover:bg-[var(--studio-control-hover)]"
          >
            ←
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-[var(--studio-text)]">{title || t('Untitled site')}</div>
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--studio-text-muted)]">
              <span className={`h-1.5 w-1.5 rounded-full ${published ? 'bg-[var(--studio-success)]' : 'bg-[var(--studio-warning)]'}`} aria-hidden />
              <span>{t(published ? 'Published' : 'Draft')}</span>
              <span aria-hidden>·</span>
              <span className="truncate">{currentPage.name || t('Preview')}</span>
            </div>
          </div>
          <LanguageSwitcher className="[&_span[aria-hidden]]:hidden" />
        </div>
      </header>

      {error && <div role="alert" className="shrink-0 bg-[var(--studio-danger-soft)] px-4 py-2 text-xs text-[var(--studio-danger)]">{error}</div>}

      <section className="relative min-h-0 flex-1 bg-white" aria-label={t('Preview')}>
        {frame}
      </section>

      <nav className="shrink-0 border-t border-[var(--studio-border)] bg-[var(--studio-panel)] pb-[env(safe-area-inset-bottom)]" aria-label={t('Mobile preview navigation')}>
        {/* Type sits on the labels, not the items: the editor's buttons take
            their font from context (index.css), so a size on the <button>
            never applied and two tabs read at 16px beside two at 11px. */}
        <div className="grid h-16 grid-cols-4">
          <button type="button" onClick={() => setFocused(true)} aria-label={t('Focus preview')} className="flex min-w-0 flex-col items-center justify-center gap-1 text-[var(--studio-accent-text)]">
            <EyeIcon size={19} aria-hidden />
            <span className="text-[11px] font-semibold">{t('Preview')}</span>
          </button>
          <button type="button" onClick={() => setSheet('pages')} className="flex min-w-0 flex-col items-center justify-center gap-1 text-[var(--studio-text-muted)]">
            <LayersIcon size={19} aria-hidden />
            <span className="text-[11px] font-medium">{t('Pages')}</span>
          </button>
          {published && slug ? (
            <Link to={`/site/${slug}`} target="_blank" rel="noreferrer" aria-label={t('Open live site')} className="flex min-w-0 flex-col items-center justify-center gap-1 text-[11px] font-medium text-[var(--studio-text-muted)]">
              <GlobeIcon size={19} aria-hidden />
              <span>{t('Live')}</span>
            </Link>
          ) : (
            <div className="flex min-w-0 flex-col items-center justify-center gap-1 text-[11px] font-medium text-[var(--studio-text-faint)]" aria-label={t('Draft')}>
              <GlobeIcon size={19} aria-hidden />
              <span>{t('Draft')}</span>
            </div>
          )}
          <button type="button" onClick={() => setSheet('desktop')} className="flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[var(--studio-text-muted)]">
            <EditIcon size={19} aria-hidden />
            <span className="max-w-full truncate text-[11px] font-medium">{t('Desktop')}</span>
          </button>
        </div>
      </nav>

      {sheet && (
        <div className="studio-theme-surface studio-overlay fixed inset-0 z-[100] flex items-end" onClick={() => setSheet(null)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`mobile-${sheet}-sheet-title`}
            className="max-h-[75dvh] w-full overflow-hidden rounded-t-3xl border-t border-[var(--studio-border)] bg-[var(--studio-panel-raised)] pb-[env(safe-area-inset-bottom)] text-[var(--studio-text)] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-[var(--studio-border-strong)]" aria-hidden />
            <div className="flex items-center justify-between border-b border-[var(--studio-border)] px-5 py-4">
              <h2 id={`mobile-${sheet}-sheet-title`} className="text-base font-semibold text-[var(--studio-text)]">{t(sheet === 'pages' ? 'Site pages' : 'Desktop editing')}</h2>
              <button type="button" onClick={() => setSheet(null)} className="grid h-9 w-9 place-items-center rounded-full bg-[var(--studio-control)] text-lg text-[var(--studio-text)] hover:bg-[var(--studio-control-hover)]" aria-label={t('Close')}>×</button>
            </div>
            {sheet === 'pages' ? (
              <div className="max-h-[55dvh] overflow-y-auto p-3">
                {pages.map((page, index) => (
                  <button
                    key={page.id}
                    type="button"
                    aria-label={page.name || `${t('Pages')} ${index + 1}`}
                    onClick={() => { onSelectPage(page.id); setSheet(null) }}
                    aria-current={page.id === currentPage.id ? 'page' : undefined}
                    className={`mb-1 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left ${page.id === currentPage.id ? 'bg-[var(--studio-accent-soft)] text-[var(--studio-accent-text)]' : 'text-[var(--studio-text)] hover:bg-[var(--studio-control-hover)]'}`}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[var(--studio-control)] text-xs font-bold">{index + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{page.name || `${t('Pages')} ${index + 1}`}</span>
                    {page.id === currentPage.id && <span className="text-[var(--studio-accent-text)]" aria-hidden>✓</span>}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-4 p-5">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--studio-accent-soft)] text-[var(--studio-accent-text)]"><EditIcon size={23} aria-hidden /></div>
                <p className="text-sm leading-6 text-[var(--studio-text-muted)]">{t('Mobile keeps the site preview-first. Open this link on a desktop computer to make changes.')}</p>
                <button type="button" onClick={copyEditorLink} className="w-full rounded-xl bg-[var(--studio-accent)] px-4 py-3 text-[var(--studio-on-accent)] hover:bg-[var(--studio-accent-fill-hover)]">
                  <span className="text-sm font-semibold">{t(copied ? 'Editor link copied' : 'Copy editor link')}</span>
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  )
}
