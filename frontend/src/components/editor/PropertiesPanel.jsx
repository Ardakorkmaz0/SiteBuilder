import { useCallback, useState } from 'react'
import { useEditorStore, selectComponentParent, selectCurrentPage } from '../../store/editorStore.js'
import { registry } from '../registry.jsx'
import PanelTabs from './PanelTabs.jsx'
import PanelGroup from './PanelGroup.jsx'
import PropertiesHeader from './PropertiesHeader.jsx'
import MobileOverrideBanner from './MobileOverrideBanner.jsx'
import TypographyFields from './TypographyFields.jsx'
import ColorFields from './ColorFields.jsx'
import BorderFields from './BorderFields.jsx'
import EffectsFields from './EffectsFields.jsx'
import AlignmentFields from './AlignmentFields.jsx'
import SizeFields from './SizeFields.jsx'
import SpacingFields from './SpacingFields.jsx'
import PositionStackFields from './PositionStackFields.jsx'
import FlexLayoutFields from './FlexLayoutFields.jsx'
import MotionFields from './MotionFields.jsx'
import { createCanvasInspectorAdapter } from './inspectorAdapters.js'
import { PROPERTIES_TABS } from './propertiesTabs.js'
import { componentKindIcon } from './elementKindIcons.js'
import AiComponentEdit from './AiComponentEdit.jsx'
import { useAiAvailable } from '../../utils/aiProviders.js'
import { LINKABLE_TYPES } from '../renderer/constants.js'
import { DEFAULT_THEME, FONT_OPTIONS, THEME_PRESETS, canvasFontFamily, hasOwnTheme, normalizeTheme, presetTheme, sameTheme } from '../../utils/theme.js'
import SavedThemes, { ThemeSwatchButton } from './SavedThemes.jsx'
import { hiddenByPinnedBar } from '../../utils/pinnedCover.js'
import { presetOptions, presetsForType } from '../../utils/componentPresets.js'
import {
  appendSnippet,
  groupSnippets,
  jsSnippets,
} from '../../utils/snippets.js'
import { htmlBaseSizeFromComponent } from '../../utils/htmlSnippetSizing.js'
import { LANGUAGES } from '../../utils/languages.js'
import { containerChildKey } from '../../utils/containerFit.js'
import {
  LabeledText,
  LabeledTextarea,
  LabeledImage,
  LabeledColor,
  LabeledSelect,
  LabeledPx,
  LabeledAlign,
  LabeledRange,
  LabeledCheckbox,
  LinkTargetControl,
  LinksEditor,
  HtmlContentControl,
  SegmentedIconButtons,
  TabsEditorControl,
} from './controls.jsx'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CopyIcon,
  FileIcon,
  MinusIcon,
  MoreHorizontalIcon,
  PaletteIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
} from '../icons.jsx'
import { useLanguage } from '../../i18n/useLanguage.js'
import { fitHtmlEmbedLayout } from '../../utils/htmlEmbedMeasure.js'
import { listEmbedImages, replaceEmbedImage } from '../../utils/embedImages.js'
import { blockTextHint, linkSectionsFor } from '../../utils/linkTargets.js'
import FieldPartsEditor from './FieldPartsEditor.jsx'
import ColorModePanel from './ColorModePanel.jsx'
import { FIT_TYPES } from '../../utils/boxFit.js'
import { isAutoLayout } from '../../utils/autoLayout.js'
import { anchorOf, anchorProblem, slugifyAnchor } from '../../utils/anchors.js'
import HtmlPageColors from './HtmlPageColors.jsx'
import { moveInRadioGroup } from '../../ui/radioGroupKeys.js'

// How far below the top edge a bar can be drawn and still be read as "meant
// to sit at the top". Above this the Y is a design position, not a gap.
const PIN_KEEPS_DESIGN_Y = 100

const JS_SNIPPET_GROUPS = groupSnippets(jsSnippets)

