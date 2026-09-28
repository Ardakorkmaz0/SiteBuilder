// A form field's settings, grouped by the part they change: its label, the
// field, the placeholder, the help line, and what the field's kind adds. In
// the large view a click on a part narrows the panel to that part.
import { useLanguage } from '../../i18n/useLanguage.js'
import { useEditorStore } from '../../store/editorStore.js'
import { controlsFor, partLabel, partsFor } from '../../utils/formField.js'
import PanelGroup from './PanelGroup.jsx'

export default function FieldPartsEditor({ component, renderControl }) {
  const { t } = useLanguage()
  const selectedPart = useEditorStore((state) => state.selectedPart)
  const setSelectedPart = useEditorStore((state) => state.setSelectedPart)
  const props = component.props || {}
  const controls = controlsFor(component.type, props.inputType)
  const parts = partsFor(component.type, props.inputType)
  const focus = parts.includes(selectedPart) ? selectedPart : null
  const nameOf = (part) => t(partLabel(part, component.type, props.inputType))
  const partControls = (part) => controls.filter((control) => control.part === part).map(renderControl)

  return (
    <div className="space-y-2">
      {controls.filter((control) => control.part === null).map(renderControl)}
      {focus ? (
        // Picked in the large view: that part alone, open, with the way back.
        <section aria-label={nameOf(focus)} className="space-y-3 rounded-lg border border-[var(--studio-accent)] p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-[var(--studio-text)]">{nameOf(focus)}</h3>
            <button
              type="button"
              onClick={() => setSelectedPart(null)}
              className="studio-btn studio-btn-secondary px-2 py-1 text-[11px]"
            >
              {t('All parts')}
            </button>
          </div>
          {partControls(focus)}
        </section>
      ) : (
        parts.map((part) => (
          <PanelGroup
            key={part}
            id={`field-part-${part}`}
            title={nameOf(part)}
            defaultOpen={part === 'label' || part === 'field' || part === 'control'}
          >
            {partControls(part)}
          </PanelGroup>
        ))
      )}
    </div>
  )
}
