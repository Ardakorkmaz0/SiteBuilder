import { useLanguage } from '../../i18n/useLanguage.js'
import { useInitialDialogFocus } from '../../ui/useInitialDialogFocus.js'

// Another tab or device saved this site after it was opened here. Saving now
// would replace that work; opening the saved version would drop this tab's.
// Either can be right, so the person decides — nothing is written until then.
export default function SiteConflictDialog({ open, onReload, onOverwrite }) {
  const { t } = useLanguage()
  const ref = useInitialDialogFocus(open)
  if (!open) return null
  return (
    <div className="studio-theme-surface studio-overlay fixed inset-0 z-[170] grid place-items-center p-4">
      <div ref={ref} tabIndex={-1} role="alertdialog" aria-modal="true" aria-labelledby="site-conflict-title"
        aria-describedby="site-conflict-description"
        onKeyDown={(event) => {
          // Two choices and nothing else: keep the keyboard on them.
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
        <h2 id="site-conflict-title" className="text-base font-bold text-[var(--studio-text)]">{t('This site changed somewhere else')}</h2>
        <p id="site-conflict-description" className="mt-2 text-sm leading-relaxed text-[var(--studio-text-muted)]">
          {t('It was saved in another tab or on another device after you opened it here. Saving yours replaces that version; opening the saved one discards the changes made here.')}
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onReload} className="ms-btn ms-btn-secondary">{t('Open the saved version')}</button>
          <button type="button" onClick={onOverwrite} className="ms-btn ms-btn-primary">{t('Save mine anyway')}</button>
        </div>
      </div>
    </div>
  )
}
