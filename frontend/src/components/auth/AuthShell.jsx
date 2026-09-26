import { useEffect, useState } from 'react'
import LanguageSwitcher from '../LanguageSwitcher.jsx'
import SitePreview from '../dashboard/SitePreview.jsx'
import { listExplore } from '../../api/explore.js'
import { useLanguage } from '../../i18n/useLanguage.js'

export function AuthWidgetFrame({ children }) {
  return (
    <div className="max-w-full overflow-hidden">
      <div className="w-[121.96%] origin-top-left scale-[0.82] min-[360px]:w-[111.12%] min-[360px]:scale-[0.9] min-[390px]:w-full min-[390px]:scale-100">
        {children}
      </div>
    </div>
  )
}

const SHOWN_SITES = 3

// The proof beside the form is real: the first sites of the public feed
// (pinned ones first), each opening the live site. It used to be a drawn
// browser window full of grey bars. When there is nothing to show, or the feed
// cannot be reached, the section is left out rather than filled with stand-ins.
function MadeWithSitebuilder() {
  const { t } = useLanguage()
  const [feed, setFeed] = useState({ status: 'loading', sites: [] })

  useEffect(() => {
    let alive = true
    listExplore({ page: 1 })
      .then((result) => alive && setFeed({ status: 'ready', sites: (result.results || []).slice(0, SHOWN_SITES) }))
      .catch(() => alive && setFeed({ status: 'failed', sites: [] }))
    return () => { alive = false }
  }, [])

  if (feed.status === 'failed' || (feed.status === 'ready' && feed.sites.length === 0)) return null

  return (
    <section aria-labelledby="made-with-sitebuilder" aria-busy={feed.status === 'loading'} className="mt-12">
      <h2 id="made-with-sitebuilder" className="text-sm font-semibold text-[var(--studio-text-muted)]">
        {t('Made with Sitebuilder')}
      </h2>
      <ul className="mt-3 grid grid-cols-3 gap-4">
        {feed.status === 'loading'
          ? Array.from({ length: SHOWN_SITES }, (_, index) => (
            <li key={index} aria-hidden="true" className="h-[7.5rem] rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-control)]" />
          ))
          : feed.sites.map((site) => (
            <li key={site.id} className="min-w-0">
              <a href={`/site/${site.slug}`} className="group block">
                <span className="block overflow-hidden rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] transition-colors group-hover:border-[var(--studio-border-strong)]">
                  <SitePreview site={site} source="public" height={120} framed={false} />
                </span>
                <span className="mt-2 block truncate text-sm font-semibold text-[var(--studio-text)]">{site.title}</span>
                <span className="block truncate text-xs text-[var(--studio-text-muted)]">{site.owner_display_name}</span>
              </a>
            </li>
          ))}
      </ul>
    </section>
  )
}

export default function AuthShell({ title, description, onSubmit, children, footer }) {
  const { t } = useLanguage()
  const Surface = onSubmit ? 'form' : 'section'
  const surfaceProps = onSubmit ? { onSubmit } : {}

  return (
    <main className="themed-auth-page min-h-[100dvh] bg-[var(--studio-shell)] text-[var(--studio-text)]">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <header className="flex min-h-10 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="brand-mark" aria-hidden="true">S</span>
            <span className="truncate text-base font-semibold text-[var(--studio-text)] sm:text-lg">
              Sitebuilder
            </span>
          </div>
          <LanguageSwitcher />
        </header>

        <div className="grid flex-1 items-start gap-8 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,27rem)] lg:items-center lg:gap-20 lg:py-10">
          <aside className="hidden lg:block">
            <p className="max-w-xl font-[family-name:var(--font-display)] text-4xl font-semibold leading-[1.1] text-[var(--studio-text)] xl:text-5xl">
              {t('Build and publish your first site in minutes.')}
            </p>
            <p className="mt-4 max-w-md text-base leading-7 text-[var(--studio-text-muted)]">
              {t('Sign in to keep building your sites.')}
            </p>
            <MadeWithSitebuilder />
          </aside>

          <div className="mx-auto w-full max-w-md lg:mx-0">
            <Surface
              {...surfaceProps}
              aria-labelledby="auth-page-title"
              className="studio-auth-card rounded-[var(--studio-radius-2xl)] border border-[var(--studio-border)] bg-[var(--studio-panel-raised)] px-3 py-6 min-[360px]:px-5 sm:p-8"
            >
              <div>
                <h1 id="auth-page-title" className="text-2xl font-semibold text-[var(--studio-text)]">
                  {title}
                </h1>
                <p className="mt-1.5 text-sm leading-6 text-[var(--studio-text-muted)]">
                  {description}
                </p>
              </div>

              <div className="mt-6 space-y-5">
                {children}
              </div>

              {footer && (
                <div className="mt-6 border-t border-[var(--studio-border)] pt-5 text-center text-sm text-[var(--studio-text-muted)]">
                  {footer}
                </div>
              )}
            </Surface>
          </div>
        </div>
      </div>
    </main>
  )
}
