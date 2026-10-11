// Device frames for previewing HTML pages — shared by the editor header
// (selector lives there) and the HtmlWorkspace stage (sizing math).
export const DEVICES = [
  { id: 'fit', label: 'Responsive · area width', w: 0, h: 0 },
  { id: 'desktop-16-9', label: 'Desktop 16:9 · 1280×720', w: 1280, h: 720 },
  { id: 'desktop-16-10', label: 'Desktop 16:10 · 1280×800', w: 1280, h: 800 },
  { id: 'laptop', label: 'Laptop · 1440×900', w: 1440, h: 900 },
  { id: 'fhd', label: 'Full HD · 1920×1080', w: 1920, h: 1080 },
  { id: 'ipad', label: 'iPad · 768×1024', w: 768, h: 1024 },
  { id: 'ipadpro', label: 'iPad Pro · 1024×1366', w: 1024, h: 1366 },
  { id: 'iphone14', label: 'iPhone 14 · 390×844', w: 390, h: 844 },
  { id: 'iphonese', label: 'iPhone SE (3rd gen) · 375×667', w: 375, h: 667 },
  { id: 'iphone15pro', label: 'iPhone 15 Pro · 393×852', w: 393, h: 852 },
  { id: 'iphone15max', label: 'iPhone 15 Pro Max · 430×932', w: 430, h: 932 },
  { id: 'galaxys24', label: 'Galaxy S24 · 360×780', w: 360, h: 780 },
  { id: 'galaxys24ultra', label: 'Galaxy S24 Ultra · 384×824', w: 384, h: 824 },
  { id: 'pixel7', label: 'Pixel 7 · 412×915', w: 412, h: 915 },
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
