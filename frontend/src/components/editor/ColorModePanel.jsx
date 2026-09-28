// The Theme panel's group for the site's other palette: the colors a visitor
// gets after pressing the theme switch (utils/colorMode.js). A light site's
// other palette is dark and a dark site's is light, so the group is named for
// whichever that is.
import PanelGroup from './PanelGroup.jsx'
import { LabeledCheckbox, LabeledColor } from './controls.jsx'
import { useLanguage } from '../../i18n/useLanguage.js'
import { selectCurrentPage, useEditorStore } from '../../store/editorStore.js'
import { colorModeFor, hasThemeToggle } from '../../utils/colorMode.js'
import { CANVAS_WIDTH } from '../registry.jsx'

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

const NO_HTML = {}

export default function ColorModePanel({ htmlMode = false, htmlMap = NO_HTML }) {
  const { t } = useLanguage()
  const schema = useEditorStore((s) => s.schema)
  const page = useEditorStore(selectCurrentPage)
  const updateColorMode = useEditorStore((s) => s.updateColorMode)
  const preview = useEditorStore((s) => s.colorModePreview)
  const setPreview = useEditorStore((s) => s.setColorModePreview)
  const addComponent = useEditorStore((s) => s.addComponent)
  // The page on screen decides the direction: a dark template's other
  // palette is a light one, whatever the site theme says.
  const mode = colorModeFor(schema, page, htmlMap, { always: true })
  const other = mode.other
  const dark = mode.alt === 'dark'
  const hasSwitch = hasThemeToggle(schema, htmlMap)
  const own = schema?.colorMode?.theme || {}
  const edited = Object.keys(own).length > 0

  const addSwitch = () => {
    const width = page?.canvasWidth || CANVAS_WIDTH
    addComponent('themeToggle', Math.max(0, width - 44 - 24), 24, null, 'icon', { w: 44, h: 44 })
  }

  return (
    <PanelGroup id="theme-color-mode" title={dark ? t('Dark mode') : t('Light mode')} defaultOpen>
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
        </div>
      )}
      {!htmlMode && (
        <LabeledCheckbox
          label={dark ? t('Show dark mode on the canvas') : t('Show light mode on the canvas')}
          checked={preview}
          onChange={setPreview}
        />
      )}
      <LabeledCheckbox
        label={t('Start in the visitor’s device setting')}
        checked={!!schema?.colorMode?.followDevice}
        onChange={(on) => updateColorMode({ followDevice: on })}
      />
      {ROLES.map(([role, label]) => (
        <LabeledColor
          key={role}
          label={t(label)}
          value={other[role]}
          onChange={(value) => updateColorMode({ theme: { [role]: value } })}
        />
      ))}
      {edited && (
        <button type="button" onClick={() => updateColorMode({ theme: null })} className="studio-btn studio-btn-secondary px-2 py-1 text-xs">
          {t('Use the suggested colors')}
        </button>
      )}
    </PanelGroup>
  )
}
