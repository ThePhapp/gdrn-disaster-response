import { useEffect, useState, type FormEvent } from 'react'
import { ApiError } from '../../shared/api'
import { EmptyState, ErrorMessage, Field, Loading, PageHeader } from '../../shared/components'
import { useI18n } from '../../shared/i18n'
import { getDashboard, validRange, type DashboardSummary, type DateRange } from './dashboard-api'
import './dashboard.css'

type Result = { key: string; data?: DashboardSummary; error?: 'forbidden' | 'connection' }

export function DashboardPage() {
  const { t, language } = useI18n()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [invalid, setInvalid] = useState(false)
  const [range, setRange] = useState<DateRange | null>(null)
  const [revision, setRevision] = useState(0)
  const key = `${range?.from ?? ''}/${range?.to ?? ''}/${revision}`
  const [result, setResult] = useState<Result>({ key: '' })
  const data = result.key === key ? result.data : undefined
  const error = result.key === key ? result.error : undefined
  const loading = !data && !error

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    setResult({ key })
    getDashboard(range, controller.signal).then(data => {
      if (active) setResult({ key, data })
    }).catch((error: unknown) => {
      if (active && !controller.signal.aborted) setResult({ key,
        error: error instanceof ApiError && error.status === 403 ? 'forbidden' : 'connection' })
    })
    return () => { active = false; controller.abort() }
  }, [key, range])

  function apply(event: FormEvent) {
    event.preventDefault()
    if (!validRange(from, to)) { setInvalid(true); return }
    setInvalid(false)
    setRange(from ? { from, to } : null)
    setRevision(value => value + 1)
  }

  function clear() {
    setFrom(''); setTo(''); setInvalid(false); setRange(null); setRevision(value => value + 1)
  }

  const number = (value: number) => new Intl.NumberFormat(language === 'vi' ? 'vi-VN' : 'en-US').format(value)
  const reports = data ? data.reports.pending + data.reports.verified + data.reports.rejected : 0
  const missions = data ? data.missions.assigned + data.missions.inProgress + data.missions.completed : 0
  const activeMissions = data ? data.missions.assigned + data.missions.inProgress : 0

  return <section className="dashboard" aria-label={t('dashboard.title')}>
    <PageHeader eyebrow={t('dashboard.eyebrow')} title={t('dashboard.title')}
      description={t('dashboard.description')} action={<button type="button" className="secondary"
        disabled={loading} onClick={() => setRevision(value => value + 1)}>{t('dashboard.refresh')}</button>} />
    <form className="dashboard-filter" onSubmit={apply} noValidate aria-label={t('dashboard.filter')}>
      <div className="dashboard-filter__fields">
        <Field id="dashboard-from" type="date" min="0001-01-01" max="9999-12-31"
          label={t('dashboard.from')} value={from} aria-describedby="dashboard-date-hint"
          onChange={event => setFrom(event.target.value)} />
        <Field id="dashboard-to" type="date" min="0001-01-01" max="9999-12-31"
          label={t('dashboard.to')} value={to} aria-describedby="dashboard-date-hint"
          onChange={event => setTo(event.target.value)} />
        <button type="submit">{t('dashboard.apply')}</button>
        <button type="button" className="secondary" onClick={clear}>{t('dashboard.clear')}</button>
      </div>
      <p id="dashboard-date-hint" className="field-hint">{t('dashboard.dateHint')}</p>
      {invalid && <ErrorMessage>{t('dashboard.invalidRange')}</ErrorMessage>}
    </form>
    <div className="dashboard-context">
      <p><strong>{t('dashboard.applied')}:</strong> {range ? `${range.from} → ${range.to}` : t('dashboard.allTime')}
        <span className="muted"> · Asia/Ho_Chi_Minh (UTC+7)</span></p>
      {data && <p className="muted">{t('dashboard.updated')}: {new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-GB', {
        dateStyle: 'medium', timeStyle: 'medium', timeZone: data.timeZone,
      }).format(new Date(data.asOf))}</p>}
    </div>
    <div aria-busy={loading}>
      {loading && <Loading>{t('dashboard.loading')}</Loading>}
      {error && <><ErrorMessage>{t(error === 'forbidden' ? 'app.forbidden' : 'dashboard.error')}</ErrorMessage>
        {error !== 'forbidden' && <button className="secondary" onClick={() => setRevision(value => value + 1)}>{t('shared.retry')}</button>}</>}
      {data && <>
        <div className="dashboard-metrics">
          <Metric label={t('dashboard.totalReports')} value={number(reports)} hint={t('dashboard.reportsHint')} icon="reports" />
          <Metric label={t('dashboard.activeMissions')} value={number(activeMissions)} hint={t('dashboard.missionsHint')} icon="missions" />
          <Metric label={t('dashboard.availableTeams')} value={number(data.teams.available)}
            hint={t('dashboard.busyTeams', { count: number(data.teams.busy) })} icon="teams" />
        </div>
        <p className="dashboard-capacity-note muted">{t('dashboard.capacityHint')}</p>
        {reports === 0 && missions === 0 && <EmptyState>{t('dashboard.empty')}</EmptyState>}
        <div className="dashboard-breakdowns">
          <Breakdown title={t('dashboard.reportBreakdown')} total={reports} format={number} rows={[
            { label: t('reporting.status.PENDING'), value: data.reports.pending, tone: 'pending' },
            { label: t('reporting.status.VERIFIED'), value: data.reports.verified, tone: 'verified' },
            { label: t('reporting.status.REJECTED'), value: data.reports.rejected, tone: 'rejected' },
          ]} />
          <Breakdown title={t('dashboard.missionBreakdown')} total={missions} format={number} rows={[
            { label: t('rescue.status.ASSIGNED'), value: data.missions.assigned, tone: 'pending' },
            { label: t('rescue.status.IN_PROGRESS'), value: data.missions.inProgress, tone: 'progress' },
            { label: t('rescue.status.COMPLETED'), value: data.missions.completed, tone: 'verified' },
          ]} />
        </div>
        <p className="muted dashboard-method">{t('dashboard.method')}</p>
      </>}
    </div>
  </section>
}

function Metric({ label, value, hint, icon }: { label: string; value: string; hint: string; icon: 'reports' | 'missions' | 'teams' }) {
  const paths = { reports: 'M8 3h8l4 4v14H4V3h4zm0 8h8M8 15h8',
    missions: 'm4 12 5 5L20 6M4 4h6M4 8h3', teams: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-4M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m8-8a4 4 0 0 1 0 8' }
  return <article className="dashboard-metric" aria-label={label}><div className="dashboard-metric__top">
    <h2>{label}</h2><svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d={paths[icon]} /></svg>
  </div><p className="dashboard-metric__value">{value}</p><p className="muted">{hint}</p></article>
}

function Breakdown({ title, total, rows, format }: { title: string; total: number; format: (value: number) => string;
  rows: { label: string; value: number; tone: string }[] }) {
  return <section className="dashboard-breakdown"><h2>{title}</h2><table aria-label={title}><tbody>
    {rows.map(row => <tr key={row.tone}><th scope="row">{row.label}</th><td className="dashboard-bar-cell" aria-hidden="true">
      <div className="dashboard-bar"><span className={`dashboard-bar__fill dashboard-bar__fill--${row.tone}`}
        style={{ width: `${total ? row.value / total * 100 : 0}%` }} /></div>
    </td><td className="dashboard-count">{format(row.value)}</td></tr>)}
  </tbody></table></section>
}
