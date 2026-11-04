// The Theme panel's group for the site's other palette: the colors a visitor
// gets after pressing the theme switch (utils/colorMode.js). A light site's
// other palette is dark and a dark site's is light, so the group is named for
// whichever that is.
import PanelGroup from './PanelGroup.jsx'
import { LabeledCheckbox, LabeledColor } from './controls.jsx'
import { useLanguage } from '../../i18n/useLanguage.js'
import { selectCurrentPage, useEditorStore } from '../../store/editorStore.js'
import { colorModeFor, contrastProblems, hasThemeToggle, normalizeHex, pagesWithoutThemeToggle, siteStart } from '../../utils/colorMode.js'
import { moveInRadioGroup } from '../../ui/radioGroupKeys.js'

const ROLES = [
  ['backgroundColor', 'Page background'],
  ['surfaceColor', 'Cards and fields'],
  ['softColor', 'Soft sections'],
  ['textColor', 'Text color'],
  ['mutedColor', 'Muted color'],
  ['borderColor', 'Border color'],
  ['primaryColor', 'Primary color'],
  ['buttonTextColor', 'Button text color'],
  ['accentColor', 'Accent color'],
  ['headerColor', 'Header background'],
  ['headerTextColor', 'Header text'],
]

const STARTS = [['light', 'Light'], ['dark', 'Dark'], ['system', 'Device']]

const NO_HTML = {}

