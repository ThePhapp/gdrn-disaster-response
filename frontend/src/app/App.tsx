import type { ReactNode } from 'react'
import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '../auth/LoginPage'
import { session, useSession, type Role } from '../auth/session'
import { EmptyState, ErrorMessage } from '../shared/components'
import { LanguageSwitcher, useI18n } from '../shared/i18n'
import { featureRoutes, landingPath } from './feature-routes'

export function RoleGuard({ roles, children }: { roles: readonly Role[]; children: ReactNode }) {
  const { user } = useSession()
  const { t } = useI18n()
  if (!user) return <Navigate to="/login" replace />
  return roles.includes(user.role) ? children : <ErrorMessage>{t('app.forbidden')}</ErrorMessage>
}
export function App() {
  const { user, generation } = useSession()
  const { t } = useI18n()
  const routeLabel = (path: string) => path === '/operations/disasters' ? t('nav.disasters')
    : path === '/operations/reports' ? t('nav.reports')
      : path === '/reports/new' ? t('nav.createReport')
        : path === '/my-reports' ? t('nav.myReports') : t('nav.rescue')
  return <><a className="skip-link" href="#main">{t('app.skip')}</a>
    <header className={`app-header${user?.role === 'AUTHORITY' ? ' app-header--authority' : ''}`}><Link className="brand" to={user ? landingPath(user.role) : '/login'}><span className="brand-mark" aria-hidden="true">G</span><span className="brand-name">GDRN<span className="brand-caption">Crisis Command</span></span></Link>
      <div className="app-header__right">{user ? <nav className="app-nav" aria-label={t('app.nav')}><span className="app-role">{user.role === 'CITIZEN' ? t('app.citizen') : t('app.authority')}</span>{featureRoutes.filter(route => route.roles.includes(user.role)).map(route => <NavLink key={route.path} to={route.path}>{routeLabel(route.path)}</NavLink>)}
        <button className="secondary" onClick={() => session.clear()}>{t('app.logout')}</button></nav>
        : <span className="app-header__note">{t('app.headerNote')}</span>}<LanguageSwitcher /></div>
    </header><main id="main" className="app-main" tabIndex={-1}><Routes>
      <Route path="/login" element={<LoginPage key={user?.id ?? 'anonymous'} />} />
      <Route path="/" element={<Navigate to={user ? landingPath(user.role) : '/login'} replace />} />
      {featureRoutes.map(route => <Route key={route.path} path={route.path} element={<RoleGuard key={generation} roles={route.roles}>{route.element}</RoleGuard>} />)}
      <Route path="*" element={user ? <EmptyState>{t('app.notFound')}</EmptyState> : <Navigate to="/login" replace />} />
    </Routes></main><footer className="app-footer">{t('app.footer')}</footer></>
}
