import { useLanguage } from '../../i18n/useLanguage.js'
import { useEscapeToClose } from '../../ui/useEscapeToClose.js'
import { useInitialDialogFocus } from '../../ui/useInitialDialogFocus.js'

// Leaving the editor with unsaved work: save and leave, leave without saving,
// or stay. It takes the keyboard like the editor's other dialogs. Focus used
// to stay on the Back button behind it, so Tab walked the page underneath and
// Esc did nothing. Esc is Stay: the one answer that loses nothing.
export default function UnsavedLeaveDialog({ open, saving, onSave, onDiscard, onStay }) {
  const { t } = useLanguage()
  // Not while a save is on its way out: Stay is disabled then as well.
  useEscapeToClose(open && !saving, onStay)
  const ref = useInitialDialogFocus(open)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[160] grid place-items-center bg-black/40 p-4" role="presentation">
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="unsaved-leave-title"
        onKeyDown={(event) => {
          // Three choices and nothing else: keep the keyboard on them.
          if (event.key !== 'Tab') return
          const buttons = [...ref.current.querySelectorAll('button:not(:disabled)')]
          if (!buttons.length) { event.preventDefault(); return }
          const first = buttons[0]
          const last = buttons[buttons.length - 1]
          if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
            event.preventDefault(); last.focus()
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault(); first.focus()
          }
        }}
        className="w-full max-w-md rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-2xl outline-none"
      >
        <h2 id="unsaved-leave-title" className="text-base font-bold text-[#111827]">
          {t('Save before leaving?')}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#6b7280]">
          {t('You have unsaved changes. Save them manually before leaving this editor.')}
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onStay}
            disabled={saving}
            className="rounded-lg border border-[#d1d5db] px-3 py-2 text-sm font-medium text-[#374151] hover:bg-[#f3f4f6] disabled:opacity-50"
          >
            {t('Stay')}
          </button>
          <button
            type="button"
            onClick={onDiscard}
            disabled={saving}
            className="rounded-lg px-3 py-2 text-sm font-medium text-[#b91c1c] hover:bg-red-50 disabled:opacity-50"
          >
            {t('Leave without saving')}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-lg bg-[#4f46e5] px-3 py-2 text-sm font-semibold text-white hover:bg-[#4338ca] disabled:opacity-50"
          >
            {saving ? t('Saving…') : t('Save and leave')}
          </button>
        </div>
      </div>
    </div>
  )
}
