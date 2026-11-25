import macbookDeck from './laptopArt/macbook.webp'
import nitroDeck from './laptopArt/nitro.webp'
import './LaptopFrame.css'

const DECK_IMAGE = { macbook: macbookDeck, nitro: nitroDeck }

export default function LaptopFrame({ metrics, screenWidth, screenHeight, children }) {
  const { profile, side, top, bottom, deck, overlap, extraWidth, extraHeight } = metrics
  return (
    <div
      data-builder-laptop-frame={profile}
      className="laptop-frame"
      style={{ width: screenWidth + extraWidth, height: screenHeight + extraHeight }}
    >
      <div
        className="laptop-lid"
        style={{
          marginInline: extraWidth / 2 - side,
          padding: `${top}px ${side}px ${bottom}px`,
          '--laptop-top-bezel': `${top}px`,
        }}
      >
        <div
          data-builder-laptop-screen
          className="laptop-display"
          style={{ width: screenWidth, height: screenHeight }}
        >
          {children}
        </div>
        <span aria-hidden="true" className="laptop-webcam" />
      </div>
      <img
        alt=""
        className="laptop-deck"
        data-builder-laptop-keyboard
        draggable={false}
        src={DECK_IMAGE[profile]}
        width={screenWidth + extraWidth}
        height={deck}
        style={{ marginTop: -overlap, height: deck }}
      />
    </div>
  )
}
