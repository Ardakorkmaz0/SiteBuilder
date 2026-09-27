// The part of a canvas that goes full screen: the page in its PC or phone
// frame, without the toolbars above it or the rails beside it.
//
// The same element is pinned over the window with CSS while full screen is on.
// When the browser grants real full screen that changes nothing (a full-screen
// element is already fixed to the screen); when it refuses, the page still
// covers the editor instead of leaving it half on screen.

import { forwardRef } from 'react'
import { useLanguage } from '../../i18n/useLanguage.js'
import { MinimizeIcon } from '../icons.jsx'

function FullscreenStage({ active = false, onExit, children }, ref) {
  const { t } = useLanguage()
  return (
    <div
      ref={ref}
      data-fullscreen-stage={active ? 'on' : undefined}
      className={active
        ? 'fixed inset-0 z-[200] flex min-h-0 min-w-0 flex-col bg-[var(--studio-shell)]'
        : 'relative flex min-h-0 min-w-0 flex-1 flex-col'}
    >
      {children}
      {active && (
        // Inside the full-screen element, or it would not be on screen at all.
        // Esc works too; a phone has no Esc key.
        <button
          type="button"
          onClick={onExit}
          title={t('Leave full screen (Esc)')}
          aria-label={t('Leave full screen (Esc)')}
          className="absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full bg-black/55 text-white opacity-70 transition-opacity hover:opacity-100 focus-visible:opacity-100"
        >
          <MinimizeIcon size={18} />
        </button>
      )}
    </div>
  )
}

export default forwardRef(FullscreenStage)
