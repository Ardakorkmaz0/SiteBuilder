import { useLanguage } from '../../i18n/useLanguage.js'

export default function MobileOverrideBanner({ count = 0, onReset, message }) {
  const { t } = useLanguage()
  return (
    <div className="rounded-xl border border-[color-mix(in_srgb,var(--studio-accent)_22%,var(--studio-border))] bg-[var(--studio-accent-soft)] px-3 py-2">
      <p className="text-[11px] leading-relaxed text-[var(--studio-accent-text)]">
        {message || t('Style edits here apply to MOBILE only. Clear a field to fall back to the PC value.')}
      </p>
      {count > 0 && onReset && (
        <button
          type="button"
          onClick={onReset}
          className="studio-btn studio-btn-secondary mt-1.5 px-2 py-1 text-[11px]"
        >
          {t('Reset mobile styles')} ({count})
        </button>
      )}
    </div>
  )
}
