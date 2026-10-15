import { useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { register, googleLogin, upgradeGuest } from '../api/auth.js'
import { useAuthStore, useIsGuest } from '../store/authStore.js'
import { keepGuestWork } from '../utils/keepGuestWork.js'
import { apiError } from '../utils/errors.js'
import { passwordStrength } from '../utils/passwordStrength.js'
import AuthShell, { AuthWidgetFrame } from '../components/auth/AuthShell.jsx'
import GoogleSignInButton from '../components/auth/GoogleSignInButton.jsx'
import Recaptcha from '../components/auth/Recaptcha.jsx'
import GuestEntry from '../components/auth/GuestEntry.jsx'
import { usePublicConfig } from '../utils/usePublicConfig.js'
import { useLanguage } from '../i18n/useLanguage.js'
import { editorReturnPath } from '../utils/authReturn.js'

const ENV_RECAPTCHA = !!import.meta.env.VITE_RECAPTCHA_SITE_KEY

export default function RegisterPage() {
  const { t } = useLanguage()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [captcha, setCaptcha] = useState('')
  const [error, setError] = useState('')
  // Which field the server refused ("this username is taken"): marked, said
  // with the field, and where the cursor goes, so the fix is one step away.
  const [errorField, setErrorField] = useState('')
  const fieldRefs = { username: useRef(null), email: useRef(null), password: useRef(null) }
  const [loading, setLoading] = useState(false)
  // Matches the sign-in form: unchecked keeps the session in
  // sessionStorage so it ends with the tab.
  const [remember, setRemember] = useState(true)
  const navigate = useNavigate()
  const { state } = useLocation()
  const from = editorReturnPath(state?.from)
  const setAuth = useAuthStore((s) => s.setAuth)
  // Someone who came in through "continue without signing in" is not
  // registering a second time — they are putting a password on the identity
  // that already owns their sites. Same form, different endpoint.
  const upgrading = useIsGuest()
  // Field by field: a selector that builds an object is a new snapshot every
  // render, and zustand re-renders forever on it.
  const previousToken = useAuthStore((s) => s.token)
  const previousUser = useAuthStore((s) => s.user)
  const cfg = usePublicConfig()
  const recaptchaOn = !!(cfg?.recaptcha_site_key || ENV_RECAPTCHA)

  const strength = passwordStrength(password)

  async function onSubmit(e) {
    e.preventDefault()
    if (recaptchaOn && !captcha) {
      setError(t('Please confirm you are not a robot.'))
      return
    }
    setError('')
    setErrorField('')
    setLoading(true)
    try {
      const { token, user } = upgrading
        ? await upgradeGuest(username, email, password, captcha)
        : await register(username, email, password, captcha)
      setAuth(token, user, remember)
      // Upgrading keeps the same row; this only has something to do when the
      // form went the ordinary register route with a guest session open.
      const moved = await keepGuestWork({ token: previousToken, user: previousUser, nextUserId: user.id })
      navigate(from, moved ? { state: { guestWorkMoved: moved } } : undefined)
    } catch (err) {
      setError(apiError(err, t('Registration failed.')))
      const field = ['username', 'email', 'password'].find((key) => err?.response?.data?.[key])
      setErrorField(field || '')
      if (field) fieldRefs[field].current?.focus()
    } finally {
      setLoading(false)
    }
  }

  async function onGoogle(credential) {
    setError('')
    try {
      const { token, user } = await googleLogin(credential)
      setAuth(token, user, remember)
      const moved = await keepGuestWork({ token: previousToken, user: previousUser, nextUserId: user.id })
      navigate(from, moved ? { state: { guestWorkMoved: moved } } : undefined)
    } catch (err) {
      setError(apiError(err, t('Google sign-in failed.')))
    }
  }

  return (
    <AuthShell
      title={upgrading ? t('Keep what you have made') : t('Create your account')}
      description={upgrading
        ? t('Pick a name and a password. The sites you made as a guest stay yours.')
        : t('Build and publish your first site in minutes.')}
      onSubmit={onSubmit}
      footer={(
        <>
          {t('Already have an account?')}{' '}
          <Link className="font-semibold text-[var(--studio-accent-hover)] hover:underline" to="/login" state={{ from }}>
            {t('Sign in')}
          </Link>
        </>
      )}
    >
      {error && (
        <div id="register-error" role="alert" className="studio-status-danger rounded-lg border px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-[var(--studio-text-muted)]">{t('Username')}</span>
        {/* Folded as it is typed, not silently on the server: the name in the
            field is the name the account will have. */}
        <input
          ref={fieldRefs.username}
          className="ms-input"
          value={username}
          aria-invalid={errorField === 'username' || undefined}
          aria-describedby={errorField === 'username' ? 'register-error' : undefined}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          autoComplete="username"
          spellCheck="false"
          autoCapitalize="none"
          required
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-[var(--studio-text-muted)]">{t('Email')}</span>
        <input
          ref={fieldRefs.email}
          type="email"
          className="ms-input"
          value={email}
          aria-invalid={errorField === 'email' || undefined}
          aria-describedby={errorField === 'email' ? 'register-error' : undefined}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </label>

      <div className="block">
        <label htmlFor="register-password" className="mb-1.5 block text-sm font-medium text-[var(--studio-text-muted)]">{t('Password')}</label>
        <input
          ref={fieldRefs.password}
          id="register-password"
          aria-describedby={errorField === 'password' ? 'register-error register-password-hint' : 'register-password-hint'}
          aria-invalid={errorField === 'password' || undefined}
          type="password"
          className="ms-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
        {/* Strength meter is a hint; server-side validators remain authoritative. */}
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--studio-control)]">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${password ? strength.percent : 0}%`, background: strength.color }}
          />
        </div>
        {/* Outside the label: the hint and the strength describe the field,
            they are not its name. A screen reader reads them after it. */}
        <span id="register-password-hint" className="mt-1 flex flex-wrap items-center justify-between gap-1 text-xs text-[var(--studio-text-muted)]">
          <span>{t('8+ chars, mix letters, numbers & symbols.')}</span>
          {password && <span style={{ color: strength.color }}>{t(strength.label)}</span>}
        </span>
      </div>

      <label className="flex items-center gap-2 text-sm text-[var(--studio-text-muted)]">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          className="h-4 w-4 rounded accent-[var(--studio-accent)]"
        />
        {t('Remember me')}
      </label>

      {/* reCAPTCHA renders only when a runtime or build-time site key exists. */}
      <AuthWidgetFrame>
        <Recaptcha onChange={setCaptcha} />
      </AuthWidgetFrame>

      <button type="submit" disabled={loading} className="ms-btn ms-btn-primary w-full py-2.5">
        {loading
          ? t('Creating…')
          : upgrading ? t('Create my account') : t('Create account')}
      </button>

      {/* Google sign-in renders only when a client id exists. */}
      {!upgrading && (
        <AuthWidgetFrame>
          <GoogleSignInButton onCredential={onGoogle} onError={setError} />
        </AuthWidgetFrame>
      )}
      {!upgrading && <GuestEntry onError={setError} />}
    </AuthShell>
  )
}
