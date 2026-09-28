// Presentational components rendered from the JSON schema.
// Each receives { props, style }. The passed `style` already includes
// width/height 100% so the component fills its free-canvas box. Nothing the
// owner typed goes through dangerouslySetInnerHTML (only the fixed icon markup
// shared with the published page does), so React escapes all text. URLs go
// through sanitizeUrl.
import { useContext, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { sanitizeUrl, sanitizeImageSrc } from '../../utils/sanitize.js'
import { ICONS } from '../../utils/icons.js'
import { ALERT_VARIANTS } from './constants.js'
import { withBuilderInteractiveHtml } from '../../utils/htmlRuntime.js'
import { htmlEmbedDocument } from '../../utils/htmlEmbedDocument.js'
import { htmlEmbedDocumentOptions } from '../../utils/htmlSnippetSizing.js'
import { scaleCssValue, scaledPx } from './scale.js'
import { EYE_ICONS, FORM_FIELD_CSS, choiceList, fieldClassName, fieldStyles, radioChoices, rangeAttrs } from '../../utils/formField.js'
import { THEME_TOGGLE_CSS, THEME_TOGGLE_ICONS, showsLabel, themeToggleLabel } from '../../utils/themeToggle.js'
import { useColorMode } from './colorModeContext.js'
import {
  navLinkLabel,
  navbarBrandAlign,
  navbarLinkGap,
  navbarLinksAlign,
  navbarPlacement,
} from '../../utils/navbarLayout.js'
import { LanguageContext } from '../../i18n/context.js'
import { EmbedFontContext } from './embedFont.js'

function linkAttrs(href) {
  return /^https?:\/\//i.test(href)
    ? { target: '_blank', rel: 'noopener noreferrer' }
    : {}
}

function InlineIcon({ name }) {
  const d = name ? ICONS[name] : null
  if (!d) return null
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d={d} />
    </svg>
  )
}

const multilineTextStyle = {
  whiteSpace: 'pre-wrap',
  overflowWrap: 'break-word',
  wordBreak: 'break-word',
}

// The full region body is rendered by Renderer/RegionEditor because it owns
// the centered, droppable inner design surface. This registry fallback keeps
// isolated component previews valid.
export function Region({ style }) {
  return <section style={style} />
}

