import { Link } from 'react-router-dom'
import { getAdminSystem } from '../../api/admin.js'
import { useAuthStore } from '../../store/authStore.js'
import { useLanguage } from '../../i18n/useLanguage.js'
import { Chip, ErrorBox, Facts, Loading, SectionHeading } from './adminUi.jsx'
import { formatBytes, formatDate, formatNumber, useAdminData } from './adminData.js'

const RECORD_LABELS = [
  ['users', 'Accounts'], ['sites', 'Sites'], ['published_pages', 'Published pages'], ['versions', 'Saved versions'],
  ['visits', 'Recorded visits'], ['favorites', 'Favorites'], ['uploads', 'Uploaded images'],
  ['form_submissions', 'Form submissions'], ['review_comments', 'Review comments'],
  ['shared_components', 'Shared blocks'], ['site_reports', 'Site reports'],
  ['component_reports', 'Block reports'], ['audit_entries', 'Activity log entries'],
]

function Health({ ok, good, bad }) {
  return ok ? <Chip tone="success">{good}</Chip> : <Chip tone="danger">{bad}</Chip>
}

export default function AdminSystem() {
  const { t, language } = useLanguage()
  const isSuperuser = useAuthStore((s) => s.user?.is_superuser)
  const { data, error, loading, reload } = useAdminData(getAdminSystem, 'system')

  const header = (
    <SectionHeading title={t('System')} description={t('How the server is doing and which features are switched on. Keys and passwords are never shown here.')}>
      <button type="button" onClick={reload} className="studio-btn studio-btn-secondary">{t('Check again')}</button>
      {isSuperuser && <Link to="/admin/settings" className="studio-btn studio-btn-primary">{t('Server settings')}</Link>}
    </SectionHeading>
  )
  if (loading) return <>{header}<Loading /></>
  if (error) return <>{header}<ErrorBox message={error} onRetry={reload} /></>

  const on = (flag) => (flag ? <Chip tone="success">{t('On')}</Chip> : <Chip>{t('Off')}</Chip>)

  return (
    <>
      {header}
      {data.debug && (
        <p role="alert" className="studio-status-danger mb-6 rounded-[var(--studio-radius-lg)] border px-4 py-3 text-sm">
          {t('Debug mode is on. Error pages show internals to visitors; turn it off in production.')}
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="dashboard-section-card p-5">
          <h3 className="mb-4 font-semibold text-[var(--studio-text)]">{t('Health')}</h3>
          <Facts items={[
            [t('Database'), <span key="db" className="inline-flex items-center gap-2">{data.database.engine} <Health ok={data.database.ok} good={t('Answering')} bad={t('Not answering')} /></span>],
            [t('Cache'), <span key="cache" className="inline-flex items-center gap-2">{data.cache.backend} <Health ok={data.cache.ok} good={t('Working')} bad={t('Not working')} /></span>],
            [t('Cache shared across workers'), data.cache.shared ? t('Yes') : t('No, each worker counts on its own')],
            [t('Server time'), formatDate(data.server_time, language, { time: true })],
            [t('Time zone'), data.timezone],
          ]} />
        </section>
        <section className="dashboard-section-card p-5">
          <h3 className="mb-4 font-semibold text-[var(--studio-text)]">{t('Features')}</h3>
          <Facts items={[
            [t('Email (password reset)'), on(data.features.email)],
            [t('Google sign-in'), on(data.features.google_sign_in)],
            [t('reCAPTCHA'), on(data.features.recaptcha)],
            [t('App address'), data.frontend_url || t('Not set')],
          ]} />
        </section>
        <section className="dashboard-section-card p-5">
          <h3 className="mb-4 font-semibold text-[var(--studio-text)]">{t('Versions')}</h3>
          <Facts items={[
            ['Python', data.versions.python],
            ['Django', data.versions.django],
            ['Django REST framework', data.versions.rest_framework],
            [t('Latest migration'), data.latest_migration ? `${data.latest_migration.name} (${formatDate(data.latest_migration.applied, language)})` : t('None')],
          ]} />
        </section>
        <section className="dashboard-section-card p-5">
          <h3 className="mb-4 font-semibold text-[var(--studio-text)]">{t('Stored records')}</h3>
          <Facts items={[
            ...RECORD_LABELS.map(([key, label]) => [t(label), formatNumber(data.records[key], language)]),
            [t('Space used by uploads'), formatBytes(data.storage.bytes, language)],
          ]} />
        </section>
      </div>
    </>
  )
}
