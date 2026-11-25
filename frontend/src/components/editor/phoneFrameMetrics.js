import { HANDHELD_SCREENS } from '../../utils/deviceCatalog.js'

// Device bodies for the editor's phone mockup, in DESIGN pixels. Shared so the
// Edit canvas and the View preview reserve the same room for the bezel and
// therefore fit-scale to the same size. See PhoneFrame.jsx for the drawing.
//
// The mockup follows the device the user picked in the size dropdown: an iPhone
// preset gets an iPhone body, a Galaxy gets a punch-hole camera and squarer
// corners, the Ultra is boxier still. What identifies a phone at a glance is
// corner roundness, bezel thickness, camera cutout and button placement — so
// those are what vary.
//
// Camera cutouts overlay the preview without changing the page's layout size.

export const PHONE_MODELS = {
  // Neutral artboard for custom/default 390px work: it deliberately carries no
  // vendor identity, while still looking like a real contemporary phone.
  generic: {
    id: 'generic',
    name: 'Standard mobile',
    bezel: { side: 8, top: 8, bottom: 9 },
    radius: 36,
    screenRadius: 29,
    camera: 'punch',
    buttons: 'galaxy',
    body: 'graphite',
  },
  // iPhone 15 Pro / Pro Max: titanium rail, near-uniform bezel and Dynamic Island.
  'iphone-island': {
    id: 'iphone-island',
    name: 'iPhone 15 Pro',
    bezel: { side: 9, top: 9, bottom: 9 },
    radius: 54,
    screenRadius: 46,
    camera: 'island',
    buttons: 'iphone',
    body: 'titanium',
  },
  // The regular iPhone 14 uses the classic Face ID notch, not Dynamic Island.
  'iphone-notch': {
    id: 'iphone-notch',
    name: 'iPhone 14',
    bezel: { side: 10, top: 10, bottom: 10 },
    radius: 50,
    screenRadius: 41,
    camera: 'notch',
    buttons: 'iphone',
    body: 'midnight',
  },
  // iPhone SE: thick brow and chin, squared body, physical home button.
  'iphone-classic': {
    id: 'iphone-classic',
    name: 'iPhone SE (3rd generation)',
    bezel: { side: 11, top: 52, bottom: 62 },
    radius: 24,
    screenRadius: 2,
    camera: 'earpiece',
    buttons: 'iphone',
    home: true,
    body: 'aluminium',
  },
  // Galaxy S: thin even bezel, centred punch-hole, moderately round corners,
  // and every button on the right edge.
  'galaxy-s24': {
    id: 'galaxy-s24',
    name: 'Galaxy S24',
    bezel: { side: 7, top: 7, bottom: 8 },
    radius: 38,
    screenRadius: 31,
    camera: 'punch',
    buttons: 'galaxy',
    body: 'graphite',
  },
  // Galaxy Ultra: the boxy one — corners barely rounded.
  'galaxy-s24-ultra': {
    id: 'galaxy-s24-ultra',
    name: 'Galaxy S24 Ultra',
    bezel: { side: 8, top: 8, bottom: 9 },
    radius: 14,
    screenRadius: 7,
    camera: 'punch',
    buttons: 'galaxy',
    body: 'titanium-black',
  },
  'galaxy-ultra-rounded': {
    id: 'galaxy-ultra-rounded',
    bezel: { side: 8, top: 8, bottom: 9 },
    radius: 29,
    screenRadius: 21,
    camera: 'punch',
    buttons: 'galaxy',
    body: 'titanium-black',
  },
  'galaxy-a-drop': {
    id: 'galaxy-a-drop',
    bezel: { side: 8, top: 10, bottom: 15 },
    radius: 33,
    screenRadius: 24,
    camera: 'teardrop',
    buttons: 'galaxy',
    body: 'graphite',
  },
  'android-punch': {
    id: 'android-punch',
    bezel: { side: 8, top: 8, bottom: 10 },
    radius: 38,
    screenRadius: 30,
    camera: 'punch',
    buttons: 'galaxy',
    body: 'graphite',
  },
  // Pixel 7 has a rounder screen and its power key sits above the volume rocker.
  'pixel-7': {
    id: 'pixel-7',
    name: 'Pixel 7',
    bezel: { side: 9, top: 10, bottom: 11 },
    radius: 34,
    screenRadius: 26,
    camera: 'punch',
    buttons: 'pixel',
    body: 'obsidian',
  },
  'pixel-9': {
    id: 'pixel-9',
    bezel: { side: 8, top: 8, bottom: 8 },
    radius: 42,
    screenRadius: 34,
    camera: 'punch',
    buttons: 'pixel',
    body: 'obsidian',
  },
  // A foldable's screen (deviceCatalog.js): thin bezel, squarer corners, and
  // the hinge drawn across the screen where the device folds.
  foldable: {
    id: 'foldable',
    name: 'Foldable',
    bezel: { side: 7, top: 7, bottom: 7 },
    radius: 22,
    screenRadius: 14,
    camera: 'punch',
    buttons: 'galaxy',
    body: 'graphite',
  },
}

// Heights for custom widths with no explicit screen height.
const SCREEN_HEIGHT_BY_WIDTH = Object.fromEntries(
  HANDHELD_SCREENS.filter((device) => device.category === 'phone').reverse().map(({ w, h }) => [w, h]),
)

export function phoneScreenHeight(width) {
  const w = Math.round(Number(width) || 0)
  if (SCREEN_HEIGHT_BY_WIDTH[w]) return SCREEN_HEIGHT_BY_WIDTH[w]
  // Contemporary phones sit around 2.16:1; clamp so an odd custom width still
  // produces a screen someone could hold.
  return Math.min(1400, Math.max(480, Math.round((w || 390) * 2.16)))
}

// Each foldable in its maker's finish and with its maker's keys; the keys also
// pick the browser drawn on it (Safari for an iPhone, Chrome for the rest).
const FOLDABLE_LOOKS = {
  'iphone-fold': { buttons: 'iphone', body: 'titanium' },
  'pixel9-pro-fold': { buttons: 'pixel', body: 'obsidian' },
  'huawei-mate-x6': { body: 'titanium-black' },
  'huawei-mate-xt': { body: 'titanium-black' },
}

export function phoneModel(device) {
  if (device?.category === 'foldable') {
    const { camera = 'punch', cameraPlacement, cameraX, cameraTop, hinge, name } = device
    return { ...PHONE_MODELS.foldable, ...FOLDABLE_LOOKS[device.group], camera, cameraPlacement, cameraX, cameraTop, hinge, name }
  }
  if (device?.category === 'phone' && PHONE_MODELS[device.model]) {
    return { ...PHONE_MODELS[device.model], name: device.name, compactIsland: device.compactIsland }
  }
  return PHONE_MODELS.generic
}

// How much bigger the device body is than the screen it holds.
export function phoneFrameW(model) {
  return model.bezel.side * 2
}
export function phoneFrameH(model) {
  return model.bezel.top + model.bezel.bottom
}