// Optional snippet picker. Empty selection is the default — writing by hand
// stays the primary workflow; this is just a shortcut.
function SnippetPicker({ groups, list, onPick }) {
  const { t } = useLanguage()
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-[var(--studio-text-muted)]">
        {t('Insert snippet (optional)')}
      </span>
      <select
        value=""
        onChange={(e) => {
          const id = e.target.value
          if (!id) return
          const snippet = list.find((s) => s.id === id)
          if (snippet) onPick(snippet)
          e.target.value = ''
        }}
        className="studio-input min-w-0 w-full px-2.5 py-1.5 text-xs"
      >
        <option value="">{t('— pick a snippet to append —')}</option>
        {groups.map((g) => (
          <optgroup key={g.category} label={t(g.category)}>
            {g.items.map((s) => (
              <option key={s.id} value={s.id} title={t(s.description)}>
                {t(s.name)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  )
}

const STYLE_META = {
  transform: { label: 'Transform', control: 'text', placeholder: 'e.g. rotate(-3deg) scale(1.05)' },
  filter: { label: 'Filter', control: 'text', placeholder: 'e.g. blur(2px) brightness(1.1)' },
  backdropFilter: { label: 'Backdrop filter', control: 'text', placeholder: 'e.g. blur(8px)' },
  textShadow: { label: 'Text shadow', control: 'text', placeholder: 'e.g. 0 2px 6px rgba(0,0,0,.3)' },
  aspectRatio: { label: 'Aspect ratio', control: 'text', placeholder: 'e.g. 16 / 9' },
  objectPosition: { label: 'Image position', control: 'text', placeholder: 'e.g. center' },
  backgroundSize: {
    label: 'Background size',
    control: 'select',
    options: [['auto', 'Auto'], ['cover', 'Cover'], ['contain', 'Contain']],
  },
  backgroundPosition: { label: 'Background position', control: 'text', placeholder: 'e.g. center' },
  backgroundRepeat: {
    label: 'Background repeat',
    control: 'select',
    options: [
      ['no-repeat', 'No repeat'],
      ['repeat', 'Repeat'],
      ['repeat-x', 'Repeat X'],
      ['repeat-y', 'Repeat Y'],
    ],
  },
  cursor: {
    label: 'Cursor',
    control: 'select',
    options: [
      ['auto', 'Auto'],
      ['pointer', 'Pointer'],
      ['default', 'Default'],
      ['move', 'Move'],
      ['text', 'Text'],
      ['not-allowed', 'Not allowed'],
    ],
  },
}

// Universal advanced style controls shown for every component (standard CSS).
const ADVANCED_STYLE_KEYS = [
  'transform', 'filter', 'backdropFilter', 'textShadow', 'aspectRatio',
  'objectPosition', 'backgroundSize', 'backgroundPosition', 'backgroundRepeat',
  'cursor',
]

const PROPS_TAB_KEY = 'pwb_props_tab'
const PAGE_TAB_KEY = 'pwb_page_tab'

// Project code lives in Source and AI lives in its own workspace. Keeping this
// list visual-only prevents the same feature from appearing in three places.
const PAGE_TABS = [
  ['page', 'Page', FileIcon],
  ['theme', 'Theme', PaletteIcon],
]

const THEME_SHAPES = [
  ['sharp', 'Sharp', '0px', '0px'],
  ['soft', 'Soft', '8px', '8px'],
  ['rounded', 'Rounded', '16px', '12px'],
  ['pill', 'Pill buttons', '18px', '999px'],
]

// Typography choices. The empty value leaves every block as designed; picking
// one sets it on every heading or paragraph when the theme is applied.
const HEADING_WEIGHTS = [
  ['', 'As designed'], ['400', 'Regular'], ['500', 'Medium'], ['600', 'Semibold'],
  ['700', 'Bold'], ['800', 'Extra bold'], ['900', 'Black'],
]
const HEADING_TRACKING = [
  ['', 'As designed'], ['-0.03em', 'Tight'], ['-0.015em', 'Slightly tight'],
  ['0em', 'Normal'], ['0.02em', 'Wide'], ['0.06em', 'Extra wide'],
]
const BODY_LINE_HEIGHTS = [
  ['', 'As designed'], ['1.4', 'Compact'], ['1.55', 'Comfortable'], ['1.7', 'Relaxed'], ['1.9', 'Airy'],
]

const THEME_SHADOWS = [
  ['none', 'No shadow', 'none'],
  ['subtle', 'Subtle shadow', '0 1px 3px rgba(15,23,42,0.08)'],
  ['soft', 'Soft shadow', '0 8px 24px rgba(15,23,42,0.10)'],
  ['strong', 'Strong shadow', '0 18px 45px rgba(15,23,42,0.18)'],
]

// Find a component anywhere in the tree (containers and tabs nest children).
const NESTING_TYPES = new Set(['container', 'tabs', 'region'])
const MIN_COMPONENT_SIZE = 20
const SIZE_PRESET_OPTIONS = [
  ['small', 'Small', 0.75],
  ['mid', 'Mid', 1],
  ['big', 'Big', 1.35],
]

function findComponentEntry(components, id, parent = null) {
  for (const c of components || []) {
    if (c.id === id) return { component: c, parent }
    if (NESTING_TYPES.has(c.type) && Array.isArray(c.children)) {
      const found = findComponentEntry(c.children, id, c)
      if (found) return found
    }
  }
  return null
}

function componentLayout(component, layoutKey) {
  return component?.[layoutKey] || component?.layout || { x: 0, y: 0, w: 200, h: 80 }
}

function entryLayoutKey(entry, isMobile, isFlow) {
  // Tabs share their child design across breakpoints. A region child has its
  // own phone coordinates, including on a flow page; a free container's once
  // its blocks have a phone layout (containerChildKey).
  if (!isMobile) return 'layout'
  if (entry?.parent?.type === 'container') return containerChildKey(entry.parent, 'mobile', isFlow)
  if (entry?.parent) return entry.parent.type === 'region' ? 'mobileLayout' : 'layout'
  return isFlow ? 'layout' : 'mobileLayout'
}

function cleanSize(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function clampSize(value) {
  return Math.max(MIN_COMPONENT_SIZE, Math.round(cleanSize(value, MIN_COMPONENT_SIZE)))
}

function scaledLayoutSize(layout, factor) {
  return {
    w: clampSize(cleanSize(layout?.w, 200) * factor),
    h: clampSize(cleanSize(layout?.h, 80) * factor),
  }
}

function presetLayoutSize(component, factor, currentLayout) {
  const current = currentLayout || componentLayout(component, 'layout')
  const base = component?.type === 'html'
    ? htmlBaseSizeFromComponent(component, current) || current
    : registry[component?.type]?.defaultSize || current
  return {
    w: clampSize(cleanSize(base.w, 200) * factor),
    h: clampSize(cleanSize(base.h, 80) * factor),
  }
}

function sharedLayoutValue(items, key) {
  if (!items.length) return null
  const first = Math.round(cleanSize(items[0].layout?.[key], 0))
  return items.every((item) => Math.round(cleanSize(item.layout?.[key], 0)) === first)
    ? first
    : null
}

// Several store edits behind one click, as ONE undo step (the store's pointer
// gesture does exactly this for a drag).
function asOneStep(run) {
  const store = useEditorStore.getState()
  store.beginHistoryGesture()
  try {
    run()
  } finally {
    store.endHistoryGesture()
  }
}

function SectionTitle({ children }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--studio-text-muted)]">
      {children}
    </h3>
  )
}

const ANCHOR_PROBLEMS = {
  reserved: '"#{anchor}" is used by the editor itself. Choose another name.',
  page: 'A page is already called "#{anchor}", so a link to it would switch pages. Choose another name.',
  taken: 'Another block on this page is already called "#{anchor}".',
}

// A block's readable section name (#about). The name is committed on Enter or
// when the field is left — slugifying on every keystroke would eat the hyphen
// you are about to type. Keyed by the block and its current name in the panel,
// so selecting another block or an undo starts the draft over.
function SectionNameControl({ component, suggestion }) {
  const { t } = useLanguage()
  const setAnchor = useEditorStore((s) => s.setAnchor)
  const current = anchorOf(component)
  const [draft, setDraft] = useState(current)
  const [problem, setProblem] = useState('')
  const preview = slugifyAnchor(draft)
  const commit = (value) => {
    const result = setAnchor(component.id, value)
    setProblem(result.ok ? '' : result.problem)
    if (result.ok) setDraft(result.anchor)
  }
  return (
    <div className="space-y-1.5">
      {/* The group is already titled "Section name"; the field does not repeat it. */}
      <label className="block">
        <div className="flex items-center gap-1.5">
          <span aria-hidden="true" className="text-sm font-semibold text-[var(--studio-text-muted)]">#</span>
          <input
            type="text"
            aria-label={t('Section name')}
            className="studio-input min-w-0 w-full px-2.5 py-2 text-sm"
            value={draft}
            placeholder={suggestion || t('e.g. about')}
            onChange={(e) => {
              setDraft(e.target.value)
              setProblem('')
            }}
            onBlur={() => commit(draft)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commit(draft)
              }
            }}
          />
        </div>
      </label>
      {problem && problem !== 'missing' ? (
        <p className="studio-status-warning rounded-md border px-2 py-1 text-[11px] leading-snug">
          {t(ANCHOR_PROBLEMS[problem], { anchor: preview })}
        </p>
      ) : draft && preview !== draft ? (
        <p className="text-[11px] text-[var(--studio-text-faint)]">{t('Saved as #{anchor}', { anchor: preview || '—' })}</p>
      ) : null}
      {!current && suggestion ? (
        <button
          type="button"
          onClick={() => commit(suggestion)}
          className="studio-btn studio-btn-secondary px-2 py-1 text-xs"
        >
          {t('Use #{anchor}', { anchor: suggestion })}
        </button>
      ) : null}
      <p className="text-[11px] leading-snug text-[var(--studio-text-faint)]">
        {current
          ? t('Links reach this block as #{anchor}. Renaming it updates the links on this page.', { anchor: current })
          : t('Name this block so links can point to it, e.g. #about.')}
      </p>
    </div>
  )
}

function PropControl({ field, value, onChange, extras, pages = [], sections = null, subject }) {
  const { t } = useLanguage()
  const label = t(field.label)
  const options = field.options?.map(([optionValue, optionLabel]) => [optionValue, t(optionLabel)])
  // An href field becomes the visual link-target picker (page / top / section
  // / URL) instead of a raw text box.
  if (field.key === 'href') {
    return <LinkTargetControl label={label} value={value} onChange={onChange} pages={pages} sections={sections} subject={subject} />
  }
  if (field.control === 'link') {
    return <LinkTargetControl label={label} value={value} onChange={onChange} pages={pages} sections={sections} subject={subject} />
  }
  if (field.control === 'textarea') {
    return <LabeledTextarea label={label} value={value} onChange={onChange} />
  }
  if (field.control === 'code') {
    return (
      <div className="space-y-2">
        <SnippetPicker
          groups={JS_SNIPPET_GROUPS}
          list={jsSnippets}
          onPick={(s) => onChange(appendSnippet(value, s, 'js'))}
        />
        <LabeledTextarea
          label={label}
          value={value}
          onChange={onChange}
          rows={14}
          mono
          placeholder={'<div>Your custom HTML</div>\n<style>/* CSS */</style>\n<script>/* JS */<\\/script>'}
        />
      </div>
    )
  }
  if (field.control === 'links') {
    return <LinksEditor label={label} value={value} onChange={onChange} pages={pages} sections={sections} subject={subject} />
  }
  if (field.control === 'htmlContent') {
    return <HtmlContentControl label={label} value={value} onChange={onChange} pages={pages} />
  }
  if (field.control === 'tabs') {
    return (
      <TabsEditorControl
        label={label}
        value={value}
        onChange={onChange}
        activeId={extras?.activeId}
        onActiveChange={extras?.onActiveChange}
        children={extras?.children}
        onChildrenChange={extras?.onChildrenChange}
        batch={extras?.batch}
      />
    )
  }
  if (field.control === 'image') {
    return <LabeledImage label={label} value={value} onChange={onChange} />
  }
  if (field.control === 'color') {
    return <LabeledColor label={label} value={value} onChange={onChange} fallback={field.fallback} subject={subject} />
  }
  if (field.control === 'px') {
    return <LabeledPx label={label} value={value} onChange={onChange} placeholder={field.placeholder ? t(field.placeholder) : undefined} subject={subject} />
  }
  if (field.control === 'align') {
    return <LabeledAlign label={label} value={value} onChange={onChange} options={options} />
  }
  if (field.control === 'select') {
    return (
      <LabeledSelect
        label={label}
        value={value}
        onChange={onChange}
        options={options}
      />
    )
  }
  return <LabeledText label={label} value={value} onChange={onChange} />
}

function StyleControl({ styleKey, value, onChange, subject, allowInherit = false }) {
  const { t } = useLanguage()
  const meta = STYLE_META[styleKey]
  if (!meta) return null
  const label = t(meta.label)
  const options = meta.options?.map(([optionValue, optionLabel]) => [optionValue, t(optionLabel)])
  if (meta.control === 'color') {
    return <LabeledColor label={label} value={value} onChange={onChange} subject={subject} />
  }
  if (meta.control === 'select') {
    const selectOptions = allowInherit && options && !options.some(([optionValue]) => optionValue === '')
      ? [['', t('Same as PC')], ...options]
      : options
    return (
      <LabeledSelect
        label={label}
        value={value}
        onChange={onChange}
        options={selectOptions}
      />
    )
  }
  if (meta.control === 'px') {
    return <LabeledPx label={label} value={value} onChange={onChange} subject={subject} />
  }
  if (meta.control === 'range') {
    return <LabeledRange label={label} value={value} onChange={onChange} />
  }
  return (
    <LabeledText
      label={label}
      value={value}
      onChange={onChange}
      placeholder={meta.placeholder}
    />
  )
}

// On an uploaded page the DOCUMENT is the page: `htmlPageSettings` is what its
// head currently says and `onHtmlPageSettings` writes back into it. Without
// them these controls would edit a schema nothing publishes — which is how a
// language picked here used to change nothing at all.
export default function PropertiesPanel({
  htmlMode = false,
  onApplyThemeToHtml,
  onReplaceHtmlColor,
  simpleMode = false,
  htmlPageSettings = null,
  onHtmlPageSettings,
  // Each HTML page's document, by page id: its palette and any theme switch
  // in it are in there, not in the schema.
  pageHtmlMap = null,
  viewportOverride = null,
}) {
  const { t } = useLanguage()
  const selectedId = useEditorStore((s) => s.selectedId)
  const schema = useEditorStore((s) => s.schema)
  const page = useEditorStore(selectCurrentPage)
  const storeViewport = useEditorStore((s) => s.viewport)
  const viewport = viewportOverride || storeViewport
  const updateProps = useEditorStore((s) => s.updateProps)
  const rawUpdateStyles = useEditorStore((s) => s.updateStyles)
  const updateStyles = useCallback(
    (id, patch) => rawUpdateStyles(id, patch, viewportOverride ? { viewport: viewportOverride } : undefined),
    [rawUpdateStyles, viewportOverride],
  )
  const clearMobileStyles = useEditorStore((s) => s.clearMobileStyles)
  const updateTheme = useEditorStore((s) => s.updateTheme)
  const applyTheme = useEditorStore((s) => s.applyTheme)
  const setPageThemeScope = useEditorStore((s) => s.setPageThemeScope)
  const updatePageTheme = useEditorStore((s) => s.updatePageTheme)
  const applyPageTheme = useEditorStore((s) => s.applyPageTheme)
  const themeUnapplied = useEditorStore((s) => s.themeUnapplied)
  const markThemeApplied = useEditorStore((s) => s.markThemeApplied)
  const applyComponentPreset = useEditorStore((s) => s.applyComponentPreset)
  const rawSetLayout = useEditorStore((s) => s.setLayout)
  const setLayout = useCallback(
    (id, patch) => rawSetLayout(id, patch, viewportOverride ? { viewport: viewportOverride } : undefined),
    [rawSetLayout, viewportOverride],
  )
  const setLayoutMany = useEditorStore((s) => s.setLayoutMany)
  const fitEmbedBox = useEditorStore((s) => s.fitEmbedBox)
  const alignSelection = useEditorStore((s) => s.alignSelection)
  const distributeSelection = useEditorStore((s) => s.distributeSelection)
  const selectedIds = useEditorStore((s) => s.selectedIds)
  const renamePage = useEditorStore((s) => s.renamePage)
  const setPageFolder = useEditorStore((s) => s.setPageFolder)
  const setPageSettings = useEditorStore((s) => s.setPageSettings)
  const setPageMeta = useEditorStore((s) => s.setPageMeta)
  const setVisibility = useEditorStore((s) => s.setVisibility)
  const autoArrangeMobile = useEditorStore((s) => s.autoArrangeMobile)
  const duplicateComponent = useEditorStore((s) => s.duplicateComponent)
  const selectComponent = useEditorStore((s) => s.selectComponent)
  const selectParentComponent = useEditorStore((s) => s.selectParentComponent)
  const parentOfSelected = useEditorStore((s) => (s.selectedId ? selectComponentParent(s, s.selectedId) : null))
  const bringToFront = useEditorStore((s) => s.bringToFront)
  const sendToBack = useEditorStore((s) => s.sendToBack)
  const moveForward = useEditorStore((s) => s.moveForward)
  const moveBackward = useEditorStore((s) => s.moveBackward)
  const moveRegion = useEditorStore((s) => s.moveRegion)
  const removeComponent = useEditorStore((s) => s.removeComponent)
  const setActiveTab = useEditorStore((s) => s.setActiveTab)
  const setTabsChildren = useEditorStore((s) => s.setTabsChildren)
  const applyThemeToComponent = useEditorStore((s) => s.applyThemeToComponent)
  const copyComponentToPage = useEditorStore((s) => s.copyComponentToPage)
  // Which Properties tab is open, remembered like the left rail's section.
  const [propsTab, setPropsTabState] = useState(() => {
    try {
      const saved = localStorage.getItem(PROPS_TAB_KEY)
      return PROPERTIES_TABS.some(([id]) => id === saved) ? saved : 'content'
    } catch { return 'content' }
  })
  const setPropsTab = (tab) => {
    setPropsTabState(tab)
    try { localStorage.setItem(PROPS_TAB_KEY, tab) } catch { /* ignore */ }
  }
  const [aiEditOpen, setAiEditOpen] = useState(false)
  // The server can switch the assistant off (Settings → AI assistant).
  const aiOn = useAiAvailable()
  const [actionsOpen, setActionsOpen] = useState(false)
  const pageTabs = PAGE_TABS
  const [pageTab, setPageTabState] = useState(() => {
    try {
      const saved = localStorage.getItem(PAGE_TAB_KEY)
      return PAGE_TABS.some(([id]) => id === saved) ? saved : 'page'
    } catch { return 'page' }
  })
  const setPageTab = (tab) => {
    setPageTabState(tab)
    try { localStorage.setItem(PAGE_TAB_KEY, tab) } catch { /* ignore */ }
  }
  // Old sessions may remember a removed Code or AI tab; fall back cleanly.
  const activePageTab = pageTabs.some(([id]) => id === pageTab) ? pageTab : pageTabs[0][0]

  // One pair of accessors for both worlds: schema fields for a component page,
  // the parsed document for an uploaded one.
  const documentPage = htmlMode ? (htmlPageSettings || {}) : null
  const pageSetting = (key, fallback = '') => (
    documentPage ? (documentPage[key] ?? fallback) : (page[key] ?? fallback)
  )
  const writePageSetting = (patch) => (
    documentPage ? onHtmlPageSettings?.(patch) : setPageSettings(page.id, patch)
  )
  const writePageMeta = (patch) => (
    documentPage ? onHtmlPageSettings?.(patch) : setPageMeta(page.id, patch)
  )

  const isMobile = viewport === 'mobile'
  const isFlow = !!page.flowMode
  const selectedEntry = findComponentEntry(page.components, selectedId)
  const layoutKey = entryLayoutKey(selectedEntry, isMobile, isFlow)
  const component = selectedEntry?.component || null
  const parentComponent = selectedEntry?.parent || null
  const viewportStretchComponent = component?.type === 'region' || (
    component?.type === 'navbar' &&
    component.props?.navLayout !== 'vertical' &&
    component.props?.widthMode !== 'boxed'
  )
  const orderedRegions = page.components
    .filter((item) => item.type === 'region')
    .sort((a, b) => (a.layout?.y || 0) - (b.layout?.y || 0))
  const regionIndex = component?.type === 'region'
    ? orderedRegions.findIndex((item) => item.id === component.id)
    : -1
  const isAbsoluteNested = parentComponent?.type === 'tabs'
    || (parentComponent?.type === 'container' && !isAutoLayout(parentComponent.props))
    || parentComponent?.type === 'region'
  const showPositionControls = !isFlow || isAbsoluteNested
  // A pinned bar leaves the page and sits on the viewport edge, so anything
  // drawn under that strip is gone before the visitor scrolls — and on an
  // absolutely positioned page there is no flow to pad. Say so here rather
  // than letting it be discovered after publishing.
  const hiddenUnderBar = component ? hiddenByPinnedBar(component, page.components, layoutKey) : 0
  const selectedEntries = selectedIds
    .map((id) => findComponentEntry(page.components, id))
    .filter(Boolean)
  const selectedLayoutItems = selectedEntries.map((entry) => ({
    component: entry.component,
    layout: componentLayout(entry.component, entryLayoutKey(entry, isMobile, isFlow)),
  }))
  const selectionWidthValue = sharedLayoutValue(selectedLayoutItems, 'w')
  const selectionHeightValue = sharedLayoutValue(selectedLayoutItems, 'h')
  const multiShowPositionControls = selectedEntries.some((entry) => (
    !isFlow
    || entry.parent?.type === 'tabs'
    || (entry.parent?.type === 'container' && !isAutoLayout(entry.parent.props))
    || entry.parent?.type === 'region'
  ))
  const applySelectionSize = (patch) => {
    const updates = {}
    for (const item of selectedLayoutItems) {
      updates[item.component.id] = {
        ...(patch.w === undefined ? {} : { w: clampSize(patch.w) }),
        ...(patch.h === undefined ? {} : { h: clampSize(patch.h) }),
      }
    }
    if (Object.keys(updates).length) setLayoutMany(updates)
  }
  const scaleSelectionSize = (factor) => {
    const updates = {}
    for (const item of selectedLayoutItems) {
      updates[item.component.id] = scaledLayoutSize(item.layout, factor)
    }
    if (Object.keys(updates).length) setLayoutMany(updates)
  }
  const presetSelectionSize = (factor) => {
    const updates = {}
    for (const item of selectedLayoutItems) {
      updates[item.component.id] = presetLayoutSize(item.component, factor, item.layout)
    }
    if (Object.keys(updates).length) setLayoutMany(updates)
  }
  // "Whole site" edits the site theme and restyles every page that follows it;
  // "This page only" gives the open page its own theme and touches nothing
  // else. The panel shows and edits whichever theme the open page wears.
  const ownTheme = hasOwnTheme(page)
  const ownThemeElsewhere = (schema.pages || []).filter((p) => p.id !== page?.id && hasOwnTheme(p)).length
  // Normalized so a theme saved before a field existed still shows a value.
  const theme = normalizeTheme(ownTheme ? page.theme : (schema.theme || DEFAULT_THEME))
  const editTheme = (patch) => (ownTheme ? updatePageTheme(page.id, patch) : updateTheme(patch))
  const restyleWith = (next) => {
    if (htmlMode) {
      onApplyThemeToHtml?.(normalizeTheme(next), { pageOnly: ownTheme })
      markThemeApplied()
    } else if (ownTheme) applyPageTheme(page.id)
    else applyTheme()
  }
  const applyLabel = ownTheme ? t('Apply to this page') : htmlMode ? t('Apply to pages') : t('Apply to design')
  // A whole theme at once (a preset or a saved one): set it, then restyle, as
  // presets always did, within the chosen scope.
  const applyWholeTheme = (next) => asOneStep(() => {
    editTheme(next)
    restyleWith(next)
  })
  // Extra hints and the X/Y fields used to hide behind a Basic/Extended switch
  // in this panel. That switch is gone — collapsible groups do that job — so
  // they now follow the app-wide Simple mode alone.
  const extendedMode = !simpleMode

  if (selectedLayoutItems.length > 1) {
    const canDistribute = selectedLayoutItems.length >= 3
    return (
      <div className="studio-properties-panel flex h-full min-w-0 flex-col overflow-hidden">
        <div className="border-b border-[var(--studio-border)] px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-[var(--studio-text)]">{t('Selection')}</h2>
              <p className="truncate text-xs text-[var(--studio-text-muted)]">{t('{count} items selected', { count: selectedLayoutItems.length })}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-[var(--studio-panel-muted)] p-3">
          <div className="rounded-xl border border-[color-mix(in_srgb,var(--studio-accent)_22%,var(--studio-border))] bg-[var(--studio-accent-soft)] px-3 py-2">
            <span className="text-xs font-semibold text-[var(--studio-accent-text)]">
              {isFlow ? t('Editing HTML flow layout') : t('Editing {viewport} layout', { viewport: t(isMobile ? 'Mobile' : 'PC') })}
            </span>
          </div>

          <section className="space-y-2.5 rounded-xl border border-[var(--studio-border)] bg-[var(--studio-panel-raised)] p-3 shadow-[var(--studio-shadow-sm)]">
            <SectionTitle>
              {t('Size')}
              <span className="ml-1 font-normal normal-case text-[var(--studio-text-faint)]">
                ({t(isFlow ? 'all screens' : isMobile ? 'mobile' : 'PC')})
              </span>
            </SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              <MixedNumber
                label={t(isFlow ? 'Max width' : 'Width')}
                value={selectionWidthValue ?? 0}
                mixed={selectionWidthValue === null}
                onChange={(v) => applySelectionSize({ w: v })}
              />
              <MixedNumber
                label={t(isFlow ? 'Min height' : 'Height')}
                value={selectionHeightValue ?? 0}
                mixed={selectionHeightValue === null}
                onChange={(v) => applySelectionSize({ h: v })}
              />
            </div>
            <SizeQuickControls
              onScale={scaleSelectionSize}
              onPreset={presetSelectionSize}
            />
          </section>

          {multiShowPositionControls && (
            <section className="space-y-2.5 rounded-xl border border-[var(--studio-border)] bg-[var(--studio-panel-raised)] p-3 shadow-[var(--studio-shadow-sm)]">
              <SectionTitle>
                {t('Align')}
                <span className="ml-1 font-normal normal-case text-[var(--studio-text-faint)]">
                  ({t('{count} selected', { count: selectedLayoutItems.length })})
                </span>
              </SectionTitle>
              {extendedMode && (
                <p className="text-[11px] leading-snug text-[var(--studio-text-faint)]">
                  {t('Aligns the selected items to each other.')}
                </p>
              )}
              <SegmentedIconButtons
                inline
                label={t('Element')}
                value=""
                onChange={(v) => {
                  if (v === 'left') alignSelection('left')
                  else if (v === 'center') alignSelection('centerH')
                  else if (v === 'right') alignSelection('right')
                }}
                options={[
                  ['left', t('Left'), 'alignBoxLeft'],
                  ['center', t('Center'), 'alignBoxCenter'],
                  ['right', t('Right'), 'alignBoxRight'],
                ]}
              />
              <SegmentedIconButtons
                inline
                label={t('Vertical')}
                value=""
                onChange={(v) => {
                  if (v === 'top') alignSelection('top')
                  else if (v === 'middle') alignSelection('middleV')
                  else if (v === 'bottom') alignSelection('bottom')
                }}
                options={[
                  ['top', t('Top'), 'alignBoxTop'],
                  ['middle', t('Middle'), 'alignBoxMiddle'],
                  ['bottom', t('Bottom'), 'alignBoxBottom'],
                ]}
              />
              <SegmentedIconButtons
                inline
                label={t('Distribute')}
                value=""
                onChange={(v) => distributeSelection(v)}
                options={[
                  ['x', t('Distribute X'), 'distributeH', !canDistribute],
                  ['y', t('Distribute Y'), 'distributeV', !canDistribute],
                ]}
              />
            </section>
          )}
        </div>
      </div>
    )
  }

  if (!component) {
    return (
      <div className="studio-properties-panel flex h-full min-w-0 flex-col overflow-hidden">
        <div className="border-b border-[var(--studio-border)] px-3 py-3">
          <h2 className="text-sm font-semibold text-[var(--studio-text)]">{t('Page')}</h2>
          <p className="text-xs text-[var(--studio-text-muted)]">
            {isFlow
              ? t('HTML flow layout - nothing selected')
              : t(isMobile ? 'Mobile layout - nothing selected' : 'PC layout - nothing selected')}
          </p>
        </div>
        <PanelTabs
          value={activePageTab}
          onChange={setPageTab}
          tabs={pageTabs.map(([id, label, Icon]) => [id, t(label), Icon])}
        />

        <div className="flex-1 space-y-2 overflow-y-auto bg-[var(--studio-panel-muted)] p-2.5">
          {activePageTab === 'page' && (
            <>
        <PanelGroup id="page-basics" title={t('Page')} defaultOpen>
            <LabeledText
              label={t('Page name')}
              value={page.name}
              onChange={(v) => renamePage(page.id, v)}
            />
            {!simpleMode && (
              <LabeledText
                label={t('Folder (optional)')}
                value={page.folder}
                onChange={(v) => setPageFolder(page.id, v)}
                placeholder={t('e.g. Marketing')}
              />
            )}
            {/* Canvas-only: an uploaded page paints its own background in its
                own CSS, so these would be three controls that change nothing. */}
            {!htmlMode && (
              <>
                <LabeledColor
                  label={t('Page background (PC)')}
                  value={page.background || '#ffffff'}
                  onChange={(v) => setPageSettings(page.id, { background: v })}
                />
                <LabeledColor
                  label={t('Page background (Mobile)')}
                  value={page.backgroundMobile || page.background || '#ffffff'}
                  onChange={(v) => setPageSettings(page.id, { backgroundMobile: v })}
                />
                <button
                  type="button"
                  onClick={() => setPageSettings(page.id, { backgroundMobile: page.background || '#ffffff' })}
                  className="w-full rounded-lg border border-[var(--studio-border)] bg-[var(--studio-control)] px-2 py-1.5 text-xs font-medium text-[var(--studio-text-muted)] hover:bg-[var(--studio-control-hover)] hover:text-[var(--studio-text)]"
                >
                  {t('Use PC background on mobile')}
                </button>
              </>
            )}
            {isMobile && !isFlow && (
              <button
                type="button"
                onClick={autoArrangeMobile}
                className="studio-btn studio-btn-secondary w-full justify-between px-3 py-1.5 text-xs"
              >
                <span>{t('Auto-arrange mobile layout')}</span>
                <SparklesIcon size={14} className="text-[var(--studio-accent-text)]" />
              </button>
            )}
        </PanelGroup>
        <PanelGroup id="page-browser" title={t('Browser & accessibility')} defaultOpen>
          {/* Preview chrome for the component canvas; the HTML workspace has
              no such indicator. */}
          {!htmlMode && (
            <LabeledCheckbox
              label={t('Show scroll indicator in mobile preview')}
              checked={page.showScrollIndicator !== false}
              onChange={(v) => setPageSettings(page.id, { showScrollIndicator: v })}
            />
          )}
          <LabeledSelect
            label={t('Page language')}
            value={pageSetting('language', 'en') || 'en'}
            onChange={(v) => writePageSetting({ language: v })}
            options={LANGUAGES}
          />
          <LabeledSelect
            label={t('Text direction')}
            value={pageSetting('direction')}
            onChange={(v) => writePageSetting({ direction: v })}
            options={[['', t('Follow the language')], ['ltr', t('Left to right')], ['rtl', t('Right to left')]]}
          />
          <LabeledCheckbox
            label={t('Smooth scrolling for in-page links')}
            checked={!!pageSetting('smoothScroll', false)}
            onChange={(v) => writePageSetting({ smoothScroll: v })}
          />
          <LabeledColor
            label={t('Browser theme color')}
            value={pageSetting('themeColor') || page.background || '#ffffff'}
            onChange={(v) => writePageSetting({ themeColor: v })}
          />
          <p className="text-[11px] leading-snug text-[var(--studio-text-faint)]">
            {t('Tints the browser bar around your page on phones.')}
          </p>
          <LabeledText
            label={t('Canonical URL')}
            value={pageSetting('canonicalUrl')}
            onChange={(v) => writePageSetting({ canonicalUrl: v })}
            placeholder="https://example.com/page"
          />
          <p className="text-[11px] leading-snug text-[var(--studio-text-faint)]">
            {t('Use the preferred public URL when the same page can be reached from multiple addresses.')}
          </p>
          <LabeledCheckbox
            label={t('Hide this page from search engines')}
            checked={!!pageSetting('noIndex', false)}
            onChange={(v) => writePageSetting({ noIndex: v })}
          />
        </PanelGroup>
        <PanelGroup id="page-seo" title={t('SEO & sharing')} defaultOpen>
          <LabeledText
            label={t('Search title')}
            value={pageSetting('seoTitle')}
            onChange={(v) => writePageMeta({ seoTitle: v })}
            placeholder={page.name}
          />
          <p className="text-[11px] leading-snug text-[var(--studio-text-faint)]">
            {t('{count}/60 characters', { count: (pageSetting('seoTitle') || page.name || '').length })}
          </p>
          <LabeledTextarea
            label={t('Search description')}
            value={pageSetting('seoDescription')}
            onChange={(v) => writePageMeta({ seoDescription: v })}
            rows={3}
            placeholder={t('One or two sentences describing this page.')}
          />
          <p className="text-[11px] leading-snug text-[var(--studio-text-faint)]">
            {t('{count}/160 characters — search engines cut off longer descriptions.', {
              count: (pageSetting('seoDescription') || '').length,
            })}
          </p>
          <LabeledImage
            label={t('Sharing image')}
            value={pageSetting('seoImage')}
            onChange={(v) => writePageMeta({ seoImage: v })}
          />
          <p className="text-[11px] leading-snug text-[var(--studio-text-faint)]">
            {t('Shown when the page is shared on social apps. 1200x630 works best.')}
          </p>
          <div
            aria-label={t('Search result preview')}
            className="rounded-xl border border-[var(--studio-border)] bg-[var(--studio-panel-raised)] p-3"
          >
            <p className="truncate text-[10px] text-[var(--studio-success)]">
              {pageSetting('canonicalUrl') || `https://example.com/${String(page.name || 'page').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
            </p>
            <p className="mt-1 line-clamp-1 text-sm font-medium text-[var(--studio-accent-hover)]">
              {pageSetting('seoTitle') || page.name || t('Untitled page')}
            </p>
            <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[var(--studio-text-muted)]">
              {pageSetting('seoDescription') || t('Add a description to preview how this page may appear in search results.')}
            </p>
          </div>
        </PanelGroup>
          <p className="text-xs leading-relaxed text-[var(--studio-text-muted)]">
            {isFlow
              ? t('Flow mode uses one document order that adapts across PC and mobile.')
              : isMobile
                ? t('Mobile is a separate design. Drag and resize components on the phone, or auto-arrange them into a clean single column.')
                : t('Select a component on the canvas to edit its content, style, position and size.')}
          </p>
            </>
          )}

          {activePageTab === 'theme' && (
            <>
        {/* An uploaded page rarely uses the variable names the theme knows,
            so its own colours come first: the way to recolour any page. */}
        {htmlMode && (
          <PanelGroup id="html-page-colors" title={t('Colors on this page')} defaultOpen>
            <HtmlPageColors
              html={pageHtmlMap?.[page.id] || ''}
              onReplace={(from, to) => onReplaceHtmlColor?.(from, to, { pageOnly: ownTheme })}
              scopeHint={ownTheme
                ? t('Only on this page: it keeps its own theme.')
                : ownThemeElsewhere
                  ? t('On every page, except {count} that keep their own theme.', { count: ownThemeElsewhere })
                  : t('On every page of the site.')}
            />
          </PanelGroup>
        )}
        <PanelGroup
          id="theme-presets"
          title={
            <>
              {t('Theme')}
              <span className="ml-1 font-normal normal-case text-[var(--studio-text-faint)]">({ownTheme ? t('this page') : t('whole site')})</span>
            </>
          }
          defaultOpen
        >
          {/* Where the theme goes. A page on "This page only" keeps its own
              theme: the site theme skips it, and its changes skip the site. */}
          <div className="space-y-1.5">
            <div role="radiogroup" aria-label={t('Where the theme applies')} onKeyDown={moveInRadioGroup} className="studio-segment flex w-full">
              {[['site', t('Whole site'), t('Whole site')], ['page', t('This page'), t('This page only')]].map(([scope, label, hint]) => (
                <button
                  key={scope}
                  type="button"
                  title={hint}
                  role="radio"
                  aria-checked={(scope === 'page') === ownTheme}
                  tabIndex={(scope === 'page') === ownTheme ? 0 : -1}
                  onClick={() => { if ((scope === 'page') !== ownTheme) setPageThemeScope(page.id, scope) }}
                  className={`studio-segment-btn flex-1 whitespace-nowrap ${(scope === 'page') === ownTheme ? 'studio-segment-btn-active' : ''}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[11px] leading-snug text-[var(--studio-text-muted)]">
              {ownTheme
                ? t('"{name}" keeps its own theme. Changes here stay on this page, and the site theme does not reach it.', { name: page.name })
                : ownThemeElsewhere
                  ? t('Changes here reach every page except {count} that keep their own theme.', { count: ownThemeElsewhere })
                  : t('Changes here reach every page.')}
            </p>
          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
            {themeUnapplied && (
              <p role="status" className="min-w-0 flex-1 text-[11px] leading-snug text-[var(--studio-accent-text)]">
                {t('Not on the page yet: press "{action}" to use these edits.', { action: applyLabel })}
              </p>
            )}
            <button
              type="button"
              onClick={() => restyleWith(theme)}
              title={ownTheme
                ? t('Apply this theme to this page only')
                : htmlMode
                  ? t('Apply this palette + font to every HTML page')
                  : t('Apply the theme to every component')}
              className={`shrink-0 rounded-lg border border-[var(--studio-accent)] px-2 py-1 text-xs font-semibold ${themeUnapplied
                ? 'bg-[var(--studio-accent)] text-white hover:bg-[var(--studio-accent-fill-hover)]'
                : 'text-[var(--studio-accent-hover)] hover:bg-[var(--studio-accent-soft)]'}`}
            >
              {applyLabel}
            </button>
          </div>
            {/* One-click presets: set the palette AND restyle everything —
                the component schema (component mode) or every HTML page's
                document (HTML mode). New components inherit the active theme. */}
            {[
              ['light', t('Light'), THEME_PRESETS.filter((p) => !p.dark)],
              ['dark', t('Dark'), THEME_PRESETS.filter((p) => p.dark)],
            ].map(([group, heading, presets]) => (
              <div key={group} className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--studio-text-muted)]">{heading}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {presets.map((p) => (
                    <ThemeSwatchButton
                      key={p.id}
                      theme={p.theme}
                      name={t(p.name)}
                      active={sameTheme(presetTheme(p), theme)}
                      title={ownTheme
                        ? t('Use the "{name}" theme on this page only', { name: t(p.name) })
                        : t('Use the "{name}" theme and apply it to the whole site', { name: t(p.name) })}
                      onClick={() => applyWholeTheme(presetTheme(p))}
                    />
                  ))}
                </div>
              </div>
            ))}
            <LabeledColor
              label={t('Primary color')}
              value={theme.primaryColor}
              onChange={(v) => editTheme({ primaryColor: v })}
            />
            <div
              aria-label={t('Theme preview')}
              className="overflow-hidden rounded-xl border"
              style={{
                background: theme.surfaceColor,
                borderColor: theme.borderColor,
                boxShadow: theme.shadow === 'none' ? 'none' : theme.shadow,
              }}
            >
              <div className="p-3">
                <p
                  className="text-base font-bold"
                  style={{ color: theme.textColor, fontFamily: theme.headingFontFamily }}
                >
                  {t('Your heading style')}
                </p>
                <p
                  className="mt-1 text-[11px] leading-relaxed"
                  style={{ color: theme.mutedColor, fontFamily: theme.fontFamily }}
                >
                  {t('Body text, surfaces, borders and buttons update together.')}
                </p>
                <span
                  className="mt-3 inline-flex px-3 py-1.5 text-[11px] font-semibold"
                  style={{
                    background: theme.primaryColor,
                    color: theme.buttonTextColor,
                    borderRadius: theme.buttonRadius,
                    fontFamily: theme.fontFamily,
                  }}
                >
                  {t('Button preview')}
                </span>
              </div>
            </div>
        </PanelGroup>

        <PanelGroup id="theme-mine" title={t('My themes')} defaultOpen>
          <SavedThemes theme={theme} onApply={(item) => applyWholeTheme(item.theme)} />
        </PanelGroup>

        <ColorModePanel htmlMode={htmlMode} htmlMap={pageHtmlMap || undefined} />

        {!simpleMode && (
          <>
            <PanelGroup id="theme-colors" title={t('Colors')} defaultOpen>
            <LabeledColor
              label={t('Text color')}
              value={theme.textColor}
              onChange={(v) => editTheme({ textColor: v })}
            />
            <LabeledColor
              label={t('Muted color')}
              value={theme.mutedColor}
              onChange={(v) => editTheme({ mutedColor: v })}
            />
            <LabeledColor
              label={t('Border color')}
              value={theme.borderColor}
              onChange={(v) => editTheme({ borderColor: v })}
            />
            <LabeledColor
              label={t('Button text color')}
              value={theme.buttonTextColor}
              onChange={(v) => editTheme({ buttonTextColor: v })}
            />
            <LabeledColor
              label={t('Site background')}
              value={theme.backgroundColor}
              onChange={(v) => editTheme({ backgroundColor: v })}
            />
            <LabeledColor
              label={t('Surface color')}
              value={theme.surfaceColor}
              onChange={(v) => editTheme({ surfaceColor: v })}
            />
            <LabeledColor
              label={t('Soft background')}
              value={theme.softColor}
              onChange={(v) => editTheme({ softColor: v })}
            />
            <LabeledColor
              label={t('Header color')}
              value={theme.headerColor}
              onChange={(v) => editTheme({ headerColor: v })}
            />
            <LabeledColor
              label={t('Header text')}
              value={theme.headerTextColor}
              onChange={(v) => editTheme({ headerTextColor: v })}
            />
            <LabeledColor
              label={t('Accent color')}
              value={theme.accentColor}
              onChange={(v) => editTheme({ accentColor: v })}
            />
            <p className="text-[11px] leading-snug text-[var(--studio-text-muted)]">
              {t('Badges and icons use the accent; HTML pages get it as their second brand color.')}
            </p>
            </PanelGroup>
            <PanelGroup id="theme-type" title={t('Type & corners')}>
            <LabeledSelect
              label={t('Body font')}
              value={theme.fontFamily}
              onChange={(v) => editTheme({ fontFamily: v })}
              options={FONT_OPTIONS.map(([value, label]) => [value, t(label)])}
            />
            <LabeledSelect
              label={t('Heading font')}
              value={theme.headingFontFamily}
              onChange={(v) => editTheme({ headingFontFamily: v })}
              options={FONT_OPTIONS.map(([value, label]) => [value, t(label)])}
            />
            <LabeledSelect
              label={t('Heading weight')}
              value={theme.headingWeight}
              onChange={(v) => editTheme({ headingWeight: v })}
              options={HEADING_WEIGHTS.map(([value, label]) => [value, t(label)])}
            />
            <LabeledSelect
              label={t('Heading letter spacing')}
              value={theme.headingLetterSpacing}
              onChange={(v) => editTheme({ headingLetterSpacing: v })}
              options={HEADING_TRACKING.map(([value, label]) => [value, t(label)])}
            />
            <LabeledSelect
              label={t('Text line height')}
              value={theme.bodyLineHeight}
              onChange={(v) => editTheme({ bodyLineHeight: v })}
              options={BODY_LINE_HEIGHTS.map(([value, label]) => [value, t(label)])}
            />
            <LabeledSelect
              label={t('Corner style')}
              value={THEME_SHAPES.find(([, , radius, buttonRadius]) => (
                radius === theme.radius && buttonRadius === theme.buttonRadius
              ))?.[0] || 'custom'}
              onChange={(value) => {
                const preset = THEME_SHAPES.find(([id]) => id === value)
                if (preset) editTheme({ radius: preset[2], buttonRadius: preset[3] })
              }}
              options={[
                ...THEME_SHAPES.map(([id, label]) => [id, t(label)]),
                ['custom', t('Custom')],
              ]}
            />
            <LabeledPx
              label={t('Corner radius')}
              value={theme.radius}
              onChange={(v) => editTheme({ radius: v })}
            />
            <LabeledPx
              label={t('Button radius')}
              value={theme.buttonRadius}
              onChange={(v) => editTheme({ buttonRadius: v })}
            />
            <LabeledText
              label={t('Shadow')}
              value={theme.shadow}
              onChange={(v) => editTheme({ shadow: v })}
              placeholder={t('e.g. 0 8px 24px rgba(0,0,0,0.12)')}
            />
            <LabeledSelect
              label={t('Shadow preset')}
              value={THEME_SHADOWS.find(([, , value]) => value === theme.shadow)?.[0] || 'custom'}
              onChange={(value) => {
                const preset = THEME_SHADOWS.find(([id]) => id === value)
                if (preset) editTheme({ shadow: preset[2] })
              }}
              options={[
                ...THEME_SHADOWS.map(([id, label]) => [id, t(label)]),
                ['custom', t('Custom')],
              ]}
            />
            </PanelGroup>
          </>
        )}
            </>
          )}

        </div>
      </div>
    )
  }

  const def = registry[component.type]
  const layout = component[layoutKey] || component.layout
  // The blocks a "section on this page" link can point at, by name. Their ids
  // are generated (region_x7k2ab), so a typed id was almost always a dead link.
  const labelUses = new Map()
  const linkSections = linkSectionsFor(page?.components, { excludeId: component.id }).map((s) => {
    const base = `${s.anchor ? `#${s.anchor} · ` : ''}${t(registry[s.type]?.label || s.type)}${s.text ? ` · ${s.text}` : ''}`
    // Two blocks that read the same still have to be told apart in the list.
    const n = (labelUses.get(base) || 0) + 1
    labelUses.set(base, n)
    return { id: s.id, label: `${'— '.repeat(s.depth)}${base}${n > 1 ? ` (${n})` : ''}` }
  })
  const componentPresets = presetsForType(component.type)
  // Pages a component can be copied onto: the ones with a canvas. An HTML page
  // is its document; a copy "onto" it landed in the canvas design hidden
  // behind that document and was never seen again.
  const copyTargets = schema.pages.filter((p) => p.id !== page.id && p.mode !== 'html')
  const scrollBehavior = component.props?.scrollBehavior || 'normal'
  const scaleSingleSize = (factor) => {
    setLayout(component.id, scaledLayoutSize(layout, factor))
  }
  const presetSingleSize = (factor) => {
    setLayout(component.id, presetLayoutSize(component, factor, layout))
  }
  const setScrollBehavior = (mode) => {
    const next = mode || 'normal'
    const currentLayout = component[layoutKey] || component.layout || {}
    const enteringPinnedMode = scrollBehavior === 'normal' && next !== 'normal'
    const defaultPinX = isFlow && !isAbsoluteNested ? 'center' : 'left'
    const defaultPinOffsetX = isFlow && !isAbsoluteNested ? 0 : Math.round(currentLayout.x || 0)
    // A newly pinned element should hug the selected viewport edge. Reusing
    // its canvas Y coordinate wholesale made "Fixed" look broken: an element
    // designed at y=600 stayed 600px below the screen top.
    //
    // But throwing the Y away is wrong the other way. A bar drawn a little
    // below the top edge has a deliberate gap above it — pinning it should
    // keep the design, not silently flatten it against the edge. So keep a Y
    // that is already near the top and drop one that plainly is not; the
    // offset field stays editable either way.
    const designY = Math.round(currentLayout.y || 0)
    const defaultPinOffsetY = isFlow && !isAbsoluteNested
      ? 16
      : (designY > 0 && designY <= PIN_KEEPS_DESIGN_Y ? designY : 0)
    updateProps(component.id, {
      scrollBehavior: next,
      ...(next === 'normal'
        ? {}
        : {
            pinY: enteringPinnedMode ? 'top' : component.props?.pinY || 'top',
            pinX: enteringPinnedMode ? defaultPinX : component.props?.pinX || defaultPinX,
            pinOffsetY: enteringPinnedMode ? defaultPinOffsetY : component.props?.pinOffsetY ?? 0,
            pinOffsetX: enteringPinnedMode ? defaultPinOffsetX : component.props?.pinOffsetX ?? 0,
            pinZIndex: component.props?.pinZIndex ?? (next === 'fixed' ? 100 : 20),
          }),
    })
  }
  const contentSection = (def.editableProps || []).length > 0 ? (
    <PanelGroup id="content" title={t('Content')} defaultOpen>
      {/* Navbars lead with pinning, Bootstrap-style — "is this bar fixed?" is
          the first question a nav asks. Exactly two states, and toggling MUST
          NOT change the design: a full-width bar stays edge-to-edge where it
          is, only the scroll behavior changes (fixed-top). A fixed VERTICAL
          navbar becomes a full-height rail (Twitter-like) and picks its side. */}
      {component.type === 'navbar' && (
        <>
          <LabeledSelect
            label={t('Pin navbar')}
            value={scrollBehavior === 'normal' ? 'normal' : 'fixed'}
            onChange={(mode) => {
              if (mode !== 'fixed') {
                updateProps(component.id, { scrollBehavior: 'normal' })
                return
              }
              const vertical = component.props?.navLayout === 'vertical'
              const boxed = component.props?.widthMode === 'boxed'
              updateProps(component.id, {
                scrollBehavior: 'fixed',
                pinY: 'top',
                pinOffsetY: 0,
                // Full-width bars and rails hug their edges (offset 0); only a
                // boxed bar keeps its designed x so it does not jump sideways.
                pinX: vertical && component.props?.pinX === 'right' ? 'right' : 'left',
                pinOffsetX: !vertical && boxed ? Math.round((component.layout?.x || 0)) : 0,
                pinZIndex: component.props?.pinZIndex ?? 100,
              })
            }}
            options={[
              ['normal', t('Not fixed')],
              ['fixed', t('Fixed while scrolling (fixed-top)')],
            ]}
          />
          {component.props?.navLayout === 'vertical' && scrollBehavior === 'fixed' && (
            <LabeledSelect
              label={t('Rail side')}
              value={component.props?.pinX === 'right' ? 'right' : 'left'}
              onChange={(v) => updateProps(component.id, { pinX: v, pinOffsetX: 0 })}
              options={[['left', t('Left')], ['right', t('Right')]]}
            />
          )}
        </>
      )}
      {/* Picture blocks (Avatar, figures, photo cards) drop as html embeds, so
          swapping the photo used to require editing the snippet by hand. Every
          <img> in the code gets a real picker, FIRST — the main property of an
          image block is its image. */}
      {component.type === 'html' &&
        listEmbedImages(component.props.code).map((img, _, all) => (
          <LabeledImage
            key={`embed-img-${img.index}`}
            label={all.length === 1 ? t('Image') : `${t('Image')} ${img.index + 1}`}
            value={img.src}
            onChange={(src) =>
              updateProps(component.id, {
                code: replaceEmbedImage(component.props.code, img.index, src),
              })
            }
          />
        ))}
      {/* Shape: force any image embed into a square/circle frame — the photo
          conforms to the box (cover) and the box locks to 1:1, instead of the
          box stretching to the photo's rectangle. */}
      {component.type === 'html' && listEmbedImages(component.props.code).length > 0 && (
        <LabeledSelect
          label={t('Shape')}
          value={component.props.shape || ''}
          onChange={(shape) => asOneStep(() => {
            updateProps(component.id, { shape: shape || undefined })
            if (shape === 'square' || shape === 'circle') {
              const side = Math.round(Math.min(layout.w || 200, layout.h || 200))
              fitEmbedBox(component.id, { w: side, h: side })
            }
          })}
          options={[['', t('Original')], ['square', t('Square')], ['circle', t('Circle')]]}
        />
      )}
      {def.fieldParts && (
        <FieldPartsEditor
          component={component}
          renderControl={(field) => (
            <PropControl
              key={`${field.key}-${field.control || 'text'}-${field.label}`}
              field={field}
              value={component.props[field.sourceKey || field.key]}
              pages={schema.pages}
              sections={linkSections}
              subject={component.id}
              onChange={(val) => updateProps(component.id, { [field.sourceKey || field.key]: val })}
            />
          )}
        />
      )}
      {!def.fieldParts && def.editableProps.filter((field) => !field.onlyWhen || field.onlyWhen(component.props)).map((field) => (
        <PropControl
          key={`${field.key}-${field.control || 'text'}-${field.label}`}
          field={field}
          value={component.props[field.sourceKey || field.key]}
          pages={schema.pages}
          sections={linkSections}
          subject={component.id}
          onChange={(val) => updateProps(component.id, { [field.sourceKey || field.key]: val })}
          extras={
            component.type === 'tabs' && field.control === 'tabs'
              ? {
                  activeId: component.props.activeId,
                  onActiveChange: (id) => setActiveTab(component.id, id),
                  children: component.children || [],
                  onChildrenChange: (next) => setTabsChildren(component.id, next),
                  batch: asOneStep,
                }
              : undefined
          }
        />
      ))}
    </PanelGroup>
  ) : null
  const linkSection = LINKABLE_TYPES.has(component.type) ? (
    <PanelGroup id="link" title={t('Link')} defaultOpen>
      <LinkTargetControl
        label={t('Wrap in a link')}
        value={component.props.href}
        pages={schema.pages}
        sections={linkSections}
        subject={component.id}
        onChange={(val) => updateProps(component.id, { href: val })}
      />
    </PanelGroup>
  ) : null
  // Any block can be a link destination. Bands are the usual ones, so their
  // group starts open; for the rest it waits closed until wanted.
  const anchorSuggestion = (() => {
    const slug = slugifyAnchor(blockTextHint(component))
    return slug && !anchorProblem(slug, { components: page?.components, pages: schema.pages, selfId: component.id })
      ? slug
      : ''
  })()
  const anchorSection = (
    <PanelGroup
      id="anchor"
      title={t('Section name')}
      defaultOpen={component.type === 'region' || component.type === 'section'}
    >
      <SectionNameControl
        key={`${component.id}:${anchorOf(component)}`}
        component={component}
        suggestion={anchorSuggestion}
      />
    </PanelGroup>
  )

  const layoutSharedAcrossScreens = isFlow || (!!parentComponent && parentComponent.type !== 'region')
  const adapter = createCanvasInspectorAdapter({
    component,
    def,
    viewport,
    isFlow,
    layout,
    layoutSharedAcrossScreens,
    showPositionControls,
    extendedMode,
    viewportStretchComponent,
    selectedIds,
    pages: schema.pages,
    linkSections,
    updateStyles,
    updateProps,
    setLayout,
    clearMobileStyles,
    alignSelection,
    distributeSelection,
    scaleSingleSize,
    presetSingleSize,
    scrollBehavior,
    setScrollBehavior,
    hiddenUnderBar,
  })

  const designTabEmpty =
    !adapter.hasAny([
      'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing',
      'textTransform', 'textAlign', 'italic', 'underline',
      'color', 'background', 'gradient', 'backgroundImage',
      'borderRadius', 'borderWidth', 'borderStyle', 'borderColor', 'border',
      'boxShadow', 'opacity', 'overflow', 'objectFit',
    ]) && !extendedMode
  const emptyTabHint = (
    <p className="px-1 py-6 text-center text-[11px] leading-snug text-[var(--studio-text-faint)]">
      {t('Nothing to set here for this component.')}
    </p>
  )

  return (
    <div className="studio-properties-panel flex h-full min-w-0 flex-col overflow-hidden">
      <PropertiesHeader
        icon={componentKindIcon(component.type)}
        title={t(def.label)}
        badge={isFlow ? t('all screens') : t(isMobile ? 'Mobile' : 'PC')}
        onDeselect={() => selectComponent(null)}
        parentName={parentOfSelected ? t(registry[parentOfSelected.type]?.label || parentOfSelected.type) : null}
        onSelectParent={parentOfSelected ? () => selectParentComponent(component.id) : undefined}
        actions={aiOn && <button
            type="button"
            aria-expanded={aiEditOpen}
            aria-label={t('Ask AI to edit this')}
            title={t('Ask AI to edit this')}
            onClick={() => setAiEditOpen((open) => !open)}
            className={`studio-icon-btn h-9 w-9 shrink-0 border ${
              aiEditOpen
                ? 'border-[color-mix(in_srgb,var(--studio-accent)_34%,var(--studio-border))] bg-[var(--studio-accent-soft)] text-[var(--studio-accent-text)]'
                : 'border-[var(--studio-border)] bg-[var(--studio-control)]'
            }`}
          >
            <SparklesIcon size={15} />
          </button>}
      >
        {aiOn && aiEditOpen && (
          <div className="mt-3">
            <AiComponentEdit
              key={component.id}
              component={component}
              onApply={(styles, props) => asOneStep(() => {
                if (styles && Object.keys(styles).length) updateStyles(component.id, styles)
                if (props && Object.keys(props).length) updateProps(component.id, props)
              })}
            />
          </div>
        )}
      </PropertiesHeader>

      <PanelTabs
        value={propsTab}
        onChange={setPropsTab}
        tabs={PROPERTIES_TABS.map(([id, label, Icon]) => [id, t(label), Icon])}
      />

      <div
        role="tabpanel"
        aria-label={t(PROPERTIES_TABS.find(([id]) => id === propsTab)?.[1] || 'Content')}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-[var(--studio-panel-muted)] p-2.5"
      >
        {propsTab === 'content' && (
          <>
            {/* Main properties FIRST — the thing you dropped the component for
                (its image, text, links) must not hide below secondary tooling. */}
            {component.type === 'region' && isMobile ? null : contentSection}
            {linkSection}
            {anchorSection}
            {componentPresets.length > 0 && (
              <PanelGroup id="presets" title={t('Presets')}>
                <LabeledSelect
                  label={t('Component preset')}
                  value=""
                  onChange={(value) => value && applyComponentPreset(component.id, value)}
                  options={presetOptions(component.type).map(([value, label]) => [value, t(label)])}
                />
              </PanelGroup>
            )}
          </>
        )}

        {propsTab === 'design' && (
          <>
            {designTabEmpty && emptyTabHint}
            {adapter.mobileStyleScope && (
              <MobileOverrideBanner
                count={adapter.mobileOverrideCount}
                onReset={adapter.onResetMobile}
              />
            )}
            <TypographyFields adapter={adapter} />
            <ColorFields adapter={adapter} />
            <BorderFields adapter={adapter} />
            <EffectsFields adapter={adapter} />
            {extendedMode && (
              <PanelGroup id="advanced-css" title={t('Advanced CSS')}>
                {ADVANCED_STYLE_KEYS.map((styleKey) => (
                  <StyleControl
                    key={styleKey}
                    styleKey={styleKey}
                    subject={component.id}
                    allowInherit={adapter.mobileStyleScope}
                    value={
                      adapter.mobileStyleScope
                        ? (component.stylesMobile?.[styleKey] ?? component.styles[styleKey])
                        : component.styles[styleKey]
                    }
                    onChange={(val) => updateStyles(component.id, { [styleKey]: val })}
                  />
                ))}
              </PanelGroup>
            )}
          </>
        )}

        {propsTab === 'layout' && (
          <>
            {adapter.mobileStyleScope && (
              <MobileOverrideBanner
                count={adapter.mobileOverrideCount}
                onReset={adapter.onResetMobile}
              />
            )}
            {isMobile && !isFlow && (
              <button
                type="button"
                onClick={autoArrangeMobile}
                className="studio-btn studio-btn-secondary w-full justify-between px-3 py-1.5 text-xs"
              >
                <span>{t('Auto-arrange mobile layout')}</span>
                <SparklesIcon size={14} className="text-[var(--studio-accent-text)]" />
              </button>
            )}
            <AlignmentFields adapter={adapter} />
            <SizeFields
              adapter={adapter}
              scopeLabel={t(layoutSharedAcrossScreens ? 'all screens' : isMobile ? 'mobile' : 'PC')}
            >
              {!viewportStretchComponent && (
                <SizeQuickControls
                  onScale={scaleSingleSize}
                  onPreset={presetSingleSize}
                />
              )}
              {!isFlow && FIT_TYPES.has(component.type) && (
                <LabeledCheckbox
                  label={t('Content fits the box')}
                  hint={component.props?.fit === 'box' ? '' : t('Resizing turns it on')}
                  checked={component.props?.fit === 'box'}
                  onChange={(on) => updateProps(component.id, { fit: on ? 'box' : 'off' })}
                />
              )}
              {component.type === 'html' && viewport !== 'mobile' && (
                <button
                  type="button"
                  onClick={() =>
                    // releaseManual: asking for the fit hands a block sized by hand
                    // back to automatic sizing, as the toolbar's button does.
                    fitHtmlEmbedLayout(component, Math.round(component.layout?.w || 360), (patch) =>
                      fitEmbedBox(component.id, patch, { releaseManual: true }),
                    { font: canvasFontFamily(useEditorStore.getState().schema) })
                  }
                  title={t('Measure the block and snap the box to its real size')}
                  className="studio-btn studio-btn-secondary w-full px-3 py-1.5 text-xs"
                >
                  {t('Fit to content')}
                </button>
              )}
            </SizeFields>
            <SpacingFields adapter={adapter} />
            <PositionStackFields adapter={adapter} />
            <FlexLayoutFields adapter={adapter} />
            {component.type === 'region' && (
              <PanelGroup id="region-order" title={t('Section order')} defaultOpen>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={regionIndex <= 0}
                    onClick={() => moveRegion(component.id, 'up')}
                    className="studio-btn studio-btn-secondary gap-1 px-2 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ArrowUpIcon size={13} />
                    <span>{t('Move section up')}</span>
                  </button>
                  <button
                    type="button"
                    disabled={regionIndex < 0 || regionIndex >= orderedRegions.length - 1}
                    onClick={() => moveRegion(component.id, 'down')}
                    className="studio-btn studio-btn-secondary gap-1 px-2 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ArrowDownIcon size={13} />
                    <span>{t('Move section down')}</span>
                  </button>
                </div>
                <p className="text-[11px] leading-snug text-[var(--studio-text-faint)]">
                  {t('Sections stay stacked; changing the height pushes the content below.')}
                </p>
              </PanelGroup>
            )}
            {parentComponent?.type === 'region' && !isMobile && (
              <PanelGroup id="dock" title={t('Dock to section')} defaultOpen>
                <LabeledSelect
                  label={t('Horizontal docking')}
                  value={component.props?.dockX || 'auto'}
                  onChange={(value) => updateProps(component.id, { dockX: value })}
                  options={[
                    ['auto', t('Auto (nearest edge)')],
                    ['left', t('Left')],
                    ['center', t('Center')],
                    ['right', t('Right')],
                    ['stretch', t('Stretch')],
                  ]}
                />
                <p className="text-[11px] leading-snug text-[var(--studio-text-faint)]">
                  {t('Docking keeps this element attached to the chosen grid edge as the screen width changes.')}
                </p>
              </PanelGroup>
            )}
            <PanelGroup id="visibility" title={t('Responsive')}>
              <LabeledCheckbox
                label={t('Show on PC')}
                checked={!component.hidden}
                onChange={(checked) => setVisibility(component.id, { hidden: !checked })}
              />
              <LabeledCheckbox
                label={t('Show on Mobile')}
                checked={!component.hiddenMobile}
                onChange={(checked) => setVisibility(component.id, { hiddenMobile: !checked })}
              />
            </PanelGroup>
          </>
        )}

        {propsTab === 'motion' && (
          scrollBehavior === 'normal' ? (
            <PanelGroup id="motion" title={t('Motion')} defaultOpen>
              <MotionFields
                motion={component.props}
                onChange={(patch) => updateProps(component.id, patch)}
              />
            </PanelGroup>
          ) : (
            <div className="rounded-xl border border-[var(--studio-border)] bg-[var(--studio-panel-raised)] p-3 text-xs leading-relaxed text-[var(--studio-text-muted)]">
              {t('Motion is disabled while this element is pinned to the screen.')}
            </div>
          )
        )}
      </div>

      <div
        role="region"
        aria-label={t('Arrange')}
        className="shrink-0 border-t border-[var(--studio-border)] bg-[var(--studio-panel)] p-2.5 shadow-[0_-10px_28px_color-mix(in_srgb,var(--studio-shell)_72%,transparent)]"
      >
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.25rem] gap-2">
          <button
            type="button"
            onClick={() => duplicateComponent(component.id)}
            className="studio-btn studio-btn-secondary min-w-0 px-2 text-xs"
          >
            <CopyIcon size={14} className="shrink-0" />
            <span className="truncate">{t('Duplicate')}</span>
          </button>
          <button
            type="button"
            aria-label={t('Delete component')}
            onClick={() => removeComponent(component.id)}
            className="studio-btn min-w-0 border border-[color-mix(in_srgb,var(--studio-danger)_34%,var(--studio-border))] bg-[var(--studio-danger-soft)] px-2 text-xs text-[var(--studio-danger)] hover:bg-[color-mix(in_srgb,var(--studio-danger)_16%,var(--studio-panel-raised))]"
          >
            <TrashIcon size={14} className="shrink-0" />
            <span className="truncate">{t('Delete')}</span>
          </button>
          <button
            type="button"
            aria-label={t('More actions')}
            title={t('More actions')}
            aria-expanded={actionsOpen}
            onClick={() => setActionsOpen((open) => !open)}
            className={`studio-icon-btn h-9 w-9 border ${
              actionsOpen
                ? 'border-[color-mix(in_srgb,var(--studio-accent)_34%,var(--studio-border))] bg-[var(--studio-accent-soft)] text-[var(--studio-accent-text)]'
                : 'border-[var(--studio-border)] bg-[var(--studio-control)]'
            }`}
          >
            <MoreHorizontalIcon size={16} />
          </button>
        </div>

        {actionsOpen && (
          <div className="mt-2 space-y-2 rounded-xl border border-[var(--studio-border)] bg-[var(--studio-panel-raised)] p-2 shadow-[var(--studio-shadow-sm)]">
            {component.type !== 'region' && (
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => bringToFront(component.id)}
                  className="studio-btn bg-[var(--studio-control)] px-2 py-1.5 text-xs"
                >
                  {t(isFlow ? 'Move end' : 'Front')}
                </button>
                <button
                  type="button"
                  onClick={() => sendToBack(component.id)}
                  className="studio-btn bg-[var(--studio-control)] px-2 py-1.5 text-xs"
                >
                  {t(isFlow ? 'Move start' : 'Back')}
                </button>
                <button
                  type="button"
                  onClick={() => moveBackward(component.id)}
                  title={t(isFlow ? 'Move one step earlier in the order' : 'Bring one step backward')}
                  className="studio-btn bg-[var(--studio-control)] px-2 py-1.5 text-xs"
                >
                  {t(isFlow ? 'Before' : 'Backward')}
                </button>
                <button
                  type="button"
                  onClick={() => moveForward(component.id)}
                  title={t(isFlow ? 'Move one step later in the order' : 'Bring one step forward')}
                  className="studio-btn bg-[var(--studio-control)] px-2 py-1.5 text-xs"
                >
                  {t(isFlow ? 'Next' : 'Forward')}
                </button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => applyThemeToComponent(component.id)}
                title={t('Restyle this component with the active theme')}
                className="studio-btn studio-btn-accent px-2 py-1.5 text-xs"
              >
                <PaletteIcon size={14} /> {t('Theme')}
              </button>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) copyComponentToPage(component.id, e.target.value)
                  e.target.value = ''
                }}
                disabled={!copyTargets.length}
                title={t('Copy this component onto another page')}
                className="studio-input min-w-0 px-2 py-1.5 text-xs font-medium disabled:opacity-40"
              >
                <option value="" disabled>
                  {t('Copy page...')}
                </option>
                {copyTargets
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MixedNumber({ label, value, mixed, onChange }) {
  const { t } = useLanguage()
  const displayValue = mixed ? '' : Math.round(value ?? 0)
  const [draft, setDraft] = useState(null)

  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[11px] font-medium text-[var(--studio-text-muted)]">{label}</span>
      <div className="studio-input flex min-w-0 items-center px-0 py-0">
        <input
          type="number"
          className="min-w-0 flex-1 bg-transparent px-2.5 py-1.5 text-xs text-[var(--studio-text)] placeholder:text-[var(--studio-text-faint)] focus:outline-none"
          value={draft ?? displayValue}
          placeholder={mixed ? t('Mixed') : undefined}
          onChange={(e) => {
            const next = e.target.value
            setDraft(next)
            if (next !== '') onChange(Number(next))
          }}
          onBlur={() => setDraft(null)}
        />
        <span aria-hidden="true" className="pointer-events-none shrink-0 select-none pr-2.5 text-[11px] font-medium text-[var(--studio-text-faint)]">
          px
        </span>
      </div>
    </label>
  )
}

