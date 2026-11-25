const LAPTOP_PROFILES = {
  nitro: {
    bezel: { side: 0.018, top: 0.024, bottom: 0.065 },
    baseInset: 0.142,
    deckRatio: 315 / 1400,
    overlap: 0.022,
  },
  macbook: {
    bezel: { side: 0.013, top: 0.016, bottom: 0.032 },
    baseInset: 0.109,
    deckRatio: 393 / 1400,
    overlap: 0.006,
  },
}

// Chassis measurements surround the selected viewport and never change its CSS size.
export function laptopFrameMetrics(profile, screenWidth) {
  const dimensions = LAPTOP_PROFILES[profile]
  if (!dimensions) return null

  const side = Math.round(screenWidth * dimensions.bezel.side)
  const top = Math.round(screenWidth * dimensions.bezel.top)
  const bottom = Math.round(screenWidth * dimensions.bezel.bottom)
  const extraWidth = 2 * Math.round(screenWidth * dimensions.baseInset)
  const deck = Math.round((screenWidth + extraWidth) * dimensions.deckRatio)
  const overlap = Math.round(screenWidth * dimensions.overlap)

  return { profile, side, top, bottom, deck, overlap, extraWidth, extraHeight: top + bottom + deck - overlap }
}
