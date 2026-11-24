// The screens a page can be designed and previewed on, grouped the way the
// device picker shows them. Sizes are CSS pixels (what a page's media queries
// see): the panel's resolution divided by the device pixel ratio.
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

export const FOLDABLES = [
  {
    group: 'galaxy-zfold6',
    name: 'Galaxy Z Fold6',
    states: [
      { id: 'zfold6-cover', state: 'cover', w: 369, h: 905 },
      { id: 'zfold6-inner', state: 'inner', w: 707, h: 823, hinge: HINGE_VERTICAL },
    ],
  },
  {
    group: 'galaxy-zflip6',
    name: 'Galaxy Z Flip6',
    states: [
      { id: 'zflip6-cover', state: 'cover', w: 320, h: 332 },
      { id: 'zflip6-inner', state: 'inner', w: 411, h: 1006, hinge: HINGE_HORIZONTAL },
    ],
  },
  {
    group: 'pixel9-pro-fold',
    name: 'Pixel 9 Pro Fold',
    states: [
      { id: 'pixel9fold-cover', state: 'cover', w: 410, h: 923 },
      { id: 'pixel9fold-inner', state: 'inner', w: 791, h: 820, hinge: HINGE_VERTICAL },
    ],
  },
  {
    group: 'huawei-mate-x6',
    name: 'Huawei Mate X6',
    states: [
      { id: 'matex6-cover', state: 'cover', w: 360, h: 813 },
      { id: 'matex6-inner', state: 'inner', w: 747, h: 813, hinge: HINGE_VERTICAL },
    ],
  },
  {
    // A tri-fold: one, two or all three panels open.
    group: 'huawei-mate-xt',
    name: 'Huawei Mate XT',
    states: [
      { id: 'matext-single', state: 'single', w: 336, h: 744 },
      { id: 'matext-double', state: 'double', w: 683, h: 744, hinge: HINGE_VERTICAL },
      { id: 'matext-full', state: 'full', w: 1061, h: 744, hinge: HINGE_THIRDS },
    ],
  },
  {
    // Not on sale: the sizes follow what has been reported about Apple's
    // foldable, and the picker says it is a concept.
    group: 'iphone-fold',
    name: 'iPhone Fold',
    concept: true,
    states: [
      { id: 'iphonefold-cover', state: 'cover', w: 474, h: 696 },
      { id: 'iphonefold-inner', state: 'inner', w: 640, h: 904, hinge: HINGE_VERTICAL },
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

// Every foldable state as a flat device: { id, w, h, name, state, group, hinge, concept }.
export const FOLDABLE_STATES = FOLDABLES.flatMap((device) => device.states.map((state) => ({
  ...state,
  name: device.name,
  group: device.group,
  concept: !!device.concept,
  hinge: state.hinge || HINGE_NONE,
})))

// The state of a foldable that has this screen size, if one has: the canvas
// presets are remembered as a width and a height, not an id.
export function foldableStateOfSize(w, h) {
  return FOLDABLE_STATES.find((state) => state.w === Math.round(Number(w)) && state.h === Math.round(Number(h))) || null
}
