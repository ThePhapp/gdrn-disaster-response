import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { landingPath } from '../app/feature-routes'
import { ApiError } from '../shared/api'
import { ErrorMessage, Field, PageHeader } from '../shared/components'
import { useI18n } from '../shared/i18n'
import { login } from './login'
import { useSession } from './session'

export function LoginPage() {
  const { user } = useSession()
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  if (user) {
    const destination = landingPath(user.role)
    if (destination !== '/login') return <Navigate to={destination} replace />
    return <section className="card account-card"><PageHeader eyebrow={t('login.signedIn')} title={t('login.signedInTitle')} />
      <dl className="account-facts"><div><dt>{t('login.email')}</dt><dd>{user.email}</dd></div><div><dt>{t('login.role')}</dt><dd>{user.role === 'CITIZEN' ? t('app.citizen') : t('app.authority')}</dd></div></dl>
      <p className="muted">{t('login.reloadRequiresLoginConfirmed')}</p></section>
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setError('')
    const fields: Record<string, string> = {}
    const normalized = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || [...normalized].length > 254) fields.email = t('login.emailError')
    if (!password || [...password].length > 128 || new TextEncoder().encode(password).length > 72) fields.password = t('login.passwordError')
    setFieldErrors(fields)
    if (Object.keys(fields).length) {
      document.getElementById(fields.email ? 'email' : 'password')?.focus()
      return
    }
    setBusy(true)
    try {
      await login(email, password)
      setPassword('')
    } catch (failure) {
      setPassword('')
      setError(failure instanceof ApiError && failure.problem?.code === 'INVALID_CREDENTIALS'
        ? t('login.invalidCredentials') : failure instanceof ApiError ? failure.message : t('login.connectionError'))
    } finally { setBusy(false) }
  }
  return <div className="login-screen">
    <section className="login-hero" aria-labelledby="login-hero-title">
      <div className="login-topography" aria-hidden="true" />
      <div className="login-hero__content"><p className="eyebrow">{t('login.heroEyebrow')}</p>
        <h2 id="login-hero-title">{t('login.heroTitle').split('\n').map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}<span className="hero-period">.</span></h2>
        <p className="login-hero__description">{t('login.heroDescription')}</p>
      </div>
      <div className="login-hero__signature"><span aria-hidden="true" className="hero-rule" /><span>{t('login.signature')}</span><span>{t('login.signatureNote')}</span></div>
    </section>
    <section className="login-card" aria-label={t('login.formLabel')}>
    <PageHeader eyebrow={t('login.welcome')} title={t('login.title')} description={t('login.description')} />
    <form onSubmit={submit} noValidate aria-busy={busy}>
      <Field id="email" label={t('login.email')} type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} error={fieldErrors.email} required disabled={busy} />
      <Field id="password" label={t('login.password')} type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} error={fieldErrors.password} required disabled={busy} />
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <button className="login-submit" type="submit" disabled={busy}>{busy ? t('login.signingIn') : t('login.signIn')}<span aria-hidden="true">{busy ? '…' : '→'}</span></button>
      <span className="sr-only" role="status">{busy ? t('login.authenticating') : ''}</span>
    </form><p className="session-note">{t('login.reloadRequiresLoginNote').split('\n').map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</p>
    </section>
  </div>
}
