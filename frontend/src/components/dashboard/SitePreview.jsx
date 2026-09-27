import { useEffect, useRef, useState } from 'react'
import { getSite, getPublicSite } from '../../api/sites.js'
import { schemaToResponsiveHtml } from '../../utils/responsiveHtml.js'
import { withoutExecutableScripts } from '../../utils/htmlRuntime.js'
import { useLanguage } from '../../i18n/useLanguage.js'

// A live, scaled-down thumbnail of a site's home page (the "Minecraft map"
// under the title). Lazy: only fetches + renders once the card scrolls near
// view (IntersectionObserver). Inert: scripts are stripped AND the iframe is
// fully sandboxed, so a thumbnail can never run code or be clicked into. The
// built document is cached per site id so re-mounts don't refetch.

const LOGICAL_W = 1200
const cache = new Map() // site.id -> html doc string

function buildDoc(site) {
  const raw = site.html && site.html.trim()
    ? site.html
    : schemaToResponsiveHtml(site.schema, site.title)
  return withoutExecutableScripts(raw)
}

// The owner's sharing image, when they chose one: the card shows what a shared
// link shows. Only a web address or a site path; the server sends nothing else.
function shareImage(site) {
  const value = String(site?.share_image || '').trim()
  return /^(https?:\/\/|\/(?!\/))/i.test(value) ? value : ''
}

// `framed={false}` drops the thumbnail's own border and rounding, for a card
// that already frames it — a frame inside a frame reads as nesting for its
// own sake.
export default function SitePreview({ site, height = 150, source = 'owner', framed = true }) {
  const { t } = useLanguage()
  const boxRef = useRef(null)
  const [doc, setDoc] = useState(() => cache.get(site.id) || null)
  const [visible, setVisible] = useState(false)
  const [width, setWidth] = useState(360)
  const [failed, setFailed] = useState(false)
  // A broken image falls back to the live thumbnail rather than an empty box.
  const [imageFailed, setImageFailed] = useState(false)
  const image = imageFailed ? '' : shareImage(site)

  // Reveal when scrolled near the viewport.
  useEffect(() => {
    const el = boxRef.current
    if (!el || visible) return undefined
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true)
          io.disconnect()
        }
      },
      { rootMargin: '200px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [visible])

  // Track the box width so the page can be scaled to fit it.
  useEffect(() => {
    const el = boxRef.current
    if (!el) return undefined
    const update = () => setWidth(el.clientWidth || 360)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Fetch + build the document once revealed (the mount initializer already
  // served any cached doc, so a hit never reaches here).
  useEffect(() => {
    if (!visible || doc || image) return undefined
    let alive = true
    const fetcher = source === 'public' ? getPublicSite(site.slug) : getSite(site.id)
    fetcher
      .then((full) => {
        const d = buildDoc(full)
        cache.set(site.id, d)
        if (alive) setDoc(d)
      })
      .catch(() => alive && setFailed(true))
    return () => { alive = false }
  }, [visible, doc, image, site.id, site.slug, source])

  const scale = width / LOGICAL_W

  return (
    <div
      ref={boxRef}
      className={`relative w-full overflow-hidden bg-[var(--studio-control)] ${framed ? 'rounded-xl border border-[var(--studio-border)]' : ''}`}
      style={{ height }}
    >
      {image ? (
        <img
          src={image}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setImageFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : doc ? (
        <iframe
          title={`preview-${site.id}`}
          srcDoc={doc}
          sandbox=""
          tabIndex={-1}
          aria-hidden
          style={{
            width: LOGICAL_W,
            height: Math.round(height / (scale || 1)),
            border: 'none',
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            pointerEvents: 'none',
            background: '#ffffff',
          }}
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-xs text-[var(--studio-text-faint)]">
          <span>{failed ? t('No preview') : t('Loading preview…')}</span>
        </div>
      )}
    </div>
  )
}
