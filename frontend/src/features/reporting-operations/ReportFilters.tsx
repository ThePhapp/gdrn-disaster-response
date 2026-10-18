import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Field } from '../../shared/components'
import { useI18n } from '../../shared/i18n'
import { LocationMap, type LocationValue } from '../../shared/location'
import type { ReportFilters as Filters, ReportStatus } from './reporting-api'
import { reportStatuses, statusLabels } from './presentation'

export function ReportFilters({ disabled, onApply }: { disabled: boolean; onApply: (value: Filters) => void }) {
  const { t } = useI18n()
  const [status, setStatus] = useState<ReportStatus | ''>('')
  const [coordinates, setCoordinates] = useState({ lat: '', lon: '', radiusMeters: '' })
  const [errors, setErrors] = useState<Partial<typeof coordinates>>({})
  const form = useRef<HTMLFormElement>(null)
  const focusInvalid = useRef(false)
  const latitude = coordinates.lat.trim() === '' ? undefined : Number(coordinates.lat)
  const longitude = coordinates.lon.trim() === '' ? undefined : Number(coordinates.lon)
  const location = latitude !== undefined && longitude !== undefined
    && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
    && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180
    ? { latitude, longitude }
    : undefined
  const radius = Number(coordinates.radiusMeters)
  const radiusMeters = Number.isInteger(radius) && radius >= 1 && radius <= 100000 ? radius : undefined

  useEffect(() => {
    if (!focusInvalid.current) return
    focusInvalid.current = false
    form.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus()
  }, [errors])

  function setCoordinate(field: keyof typeof coordinates, value: string) {
    setCoordinates(current => ({ ...current, [field]: value }))
    setErrors(current => ({ ...current, [field]: undefined }))
  }

  function setLocation(value: LocationValue) {
    setCoordinates(current => ({ ...current, lat: String(value.latitude), lon: String(value.longitude) }))
    setErrors(current => ({ ...current, lat: undefined, lon: undefined }))
  }
  function apply(event: FormEvent) {
    event.preventDefault()
    const next: Partial<typeof coordinates> = {}
    const hasGeo = Object.values(coordinates).some(value => value.trim() !== '')
    if (hasGeo) {
      for (const key of ['lat', 'lon', 'radiusMeters'] as const) {
        const value = Number(coordinates[key])
        const limit = key === 'lat' ? 90 : 180
        if (!coordinates[key].trim() || !Number.isFinite(value)) next[key] = 'Nhập đủ cả ba giá trị tọa độ và bán kính.'
        else if (key === 'radiusMeters' ? !Number.isInteger(value) || value < 1 || value > 100000 : Math.abs(value) > limit) {
          next[key] = key === 'radiusMeters' ? 'Bán kính phải là số nguyên từ 1 đến 100000 mét.' : `Giá trị phải từ -${limit} đến ${limit}.`
        }
      }
    }
    if (Object.keys(next).length) focusInvalid.current = true
    setErrors(next)
    if (Object.keys(next).length) {
      return
    }
    onApply({ page: 0, size: 20, status: status || undefined, ...(hasGeo ? {
      lat: Number(coordinates.lat), lon: Number(coordinates.lon), radiusMeters: Number(coordinates.radiusMeters),
    } : {}) })
  }
  return <form ref={form} className="report-filters" aria-label={t('reporting.filterForm')} noValidate onSubmit={apply}>
    <div className="report-filter-status"><label htmlFor="report-status-filter">{t('reporting.status')}</label><select id="report-status-filter" disabled={disabled} value={status} onChange={event => setStatus(event.target.value as ReportStatus | '')}>
      <option value="">{t('reporting.allStatuses')}</option>{reportStatuses.map(value => <option key={value} value={value}>{t(`reporting.status.${value}` as 'reporting.status.PENDING' | 'reporting.status.VERIFIED' | 'reporting.status.REJECTED')}</option>)}
    </select></div>
    {(['lat', 'lon', 'radiusMeters'] as const).map(key => <Field key={key} id={`report-filter-${key}`} disabled={disabled}
      label={key === 'lat' ? t('reporting.latitude') : key === 'lon' ? t('reporting.longitude') : t('reporting.radius')} inputMode={key === 'radiusMeters' ? 'numeric' : 'decimal'}
      value={coordinates[key]} error={errors[key]} onChange={event => setCoordinate(key, event.target.value)} />)}
    <LocationMap value={location} onChange={setLocation} radiusMeters={radiusMeters} disabled={disabled}
      label={t('reporting.filterMap')} className="report-filter-map" />
    <p className="report-filter-hint">{t('reporting.geoHint')}</p>
    <button type="submit" disabled={disabled}>{t('reporting.apply')}</button>
    <button type="button" className="secondary" disabled={disabled} onClick={() => {
      setStatus(''); setCoordinates({ lat: '', lon: '', radiusMeters: '' }); setErrors({}); onApply({ page: 0, size: 20 })
    }}>{t('reporting.clear')}</button>
  </form>
}
