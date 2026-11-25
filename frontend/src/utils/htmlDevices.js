import { FOLDABLE_STATES, HANDHELD_SCREENS, LAPTOP_SCREENS, PHONE_BREAKPOINT } from './deviceCatalog.js'

// Device frames for previewing HTML pages — shared by the device picker above
// the stage (DevicePicker) and the HtmlWorkspace stage (sizing math).
// `category` places a device in the picker; `name` is what its card says.
// Foldables come from deviceCatalog.js, a device per screen state.
const SCREENS = [
  { id: 'fit', name: 'Responsive', category: 'desktop', w: 0, h: 0 },
  { id: 'desktop-16-9', name: 'Desktop 16:9', category: 'desktop', w: 1280, h: 720 },
  { id: 'desktop-16-10', name: 'Desktop 16:10', category: 'desktop', w: 1280, h: 800 },
  { id: 'laptop', name: 'Laptop', category: 'desktop', w: 1440, h: 900, laptop: 'generic' },
  ...LAPTOP_SCREENS,
  { id: 'fhd', name: 'Full HD', category: 'desktop', w: 1920, h: 1080 },
  { id: 'qhd', name: 'QHD', category: 'desktop', w: 2560, h: 1440 },
]

export const DEVICES = [
  ...SCREENS,
  ...HANDHELD_SCREENS,
  ...FOLDABLE_STATES,
]

export { PHONE_BREAKPOINT } from './deviceCatalog.js'
// The narrowest a page is drawn on the PC side of the toggle.
export const PC_MIN_WIDTH = 1024

// Is this device a phone-sized frame? Drives the PC/Mobile quick toggle.
export const isMobileDevice = (id) => {
  const d = DEVICES.find((x) => x.id === id)
  return !!d && d.w > 0 && d.w < PHONE_BREAKPOINT
}

// The page size "Responsive · area width" draws at, for the area the stage has
// (`frameW`/`frameH`: what a browser frame around the page takes of it).
//
// The area can be narrower than any desktop is: a small window with both rails
// open leaves about 700px. At that width the page is in its phone layout, with
// the phone overrides made in the editor applied, while the toggle says PC. A
// hamburger stood where the menu should be, and a PC style edit that a phone
// override covers looked as if it had never been made. So PC is never drawn
// narrower than a desktop: under the breakpoint the page keeps a desktop width
// and is drawn smaller to fit, exactly like the fixed desktop sizes. `height`
// then grows by the same factor, so the smaller page still fills the area.
//
// An unmeasured stage (0 wide, before the first layout) is not a narrow one.
export function responsivePcSize({ availableW, availableH, frameW = 0, frameH = 0, measured = true }) {
  const areaW = Math.round(availableW - frameW)
  const areaH = Math.round(availableH - frameH)
  if (!measured || areaW >= PHONE_BREAKPOINT) {
    return { narrow: false, width: Math.max(320, areaW), height: Math.max(420, areaH) }
  }
  const scale = Math.min(1, availableW / (PC_MIN_WIDTH + frameW))
  return {
    narrow: true,
    width: PC_MIN_WIDTH,
    height: Math.max(420, Math.round(availableH / scale) - frameH),
  }
}

// The sizes one side of that toggle offers: phones under Mobile, everything
// else (the area width, desktops, tablets) under PC. One list for both would
// put an iPhone under PC and flip the toggle the moment it was picked.
export const devicesFor = (viewport) =>
  DEVICES.filter((d) => isMobileDevice(d.id) === (viewport === 'mobile'))