function SizeQuickControls({ onScale, onPreset }) {
  const { t } = useLanguage()
  return (
    <div className="grid grid-cols-5 gap-1.5">
      <button
        type="button"
        onClick={() => onScale(0.9)}
        title={t('10% smaller')}
        aria-label={t('10% smaller')}
        className="studio-btn studio-btn-secondary px-1.5 py-1.5 text-xs"
      >
        <MinusIcon size={13} />
      </button>
      <button
        type="button"
        onClick={() => onScale(1.1)}
        title={t('10% larger')}
        aria-label={t('10% larger')}
        className="studio-btn studio-btn-secondary px-1.5 py-1.5 text-xs"
      >
        <PlusIcon size={13} />
      </button>
      {SIZE_PRESET_OPTIONS.map(([id, label, factor]) => (
        <button
          key={id}
          type="button"
          onClick={() => onPreset(factor)}
          title={t('{label} size', { label: t(label) })}
          className="studio-btn bg-[var(--studio-panel-raised)] px-1.5 py-1.5 text-xs font-semibold text-[var(--studio-text)] ring-1 ring-inset ring-[var(--studio-border)] hover:bg-[var(--studio-accent-soft)] hover:text-[var(--studio-accent-text)]"
        >
          {t(label)}
        </button>
      ))}
    </div>
  )
}
