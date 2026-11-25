// The screens a page can be designed and previewed on, grouped the way the
// device picker shows them. Sizes are CSS pixels (what a page's media queries
// see): full logical screen size before browser chrome.
//
// Foldables have a screen per state. Each state is a device of its own (its
// own id, so the choice is remembered like any other), and `group` ties them
// into one card in the picker, with a switch between the states. A state
// narrower than PHONE_BREAKPOINT gets the phone layout; a wider one, the
// desktop layout, exactly as the device would.
//
// The foldable sizes are worked out from the makers' published resolutions at
// the usual Android ratios (2.625, 3.0) and are approximate: browser chrome and
// display scaling move them a little on a real device.

// The picker's sections, in order: [id, label, icon].
export const DEVICE_CATEGORIES = [
  ['desktop', 'Desktop', 'monitor'],
  ['tablet', 'Tablet', 'tablet'],
  ['phone', 'Phone', 'smartphone'],
  ['foldable', 'Foldable', 'foldable'],
]

// Where a hinge is drawn on the screen mockup.
export const HINGE_NONE = null
export const HINGE_VERTICAL = 'vertical'
export const HINGE_HORIZONTAL = 'horizontal'
export const HINGE_THIRDS = 'thirds'

// The editor uses the mobile layout below 768px, including for some tablets
// and foldable screens. Hardware category and layout are separate.
export const PHONE_BREAKPOINT = 768

export const LAPTOP_SCREENS = [
  { id: 'laptop-hd', name: 'Laptop HD', category: 'desktop', w: 1366, h: 768, laptop: 'generic' },
  { id: 'macbook-air', name: 'MacBook Air 13"', category: 'desktop', w: 1470, h: 956, laptop: 'macbook' },
  { id: 'macbook-pro-16', name: 'MacBook Pro 16"', category: 'desktop', w: 1728, h: 1117, laptop: 'macbook' },
  // Acer AN16-41 WQXGA panel at 100% display scaling.
  { id: 'acer-nitro-16', name: 'Acer Nitro 16', category: 'desktop', w: 2560, h: 1600, laptop: 'nitro' },
]