export function Navbar({ props, style, viewport = 'pc', contentWidth, boxScale = 1 }) {
  const language = useContext(LanguageContext)
  const [mobileOpen, setMobileOpen] = useState(false)
  const links = Array.isArray(props.links) ? props.links : []
  const isMobile = viewport === 'mobile'
  const layout = props.navLayout || 'horizontal'
  const vertical = layout === 'vertical'
  const centered = layout === 'centered'
  const twoRow = layout === 'twoRow'
  const mobileMenu = isMobile && !vertical && props.mobileNavMode !== 'stack'
  const mobileVisibleLinks = isMobile && !vertical && !mobileMenu
  const stacked = vertical || centered || twoRow || (isMobile && !mobileMenu)
  const linkColumn = vertical
  // Brand / links placement applies to a horizontal bar on a wide screen; the
  // stacked layouts and the phone hamburger arrange themselves.
  const placed = !stacked && !mobileMenu ? navbarPlacement(props) : null
  const menuLabel = language?.t(mobileOpen ? 'Close navigation menu' : 'Open navigation menu')
    || (mobileOpen ? 'Close navigation menu' : 'Open navigation menu')
  return (
    // The bar keeps its (possibly full-bleed) background; the inner row is capped
    // at `contentWidth` (the Max width) and centered — like a real site header.
    <nav
      style={{
        fontSize: scaledPx(16, boxScale),
        ...style,
        display: 'flex',
        justifyContent: vertical ? 'flex-start' : 'center',
        alignItems: vertical ? 'stretch' : 'center',
        overflow: vertical || mobileMenu ? 'visible' : style?.overflow,
        position: style?.position || 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: vertical ? '100%' : undefined,
          maxWidth: vertical ? undefined : contentWidth || undefined,
          marginLeft: 'auto',
          marginRight: 'auto',
          flexDirection: stacked ? 'column' : 'row',
          alignItems: centered ? 'center' : stacked ? 'flex-start' : 'center',
          justifyContent: stacked ? 'flex-start' : 'space-between',
          ...(placed ? placed.row : null),
          gap: scaledPx(isMobile ? 10 : vertical ? 14 : twoRow ? 10 : 16, boxScale),
          flexWrap: mobileMenu ? 'nowrap' : 'wrap',
          textAlign: centered ? 'center' : undefined,
          position: 'relative',
        }}
      >
        <span style={{
          fontWeight: 'bold',
          fontSize: '1.125em',
          ...multilineTextStyle,
          ...(placed ? placed.brand : null),
          ...(mobileVisibleLinks ? {
            alignSelf: navbarBrandAlign(props) === 'center'
              ? 'center'
              : navbarBrandAlign(props) === 'right' ? 'flex-end' : 'flex-start',
          } : null),
        }}>{props.brand}</span>
        {mobileMenu && (
          <button
            type="button"
            aria-label={menuLabel}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
            style={{
              appearance: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: scaledPx(36, boxScale),
              height: scaledPx(36, boxScale),
              flexShrink: 0,
              border: '1px solid currentColor',
              borderRadius: scaledPx(8, boxScale),
              background: 'transparent',
              color: 'inherit',
              font: 'inherit',
              fontSize: '1.25em',
              lineHeight: 1,
              cursor: 'pointer',
            }}
          >
            {mobileOpen ? '×' : '☰'}
          </button>
        )}
        <div
          style={{
            display: mobileMenu && !mobileOpen ? 'none' : 'flex',
            flexDirection: mobileMenu || linkColumn ? 'column' : 'row',
            alignItems: centered ? 'center' : linkColumn ? 'stretch' : 'center',
            justifyContent: centered
              ? 'center'
              : mobileVisibleLinks
                ? navbarLinksAlign(props) === 'center'
                  ? 'center'
                  : navbarLinksAlign(props) === 'right' ? 'flex-end' : 'flex-start'
                : undefined,
            gap: scaledPx(
              mobileMenu || linkColumn ? 6 : isMobile ? 16 : navbarLinkGap(props),
              boxScale,
            ),
            rowGap: scaledPx(6, boxScale),
            flexWrap: 'wrap',
            width: mobileMenu || mobileVisibleLinks || linkColumn || twoRow ? '100%' : undefined,
            ...(placed ? placed.links : null),
            ...(mobileMenu ? {
              position: 'absolute',
              zIndex: 100,
              top: `calc(100% + ${scaledPx(8, boxScale)})`,
              left: 0,
              right: 0,
              alignItems: 'stretch',
              padding: scaledPx(10, boxScale),
              border: '1px solid currentColor',
              borderRadius: scaledPx(10, boxScale),
              backgroundColor: style?.backgroundColor || '#1d1d1f',
              boxShadow: '0 12px 28px rgba(0,0,0,.2)',
            } : {}),
          }}
        >
          {links.map((link, i) => {
            const href = sanitizeUrl(link.href)
            return (
              <a
                key={i}
                href={href || undefined}
                style={{
                  color: 'inherit',
                  textDecoration: 'none',
                  display: vertical || mobileMenu ? 'block' : undefined,
                  width: vertical || mobileMenu ? '100%' : undefined,
                  padding: vertical || mobileMenu ? `${scaledPx(10, boxScale)} ${scaledPx(12, boxScale)}` : undefined,
                  borderRadius: vertical || mobileMenu ? scaledPx(8, boxScale) : undefined,
                  boxSizing: vertical || mobileMenu ? 'border-box' : undefined,
                }}
                {...linkAttrs(href)}
              >
                {navLinkLabel(link.label)}
              </a>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

// The heading tag (h1/h2/h3) inherits font metrics from the styled wrapper so it
// renders at EXACTLY the configured size — otherwise the browser's default
// `h1{font-size:2em}` doubles it (e.g. 44px → 88px) and the text overflows.
const headingTagStyle = {
  margin: 0,
  fontSize: 'inherit',
  fontWeight: 'inherit',
  fontFamily: 'inherit',
  letterSpacing: 'inherit',
  lineHeight: 1.15,
  ...multilineTextStyle,
}

export function Heading({ props, style }) {
  const Tag = ['h1', 'h2', 'h3'].includes(props.level) ? props.level : 'h2'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0, ...style }}>
      <Tag style={headingTagStyle}>{props.text}</Tag>
    </div>
  )
}

export function Text({ props, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0, ...style }}>
      <p style={{ margin: 0, ...multilineTextStyle }}>{props.text}</p>
    </div>
  )
}

export function Button({ props, style }) {
  const href = sanitizeUrl(props.href)
  return (
    <a
      href={href || undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: props.icon ? '0.45em' : undefined,
        textDecoration: 'none',
        cursor: 'pointer',
        ...style,
      }}
      {...linkAttrs(href)}
    >
      <InlineIcon name={props.icon} />
      <span style={multilineTextStyle}>{props.text}</span>
    </a>
  )
}

