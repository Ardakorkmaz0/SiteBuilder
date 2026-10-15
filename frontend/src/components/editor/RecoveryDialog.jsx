import { useLanguage } from '../../i18n/useLanguage.js'
import { useInitialDialogFocus } from '../../ui/useInitialDialogFocus.js'

export default function RecoveryDialog({ open, onRestore, onDiscard }) {
  const { t } = useLanguage()
  const ref = useInitialDialogFocus(open)
  if (!open) return null
  return (
    <div className="studio-theme-surface studio-overlay fixed inset-0 z-[170] grid place-items-center p-4">
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="recovery-title"
        aria-describedby="recovery-description"
        onKeyDown={(event) => {
          // There are exactly two controls; keep keyboard focus in the dialog.
          if (event.key !== 'Tab') return
          const buttons = ref.current.querySelectorAll('button')
          const first = buttons[0]
          const last = buttons[buttons.length - 1]
          if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
            event.preventDefault(); last.focus()
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault(); first.focus()
          }
        }}
        className="w-full max-w-md rounded-2xl border border-[var(--studio-border)] bg-[var(--studio-panel-raised)] p-5 shadow-2xl outline-none">
        <h2 id="recovery-title" className="text-base font-bold text-[var(--studio-text)]">{t('Recover your unsaved work?')}</h2>
        <p id="recovery-description" className="mt-2 text-sm leading-relaxed text-[var(--studio-text-muted)]">
          {t('Your session ended while this site had unsaved changes. Restore the local draft, or keep the version from the server.')}
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onDiscard} className="ms-btn ms-btn-secondary">{t('Keep server version')}</button>
          <button type="button" onClick={onRestore} className="ms-btn ms-btn-primary">{t('Restore local draft')}</button>
        </div>
      </div>
    </div>
  )
}
