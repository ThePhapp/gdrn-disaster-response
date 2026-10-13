import { useRef, useState, type FormEvent } from 'react'
import { Field } from '../../shared/components'
import type { ReportFilters as Filters, ReportStatus } from './reporting-api'
import { reportStatuses, statusLabels } from './presentation'

export function ReportFilters({ disabled, onApply }: { disabled: boolean; onApply: (value: Filters) => void }) {
  const [status, setStatus] = useState<ReportStatus | ''>('')
  const [coordinates, setCoordinates] = useState({ lat: '', lon: '', radiusMeters: '' })
  const [errors, setErrors] = useState<Partial<typeof coordinates>>({})
  const form = useRef<HTMLFormElement>(null)
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
    setErrors(next)
    if (Object.keys(next).length) {
      requestAnimationFrame(() => form.current?.querySelector<HTMLInputElement>('[aria-invalid=true]')?.focus())
      return
    }
    onApply({ page: 0, size: 20, status: status || undefined, ...(hasGeo ? {
      lat: Number(coordinates.lat), lon: Number(coordinates.lon), radiusMeters: Number(coordinates.radiusMeters),
    } : {}) })
  }
  return <form ref={form} className="report-filters" aria-label="Bộ lọc báo cáo" noValidate onSubmit={apply}>
    <div className="report-filter-status"><label htmlFor="report-status-filter">Trạng thái</label><select id="report-status-filter" disabled={disabled} value={status} onChange={event => setStatus(event.target.value as ReportStatus | '')}>
      <option value="">Tất cả trạng thái</option>{reportStatuses.map(value => <option key={value} value={value}>{statusLabels[value]}</option>)}
    </select></div>
    {(['lat', 'lon', 'radiusMeters'] as const).map(key => <Field key={key} id={`report-filter-${key}`} disabled={disabled}
      label={key === 'lat' ? 'Vĩ độ' : key === 'lon' ? 'Kinh độ' : 'Bán kính (m)'} inputMode={key === 'radiusMeters' ? 'numeric' : 'decimal'}
      value={coordinates[key]} error={errors[key]} onChange={event => setCoordinates(current => ({ ...current, [key]: event.target.value }))} />)}
    <p className="report-filter-hint">WGS84: vĩ độ −90…90, kinh độ −180…180. Nhập đủ cả ba giá trị để lọc trong bán kính 1–100000 mét.</p>
    <button type="submit" disabled={disabled}>Áp dụng bộ lọc</button>
    <button type="button" className="secondary" disabled={disabled} onClick={() => {
      setStatus(''); setCoordinates({ lat: '', lon: '', radiusMeters: '' }); setErrors({}); onApply({ page: 0, size: 20 })
    }}>Xóa bộ lọc</button>
  </form>
}
