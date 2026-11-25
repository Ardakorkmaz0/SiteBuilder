// Single source of truth for every component the builder supports.
// Adding a new component = adding one entry here (plus its Render component).
// This drives the Sidebar palette, the Renderer, and the PropertiesPanel.
//
// Components live on a free canvas: each has a layout { x, y, w, h }. The box
// controls size/position, so width/height/margin are NOT editable styles here —
// they are controlled by dragging/resizing or the Position & Size inputs.
import { FIELD_CONTROLS } from '../utils/formField.js'
import {
  Navbar,
  Heading,
  Text,
  Button,
  LinkButton,
  Image,
  Section,
  Region,
  Card,
  List,
  Quote,
  Badge,
  Icon,
  ThemeToggle,
  Input,
  Select,
  Alert,
  Accordion,
  Container,
  Tabs,
  HtmlEmbed,
  Divider,
  Spacer,
} from './renderer/components.jsx'
import { PRESET_IMAGES } from '../utils/presetImages.js'
import { ICON_OPTIONS } from '../utils/icons.js'
import { NodeIcon } from './icons.jsx'
import { componentKindIcon } from './editor/elementKindIcons.js'
import { FOLDABLE_STATES, HANDHELD_SCREENS, LAPTOP_SCREENS, PHONE_BREAKPOINT } from '../utils/deviceCatalog.js'

// One drawing per kind of block, shared with HTML elements of that kind.
const kindIcon = (type) => <NodeIcon name={componentKindIcon(type)} size={16} />

const OPTIONAL_ICON_OPTIONS = [['', 'None'], ...ICON_OPTIONS]

// Every field setting a component type can have, once per key: what the
// panel's generic path and other readers of editableProps see. The panel
// itself groups them by part (FieldPartsEditor).
function controlsForAll(componentType) {
  return FIELD_CONTROLS.filter((control) => !control.componentTypes || control.componentTypes.includes(componentType))
}
function uniqueControls(controls) {
  const seen = new Set()
  return controls.filter((control) => (seen.has(control.key) ? false : seen.add(control.key)))
}

