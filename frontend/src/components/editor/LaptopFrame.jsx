import './LaptopFrame.css'

const KEY_ROWS = [
  ['esc', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'],
  ['~', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'delete'],
  ['tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\'],
  ['caps', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", 'enter'],
  ['shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'shift'],
  ['ctrl', 'alt', 'cmd', 'space', 'cmd', 'alt', '←', '↑', '↓', '→'],
]

const WIDE_KEYS = { space: 6, shift: 2, enter: 2, delete: 1.8, tab: 1.5, caps: 1.7 }
const NUMPAD = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.', '↵']

export default function LaptopFrame({ metrics, screenWidth, screenHeight, children }) {
  const { profile, bezel, inset, deck, extraWidth, extraHeight } = metrics
  return (
    <div
      data-builder-laptop-frame={profile}
      className="laptop-frame"
      style={{
        width: screenWidth + extraWidth,
        height: screenHeight + extraHeight,
        '--laptop-bezel': `${bezel}px`,
        '--laptop-depth': `${deck}px`,
        '--laptop-perspective': `${Math.round(screenWidth * 0.7)}px`,
      }}
    >
      <div className="laptop-lid" style={{ marginInline: inset - bezel }}>
        <div
          data-builder-laptop-screen
          className="laptop-display"
          style={{ width: screenWidth, height: screenHeight }}
        >
          {children}
        </div>
        <span aria-hidden="true" className="laptop-webcam" />
      </div>
      <div aria-hidden="true" className="laptop-deck">
        <div className="laptop-hinge" />
        <div className="laptop-keyboard" data-builder-laptop-keyboard>
          <div className="laptop-keyboard-main">
            {KEY_ROWS.map((row, rowIndex) => (
              <div className="laptop-key-row" key={row[0]}>
                {row.map((key, index) => (
                  <span
                    key={`${key}-${index}`}
                    className="laptop-key"
                    data-gaming-key={profile === 'nitro' && 'WASD'.includes(key) ? '' : undefined}
                    style={{ flex: WIDE_KEYS[key] || 1 }}
                  >
                    {key === 'space' ? '' : profile === 'nitro' && rowIndex === 5 && key === 'cmd' ? 'win' : key}
                  </span>
                ))}
              </div>
            ))}
          </div>
          {profile === 'nitro' && (
            <div className="laptop-numpad">
              {NUMPAD.map((key) => <span className="laptop-key" key={key}>{key}</span>)}
            </div>
          )}
        </div>
        <div className="laptop-trackpad" />
      </div>
    </div>
  )
}
