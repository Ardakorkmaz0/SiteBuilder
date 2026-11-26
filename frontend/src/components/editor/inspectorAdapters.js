import {
  FONT_CHOICES,
  gradientParts,
  gradientPartsOf,
  isCssColor,
  isGradientStop,
  patchedGradient,
} from '../../utils/htmlElementEdit.js'
import { FONT_OPTIONS } from '../../utils/theme.js'

export const WEIGHT_OPTIONS = [
  ['300', 'Light'],
  ['400', 'Regular'],
  ['500', 'Medium'],
  ['600', 'Semibold'],
  ['700', 'Bold'],
  ['800', 'Extra bold'],
]

export const TEXT_TRANSFORM_OPTIONS = [
  ['none', 'As typed'],
  ['uppercase', 'UPPERCASE'],
  ['lowercase', 'lowercase'],
  ['capitalize', 'Capitalize'],
]

export const BORDER_STYLE_OPTIONS = [
  ['none', 'None'],
  ['solid', 'Solid'],
  ['dashed', 'Dashed'],
  ['dotted', 'Dotted'],
]

export const SHADOW_OPTIONS = [
  ['none', 'None'],
  ['0 1px 3px rgba(0,0,0,0.15)', 'Small'],
  ['0 4px 12px rgba(0,0,0,0.15)', 'Medium'],
  ['0 4px 20px rgba(0,0,0,0.08)', 'Soft'],
  ['0 10px 25px rgba(0,0,0,0.2)', 'Large'],
]

export const OVERFLOW_OPTIONS = [
  ['visible', 'Visible'],
  ['hidden', 'Hidden'],
  ['auto', 'Auto'],
  ['scroll', 'Scroll'],
]