export function LinkButton({ props, style }) {
  const href = sanitizeUrl(props.href)
  return (
    <a
      href={href || undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: props.icon ? '0.45em' : undefined,
        ...style,
      }}
      {...linkAttrs(href)}
    >
      <InlineIcon name={props.icon} />
      <span style={multilineTextStyle}>{props.text}</span>
    </a>
  )
}

export function Image({ props, style }) {
  const src = sanitizeImageSrc(props.src)
  return (
    <img
      src={src || undefined}
      alt={props.alt || ''}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        ...style,
        // Always cap so the image (and any border) can never overflow its column.
        maxWidth: '100%',
      }}
    />
  )
}

export function Section({ props, style, contentWidth, boxScale = 1 }) {
  const href = sanitizeUrl(props.buttonHref)
  const sectionColor = style?.color || '#1d1d1f'
  const sectionBg = style?.backgroundColor || '#ffffff'
  return (
    <section style={{ fontSize: scaledPx(16, boxScale), ...style, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
      <div
        style={{
          width: '100%',
          maxWidth: contentWidth || undefined,
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        {props.eyebrow ? (
          <p style={{ margin: `0 0 ${scaledPx(10, boxScale)}`, fontSize: '0.78em', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.72, ...multilineTextStyle }}>
            {props.eyebrow}
          </p>
        ) : null}
        {props.heading ? <h2 style={headingTagStyle}>{props.heading}</h2> : null}
        {props.text ? <p style={{ margin: props.heading ? `${scaledPx(12, boxScale)} 0 0` : 0, lineHeight: 1.6, opacity: 0.78, ...multilineTextStyle }}>{props.text}</p> : null}
        {props.buttonText ? (
          <a
            href={href || undefined}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: scaledPx(20, boxScale),
              padding: '0.72em 1.2em',
              borderRadius: '0.65em',
              background: sectionColor,
              color: sectionBg,
              textDecoration: 'none',
              fontWeight: 700,
              ...multilineTextStyle,
            }}
            {...linkAttrs(href)}
          >
            {props.buttonText}
          </a>
        ) : null}
      </div>
    </section>
  )
}

export function Card({ props, style, boxScale = 1 }) {
  return (
    <div style={{ fontSize: scaledPx(16, boxScale), display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', ...style }}>
      {props.title ? (
        <h3 style={{ margin: `0 0 ${scaledPx(8, boxScale)}`, fontSize: '1.25em', fontWeight: 600, ...multilineTextStyle }}>
          {props.title}
        </h3>
      ) : null}
      {props.text ? <p style={{ margin: 0, ...multilineTextStyle }}>{props.text}</p> : null}
    </div>
  )
}

export function List({ props, style, boxScale = 1 }) {
  const items = String(props.text || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  const Tag = props.ordered ? 'ol' : 'ul'
  return (
    <Tag style={{ margin: 0, paddingLeft: '1.4em', ...style }}>
      {items.map((it, i) => (
        <li key={i} style={{ marginBottom: scaledPx(6, boxScale) }}>
          {it}
        </li>
      ))}
    </Tag>
  )
}

export function Quote({ props, style, boxScale = 1 }) {
  return (
    <blockquote
      style={{
        margin: 0,
        borderLeft: `${scaledPx(4, boxScale)} solid currentColor`,
        paddingLeft: scaledPx(18, boxScale),
        fontStyle: 'italic',
        overflowWrap: 'break-word',
        ...style,
      }}
    >
      <p style={{ margin: 0, ...multilineTextStyle }}>{props.text}</p>
      {props.author ? (
        <footer style={{ marginTop: scaledPx(8, boxScale), fontStyle: 'normal', fontSize: '0.85em', opacity: 0.7, ...multilineTextStyle }}>
          — {props.author}
        </footer>
      ) : null}
    </blockquote>
  )
}

export function Badge({ props, style }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', ...multilineTextStyle, ...style }}>
      {props.text}
    </span>
  )
}

// The site's light/dark switch. On the canvas it shows the palette the page
// is drawn in and does nothing when clicked (a click there selects it); in a
// preview or the in-app viewer it switches the palette.
export function ThemeToggle({ props, style }) {
  useSharedCss('pwb-theme-toggle-css', THEME_TOGGLE_CSS)
  const colorMode = useColorMode()
  const dark = colorMode?.current === 'dark'
  const label = themeToggleLabel(props)
  return (
    <button
      type="button"
      className="pwb-theme-toggle"
      data-pwb-theme-toggle=""
      aria-pressed={dark}
      aria-label={label}
      onClick={colorMode?.toggle || undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5em',
        cursor: 'pointer',
        font: 'inherit',
        lineHeight: 1,
        background: 'transparent',
        border: 0,
        padding: 0,
        color: 'inherit',
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        style={{ display: 'inline-flex', width: '1.2em', height: '1.2em' }}
        dangerouslySetInnerHTML={{ __html: dark ? THEME_TOGGLE_ICONS.sun : THEME_TOGGLE_ICONS.moon }}
      />
      {showsLabel(props) && <span>{label}</span>}
    </button>
  )
}

export function Icon({ props, style, boxScale = 1 }) {
  const d = ICONS[props.name] || ICONS.star
  const label = props.label || ''
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      title={label || undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 0,
        fontSize: scaledPx(32, boxScale),
        ...style,
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width="1em"
        height="1em"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={d} />
      </svg>
    </span>
  )
}

// Once per document: what the field classes need (a placeholder's colour, a
// focus ring, the switch). The canvas and the large view draw into the app.
// The CSS a part of the page shares with the published page, added to the
// app's head once.
function useSharedCss(id, css) {
  useLayoutEffect(() => {
    if (typeof document === 'undefined' || document.getElementById(id)) return
    const tag = document.createElement('style')
    tag.id = id
    tag.textContent = css
    document.head.appendChild(tag)
  }, [id, css])
}

function useFormFieldCss() {
  useSharedCss('pwb-form-field-css', FORM_FIELD_CSS)
}

// A form field and its parts, drawn from the same description the published
// page writes (utils/formField.js). Each part is marked with data-field-part
// so the large view can tell which one was clicked.
function FormField({ componentType, props, style, boxScale = 1 }) {
  useFormFieldCss()
  const uid = useId()
  const inputId = `f-${uid.replace(/[^a-zA-Z0-9_-]/g, '')}`
  const [revealed, setRevealed] = useState(false)
  const s = fieldStyles(componentType, props, (value) => scaleCssValue(value, boxScale))
  const required = props.required === 'on'
  const labelText = props.label
    ? <>{props.label}{required ? <span aria-hidden="true"> *</span> : null}</>
    : null
  const help = props.helpText ? <p data-field-part="help" style={s.help}>{props.helpText}</p> : null
  const className = fieldClassName(props)
  const outer = { display: 'flex', flexDirection: 'column', minWidth: 0, ...style }

  if (s.kind === 'check' || s.kind === 'switch') {
    const control = s.kind === 'switch'
      ? (
        <span className="pwb-switch" data-field-part="control" style={s.switchBox}>
          <input id={inputId} type="checkbox" role="switch" defaultChecked={props.checked === 'on'} required={required} />
          <span className="pwb-switch-track" />
        </span>
      )
      : <input id={inputId} data-field-part="control" type="checkbox" defaultChecked={props.checked === 'on'} required={required} style={s.control} />
    return (
      <div style={outer}>
        <div style={s.root}>
          {control}
          {labelText ? <label data-field-part="label" htmlFor={inputId} style={s.label}>{labelText}</label> : null}
          {help}
        </div>
      </div>
    )
  }

  if (s.kind === 'choice') {
    return (
      <div style={outer}>
        <fieldset className="pwb-choices" style={s.root}>
          {labelText ? <legend data-field-part="label" style={s.label}>{labelText}</legend> : null}
          <div data-field-part="choices" style={s.choices}>
            {radioChoices(props).map((option, index) => (
              <label key={`${index}-${option}`} style={s.choice}>
                <input type="radio" name={`${inputId}-choice`} value={option} required={required && index === 0} data-field-part="control" style={s.control} />
                <span>{option}</span>
              </label>
            ))}
          </div>
          {help}
        </fieldset>
      </div>
    )
  }

  const label = labelText
    ? <label data-field-part="label" htmlFor={inputId} style={s.label}>{labelText}</label>
    : null
  let control
  if (s.kind === 'range') {
    const r = rangeAttrs(props)
    control = <input id={inputId} data-field-part="control" type="range" min={r.min} max={r.max} step={r.step} defaultValue={r.value} style={s.range} />
  } else if (s.kind === 'select') {
    const options = choiceList(props)
    control = (
      <select id={inputId} data-field-part="field" className={className} required={required} defaultValue={props.placeholder ? '' : options[0] || ''} style={s.field}>
        {props.placeholder ? <option value="" disabled>{props.placeholder}</option> : null}
        {options.map((option, index) => <option key={`${index}-${option}`} value={option}>{option}</option>)}
      </select>
    )
  } else if (s.kind === 'area') {
    control = <textarea id={inputId} data-field-part="field" className={className} placeholder={props.placeholder || ''} required={required} style={s.field} />
  } else {
    const placeholder = ['date', 'time'].includes(s.type) ? undefined : props.placeholder || ''
    const input = (
      <input
        id={inputId}
        data-field-part="field"
        type={s.type === 'password' && revealed ? 'text' : s.type}
        className={className}
        placeholder={placeholder}
        required={required}
        autoComplete={s.type === 'password' ? 'current-password' : undefined}
        style={s.field}
      />
    )
    control = s.reveal
      ? (
        <div className="pwb-password">
          {input}
          <button
            type="button"
            className="pwb-reveal"
            data-field-part="reveal"
            aria-label="Show password"
            aria-pressed={revealed ? 'true' : 'false'}
            onClick={() => setRevealed((value) => !value)}
            style={s.revealButton}
            dangerouslySetInnerHTML={{ __html: EYE_ICONS }}
          />
        </div>
      )
      : input
  }
  return (
    <div style={outer}>
      <div style={s.root}>
        {label}
        {control}
        {help}
      </div>
    </div>
  )
}

export function Input({ props, style, boxScale = 1 }) {
  return <FormField componentType="input" props={props} style={style} boxScale={boxScale} />
}

export function Select({ props, style, boxScale = 1 }) {
  return <FormField componentType="select" props={props} style={style} boxScale={boxScale} />
}

export function Alert({ props, style, boxScale = 1 }) {
  const v = ALERT_VARIANTS[props.variant] || ALERT_VARIANTS.info
  const d = ICONS[props.icon] || ICONS.check
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: scaledPx(10, boxScale),
        padding: `${scaledPx(12, boxScale)} ${scaledPx(16, boxScale)}`,
        borderRadius: scaledPx(10, boxScale),
        border: `${scaledPx(1, boxScale)} solid ${v.border}`,
        background: v.bg,
        color: v.color,
        fontSize: scaledPx(16, boxScale),
        ...style,
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width={scaleCssValue('20px', boxScale)}
        height={scaleCssValue('20px', boxScale)}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0 }}
      >
        <path d={d} />
      </svg>
      <span style={multilineTextStyle}>{props.text}</span>
    </div>
  )
}

export function Accordion({ props, style, boxScale = 1 }) {
  return (
    <details style={{ border: `${scaledPx(1, boxScale)} solid #e5e7eb`, borderRadius: scaledPx(10, boxScale), padding: `${scaledPx(2, boxScale)} ${scaledPx(16, boxScale)}`, ...style }}>
      <summary style={{ cursor: 'pointer', fontWeight: 600, padding: `${scaledPx(12, boxScale)} 0`, ...multilineTextStyle }}>
        {props.title}
      </summary>
      <div style={{ paddingBottom: scaledPx(14, boxScale), color: '#4b5563', ...multilineTextStyle }}>
        {props.text}
      </div>
    </details>
  )
}

// Placeholder for the registry; the real (recursive) container rendering lives in
// RenderComponent, which lays its children out in a flex box.
export function Container({ style }) {
  return <div style={{ display: 'flex', flexDirection: 'column', ...style }} />
}

// Placeholder; real recursive rendering (tab strip + per-panel children) lives in
// RenderComponent so it can recurse like Container does.
export function Tabs({ style }) {
  return <div style={{ display: 'flex', flexDirection: 'column', ...style }} />
}

// HTML embed: arbitrary user HTML/CSS/JS rendered inside a sandboxed iframe so
// it can't reach the editor or other components on the page. The iframe runs
// allow-scripts + allow-same-origin only when explicitly needed; the default
// `allow-scripts` keeps an opaque origin so the embed can't read parent storage.
export function HtmlEmbed({ props, style, boxScale = 1, editorPreview = false }) {
  const language = useContext(LanguageContext)
  // The embed is its own document and inherits nothing, so an embed that opts
  // in (`_siteFont`, see baseFontTag) is handed the font of the page around it:
  // from the canvas when it provides one, else read once from the element the
  // embed sits in. Until that read, no srcdoc, so the frame never loads twice.
  const siteFont = props._siteFont === true
  const contextFont = useContext(EmbedFontContext)
  const frameRef = useRef(null)
  const [pageFont, setPageFont] = useState(null)
  useLayoutEffect(() => {
    if (!siteFont || contextFont) return
    const parent = frameRef.current?.parentElement
    setPageFont(parent ? window.getComputedStyle(parent).fontFamily || '' : '')
  }, [siteFont, contextFont])
  const font = siteFont ? contextFont || pageFont : ''
  const code = typeof props.code === 'string' ? props.code : ''
  const baseHtml = htmlEmbedDocument(code, { ...htmlEmbedDocumentOptions({ type: 'html', props }, boxScale), font })
  // Inject the same anchor-interceptor / tabs handler the rest of the site
  // uses. Without it, an `<a href="#">` inside the user's snippet navigates the
  // sandboxed iframe to `about:srcdoc#` — which, in an iframe sandboxed without
  // `allow-same-origin`, can blank the iframe out and leave the user staring
  // at a white box.
  const srcDoc = font === null ? undefined : withBuilderInteractiveHtml(baseHtml)
  // A site with a light/dark switch: the block's document carries both
  // palettes (colorMode.js), and is told which one is on, now and on every
  // switch, without being reloaded.
  const palette = useColorMode()?.current || null
  useEffect(() => {
    const frame = frameRef.current
    if (!frame || !palette) return undefined
    const send = () => frame.contentWindow?.postMessage({ type: 'pwb-color-mode-set', mode: palette }, '*')
    send()
    frame.addEventListener('load', send)
    return () => frame.removeEventListener('load', send)
  }, [palette, srcDoc])
  return (
    <iframe
      ref={frameRef}
      title={language?.t('Embedded HTML') || 'Embedded HTML'}
      srcDoc={srcDoc}
      scrolling="no"
      tabIndex={editorPreview ? -1 : undefined}
      sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals"
      style={{
        ...style,
        display: 'block',
        width: '100%',
        height: '100%',
        border: '0',
        backgroundColor: style?.backgroundColor || 'transparent',
        overflow: 'hidden',
        pointerEvents: editorPreview ? 'none' : style?.pointerEvents,
        userSelect: editorPreview ? 'none' : style?.userSelect,
      }}
    />
  )
}

export function Divider({ style, contentWidth }) {
  return (
    <div
      style={{
        ...style,
        maxWidth: contentWidth || undefined,
        marginLeft: contentWidth ? 'auto' : undefined,
        marginRight: contentWidth ? 'auto' : undefined,
      }}
    />
  )
}

export function Spacer({ style }) {
  return <div aria-hidden="true" style={{ ...style }} />
}