export const HANDHELD_SCREENS = [
  { id: 'ipad-mini', name: 'iPad mini', category: 'tablet', w: 744, h: 1133 },
  { id: 'ipad', name: 'iPad', category: 'tablet', w: 768, h: 1024 },
  { id: 'galaxy-tab-s9', name: 'Galaxy Tab S9', category: 'tablet', w: 800, h: 1280 },
  { id: 'ipad-air', name: 'iPad Air', category: 'tablet', w: 820, h: 1180 },
  { id: 'ipadpro', name: 'iPad Pro', category: 'tablet', w: 1024, h: 1366 },
  { id: 'ipad-a16', name: 'iPad (A16)', category: 'tablet', w: 820, h: 1180 },
  // Apple logical screen points. Keep the established phones first when two
  // presets share dimensions so old canvas pages retain their existing choice.
  { id: 'iphone14', name: 'iPhone 14', category: 'phone', w: 390, h: 844, model: 'iphone-notch' },
  { id: 'iphonese', name: 'iPhone SE (3rd gen)', category: 'phone', w: 375, h: 667, model: 'iphone-classic' },
  { id: 'iphone15pro', name: 'iPhone 15 Pro', category: 'phone', w: 393, h: 852, model: 'iphone-island' },
  { id: 'iphone15max', name: 'iPhone 15 Pro Max', category: 'phone', w: 430, h: 932, model: 'iphone-island' },
  { id: 'iphone16pro', name: 'iPhone 16 Pro', category: 'phone', w: 402, h: 874, model: 'iphone-island' },
  { id: 'iphone16promax', name: 'iPhone 16 Pro Max', category: 'phone', w: 440, h: 956, model: 'iphone-island' },
  { id: 'iphone13', name: 'iPhone 13', category: 'phone', w: 390, h: 844, model: 'iphone-notch' },
  { id: 'iphone15', name: 'iPhone 15', category: 'phone', w: 393, h: 852, model: 'iphone-island' },
  { id: 'iphone16', name: 'iPhone 16', category: 'phone', w: 393, h: 852, model: 'iphone-island' },
  { id: 'iphone17', name: 'iPhone 17', category: 'phone', w: 402, h: 874, model: 'iphone-island' },
  { id: 'iphone17pro', name: 'iPhone 17 Pro', category: 'phone', w: 402, h: 874, model: 'iphone-island' },
  { id: 'iphone17promax', name: 'iPhone 17 Pro Max', category: 'phone', w: 440, h: 956, model: 'iphone-island' },
  { id: 'iphone17e', name: 'iPhone 17e', category: 'phone', w: 390, h: 844, model: 'iphone-notch' },
  { id: 'iphone18pro', name: 'iPhone 18 Pro', category: 'phone', w: 402, h: 874, model: 'iphone-island', compactIsland: true },
  { id: 'iphone18promax', name: 'iPhone 18 Pro Max', category: 'phone', w: 440, h: 956, model: 'iphone-island', compactIsland: true },
  // Samsung panel specs and measured logical sizes. The A07 uses its 720p
  // panel at a 2× preview scale; the other A-series presets use 384×832.
  { id: 'galaxys24', name: 'Galaxy S24', category: 'phone', w: 360, h: 780, model: 'galaxy-s24' },
  { id: 'galaxys24ultra', name: 'Galaxy S24 Ultra', category: 'phone', w: 384, h: 832, model: 'galaxy-s24-ultra' },
  { id: 'galaxys25', name: 'Galaxy S25', category: 'phone', w: 360, h: 780, model: 'galaxy-s24' },
  { id: 'galaxys25ultra', name: 'Galaxy S25 Ultra', category: 'phone', w: 384, h: 832, model: 'galaxy-ultra-rounded' },
  { id: 'galaxys26', name: 'Galaxy S26', category: 'phone', w: 360, h: 780, model: 'galaxy-s24' },
  { id: 'galaxys26ultra', name: 'Galaxy S26 Ultra', category: 'phone', w: 412, h: 891, model: 'galaxy-ultra-rounded' },
  { id: 'galaxya07', name: 'Galaxy A07', category: 'phone', w: 360, h: 800, model: 'galaxy-a-drop' },
  { id: 'galaxya16', name: 'Galaxy A16 5G', category: 'phone', w: 384, h: 832, model: 'galaxy-a-drop' },
  { id: 'galaxya17', name: 'Galaxy A17 5G', category: 'phone', w: 384, h: 832, model: 'galaxy-a-drop' },
  { id: 'galaxya26', name: 'Galaxy A26 5G', category: 'phone', w: 384, h: 832, model: 'galaxy-a-drop' },
  { id: 'galaxya37', name: 'Galaxy A37 5G', category: 'phone', w: 384, h: 832, model: 'galaxy-s24' },
  { id: 'galaxya56', name: 'Galaxy A56 5G', category: 'phone', w: 384, h: 832, model: 'galaxy-s24' },
  { id: 'galaxya57', name: 'Galaxy A57 5G', category: 'phone', w: 384, h: 832, model: 'galaxy-s24' },
  // Google Pixel hardware specs, rounded to the nearest px at 2.625×.
  { id: 'pixel9', name: 'Pixel 9', category: 'phone', w: 411, h: 923, model: 'pixel-9' },
  { id: 'pixel7', name: 'Pixel 7', category: 'phone', w: 411, h: 914, model: 'pixel-7' },
  { id: 'pixel11', name: 'Pixel 11', category: 'phone', w: 411, h: 923, model: 'pixel-9' },
  // Huawei and Xiaomi panel specs. These are preview scales where no
  // measured browser viewport is available (3× Huawei, 2.75× Redmi Note,
  // 2× Redmi A5, and 3× Xiaomi 17).
  { id: 'huawei-nova14', name: 'Huawei nova 14', category: 'phone', w: 361, h: 804, model: 'android-punch' },
  { id: 'huawei-pura80', name: 'Huawei Pura 80', category: 'phone', w: 419, h: 920, model: 'android-punch' },
  { id: 'huawei-nova15', name: 'Huawei nova 15', category: 'phone', w: 361, h: 804, model: 'android-punch' },
  { id: 'huawei-pura90', name: 'Huawei Pura 90', category: 'phone', w: 440, h: 952, model: 'android-punch' },
  { id: 'redmi-a5', name: 'Redmi A5', category: 'phone', w: 360, h: 820, model: 'galaxy-a-drop' },
  { id: 'redmi-note14', name: 'Redmi Note 14', category: 'phone', w: 393, h: 873, model: 'android-punch' },
  { id: 'redmi-note15', name: 'Redmi Note 15 5G', category: 'phone', w: 393, h: 870, model: 'android-punch' },
  { id: 'xiaomi17', name: 'Xiaomi 17', category: 'phone', w: 407, h: 885, model: 'android-punch' },
]

