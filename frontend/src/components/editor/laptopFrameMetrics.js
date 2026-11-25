// The body and keyboard take additional stage space, outside the CSS viewport.
export function laptopFrameMetrics(profile, screenWidth) {
  if (!profile) return null

  const bezel = Math.round(screenWidth * (profile === 'nitro' ? 0.016 : 0.012))
  const inset = bezel + Math.round(screenWidth * 0.027)
  const deck = Math.round(screenWidth * (profile === 'nitro' ? 0.185 : 0.155))
  return { profile, bezel, inset, deck, extraWidth: inset * 2, extraHeight: bezel * 2 + deck }
}
