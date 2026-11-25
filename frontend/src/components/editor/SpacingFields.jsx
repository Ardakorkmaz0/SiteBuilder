import { useLanguage } from '../../i18n/useLanguage.js'
import PanelGroup from './PanelGroup.jsx'
import { LabeledPx } from './controls.jsx'

const SPACING_KEYS = ['padding', 'paddingSides', 'margin', 'marginVertical']
const PADDING_SIDES = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']

// What the all-sides padding field shows. Where the sides differ it shows
// nothing, and says so, instead of one side's number (an HTML element reports
// its top padding there) or a shorthand like "24px 16px".
function allSides(all, sides) {
  if (sides.length === 4 && sides.some((side) => side !== sides[0])) return { value: '', differ: true }
  return { value: all || sides[0] || '', differ: false }
}

// A value in px, or none: the box model then says its values are pixels.
const inPixels = (value) => !value || /^\s*-?(?:\d+\.?\d*|\.\d+)\s*(px)?\s*$/i.test(value)

function Caption({ children }) {
  return (
    <span className="block text-[10px] font-semibold text-[var(--studio-text-muted)]">{children}</span>
  )
}

// Padding and margin drawn as the box they make: the margin outside, the
// padding inside it, the content in the middle, each number at the side it
// changes. The same fields as before, read and written by the same adapter on
// an HTML page and on a canvas page (inspectorAdapters.js).
export default function SpacingFields({ adapter }) {
  const { t } = useLanguage()
  if (!adapter.hasAny(SPACING_KEYS)) return null

  const hasSides = adapter.has('paddingSides')
  const hasMarginSides = adapter.has('marginVertical')
  const get = (key) => String(adapter.get(key) ?? '')
  const field = (key, label) => (
    <LabeledPx
      bare
      label={t(label)}
      value={get(key)}
      subject={adapter.subject}
      onChange={(v) => adapter.set(key, v)}
    />
  )
  const sides = hasSides ? PADDING_SIDES.map(get) : []
  const padding = allSides(get('padding'), sides)
  const boxValues = [...sides, ...(hasMarginSides ? [get('marginTop'), get('marginBottom')] : [])]

  return (
    <PanelGroup id="spacing" title={t('Spacing')} defaultOpen>
      {adapter.has('padding') && (
        <LabeledPx
          label={t('Padding')}
          hint={t('All sides')}
          value={padding.value}
          placeholder={padding.differ ? t('Sides differ') : undefined}
          subject={adapter.subject}
          onChange={(v) => adapter.set('padding', v)}
        />
      )}
      {adapter.has('margin') && (
        <LabeledPx
          label={t('Margin')}
          hint={t('All sides')}
          value={adapter.get('margin')}
          subject={adapter.subject}
          onChange={(v) => adapter.set('margin', v)}
        />
      )}
      {(hasSides || hasMarginSides) && (
        <div
          role="group"
          aria-label={t('Box model')}
          className="space-y-1.5 rounded-lg border border-[var(--studio-border)] bg-[var(--studio-panel-muted)] p-2 text-center"
        >
          {hasMarginSides && (
            <>
              <Caption>{t('Margin')}</Caption>
              <div className="flex justify-center">{field('marginTop', 'Margin top')}</div>
            </>
          )}
          <div
            className={hasSides
              ? 'space-y-1.5 rounded-md border border-dashed border-[var(--studio-accent)] bg-[var(--studio-accent-soft)] p-2'
              : 'p-0.5'}
          >
            {hasSides && (
              <>
                <Caption>{t('Padding')}</Caption>
                <div className="flex justify-center">{field('paddingTop', 'Padding top')}</div>
              </>
            )}
            <div className="flex items-center gap-1.5">
              {hasSides && field('paddingLeft', 'Padding left')}
              <span className="flex h-8 min-w-0 flex-1 items-center justify-center rounded-md border border-[var(--studio-border)] bg-[var(--studio-panel-raised)] text-[10px] text-[var(--studio-text-muted)]">
                {t('Content')}
              </span>
              {hasSides && field('paddingRight', 'Padding right')}
            </div>
            {hasSides && <div className="flex justify-center">{field('paddingBottom', 'Padding bottom')}</div>}
          </div>
          {hasMarginSides && <div className="flex justify-center">{field('marginBottom', 'Margin bottom')}</div>}
        </div>
      )}
      {(hasSides || hasMarginSides) && boxValues.every(inPixels) && (
        <p className="text-[10px] text-[var(--studio-text-faint)]">{t('Values in pixels.')}</p>
      )}
    </PanelGroup>
  )
}
