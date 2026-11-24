import { FOLDABLE_STATES } from './deviceCatalog.js'

// Device frames for previewing HTML pages — shared by the device picker above
// the stage (DevicePicker) and the HtmlWorkspace stage (sizing math).
// `category` places a device in the picker; `name` is what its card says.
// Foldables come from deviceCatalog.js, a device per screen state.
const SCREENS = [
  { id: 'fit', name: 'Responsive', category: 'desktop', w: 0, h: 0 },
  { id: 'desktop-16-9', name: 'Desktop 16:9', category: 'desktop', w: 1280, h: 720 },
  { id: 'desktop-16-10', name: 'Desktop 16:10', category: 'desktop', w: 1280, h: 800 },
  { id: 'laptop-hd', name: 'Laptop HD', category: 'desktop', w: 1366, h: 768 },
  { id: 'laptop', name: 'Laptop', category: 'desktop', w: 1440, h: 900 },
  { id: 'macbook-air', name: 'MacBook Air 13"', category: 'desktop', w: 1470, h: 956 },
  { id: 'macbook-pro-16', name: 'MacBook Pro 16"', category: 'desktop', w: 1728, h: 1117 },
  { id: 'fhd', name: 'Full HD', category: 'desktop', w: 1920, h: 1080 },
  { id: 'qhd', name: 'QHD', category: 'desktop', w: 2560, h: 1440 },
  { id: 'ipad-mini', name: 'iPad mini', category: 'tablet', w: 744, h: 1133 },
  { id: 'ipad', name: 'iPad', category: 'tablet', w: 768, h: 1024 },
  { id: 'galaxy-tab-s9', name: 'Galaxy Tab S9', category: 'tablet', w: 800, h: 1280 },
  { id: 'ipad-air', name: 'iPad Air', category: 'tablet', w: 820, h: 1180 },
  { id: 'ipadpro', name: 'iPad Pro', category: 'tablet', w: 1024, h: 1366 },
  { id: 'iphone14', name: 'iPhone 14', category: 'phone', w: 390, h: 844 },
  { id: 'iphonese', name: 'iPhone SE (3rd gen)', category: 'phone', w: 375, h: 667 },
  { id: 'iphone15pro', name: 'iPhone 15 Pro', category: 'phone', w: 393, h: 852 },
  { id: 'iphone15max', name: 'iPhone 15 Pro Max', category: 'phone', w: 430, h: 932 },
  { id: 'iphone16pro', name: 'iPhone 16 Pro', category: 'phone', w: 402, h: 874 },
  { id: 'iphone16promax', name: 'iPhone 16 Pro Max', category: 'phone', w: 440, h: 956 },
  { id: 'galaxys24', name: 'Galaxy S24', category: 'phone', w: 360, h: 780 },
  { id: 'galaxys24ultra', name: 'Galaxy S24 Ultra', category: 'phone', w: 384, h: 824 },
  { id: 'pixel7', name: 'Pixel 7', category: 'phone', w: 412, h: 915 },
  { id: 'pixel9', name: 'Pixel 9', category: 'phone', w: 411, h: 923 },
]

export const DEVICES = [
  ...SCREENS,
  ...FOLDABLE_STATES.map((state) => ({
    id: state.id,
    name: state.name,
    category: 'foldable',
    w: state.w,
    h: state.h,
    group: state.group,
    state: state.state,
    hinge: state.hinge,
    concept: state.concept,
  })),
]

// Under this width a page is in its phone layout: the breakpoint the editor's
// own phone overrides use (max-width: 767px), and what makes a device a phone.
export const PHONE_BREAKPOINT = 768
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
