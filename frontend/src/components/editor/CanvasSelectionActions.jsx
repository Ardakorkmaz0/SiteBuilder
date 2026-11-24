import {
  selectCanMoveComponent,
  selectComponentParent,
  selectCurrentPage,
  useEditorStore,
} from '../../store/editorStore.js'
import { fitHtmlEmbedLayout } from '../../utils/htmlEmbedMeasure.js'
import { useLanguage } from '../../i18n/useLanguage.js'
import { selectionActionsScaleStyle } from './canvasSelectionActionsLayout.js'
import { canvasFontFamily } from '../../utils/theme.js'
import { NodeIcon } from '../icons.jsx'
import {
  SELECTION_BAR_BACKGROUND,
  SELECTION_BAR_BORDER,
  SELECTION_BAR_SHADOW,
  SELECTION_ICON_SIZE,
  selectionActionIcon,
} from './selectionToolbar.js'

function findById(components, id) {
  for (const c of components || []) {
    if (c.id === id) return c
    const deep = findById(c.children, id)
    if (deep) return deep
  }
  return null
}

// `inline` docks the bar in the editor toolbar instead of floating it over the
// selected element: one stable place for every element's actions, so it never
// covers the design and never has to be hunted for.
export default function CanvasSelectionActions({ componentId, canvasScale = 1, style, inline = false, onSpotlight }) {
  const { t } = useLanguage()
  const parent = useEditorStore((state) => selectComponentParent(state, componentId))
  const canMoveBackward = useEditorStore((state) => selectCanMoveComponent(state, componentId, 'backward'))
  const canMoveForward = useEditorStore((state) => selectCanMoveComponent(state, componentId, 'forward'))
  const selectParent = useEditorStore((state) => state.selectParentComponent)
  const duplicate = useEditorStore((state) => state.duplicateComponent)
  const moveBackward = useEditorStore((state) => state.moveBackward)
  const moveForward = useEditorStore((state) => state.moveForward)
  const remove = useEditorStore((state) => state.removeComponent)
  const select = useEditorStore((state) => state.selectComponent)
  const fitEmbedBox = useEditorStore((state) => state.fitEmbedBox)
  const setVisibility = useEditorStore((state) => state.setVisibility)
  // Per-breakpoint visibility, pinned in the toolbar like duplicate/front/back.
  const pcHidden = useEditorStore(
    (state) => !!findById(selectCurrentPage(state)?.components, componentId)?.hidden,
  )
  const mobileHidden = useEditorStore(
    (state) => !!findById(selectCurrentPage(state)?.components, componentId)?.hiddenMobile,
  )
  // Fit lives here (not only in the Size panel) so an embed whose frame
  // overshoots or clips its content is fixed right where the user sees it.
  // PC viewport only — the fit targets the PC design box.
  const canFit = useEditorStore(
    (state) =>
      state.viewport !== 'mobile' &&
      findById(selectCurrentPage(state)?.components, componentId)?.type === 'html',
  )
  const fitToContent = () => {
    const comp = findById(selectCurrentPage(useEditorStore.getState())?.components, componentId)
    if (comp?.type !== 'html') return
    // Pressing Fit is an explicit "go back to hugging the content" — it clears
    // the hand-sized flag so the box tracks the content again from here on.
    const store = useEditorStore.getState()
    fitHtmlEmbedLayout(comp, Math.round(comp.layout?.w || 360), (patch) =>
      fitEmbedBox(componentId, patch, { releaseManual: true }),
    { font: canvasFontFamily(store.schema, selectCurrentPage(store)) })
  }
  const icon = (id, off) => <NodeIcon key={`${id}-icon`} name={selectionActionIcon(id, { off })} size={SELECTION_ICON_SIZE} />
  const actions = [
    ['parent', icon('parent'), t('Select parent'), () => selectParent(componentId), !parent],
    ['duplicate', icon('duplicate'), t('Duplicate'), () => duplicate(componentId), false],
    ...(canFit
      ? [['fit', icon('fit'), t('Fit to content'), fitToContent, false]]
      : []),
    ['backward', icon('backward'), t('Backward'), () => moveBackward(componentId), !canMoveBackward],
    ['forward', icon('forward'), t('Forward'), () => moveForward(componentId), !canMoveForward],
    // An element may be hidden on ONE breakpoint only — hiding both would make
    // it invisible everywhere and unreachable, which is what Delete is for.
    [
      'vis-pc',
      icon('vis-pc', pcHidden),
      pcHidden
        ? t('Show on PC')
        : mobileHidden
          ? t('Already hidden on Mobile — delete it instead of hiding both')
          : t('Hide on PC'),
      () => setVisibility(componentId, { hidden: !pcHidden }),
      !pcHidden && mobileHidden,
      pcHidden,
    ],
    [
      'vis-mobile',
      icon('vis-mobile', mobileHidden),
      mobileHidden
        ? t('Show on Mobile')
        : pcHidden
          ? t('Already hidden on PC — delete it instead of hiding both')
          : t('Hide on Mobile'),
      () => setVisibility(componentId, { hiddenMobile: !mobileHidden }),
      !mobileHidden && pcHidden,
      mobileHidden,
    ],
    // Opens the component on its own, large: the canvas is fitted down too far
    // to judge type or spacing on.
    ...(onSpotlight
      ? [['spotlight', icon('spotlight'), t('Open large'), () => onSpotlight(componentId), false]]
      : []),
    ['delete', icon('delete'), t('Delete component'), () => remove(componentId), false],
    // Last, as on an HTML page: let go of the selection without changing it.
    ['deselect', icon('deselect'), t('Deselect'), () => select(null), false],
  ]

  return (
    <div
      role="toolbar"
      aria-label={t('Arrange')}
      data-canvas-selection-actions=""
      onPointerDown={(event) => {
        event.preventDefault()
        event.stopPropagation()
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        width: 'max-content',
        padding: 4,
        border: `1px solid ${SELECTION_BAR_BORDER}`,
        borderRadius: 9,
        background: SELECTION_BAR_BACKGROUND,
        pointerEvents: 'auto',
        ...(inline
          ? { position: 'static', flexShrink: 0 }
          : {
              position: 'absolute',
              zIndex: 36,
              boxShadow: SELECTION_BAR_SHADOW,
              ...selectionActionsScaleStyle(canvasScale),
            }),
        ...style,
      }}
    >
      {actions.map(([id, icon, label, onClick, disabled, dimmed]) => (
        <button
          key={id}
          type="button"
          data-canvas-selection-action={id}
          aria-label={label}
          aria-pressed={dimmed === undefined ? undefined : dimmed}
          title={label}
          disabled={disabled}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onClick()
          }}
          className={`grid h-7 w-7 place-items-center rounded-md border-0 bg-transparent p-0 text-white disabled:cursor-not-allowed disabled:opacity-25 ${
            id === 'delete' ? 'hover:bg-[#991b1b]' : 'hover:bg-white/10'
          } ${dimmed ? 'text-amber-300/80' : ''}`}
        >
          {icon}
        </button>
      ))}
    </div>
  )
}
