import { useRef } from 'react'
import { EmptyState, ErrorMessage, Loading } from '../../shared/components'
import { useI18n } from '../../shared/i18n'
import { LocationMap } from '../../shared/location'
import type { Disaster } from './disaster-api'
import { ResolveDisasterDialog } from './ResolveDisasterDialog'
import { disasterLabel, SeverityBadge, StatusBadge } from './DisasterBadges'

const dateTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })

export function DisasterDetail({ disaster, loading, error, busy, confirming, onEdit, onConfirm, onResolve, onCancelResolve, onRetry }: {
  disaster?: Disaster
  loading: boolean
  error: string
  busy: boolean
  confirming: boolean
  onEdit: () => void
  onConfirm: () => void
  onResolve: () => void
  onCancelResolve: () => void
  onRetry: () => void
}) {
  const { t } = useI18n()
  const resolveTrigger = useRef<HTMLButtonElement>(null)
  if (loading) return <Loading>{t('disaster.loadingDetail')}</Loading>
  if (error) return <div className="disaster-panel__error"><ErrorMessage>{error}</ErrorMessage>
    <button type="button" className="secondary" onClick={onRetry}>{t('disaster.reloadDetail')}</button></div>
  if (!disaster) return <div className="disaster-panel__welcome"><EmptyState>
    <strong>{t('disaster.select')}</strong><span>{t('disaster.selectHint')}</span>
  </EmptyState></div>
  return <div className="disaster-detail">
    <div className="disaster-detail__heading"><div><p className="eyebrow">{disasterLabel(t, disaster.type)}</p><h2>{disaster.name}</h2></div>
      <StatusBadge status={disaster.status} /></div>
    <section className="disaster-detail__section" aria-labelledby="disaster-description-title">
      <h3 id="disaster-description-title">{t('disaster.situation')}</h3>
      <p className="disaster-detail__description">{disaster.description}</p>
    </section>
    <dl className="disaster-facts">
      <div><dt>{t('disaster.severity')}</dt><dd><SeverityBadge severity={disaster.severity} /></dd></div>
      <div><dt>{t('disaster.coordinates')}</dt><dd>{disaster.latitude}, {disaster.longitude}</dd></div>
      <div><dt>{t('disaster.created')}</dt><dd><time dateTime={disaster.createdAt}>{dateTime.format(new Date(disaster.createdAt))}</time></dd></div>
      <div><dt>{t('disaster.updated')}</dt><dd>{dateTime.format(new Date(disaster.updatedAt))}</dd></div>
      <div><dt>{t('disaster.id')}</dt><dd className="disaster-facts__id">{disaster.id}</dd></div>
      <div><dt>{t('disaster.version')}</dt><dd>{disaster.version}</dd></div>
    </dl>
    <LocationMap
      value={{ latitude: disaster.latitude, longitude: disaster.longitude }}
      readOnly
      label={`${t('disaster.location')} ${disaster.name}`}
      className="disaster-detail__map"
    />
    {disaster.status === 'ACTIVE' && <div className="disaster-actions">
      <button type="button" onClick={onEdit} disabled={busy}>{t('disaster.editAction')}</button>
      <button ref={resolveTrigger} type="button" className="danger-secondary" onClick={onConfirm} disabled={busy}>{t('disaster.resolve')}</button>
    </div>}
    {confirming && <ResolveDisasterDialog disasterName={disaster.name} busy={busy} returnFocus={resolveTrigger.current}
      onResolve={onResolve} onCancel={onCancelResolve} />}
  </div>
}