export default function ColorModePanel({ htmlMode = false, htmlMap = NO_HTML }) {
  const { t } = useLanguage()
  const schema = useEditorStore((s) => s.schema)
  const page = useEditorStore(selectCurrentPage)
  const updateColorMode = useEditorStore((s) => s.updateColorMode)
  const preview = useEditorStore((s) => s.colorModePreview)
  const setPreview = useEditorStore((s) => s.setColorModePreview)
  const addThemeSwitchToPages = useEditorStore((s) => s.addThemeSwitchToPages)
  // The page on screen decides the direction: a dark template's other
  // palette is a light one, whatever the site theme says.
  const mode = colorModeFor(schema, page, htmlMap, { always: true })
  const other = mode.other
  const dark = mode.alt === 'dark'
  const hasSwitch = hasThemeToggle(schema, htmlMap)
  const own = schema?.colorMode?.theme || {}
  const edited = Object.keys(own).length > 0
  const start = siteStart(schema) || mode.base
  const without = pagesWithoutThemeToggle(schema, htmlMap)
  const canvasIds = without.canvas.map((missing) => missing.id)
  const problems = contrastProblems(other)
  const roleLabel = (role) => t(ROLES.find(([id]) => id === role)[1])

  const addSwitch = () => addThemeSwitchToPages([page.id], { select: true })
  const addToMany = canvasIds.length === 1
    ? t('Add one to 1 page')
    : t('Add one to {count} pages', { count: canvasIds.length })

  return (
    <PanelGroup id="theme-color-mode" title={dark ? t('Dark mode') : t('Light mode')} defaultOpen>
      <div className="space-y-1.5">
        <p id="theme-color-mode-start" className="text-[11px] font-medium leading-snug text-[var(--studio-text)]">{t('The site opens in')}</p>
        <div role="radiogroup" aria-labelledby="theme-color-mode-start" onKeyDown={moveInRadioGroup} className="studio-segment flex w-full">
          {STARTS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={start === value}
              tabIndex={start === value ? 0 : -1}
              onClick={() => { if (start !== value) updateColorMode({ start: value }) }}
              className={`studio-segment-btn flex-1 whitespace-nowrap ${start === value ? 'studio-segment-btn-active' : ''}`}
            >
              {t(label)}
            </button>
          ))}
        </div>
        {start === 'system' && (
          <p className="text-[11px] leading-snug text-[var(--studio-text-muted)]">{t('Each visitor gets the setting of their own device.')}</p>
        )}
        {start === mode.alt && (
          <p className="text-[11px] leading-snug text-[var(--studio-text-muted)]">{t('Visitors see the colors below first; the editor keeps showing the colors you design in.')}</p>
        )}
      </div>
      <p className="text-[11px] leading-snug text-[var(--studio-text-muted)]">
        {dark
          ? t('Visitors switch to these colors with the theme switch. Colors from the theme follow; a color you picked for one block stays.')
          : t('Visitors switch to these light colors with the theme switch. Colors from the theme follow; a color you picked for one block stays.')}
      </p>
      {!hasSwitch && (
        <div className="space-y-1.5 rounded-lg border border-[var(--studio-border)] p-2">
          <p className="text-[11px] leading-snug text-[var(--studio-text)]">
            {t('The site has no theme switch yet, so visitors cannot change the colors.')}
          </p>
          {htmlMode ? (
            <p className="text-[11px] leading-snug text-[var(--studio-text-muted)]">
              {t('Add one from Components, under Theme switch.')}
            </p>
          ) : (
            <button type="button" onClick={addSwitch} className="studio-btn studio-btn-secondary px-2 py-1 text-xs">
              {t('Add a theme switch to this page')}
            </button>
          )}
          {canvasIds.length > 1 && (
            <button type="button" onClick={() => addThemeSwitchToPages(canvasIds)} className="studio-btn studio-btn-secondary px-2 py-1 text-xs">
              {addToMany}
            </button>
          )}
          {!htmlMode && without.html.length > 0 && (
            <p className="text-[11px] leading-snug text-[var(--studio-text-muted)]">
              {t('An HTML page gets its own from Components, under Theme switch.')}
            </p>
          )}
        </div>
      )}
      {hasSwitch && canvasIds.length + without.html.length > 0 && (
        <div className="space-y-1.5 rounded-lg border border-[var(--studio-border)] p-2">
          <p className="text-[11px] leading-snug text-[var(--studio-text)]">
            {canvasIds.length + without.html.length === 1
              ? t('1 page has no theme switch: it follows the choice, but visitors cannot change it there.')
              : t('{count} pages have no theme switch: they follow the choice, but visitors cannot change it there.', { count: canvasIds.length + without.html.length })}
          </p>
          {canvasIds.length > 0 && (
            <button type="button" onClick={() => addThemeSwitchToPages(canvasIds)} className="studio-btn studio-btn-secondary px-2 py-1 text-xs">
              {addToMany}
            </button>
          )}
          {without.html.length > 0 && (
            <p className="text-[11px] leading-snug text-[var(--studio-text-muted)]">
              {t('An HTML page gets its own from Components, under Theme switch.')}
            </p>
          )}
        </div>
      )}
      {/* An HTML page has no canvas: its View shows the other palette, before
          the page has a switch to reach it with. */}
      <LabeledCheckbox
        label={htmlMode
          ? (dark ? t('Show dark mode in View') : t('Show light mode in View'))
          : (dark ? t('Show dark mode on the canvas') : t('Show light mode on the canvas'))}
        checked={preview}
        onChange={setPreview}
      />
      {ROLES.map(([role, label]) => (
        <div key={role} className="space-y-1">
          <LabeledColor
            label={t(label)}
            value={other[role]}
            accepts={normalizeHex}
            onChange={(value) => updateColorMode({ theme: { [role]: value } })}
          />
          {problems.filter((problem) => problem.role === role).map((problem) => (
            <p key={problem.on} className="text-[11px] leading-snug text-[var(--studio-warning)]">
              {t('Hard to read on {surface}: {ratio}:1, needs {min}:1.', { surface: roleLabel(problem.on), ratio: problem.ratio, min: problem.min })}
            </p>
          ))}
        </div>
      ))}
      {edited && (
        <button type="button" onClick={() => updateColorMode({ theme: null })} className="studio-btn studio-btn-secondary px-2 py-1 text-xs">
          {t('Use the suggested colors')}
        </button>
      )}
    </PanelGroup>
  )
}