export const FOLDABLES = [
  {
    // Samsung Mobile Press panel sizes, rounded at 2.625×.
    group: 'galaxy-zfold6',
    name: 'Galaxy Z Fold6',
    states: [
      { id: 'zfold6-cover', state: 'cover', w: 369, h: 905 },
      { id: 'zfold6-inner', state: 'inner', w: 707, h: 823, hinge: HINGE_VERTICAL, camera: 'under-display' },
    ],
  },
  {
    // Samsung panel sizes, at 2.25× (cover) and 2.625× (inner).
    group: 'galaxy-zflip6',
    name: 'Galaxy Z Flip6',
    states: [
      { id: 'zflip6-cover', state: 'cover', w: 320, h: 332, camera: 'rear-cameras' },
      { id: 'zflip6-inner', state: 'inner', w: 411, h: 1006, hinge: HINGE_HORIZONTAL },
    ],
  },
  {
    // Google Pixel hardware specs, rounded at 2.625×.
    group: 'pixel9-pro-fold',
    name: 'Pixel 9 Pro Fold',
    states: [
      { id: 'pixel9fold-cover', state: 'cover', w: 411, h: 923 },
      { id: 'pixel9fold-inner', state: 'inner', w: 791, h: 820, hinge: HINGE_VERTICAL, cameraX: '96%', cameraTop: 14 },
    ],
  },
  {
    // Huawei panel sizes, rounded at 3×.
    group: 'huawei-mate-x6',
    name: 'Huawei Mate X6',
    states: [
      { id: 'matex6-cover', state: 'cover', w: 360, h: 813 },
      { id: 'matex6-inner', state: 'inner', w: 747, h: 813, hinge: HINGE_VERTICAL, cameraX: '96%', cameraTop: 14 },
    ],
  },
  {
    // Huawei panel sizes at 3×: one, two or all three panels open.
    group: 'huawei-mate-xt',
    name: 'Huawei Mate XT',
    states: [
      { id: 'matext-single', state: 'single', w: 336, h: 744 },
      { id: 'matext-double', state: 'double', w: 683, h: 744, hinge: HINGE_VERTICAL, cameraX: '25%' },
      { id: 'matext-full', state: 'full', w: 1061, h: 744, hinge: HINGE_THIRDS, cameraX: '16%' },
    ],
  },
  {
    // Keep saved IDs. Apple panel sizes, with the full screen measured in
    // iOS points; Safari 27.1 reserves part of the closed display for chrome.
    group: 'iphone-fold',
    name: 'iPhone Duo',
    states: [
      { id: 'iphonefold-cover', state: 'cover', w: 466, h: 678, camera: 'island', cameraPlacement: 'top-right' },
      { id: 'iphonefold-inner', state: 'inner', w: 951, h: 669, hinge: HINGE_VERTICAL, camera: 'under-display' },
    ],
  },
]

// What each state is called in the picker.
export const FOLD_STATE_LABELS = {
  cover: 'Outer screen',
  inner: 'Inner screen',
  single: 'One panel',
  double: 'Two panels',
  full: 'Fully open',
}

// The order a foldable's screens are offered in: closed first, then opening.
export const FOLD_STATE_ORDER = Object.keys(FOLD_STATE_LABELS)

// A foldable's place in FOLDABLES, so its card keeps that place however the
// states are split between the PC and Mobile lists. -1 for anything else.
export const foldableOrder = (group) => FOLDABLES.findIndex((device) => device.group === group)

// Every foldable state is a device in the same catalog as phones and tablets.
export const FOLDABLE_STATES = FOLDABLES.flatMap((device) => device.states.map((state) => ({
  ...state,
  category: 'foldable',
  name: device.name,
  group: device.group,
  hinge: state.hinge || HINGE_NONE,
})))