export const registry = {
  navbar: {
    type: 'navbar',
    label: 'Navbar',
    icon: kindIcon('navbar'),
    Render: Navbar,
    defaultSize: { w: 1000, h: 64 },
    defaultProps: {
      brand: 'My Personal Site',
      links: [
        { label: 'Home', href: '#' },
        { label: 'About', href: '#about' },
        { label: 'Contact', href: '#contact' },
      ],
      navLayout: 'horizontal',
      brandAlign: 'left',
      linksAlign: 'right',
      linkGap: 20,
      mobileNavMode: 'menu',
      widthMode: 'full',
    },
    defaultStyles: {
      backgroundColor: '#1d1d1f',
      color: '#f5f5f7',
      padding: '18px 28px',
    },
    editableProps: [
      { key: 'brand', label: 'Brand', control: 'textarea' },
      { key: 'links', label: 'Links', control: 'links' },
      {
        key: 'navLayout',
        label: 'Layout',
        control: 'select',
        options: [
          ['horizontal', 'Horizontal'],
          ['centered', 'Centered'],
          ['twoRow', 'Two row'],
          ['vertical', 'Vertical'],
        ],
      },
      {
        key: 'brandAlign',
        label: 'Brand position',
        control: 'align',
        options: [['left', 'Left'], ['center', 'Center'], ['right', 'Right']],
      },
      {
        key: 'linksAlign',
        label: 'Links position',
        control: 'align',
        options: [['left', 'Left'], ['center', 'Center'], ['right', 'Right']],
      },
      { key: 'linkGap', label: 'Space between links', control: 'px' },
      {
        key: 'widthMode',
        label: 'Width mode',
        control: 'select',
        options: [['full', 'Full width'], ['boxed', 'Boxed']],
      },
      {
        key: 'mobileNavMode',
        label: 'Mobile navigation',
        control: 'select',
        options: [['menu', 'Hamburger menu'], ['stack', 'Stacked links']],
      },
      // Empty runs the brand and links across the design column, whatever the
      // artboard width; a number holds them to a centred strip that wide.
      { key: 'contentWidth', label: 'Content width', control: 'px', placeholder: 'Full width' },
    ],
    editableStyles: [
      'backgroundColor', 'backgroundImage', 'color', 'fontSize', 'fontWeight',
      'fontFamily', 'textTransform', 'letterSpacing', 'padding', 'boxShadow',
      'opacity',
    ],
  },

  heading: {
    type: 'heading',
    label: 'Heading',
    icon: kindIcon('heading'),
    Render: Heading,
    defaultSize: { w: 520, h: 64 },
    defaultProps: { text: 'Welcome to my site', level: 'h1' },
    defaultStyles: {
      fontSize: '44px',
      fontWeight: '600',
      letterSpacing: '-0.02em',
      color: '#1d1d1f',
      textAlign: 'left',
      padding: '4px',
    },
    editableProps: [
      { key: 'text', label: 'Text', control: 'textarea' },
      {
        key: 'level',
        label: 'Level',
        control: 'select',
        options: [['h1', 'H1 (largest)'], ['h2', 'H2'], ['h3', 'H3']],
      },
    ],
    editableStyles: [
      'color', 'backgroundColor', 'fontSize', 'fontWeight', 'fontStyle',
      'fontFamily', 'textAlign', 'textTransform', 'letterSpacing', 'lineHeight',
      'padding', 'borderRadius', 'opacity',
    ],
  },

  text: {
    type: 'text',
    label: 'Text',
    icon: kindIcon('text'),
    Render: Text,
    defaultSize: { w: 360, h: 80 },
    defaultProps: { text: 'Tell visitors who you are and what you do in a sentence or two.' },
    defaultStyles: {
      fontSize: '19px',
      lineHeight: '1.5',
      color: '#1d1d1f',
      textAlign: 'left',
      padding: '4px',
    },
    editableProps: [{ key: 'text', label: 'Text', control: 'textarea' }],
    editableStyles: [
      'color', 'backgroundColor', 'fontSize', 'fontWeight', 'fontStyle',
      'fontFamily', 'textAlign', 'textTransform', 'textDecoration', 'lineHeight',
      'letterSpacing', 'padding', 'borderRadius', 'opacity',
    ],
  },

  button: {
    type: 'button',
    label: 'Button',
    icon: kindIcon('button'),
    Render: Button,
    defaultSize: { w: 180, h: 48 },
    defaultProps: { text: 'Contact Me', href: '#contact', icon: '' },
    defaultStyles: {
      backgroundColor: '#0071e3',
      color: '#ffffff',
      borderRadius: '980px',
      fontSize: '17px',
      fontWeight: '500',
    },
    editableProps: [
      { key: 'text', label: 'Button text', control: 'textarea' },
      { key: 'href', label: 'Link (href)', control: 'text' },
      { key: 'icon', label: 'Icon', control: 'select', options: OPTIONAL_ICON_OPTIONS },
    ],
    editableStyles: [
      'backgroundColor', 'backgroundImage', 'color', 'fontSize', 'fontWeight',
      'fontFamily', 'textTransform', 'letterSpacing', 'borderRadius',
      'borderWidth', 'borderStyle', 'borderColor', 'boxShadow', 'opacity',
    ],
  },

  linkbutton: {
    type: 'linkbutton',
    label: 'Link Button',
    icon: kindIcon('linkbutton'),
    Render: LinkButton,
    defaultSize: { w: 220, h: 44 },
    defaultProps: { text: 'Visit my GitHub', href: 'https://github.com', icon: '' },
    defaultStyles: {
      color: '#0071e3',
      fontSize: '17px',
      textDecoration: 'none',
    },
    editableProps: [
      { key: 'text', label: 'Link text', control: 'textarea' },
      { key: 'href', label: 'Link (href)', control: 'text' },
      { key: 'icon', label: 'Icon', control: 'select', options: OPTIONAL_ICON_OPTIONS },
    ],
    editableStyles: [
      'color', 'backgroundColor', 'fontSize', 'fontWeight', 'fontFamily',
      'textTransform', 'textDecoration', 'letterSpacing', 'borderRadius',
      'padding', 'opacity',
    ],
  },

  image: {
    type: 'image',
    label: 'Image',
    icon: kindIcon('image'),
    Render: Image,
    defaultSize: { w: 260, h: 170 },
    defaultProps: {
      src: PRESET_IMAGES[0].src,
      alt: 'Placeholder image',
    },
    defaultStyles: { borderRadius: '18px', objectFit: 'cover' },
    editableProps: [
      { key: 'src', label: 'Image', control: 'image' },
      { key: 'srcOther', label: 'Image in the other color mode', control: 'image' },
      { key: 'alt', label: 'Alt text', control: 'text' },
    ],
    editableStyles: [
      'objectFit', 'borderRadius', 'borderWidth', 'borderStyle',
      'borderColor', 'boxShadow', 'opacity',
    ],
  },

  section: {
    type: 'section',
    label: 'Text band',
    icon: kindIcon('section'),
    Render: Section,
    defaultSize: { w: 1000, h: 280 },
    defaultProps: {
      eyebrow: '',
      heading: 'Section title',
      text: 'A short paragraph that introduces what this section is about.',
      buttonText: '',
      buttonHref: '#top',
    },
    defaultStyles: {
      backgroundColor: '#f5f5f7',
      color: '#1d1d1f',
      padding: '40px',
      textAlign: 'center',
    },
    editableProps: [
      { key: 'eyebrow', label: 'Eyebrow', control: 'textarea' },
      { key: 'heading', label: 'Heading', control: 'textarea' },
      { key: 'text', label: 'Text', control: 'textarea' },
      { key: 'buttonText', label: 'Button text', control: 'textarea' },
      { key: 'buttonHref', label: 'Button link', control: 'link' },
    ],
    editableStyles: [
      'backgroundColor', 'backgroundImage', 'color', 'fontSize', 'fontFamily',
      'textAlign', 'textTransform', 'padding', 'borderRadius', 'boxShadow',
      'opacity',
    ],
  },

  region: {
    type: 'region',
    label: 'Section',
    icon: kindIcon('region'),
    Render: Region,
    defaultSize: { w: 980, h: 360 },
    defaultProps: { contentWidth: 980 },
    defaultStyles: {
      backgroundColor: '#f5f5f7',
      overflow: 'hidden',
    },
    editableProps: [
      { key: 'contentWidth', label: 'Max content width (desktop)', control: 'px' },
    ],
    editableStyles: [
      'backgroundColor', 'backgroundImage', 'color', 'textAlign', 'padding',
      'borderRadius', 'borderWidth', 'borderStyle', 'borderColor', 'boxShadow',
      'opacity',
    ],
  },

  card: {
    type: 'card',
    label: 'Card',
    icon: kindIcon('card'),
    Render: Card,
    defaultSize: { w: 320, h: 200 },
    defaultProps: {
      title: 'Card title',
      text: 'Some descriptive text for this card.',
    },
    defaultStyles: {
      backgroundColor: '#ffffff',
      color: '#1d1d1f',
      borderRadius: '18px',
      padding: '24px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    },
    editableProps: [
      { key: 'title', label: 'Title', control: 'textarea' },
      { key: 'text', label: 'Text', control: 'textarea' },
    ],
    editableStyles: [
      'backgroundColor', 'backgroundImage', 'color', 'fontSize', 'fontFamily',
      'textAlign', 'letterSpacing', 'borderRadius', 'padding', 'borderWidth',
      'borderStyle', 'borderColor', 'boxShadow', 'opacity',
    ],
  },

  list: {
    type: 'list',
    label: 'List',
    icon: kindIcon('list'),
    Render: List,
    defaultSize: { w: 360, h: 150 },
    defaultProps: {
      text: 'First item\nSecond item\nThird item',
      ordered: '',
    },
    defaultStyles: { fontSize: '16px', color: '#1d1d1f', lineHeight: '1.7' },
    editableProps: [
      { key: 'text', label: 'Items (one per line)', control: 'textarea' },
      {
        key: 'ordered',
        label: 'Style',
        control: 'select',
        options: [['', 'Bulleted (•)'], ['1', 'Numbered (1.)']],
      },
    ],
    editableStyles: [
      'color', 'fontSize', 'fontWeight', 'fontFamily', 'lineHeight',
      'letterSpacing', 'textAlign', 'opacity',
    ],
  },

  quote: {
    type: 'quote',
    label: 'Quote',
    icon: kindIcon('quote'),
    Render: Quote,
    defaultSize: { w: 480, h: 130 },
    defaultProps: {
      text: 'Design is not just what it looks like and feels like. Design is how it works.',
      author: 'Steve Jobs',
    },
    defaultStyles: { fontSize: '20px', color: '#374151' },
    editableProps: [
      { key: 'text', label: 'Quote', control: 'textarea' },
      { key: 'author', label: 'Author', control: 'textarea' },
    ],
    editableStyles: [
      'color', 'fontSize', 'fontWeight', 'fontStyle', 'fontFamily',
      'textAlign', 'letterSpacing', 'opacity',
    ],
  },

  badge: {
    type: 'badge',
    label: 'Badge',
    icon: kindIcon('badge'),
    Render: Badge,
    defaultSize: { w: 90, h: 30 },
    defaultProps: { text: 'New' },
    defaultStyles: {
      backgroundColor: '#2563eb',
      color: '#ffffff',
      fontSize: '13px',
      fontWeight: '600',
      padding: '4px 12px',
      borderRadius: '999px',
    },
    editableProps: [{ key: 'text', label: 'Text', control: 'textarea' }],
    editableStyles: [
      'backgroundColor', 'color', 'fontSize', 'fontWeight', 'fontFamily',
      'textTransform', 'letterSpacing', 'padding', 'borderRadius',
      'borderWidth', 'borderStyle', 'borderColor', 'opacity',
    ],
  },

  icon: {
    type: 'icon',
    label: 'Icon',
    icon: kindIcon('icon'),
    Render: Icon,
    defaultSize: { w: 48, h: 48 },
    defaultProps: { name: 'star', label: '' },
    defaultStyles: { fontSize: '40px', color: '#2563eb' },
    editableProps: [
      { key: 'name', label: 'Icon', control: 'select', options: ICON_OPTIONS },
      { key: 'label', label: 'Accessible label', control: 'text' },
    ],
    editableStyles: ['color', 'fontSize', 'opacity'],
  },

  // Every kind of form field (text, password, date, a switch, a slider…), with
  // settings per part; see utils/formField.js and FieldPartsEditor.
  input: {
    type: 'input',
    label: 'Form field',
    icon: kindIcon('input'),
    Render: Input,
    defaultSize: { w: 320, h: 70 },
    fieldParts: true,
    defaultProps: {
      label: 'Email',
      placeholder: 'you@example.com',
      inputType: 'email',
      options: 'Option 1\nOption 2\nOption 3',
      fieldBackgroundColor: '#ffffff',
      fieldColor: '#1d1d1f',
      fieldBorderColor: '#cbd5e1',
      fieldBorderWidth: '1px',
      fieldBorderRadius: '8px',
      fieldPadding: '10px 12px',
      fieldHeight: '44px',
      fieldBoxShadow: 'none',
    },
    defaultStyles: { fontSize: '15px', color: '#1d1d1f' },
    editableProps: uniqueControls(controlsForAll('input')),
    editableStyles: ['color', 'fontSize', 'fontFamily', 'textAlign', 'opacity'],
  },

  // A button visitors press to switch the site between its light and dark
  // palettes (the other palette is set in the Theme panel).
  themeToggle: {
    type: 'themeToggle',
    label: 'Theme switch',
    icon: kindIcon('themeToggle'),
    Render: ThemeToggle,
    defaultSize: { w: 44, h: 44 },
    defaultProps: { label: 'Dark mode', showLabel: '' },
    defaultStyles: {
      color: '#1d1d1f',
      backgroundColor: 'transparent',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: '#d2d2d7',
      borderRadius: '999px',
      fontSize: '16px',
      padding: '0px 12px',
    },
    editableProps: [
      { key: 'states', label: 'Visitors choose', control: 'select', options: [['', 'Light or dark'], ['three', 'Light, dark or device']] },
      { key: 'showLabel', label: 'Shows', control: 'select', options: [['', 'Icon only'], ['on', 'Icon and text']] },
      { key: 'label', label: 'Text', control: 'text' },
      { key: 'lightLabel', label: 'Name of light', control: 'text', onlyWhen: (props) => props.states === 'three' },
      { key: 'darkLabel', label: 'Name of dark', control: 'text', onlyWhen: (props) => props.states === 'three' },
      { key: 'deviceLabel', label: 'Name of device', control: 'text', onlyWhen: (props) => props.states === 'three' },
    ],
    editableStyles: [
      'color', 'backgroundColor', 'fontSize', 'fontWeight', 'fontFamily', 'padding',
      'borderRadius', 'borderWidth', 'borderStyle', 'borderColor', 'boxShadow', 'opacity',
    ],
  },

  select: {
    type: 'select',
    label: 'Dropdown',
    icon: kindIcon('select'),
    Render: Select,
    defaultSize: { w: 320, h: 70 },
    fieldParts: true,
    defaultProps: {
      fieldBackgroundColor: '#ffffff',
      fieldColor: '#1d1d1f',
      fieldBorderColor: '#cbd5e1',
      fieldBorderWidth: '1px',
      fieldBorderRadius: '8px',
      fieldPadding: '10px 12px',
      fieldHeight: '44px',
      fieldBoxShadow: 'none',
      label: 'Choose an option',
      options: 'Option 1\nOption 2\nOption 3',
      placeholder: 'Select…',
    },
    defaultStyles: { fontSize: '15px', color: '#1d1d1f' },
    editableProps: uniqueControls(controlsForAll('select')),
    editableStyles: ['color', 'fontSize', 'fontFamily', 'textAlign', 'opacity'],
  },

  alert: {
    type: 'alert',
    label: 'Alert',
    icon: kindIcon('alert'),
    Render: Alert,
    defaultSize: { w: 460, h: 56 },
    defaultProps: { text: 'Suitable — all checks passed.', variant: 'success', icon: 'check' },
    defaultStyles: {},
    editableProps: [
      { key: 'text', label: 'Text', control: 'textarea' },
      {
        key: 'variant',
        label: 'Type',
        control: 'select',
        options: [
          ['success', 'Success'],
          ['info', 'Info'],
          ['warning', 'Warning'],
          ['danger', 'Danger'],
        ],
      },
      { key: 'icon', label: 'Icon', control: 'select', options: ICON_OPTIONS },
    ],
    editableStyles: [
      'backgroundColor', 'color', 'fontSize', 'fontWeight', 'fontFamily',
      'borderRadius', 'padding', 'borderWidth', 'borderStyle', 'borderColor',
      'boxShadow', 'opacity',
    ],
  },

  accordion: {
    type: 'accordion',
    label: 'Accordion',
    icon: kindIcon('accordion'),
    Render: Accordion,
    defaultSize: { w: 460, h: 56 },
    defaultProps: {
      title: 'Advanced settings',
      text: 'Content that expands when the header is clicked — no JavaScript needed.',
    },
    defaultStyles: { fontSize: '15px', color: '#1d1d1f' },
    editableProps: [
      { key: 'title', label: 'Title', control: 'textarea' },
      { key: 'text', label: 'Content', control: 'textarea' },
    ],
    editableStyles: [
      'color', 'fontSize', 'fontFamily', 'backgroundColor', 'borderRadius',
      'borderColor', 'borderWidth', 'borderStyle', 'padding', 'opacity',
    ],
  },

  container: {
    type: 'container',
    label: 'Container',
    icon: kindIcon('container'),
    Render: Container,
    defaultSize: { w: 600, h: 200 },
    defaultProps: {},
    defaultStyles: { backgroundColor: '#f5f5f7', borderRadius: '12px', padding: '20px' },
    editableProps: [],
    editableStyles: [
      'backgroundColor', 'backgroundImage', 'borderRadius', 'padding',
      'borderWidth', 'borderStyle', 'borderColor', 'boxShadow', 'opacity',
    ],
  },

  tabs: {
    type: 'tabs',
    label: 'Tabs',
    icon: kindIcon('tabs'),
    Render: Tabs,
    defaultSize: { w: 640, h: 280 },
    defaultProps: {
      tabs: [
        { id: 't1', label: 'Tab one' },
        { id: 't2', label: 'Tab two' },
        { id: 't3', label: 'Tab three' },
      ],
      activeId: 't1',
      tabBackgroundColor: 'transparent',
      tabTextColor: '#6b7280',
      activeTabBackgroundColor: '#eff3fb',
      activeTabColor: '#1d1d1f',
      activeTabBorderColor: '#2563eb',
      tabBorderRadius: '8px',
      tabPadding: '10px 16px',
      tabGap: '6px',
      tablistBackgroundColor: 'transparent',
      tablistBorderColor: '#e5e7eb',
      tablistPadding: '0 0 8px',
      panelBackgroundColor: 'transparent',
      panelBorderColor: 'transparent',
      panelBorderRadius: '0px',
      panelPadding: '12px 0 0',
    },
    defaultStyles: {
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      padding: '16px',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: '#e5e7eb',
    },
    editableProps: [
      { key: 'tabs', label: 'Tabs', control: 'tabs' },
      { key: 'tabBackgroundColor', label: 'Tab background', control: 'color' },
      { key: 'tabTextColor', label: 'Tab text', control: 'color' },
      { key: 'activeTabBackgroundColor', label: 'Active tab background', control: 'color' },
      { key: 'activeTabColor', label: 'Active tab text', control: 'color' },
      { key: 'activeTabBorderColor', label: 'Active underline', control: 'color' },
      { key: 'tabBorderRadius', label: 'Tab radius', control: 'px' },
      { key: 'tabPadding', label: 'Tab padding', control: 'text', placeholder: 'e.g. 10px 16px' },
      { key: 'tabGap', label: 'Tab gap', control: 'px' },
      { key: 'tablistBackgroundColor', label: 'Tablist background', control: 'color' },
      { key: 'tablistBorderColor', label: 'Tablist border', control: 'color' },
      { key: 'tablistPadding', label: 'Tablist padding', control: 'text', placeholder: 'e.g. 6px' },
      { key: 'panelBackgroundColor', label: 'Panel background', control: 'color' },
      { key: 'panelBorderColor', label: 'Panel border', control: 'color' },
      { key: 'panelBorderRadius', label: 'Panel radius', control: 'px' },
      { key: 'panelPadding', label: 'Panel padding', control: 'text', placeholder: 'e.g. 12px 0 0' },
    ],
    editableStyles: [
      'backgroundColor', 'color', 'fontFamily', 'fontSize',
      'borderRadius', 'padding', 'borderWidth', 'borderStyle', 'borderColor',
      'boxShadow', 'opacity',
    ],
  },

  html: {
    type: 'html',
    label: 'HTML Embed',
    icon: kindIcon('html'),
    Render: HtmlEmbed,
    defaultSize: { w: 400, h: 240 },
    defaultProps: {
      code: '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#eef2ff;color:#3730a3;font:600 16px system-ui">Your HTML, CSS &amp; JS go here</div>',
    },
    defaultStyles: { borderRadius: '12px', overflow: 'hidden' },
    editableProps: [
      { key: 'code', label: 'Text & links', control: 'htmlContent' },
      { key: 'code', label: 'HTML / CSS / JS', control: 'code' },
      // Appearance overrides: restyle any snippet without touching its code.
      // They inject a style tag into the embed document (htmlEmbedTweaks), so
      // canvas, published site and export all render them the same way.
      { key: 'tweakBackground', label: 'Content background', control: 'color' },
      { key: 'tweakTextColor', label: 'Text color', control: 'color' },
      { key: 'tweakAccent', label: 'Accent (buttons & links)', control: 'color' },
      {
        key: 'tweakFont', label: 'Font family', control: 'select',
        options: [
          ['', 'From snippet'],
          ['system-ui, -apple-system, "Segoe UI", sans-serif', 'Modern (system)'],
          ['Georgia, "Times New Roman", serif', 'Serif (Georgia)'],
          ['"Trebuchet MS", Verdana, sans-serif', 'Rounded (Trebuchet)'],
          ['"Courier New", ui-monospace, monospace', 'Monospace'],
        ],
      },
      {
        key: 'tweakZoom', label: 'Content zoom', control: 'select',
        options: [
          ['', 'Normal'],
          ['0.85', 'Smaller'],
          ['1.15', 'Larger'],
          ['1.3', 'Extra large'],
        ],
      },
      { key: 'tweakPadding', label: 'Inner padding', control: 'px' },
      {
        key: 'tweakAlign', label: 'Content alignment', control: 'select',
        options: [
          ['', 'From snippet'],
          ['left', 'Left'],
          ['center', 'Center'],
          ['right', 'Right'],
        ],
      },
    ],
    editableStyles: [
      'backgroundColor', 'borderRadius', 'borderWidth', 'borderStyle',
      'borderColor', 'boxShadow', 'opacity', 'overflow',
    ],
  },

  divider: {
    type: 'divider',
    label: 'Divider',
    icon: kindIcon('divider'),
    Render: Divider,
    defaultSize: { w: 500, h: 8 },
    defaultProps: {},
    defaultStyles: { backgroundColor: '#d2d2d7' },
    editableProps: [],
    editableStyles: ['backgroundColor', 'borderRadius', 'opacity'],
  },

  spacer: {
    type: 'spacer',
    label: 'Spacer',
    icon: kindIcon('spacer'),
    Render: Spacer,
    defaultSize: { w: 240, h: 48 },
    defaultProps: {},
    defaultStyles: {},
    editableProps: [],
    editableStyles: ['backgroundColor'],
  },
}

export const COMPONENT_TYPES = Object.keys(registry)

export const paletteItems = COMPONENT_TYPES.map((type) => ({
  type,
  label: registry[type].label,
  icon: registry[type].icon,
}))

export const CANVAS_WIDTH = 1000
// The mobile breakpoint is designed on its own narrow canvas (real phone width),
// edited independently from the desktop layout.
export const MOBILE_CANVAS_WIDTH = 390

// Artboard sizes offered by the device picker (DevicePicker) above the canvas.
// Each sets the canvas WIDTH plus an optional "fold" guide — the visible screen
// height for that aspect ratio / device, drawn as a dashed line so the user sees
// what lands above the fold. fold:0 = off. `category` and `name` place and name
// the size in the picker. A foldable's screens come from deviceCatalog.js: the
// ones as wide as a desktop layout are PC sizes, the narrower ones phone sizes.
const DEVICE_CANVAS_PRESETS = [...HANDHELD_SCREENS, ...FOLDABLE_STATES].map(({ w, h, ...device }) => ({
  ...device,
  width: w,
  fold: h,
}))

export const PC_CANVAS_PRESETS = [
  { id: 'std', name: 'Standard', category: 'desktop', width: 1000, fold: 0 },
  { id: '16:9', name: 'Desktop 16:9', category: 'desktop', width: 1280, fold: 720 },
  { id: '16:10', name: 'Desktop 16:10', category: 'desktop', width: 1280, fold: 800 },
  { id: '4:3', name: 'Desktop 4:3', category: 'desktop', width: 1024, fold: 768 },
  { id: 'wide', name: 'Wide', category: 'desktop', width: 1440, fold: 900, laptop: 'generic' },
  ...LAPTOP_SCREENS.map(({ w, h, ...device }) => ({ ...device, width: w, fold: h })),
  { id: 'fhd', name: 'Full HD', category: 'desktop', width: 1920, fold: 1080 },
  { id: 'qhd', name: 'QHD', category: 'desktop', width: 2560, fold: 1440 },
  ...DEVICE_CANVAS_PRESETS.filter((preset) => preset.width >= PHONE_BREAKPOINT),
]

export const MOBILE_CANVAS_PRESETS = [
  { id: 'std', name: 'Standard mobile', category: 'phone', width: 390, fold: 0 },
  ...DEVICE_CANVAS_PRESETS.filter((preset) => preset.width < PHONE_BREAKPOINT),
]

// Old pages only have dimensions. Prefer the first matching preset (regular
// phones are before foldables); new selections remember an exact identity.
export function resolveCanvasPreset(viewport, width, fold, id) {
  const presets = viewport === 'mobile' ? MOBILE_CANVAS_PRESETS : PC_CANVAS_PRESETS
  const matches = (preset) => preset.width === width && preset.fold === fold
  return presets.find((preset) => preset.id === id && matches(preset)) || presets.find(matches)
}