export const GRADIENT_PRESET_OPTIONS = [
  ['none', 'None'],
  ['linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 'Purple'],
  ['linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', 'Sky'],
  ['linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', 'Mint'],
  ['linear-gradient(135deg, #fa709a 0%, #fee140 100%)', 'Sunset'],
  ['linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', 'Blossom'],
  ['linear-gradient(135deg, #30cfd0 0%, #330867 100%)', 'Ocean'],
  ['linear-gradient(180deg, #1d1d1f 0%, #434343 100%)', 'Charcoal'],
]

export const BACKGROUND_SIZE_OPTIONS = [
  ['cover', 'Fill the box'],
  ['contain', 'Fit inside'],
  ['auto', 'Original size'],
]

export const OBJECT_FIT_OPTIONS = [
  ['fill', 'Fill'],
  ['cover', 'Cover'],
  ['contain', 'Contain'],
]

const HTML_DISPLAY_OPTIONS = [
  ['', 'Default'],
  ['block', 'Block'],
  ['inline-block', 'Inline block'],
  ['flex', 'Flex'],
  ['inline', 'Inline'],
]

const CANVAS_CONTAINER_DISPLAY_OPTIONS = [
  ['free', 'Free (absolute)'],
  ['flex', 'Flex'],
  ['grid', 'Grid'],
]

const HTML_FLEX_DIRECTION_OPTIONS = [
  ['', 'Default'],
  ['row', 'Row'],
  ['column', 'Column'],
  ['row-reverse', 'Row reversed'],
  ['column-reverse', 'Column reversed'],
]

const CANVAS_FLEX_DIRECTION_OPTIONS = [
  ['row', 'Row'],
  ['column', 'Column'],
]

const HTML_JUSTIFY_OPTIONS = [
  ['', 'Default'],
  ['flex-start', 'Start'],
  ['center', 'Center'],
  ['flex-end', 'End'],
  ['space-between', 'Space between'],
  ['space-around', 'Space around'],
]

const CANVAS_JUSTIFY_OPTIONS = [
  ['start', 'Start'],
  ['center', 'Center'],
  ['end', 'End'],
  ['between', 'Space between'],
  ['around', 'Space around'],
]

const HTML_FLEX_ALIGN_OPTIONS = [
  ['', 'Default'],
  ['stretch', 'Stretch'],
  ['flex-start', 'Start'],
  ['center', 'Center'],
  ['flex-end', 'End'],
]

const CANVAS_FLEX_ALIGN_OPTIONS = [
  ['stretch', 'Stretch'],
  ['start', 'Start'],
  ['center', 'Center'],
  ['end', 'End'],
]

const HTML_FLEX_WRAP_OPTIONS = [
  ['', 'Default'],
  ['nowrap', 'One line'],
  ['wrap', 'Wrap onto more lines'],
]

const CANVAS_FLEX_WRAP_OPTIONS = [
  ['nowrap', 'One line'],
  ['wrap', 'Wrap onto more lines'],
]

const HTML_POSITION_OPTIONS = [
  ['', 'Default'],
  ['relative', 'Relative'],
  ['sticky', 'Sticky (follows the scroll)'],
  ['absolute', 'Absolute'],
  ['fixed', 'Fixed to the screen'],
]

const CANVAS_POSITION_OPTIONS = [
  ['normal', 'Default'],
  ['sticky', 'Sticky (follows the scroll)'],
  ['fixed', 'Fixed to the screen'],
]

function pxStr(value) {
  if (value === '' || value === null || value === undefined) return ''
  return `${value}px`
}

function emStr(value) {
  if (value === '' || value === null || value === undefined) return ''
  return `${value}em`
}

function parseCssNumber(value) {
  if (value === '' || value === null || value === undefined) return ''
  const parsed = Number.parseFloat(String(value))
  return Number.isFinite(parsed) ? parsed : ''
}

// A side's value, split on the spaces between sides only: the spaces inside
// calc(), clamp() or var() belong to that side. A side such as `auto` or
// `calc(1em + 4px)` is kept as it is, so editing another side leaves it alone
// (`calc(1em + 4px) 16px` was read as no sides at all, and editing the right
// side wrote 0 into the other three).
function boxSideValues(raw) {
  const sides = []
  let depth = 0
  let current = ''
  for (const ch of raw) {
    if (ch === '(') depth += 1
    if (ch === ')') depth = Math.max(0, depth - 1)
    if (depth === 0 && /\s/.test(ch)) {
      if (current) sides.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  if (current) sides.push(current)
  return sides
}

// A keyword that stands for the whole property and cannot be one side of it.
const WHOLE_PROPERTY_RE = /^(?:inherit|initial|unset|revert|revert-layer)$/i

// Expand a CSS 1..4-value box shorthand ("24px", "12px 20px", …) into its four
// sides so per-side inputs can read and edit standard `styles.padding` on canvas.
export function parseBoxSides(shorthand) {
  const raw = String(shorthand || '').trim()
  if (!raw) return { top: '', right: '', bottom: '', left: '' }
  const parts = boxSideValues(raw)
  if (!parts.length || parts.length > 4 || parts.some((p) => WHOLE_PROPERTY_RE.test(p) || /[;{}]/.test(p))) {
    return { top: '', right: '', bottom: '', left: '' }
  }
  const norm = parts.map((p) => (/^\s*-?(?:\d+\.?\d*|\.\d+)\s*$/.test(p) ? `${p.trim()}px` : p))
  if (norm.length === 1) return { top: norm[0], right: norm[0], bottom: norm[0], left: norm[0] }
  if (norm.length === 2) return { top: norm[0], right: norm[1], bottom: norm[0], left: norm[1] }
  if (norm.length === 3) return { top: norm[0], right: norm[1], bottom: norm[2], left: norm[1] }
  return { top: norm[0], right: norm[1], bottom: norm[2], left: norm[3] }
}

export function patchBoxSide(currentShorthand, side, nextValue, fallbackShorthand = '') {
  const current = parseBoxSides(currentShorthand)
  const fallback = parseBoxSides(fallbackShorthand)
  const next = {
    top: current.top || '0px',
    right: current.right || '0px',
    bottom: current.bottom || '0px',
    left: current.left || '0px',
  }
  if (nextValue === '' || nextValue === null || nextValue === undefined) {
    if (String(fallbackShorthand || '').trim()) {
      const fbNorm = {
        top: fallback.top || '0px',
        right: fallback.right || '0px',
        bottom: fallback.bottom || '0px',
        left: fallback.left || '0px',
      }
      next[side] = fbNorm[side]
      if (
        next.top === fbNorm.top &&
        next.right === fbNorm.right &&
        next.bottom === fbNorm.bottom &&
        next.left === fbNorm.left
      ) {
        return ''
      }
    } else {
      const othersEmptyOrZero = ['top', 'right', 'bottom', 'left']
        .filter((k) => k !== side)
        .every((k) => !current[k] || Number.parseFloat(current[k]) === 0)
      if (othersEmptyOrZero) return ''
      next[side] = '0px'
    }
  } else {
    next[side] = nextValue
  }
  if (next.top === next.right && next.right === next.bottom && next.bottom === next.left) {
    return next.top
  }
  if (next.top === next.bottom && next.right === next.left) {
    return `${next.top} ${next.right}`
  }
  return `${next.top} ${next.right} ${next.bottom} ${next.left}`
}

function withLeadingOption(options, lead, translate) {
  const mapped = options.map(([val, label]) => [val, translate(label)])
  if (!lead) return mapped
  return [['', translate(lead)], ...mapped]
}

const HTML_SUPPORTED = new Set([
  'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing',
  'textTransform', 'textAlign', 'italic', 'underline',
  'color', 'background', 'gradient', 'backgroundImage',
  'borderRadius', 'borderWidth', 'borderStyle', 'borderColor',
  'boxShadow', 'opacity', 'overflow',
  'alignHorizontal',
  'width', 'height', 'maxWidth',
  'padding', 'paddingSides', 'marginVertical',
  'position', 'zIndex',
  'flexLayout', 'display', 'flexDirection', 'justifyContent', 'alignItems', 'flexWrap', 'gap',
])

export function createHtmlInspectorAdapter({
  info,
  viewport = 'pc',
  pages = [],
  onChange,
  onResetMobile,
}) {
  const isMobile = viewport === 'mobile'
  const lead = isMobile ? 'Same as PC' : 'Default'
  const currentGradient = patchedGradient(info, {})
  const matchedPreset = GRADIENT_PRESET_OPTIONS.find(([val]) => (
    val !== 'none' && patchedGradient(gradientParts(val), {}) === currentGradient
  ))?.[0] || ''

  const has = (key) => {
    if (key === 'text') return !!info.canEditText
    if (key === 'href') return info.href !== null
    if (key === 'src') return info.src !== null
    if (key === 'alt') return info.alt !== null
    return HTML_SUPPORTED.has(key)
  }

  return {
    mode: 'html',
    isMobile,
    subject: info.elementKey,
    pages,
    sections: info.sections,
    mobileOverrideCount: info.mobileOverrideCount || 0,
    onResetMobile,
    allowEmptySize: true,
    colorAccepts: isCssColor,
    gradientAccepts: isGradientStop,
    has,
    hasAny: (keys) => keys.some(has),

    fontOptions: (translate) => FONT_CHOICES.map(([val, label]) => [val, translate(label)]),
    weightOptions: (translate) => withLeadingOption(WEIGHT_OPTIONS, lead, translate),
    textTransformOptions: (translate) => withLeadingOption(TEXT_TRANSFORM_OPTIONS, lead, translate),
    borderStyleOptions: (translate) => withLeadingOption(BORDER_STYLE_OPTIONS, lead, translate),
    shadowOptions: (translate) => withLeadingOption(SHADOW_OPTIONS, lead, translate),
    overflowOptions: (translate) => withLeadingOption(OVERFLOW_OPTIONS, lead, translate),
    gradientPresetOptions: (translate) => withLeadingOption(GRADIENT_PRESET_OPTIONS, lead, translate),
    backgroundSizeOptions: (translate) => withLeadingOption(BACKGROUND_SIZE_OPTIONS, lead, translate),
    objectFitOptions: (translate) => withLeadingOption(OBJECT_FIT_OPTIONS, lead, translate),
    displayOptions: (translate) => HTML_DISPLAY_OPTIONS.map(([val, label]) => [val, translate(label)]),
    flexDirectionOptions: (translate) => HTML_FLEX_DIRECTION_OPTIONS.map(([val, label]) => [val, translate(label)]),
    justifyOptions: (translate) => HTML_JUSTIFY_OPTIONS.map(([val, label]) => [val, translate(label)]),
    flexAlignOptions: (translate) => HTML_FLEX_ALIGN_OPTIONS.map(([val, label]) => [val, translate(label)]),
    flexWrapOptions: (translate) => HTML_FLEX_WRAP_OPTIONS.map(([val, label]) => [val, translate(label)]),
    positionOptions: (translate) => HTML_POSITION_OPTIONS.map(([val, label]) => [val, translate(label)]),

    get(key) {
      switch (key) {
        case 'text': return info.text
        case 'href': return info.href
        case 'src': return info.src
        case 'alt': return info.alt
        case 'fontFamily': return (isMobile ? info.mobileFontFamily : '') || info.fontFamily || ''
        case 'fontSize': return pxStr(info.fontSize)
        case 'fontWeight': return info.fontWeight || ''
        case 'lineHeight': return info.lineHeight
        case 'letterSpacing': return emStr(info.letterSpacing)
        case 'textTransform': return info.textTransform || ''
        case 'textAlign':
          return info.textAlign === 'start' ? 'left' : info.textAlign === 'end' ? 'right' : (info.textAlign || '')
        case 'italic': return !!info.italic
        case 'underline': return !!info.underline
        case 'color': return info.color || '#000000'
        case 'background': return info.background || '#ffffff'
        case 'gradientPreset': return matchedPreset
        case 'gradientFrom': return info.gradientFrom || '#ffffff'
        case 'gradientTo': return info.gradientTo || '#000000'
        case 'gradientAngle': return info.gradientAngle
        case 'backgroundImage': return info.backgroundImage || ''
        case 'backgroundSize': return info.backgroundSize || ''
        case 'borderRadius': return pxStr(info.radius)
        case 'borderWidth': return pxStr(info.borderWidth)
        case 'borderStyle': return info.borderStyle || ''
        case 'borderColor': return info.borderColor || '#000000'
        case 'boxShadow': return info.boxShadow || ''
        case 'opacity': return info.opacity
        case 'overflow': return info.overflow || ''
        case 'alignHorizontal': return (isMobile ? info.mobileAlignBlock : '') || info.alignBlock || ''
        case 'width': return info.width
        case 'height': return info.height
        case 'maxWidth': return info.maxWidth
        case 'padding': return pxStr(info.padding)
        case 'paddingTop': return pxStr(info.paddingTop)
        case 'paddingRight': return pxStr(info.paddingRight)
        case 'paddingBottom': return pxStr(info.paddingBottom)
        case 'paddingLeft': return pxStr(info.paddingLeft)
        case 'marginTop': return pxStr(info.marginTop)
        case 'marginBottom': return pxStr(info.marginBottom)
        case 'position': return info.position || ''
        case 'zIndex': return info.zIndex
        case 'display': return info.display || ''
        case 'flexDirection': return info.flexDirection || ''
        case 'justifyContent': return info.justifyContent || ''
        case 'alignItems': return info.alignItems || ''
        case 'flexWrap': return info.flexWrap || ''
        case 'gap': return pxStr(info.gap)
        default: return ''
      }
    },

    set(key, value) {
      switch (key) {
        case 'text':
        case 'href':
        case 'src':
        case 'alt':
        case 'fontFamily':
        case 'fontWeight':
        case 'lineHeight':
        case 'textTransform':
        case 'textAlign':
        case 'italic':
        case 'underline':
        case 'color':
        case 'background':
        case 'gradientFrom':
        case 'gradientTo':
        case 'gradientAngle':
        case 'backgroundImage':
        case 'backgroundSize':
        case 'borderStyle':
        case 'borderColor':
        case 'boxShadow':
        case 'opacity':
        case 'overflow':
        case 'width':
        case 'height':
        case 'maxWidth':
        case 'position':
        case 'zIndex':
        case 'display':
        case 'flexDirection':
        case 'justifyContent':
        case 'alignItems':
        case 'flexWrap':
          onChange({ [key]: value })
          return
        case 'fontSize':
        case 'letterSpacing':
        case 'padding':
        case 'paddingTop':
        case 'paddingRight':
        case 'paddingBottom':
        case 'paddingLeft':
        case 'marginTop':
        case 'marginBottom':
        case 'gap':
          onChange({ [key]: parseCssNumber(value) })
          return
        case 'borderRadius':
          onChange({ radius: parseCssNumber(value) })
          return
        case 'borderWidth':
          onChange({ borderWidth: parseCssNumber(value) })
          return
        case 'alignHorizontal':
          onChange({ alignBlock: value })
          return
        case 'gradientPreset': {
          if (!value || value === 'none') {
            onChange({ gradientFrom: '', gradientTo: '' })
            return
          }
          const parts = gradientParts(value)
          if (parts.gradientFrom) {
            onChange({
              gradientFrom: parts.gradientFrom,
              gradientTo: parts.gradientTo,
              gradientAngle: parts.gradientAngle,
            })
          }
          return
        }
        default:
      }
    },
  }
}

export function createCanvasInspectorAdapter({
  component,
  def,
  viewport = 'pc',
  isFlow = false,
  layout = {},
  layoutSharedAcrossScreens = false,
  showPositionControls = true,
  extendedMode = true,
  viewportStretchComponent = false,
  selectedIds = [],
  pages = [],
  linkSections = [],
  updateStyles,
  updateProps,
  setLayout,
  clearMobileStyles,
  alignSelection,
  distributeSelection,
  scaleSingleSize,
  presetSingleSize,
  onFitEmbed,
  scrollBehavior = 'normal',
  setScrollBehavior,
  hiddenUnderBar = 0,
}) {
  const isMobile = viewport === 'mobile'
  const mobileStyleScope = isMobile && !isFlow
  const lead = mobileStyleScope ? 'Same as PC' : null
  const editableList = def?.editableStyles || []
  const styleSet = new Set(editableList)
  const hasBorderShorthand = component.styles?.border != null || component.stylesMobile?.border != null
  const hasRichTypography = styleSet.has('fontFamily')
  const hasBoxSurface = styleSet.has('borderRadius') || styleSet.has('borderWidth') || hasBorderShorthand
  const hasEffects = styleSet.has('boxShadow') || styleSet.has('opacity') || styleSet.has('overflow') || styleSet.has('objectFit')

  const readStyle = (key) => (
    mobileStyleScope
      ? (component.stylesMobile?.[key] ?? component.styles?.[key])
      : component.styles?.[key]
  )
  const writeStyle = (patch) => updateStyles(component.id, patch)

  const currentBgImg = readStyle('backgroundImage') || ''
  const grad = gradientPartsOf(
    mobileStyleScope ? component.stylesMobile?.backgroundImage : '',
    component.styles?.backgroundImage,
  )
  const containerFlow = component.props?.flow || 'free'
  const containerDisplay = containerFlow === 'row' || containerFlow === 'column' ? 'flex' : containerFlow

  const has = (key) => {
    switch (key) {
      case 'fontFamily':
      case 'fontWeight':
      case 'lineHeight':
      case 'letterSpacing':
      case 'textTransform':
      case 'textAlign':
      case 'italic':
      case 'underline':
        return hasRichTypography || styleSet.has(key)
      case 'fontSize':
        return styleSet.has('fontSize')
      case 'color':
        return styleSet.has('color')
      case 'background':
        return styleSet.has('backgroundColor')
      case 'gradient':
        return (styleSet.has('backgroundImage') || styleSet.has('backgroundColor'))
          && component.type !== 'spacer'
          && component.type !== 'divider'
      case 'backgroundImage':
        // Backend sanitize_styles forbids url(...) in component styles; canvas
        // images live on Image blocks or HTML embeds.
        return false
      case 'borderRadius':
      case 'borderWidth':
      case 'borderStyle':
      case 'borderColor':
        return hasBoxSurface || styleSet.has(key)
      // Outside Simple mode every block can take a border and an overflow, as
      // it could under Advanced CSS: the shorthand where the block has no
      // border fields of its own.
      case 'border':
        return hasBorderShorthand || (extendedMode && !hasBoxSurface)
      case 'overflow':
        return hasEffects || extendedMode
      case 'boxShadow':
      case 'opacity':
        return hasEffects
      case 'objectFit':
        return styleSet.has('objectFit')
      case 'alignHorizontal':
      case 'alignVertical':
      case 'distribute':
        return showPositionControls && component.type !== 'region'
      case 'x':
        return showPositionControls && extendedMode && !viewportStretchComponent
      case 'y':
        return showPositionControls && extendedMode && component.type !== 'region'
      case 'width':
        return !isFlow && !viewportStretchComponent
      case 'height':
        return !isFlow
      case 'maxWidth':
        return isFlow ? !viewportStretchComponent : styleSet.has('maxWidth')
      case 'minHeight':
        return isFlow
      case 'sizePresets':
        return !viewportStretchComponent
      case 'padding':
      case 'paddingSides':
        return styleSet.has('padding')
      case 'margin':
        return styleSet.has('margin')
      case 'marginVertical':
        return (styleSet.has('padding') || styleSet.has('margin') || component.type === 'divider')
          && component.type !== 'spacer'
      case 'position':
        return component.type !== 'region'
      case 'zIndex':
        return component.type !== 'region' && scrollBehavior !== 'normal'
      case 'pinPlacement':
        return component.type !== 'region' && scrollBehavior !== 'normal'
      case 'flexLayout':
      case 'display':
        return component.type === 'container'
      case 'flexDirection':
      case 'justifyContent':
      case 'alignItems':
      case 'flexWrap':
        return component.type === 'container' && containerDisplay === 'flex'
      case 'gridColumns':
        return component.type === 'container' && containerDisplay === 'grid'
      case 'gap':
        return component.type === 'container' && containerDisplay !== 'free'
      default:
        return false
    }
  }

  return {
    mode: 'canvas',
    isMobile,
    isFlow,
    mobileStyleScope,
    layoutSharedAcrossScreens,
    extendedMode,
    subject: component.id,
    component,
    pages,
    sections: linkSections,
    selectedCount: selectedIds.length,
    mobileOverrideCount: component.stylesMobile ? Object.keys(component.stylesMobile).length : 0,
    onResetMobile: () => clearMobileStyles?.(component.id),
    allowEmptySize: false,
    colorAccepts: undefined,
    gradientAccepts: isGradientStop,
    scaleSingleSize,
    presetSingleSize,
    onFitEmbed,
    hiddenUnderBar,
    scrollBehavior,
    has,
    hasAny: (keys) => keys.some(has),

    fontOptions: (translate) => [
      ...(mobileStyleScope ? [['', translate('Same as PC')]] : []),
      ['inherit', translate('Theme font')],
      ...FONT_OPTIONS.map(([val, label]) => [val, translate(label)]),
    ],
    weightOptions: (translate) => [
      ...(lead ? [['', translate(lead)]] : [['', translate('Default')]]),
      ...WEIGHT_OPTIONS.map(([val, label]) => [val, translate(label)]),
    ],
    textTransformOptions: (translate) => withLeadingOption(TEXT_TRANSFORM_OPTIONS, lead || 'Default', translate),
    borderStyleOptions: (translate) => withLeadingOption(BORDER_STYLE_OPTIONS, lead || 'Default', translate),
    shadowOptions: (translate) => withLeadingOption(SHADOW_OPTIONS, lead, translate),
    overflowOptions: (translate) => withLeadingOption(OVERFLOW_OPTIONS, lead || 'Default', translate),
    gradientPresetOptions: (translate) => withLeadingOption(GRADIENT_PRESET_OPTIONS, lead, translate),
    backgroundSizeOptions: (translate) => withLeadingOption(BACKGROUND_SIZE_OPTIONS, lead || 'Default', translate),
    objectFitOptions: (translate) => withLeadingOption(OBJECT_FIT_OPTIONS, lead, translate),
    displayOptions: (translate) => CANVAS_CONTAINER_DISPLAY_OPTIONS.map(([val, label]) => [val, translate(label)]),
    flexDirectionOptions: (translate) => CANVAS_FLEX_DIRECTION_OPTIONS.map(([val, label]) => [val, translate(label)]),
    justifyOptions: (translate) => CANVAS_JUSTIFY_OPTIONS.map(([val, label]) => [val, translate(label)]),
    flexAlignOptions: (translate) => CANVAS_FLEX_ALIGN_OPTIONS.map(([val, label]) => [val, translate(label)]),
    flexWrapOptions: (translate) => CANVAS_FLEX_WRAP_OPTIONS.map(([val, label]) => [val, translate(label)]),
    positionOptions: (translate) => CANVAS_POSITION_OPTIONS.map(([val, label]) => [val, translate(label)]),

    get(key) {
      switch (key) {
        case 'fontFamily': return readStyle('fontFamily') ?? (mobileStyleScope ? '' : 'inherit')
        case 'fontSize': return readStyle('fontSize') ?? ''
        case 'fontWeight': {
          const w = readStyle('fontWeight') ?? ''
          if (w === 'normal') return '400'
          if (w === 'bold') return '700'
          return w
        }
        case 'lineHeight': {
          const raw = readStyle('lineHeight')
          if (raw === undefined || raw === null || raw === '') return ''
          if (typeof raw === 'string' && /[a-z%]/i.test(raw)) return raw
          const n = Number(raw)
          return Number.isFinite(n) ? n : raw
        }
        case 'letterSpacing': return readStyle('letterSpacing') ?? ''
        case 'textTransform': return readStyle('textTransform') ?? ''
        case 'textAlign': return readStyle('textAlign') ?? ''
        case 'italic': return String(readStyle('fontStyle') || '').startsWith('italic')
        case 'underline': return String(readStyle('textDecoration') || '').includes('underline')
        case 'color': return readStyle('color') ?? ''
        case 'background': return readStyle('backgroundColor') ?? ''
        case 'gradientPreset': {
          if (!currentBgImg) return mobileStyleScope ? '' : 'none'
          const exact = GRADIENT_PRESET_OPTIONS.find(([val]) => val === currentBgImg)
          if (exact) return exact[0]
          const byStops = GRADIENT_PRESET_OPTIONS.find(([val]) => (
            val !== 'none' && patchedGradient(gradientParts(val), {}) === patchedGradient(grad, {})
          ))
          return byStops ? byStops[0] : ''
        }
        case 'gradientFrom': return grad.gradientFrom || '#ffffff'
        case 'gradientTo': return grad.gradientTo || '#000000'
        case 'gradientAngle': return grad.gradientAngle
        case 'border': return readStyle('border') ?? ''
        case 'borderRadius': return readStyle('borderRadius') ?? ''
        case 'borderWidth': return readStyle('borderWidth') ?? ''
        case 'borderStyle': return readStyle('borderStyle') ?? ''
        case 'borderColor': return readStyle('borderColor') ?? ''
        case 'boxShadow': return readStyle('boxShadow') ?? (mobileStyleScope ? '' : 'none')
        case 'opacity': return readStyle('opacity') ?? 1
        case 'overflow': return readStyle('overflow') ?? ''
        case 'objectFit': return readStyle('objectFit') ?? (mobileStyleScope ? '' : 'cover')
        case 'alignHorizontal': return ''
        case 'alignVertical': return ''
        case 'x': return layout?.x ?? 0
        case 'y': return layout?.y ?? 0
        case 'width': return layout?.w ?? 200
        case 'height': return layout?.h ?? 80
        case 'maxWidth': return isFlow ? (layout?.w ?? 200) : (readStyle('maxWidth') ?? '')
        case 'minHeight': return layout?.h ?? 80
        case 'padding': return readStyle('padding') ?? ''
        case 'paddingTop': return parseBoxSides(readStyle('padding')).top
        case 'paddingRight': return parseBoxSides(readStyle('padding')).right
        case 'paddingBottom': return parseBoxSides(readStyle('padding')).bottom
        case 'paddingLeft': return parseBoxSides(readStyle('padding')).left
        case 'margin': return readStyle('margin') ?? ''
        case 'marginTop': return parseBoxSides(readStyle('margin')).top
        case 'marginBottom': return parseBoxSides(readStyle('margin')).bottom
        case 'position': return scrollBehavior || 'normal'
        case 'zIndex': return component.props?.pinZIndex ?? (scrollBehavior === 'fixed' ? 100 : 20)
        case 'pinY': return component.props?.pinY || 'top'
        case 'pinX': return component.props?.pinX || 'left'
        case 'pinOffsetY': return component.props?.pinOffsetY ?? 0
        case 'pinOffsetX': return component.props?.pinOffsetX ?? 0
        case 'display': return containerDisplay
        case 'flexDirection': return containerFlow === 'column' ? 'column' : 'row'
        case 'justifyContent': return component.props?.justify || 'start'
        case 'alignItems': return component.props?.align || 'stretch'
        case 'flexWrap': return component.props?.wrap ? 'wrap' : 'nowrap'
        case 'gridColumns': return component.props?.cols ?? 3
        case 'gap': return pxStr(component.props?.gap ?? 16)
        default: return ''
      }
    },

    set(key, value) {
      const pcPadding = mobileStyleScope ? component.styles?.padding : ''
      const pcMargin = mobileStyleScope ? component.styles?.margin : ''
      switch (key) {
        case 'fontFamily':
        case 'fontSize':
        case 'fontWeight':
        case 'letterSpacing':
        case 'textTransform':
        case 'textAlign':
        case 'border':
        case 'borderRadius':
        case 'borderWidth':
        case 'borderStyle':
        case 'borderColor':
        case 'boxShadow':
        case 'opacity':
        case 'overflow':
        case 'objectFit':
        case 'padding':
        case 'margin':
          writeStyle({ [key]: value })
          return
        case 'lineHeight':
          writeStyle({ lineHeight: value === '' || value === null ? '' : String(value) })
          return
        case 'italic':
          writeStyle({ fontStyle: value ? 'italic' : 'normal' })
          return
        case 'underline':
          writeStyle({ textDecoration: value ? 'underline' : 'none' })
          return
        case 'color':
          writeStyle({ color: value })
          return
        case 'background':
          writeStyle({ backgroundColor: value })
          return
        case 'gradientPreset':
          writeStyle({ backgroundImage: value })
          return
        case 'gradientFrom':
        case 'gradientTo':
        case 'gradientAngle': {
          const next = patchedGradient(grad, { [key]: value })
          writeStyle({ backgroundImage: next || (mobileStyleScope ? '' : 'none') })
          return
        }
        case 'paddingTop':
          writeStyle({ padding: patchBoxSide(readStyle('padding'), 'top', value, pcPadding) })
          return
        case 'paddingRight':
          writeStyle({ padding: patchBoxSide(readStyle('padding'), 'right', value, pcPadding) })
          return
        case 'paddingBottom':
          writeStyle({ padding: patchBoxSide(readStyle('padding'), 'bottom', value, pcPadding) })
          return
        case 'paddingLeft':
          writeStyle({ padding: patchBoxSide(readStyle('padding'), 'left', value, pcPadding) })
          return
        case 'marginTop':
          writeStyle({ margin: patchBoxSide(readStyle('margin'), 'top', value, pcMargin) })
          return
        case 'marginBottom':
          writeStyle({ margin: patchBoxSide(readStyle('margin'), 'bottom', value, pcMargin) })
          return
        case 'alignHorizontal':
          if (value === 'left') alignSelection?.('left')
          else if (value === 'center') alignSelection?.('centerH')
          else if (value === 'right') alignSelection?.('right')
          return
        case 'alignVertical':
          if (value === 'top') alignSelection?.('top')
          else if (value === 'middle') alignSelection?.('middleV')
          else if (value === 'bottom') alignSelection?.('bottom')
          return
        case 'distribute':
          if (value === 'x' || value === 'y') distributeSelection?.(value)
          return
        case 'x':
          setLayout?.(component.id, { x: value })
          return
        case 'y':
          setLayout?.(component.id, { y: value })
          return
        case 'width':
          setLayout?.(component.id, { w: value })
          return
        case 'height':
        case 'minHeight':
          setLayout?.(component.id, { h: value })
          return
        case 'maxWidth':
          if (isFlow) setLayout?.(component.id, { w: value })
          else writeStyle({ maxWidth: value })
          return
        case 'position':
          setScrollBehavior?.(value)
          return
        case 'zIndex':
          updateProps?.(component.id, { pinZIndex: value })
          return
        case 'pinY':
          updateProps?.(component.id, { pinY: value })
          return
        case 'pinX':
          updateProps?.(component.id, { pinX: value })
          return
        case 'pinOffsetY':
          updateProps?.(component.id, { pinOffsetY: value })
          return
        case 'pinOffsetX':
          updateProps?.(component.id, { pinOffsetX: value })
          return
        case 'display':
          if (value === 'flex') {
            updateProps?.(component.id, { flow: containerFlow === 'column' ? 'column' : 'row' })
          } else {
            updateProps?.(component.id, { flow: value })
          }
          return
        case 'flexDirection':
          updateProps?.(component.id, { flow: value === 'column' ? 'column' : 'row' })
          return
        case 'justifyContent':
          updateProps?.(component.id, { justify: value })
          return
        case 'alignItems':
          updateProps?.(component.id, { align: value })
          return
        case 'flexWrap':
          updateProps?.(component.id, { wrap: value === 'wrap' })
          return
        case 'gridColumns':
          updateProps?.(component.id, { cols: value })
          return
        case 'gap':
          updateProps?.(component.id, { gap: typeof value === 'string' ? (parseCssNumber(value) || 0) : value })
          return
        default:
      }
    },
  }
}
