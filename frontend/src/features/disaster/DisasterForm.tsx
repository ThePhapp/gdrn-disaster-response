import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Field } from '../../shared/components'
import { useI18n, type TranslationKey } from '../../shared/i18n'
import { LocationMap, type LocationValue } from '../../shared/location'
import { disasterLabel, severityLabel } from './DisasterBadges'
import {
  disasterTypes,
  severities,
  type Disaster,
  type DisasterFields,
  type DisasterPatch,
  type DisasterType,
  type Severity,
} from './disaster-api'

type FormValue = Omit<DisasterFields, 'latitude' | 'longitude'> & { latitude: string; longitude: string }
type Errors = Partial<Record<keyof FormValue | 'form', string>>

function valueOf(disaster?: Disaster): FormValue {
  return disaster ? {
    name: disaster.name,
    type: disaster.type,
    severity: disaster.severity,
    description: disaster.description,
    latitude: String(disaster.latitude),
    longitude: String(disaster.longitude),
  } : { name: '', type: 'FLOOD', severity: 'MODERATE', description: '', latitude: '', longitude: '' }
}

function validate(value: FormValue, t: (key: TranslationKey) => string): { errors: Errors; fields?: DisasterFields } {
  const errors: Errors = {}
  const name = value.name.trim()
  const description = value.description.trim()
  const latitude = Number(value.latitude)
  const longitude = Number(value.longitude)
  if (!name || [...name].length > 120) errors.name = t('disaster.form.nameError')
  if (!description || [...description].length > 2000) errors.description = t('disaster.form.descriptionError')
  if (value.latitude.trim() === '' || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) errors.latitude = t('disaster.form.latitudeError')
  if (value.longitude.trim() === '' || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) errors.longitude = t('disaster.form.longitudeError')
  return Object.keys(errors).length ? { errors } : {
    errors,
    fields: { name, description, latitude, longitude, type: value.type, severity: value.severity },
  }
}

export function DisasterForm({ disaster, busy, onCancel, onCreate, onEdit }: {
  disaster?: Disaster
  busy: boolean
  onCancel: () => void
  onCreate: (fields: DisasterFields) => Promise<void>
  onEdit: (patch: DisasterPatch) => Promise<void>
}) {
  const { t } = useI18n()
  const [value, setValue] = useState<FormValue>(() => valueOf(disaster))
  const [errors, setErrors] = useState<Errors>({})
  const form = useRef<HTMLFormElement>(null)
  const focusInvalid = useRef(false)
  const editing = Boolean(disaster)

  useEffect(() => {
    if (!focusInvalid.current) return
    focusInvalid.current = false
    form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [errors])

  const latitude = value.latitude.trim() === '' ? undefined : Number(value.latitude)
  const longitude = value.longitude.trim() === '' ? undefined : Number(value.longitude)
  const location = latitude !== undefined && longitude !== undefined
    && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
    && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180
    ? { latitude, longitude }
    : undefined

  function set<K extends keyof FormValue>(field: K, next: FormValue[K]) {
    setValue(current => ({ ...current, [field]: next }))
    setErrors(current => ({ ...current, [field]: undefined, form: undefined }))
  }

  function setLocation(next: LocationValue) {
    setValue(current => ({ ...current, latitude: String(next.latitude), longitude: String(next.longitude) }))
    setErrors(current => ({ ...current, latitude: undefined, longitude: undefined, form: undefined }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    const checked = validate(value, t)
    if (!checked.fields) {
      focusInvalid.current = true
      setErrors(checked.errors)
      return
    }
    if (!disaster) { await onCreate(checked.fields); return }
    const patch: DisasterPatch = { expectedVersion: disaster.version }
    for (const key of ['name', 'type', 'severity', 'description', 'latitude', 'longitude'] as const) {
      if (checked.fields[key] !== disaster[key]) patch[key] = checked.fields[key] as never
    }
    if (Object.keys(patch).length === 1) {
      setErrors({ form: t('disaster.form.noChanges') })
      return
    }
    await onEdit(patch)
  }

  return <form ref={form} className="disaster-form" onSubmit={submit} noValidate aria-busy={busy}>
    <Field id="disaster-name" label={t('disaster.form.name')} value={value.name} maxLength={120} autoFocus
      hint={t('disaster.form.nameHint')}
      onChange={event => set('name', event.target.value)} error={errors.name} disabled={busy} required />
    <div className="disaster-form__pair">
      <div className="field"><label htmlFor="disaster-type">{t('disaster.form.type')}</label>
        <select id="disaster-type" value={value.type} onChange={event => set('type', event.target.value as DisasterType)} disabled={busy}>
          {disasterTypes.map(type => <option key={type} value={type}>{disasterLabel(t, type)}</option>)}
        </select>
      </div>
      <div className="field"><label htmlFor="disaster-severity">{t('disaster.severity')}</label>
        <select id="disaster-severity" value={value.severity} onChange={event => set('severity', event.target.value as Severity)} disabled={busy}>
          {severities.map(severity => <option key={severity} value={severity}>{severityLabel(t, severity)}</option>)}
        </select>
      </div>
    </div>
    <div className="field"><label htmlFor="disaster-description">{t('disaster.form.description')}</label>
      <textarea id="disaster-description" value={value.description} maxLength={2000} rows={5}
        onChange={event => set('description', event.target.value)} aria-invalid={Boolean(errors.description)}
        aria-describedby={`disaster-description-hint${errors.description ? ' disaster-description-error' : ''}`} disabled={busy} required />
      <span id="disaster-description-hint" className="field-hint">{t('disaster.form.descriptionHint')}</span>
      {errors.description && <span id="disaster-description-error" className="field-error">{errors.description}</span>}
    </div>
    <div className="disaster-form__pair">
      <Field id="disaster-latitude" label={t('disaster.form.latitude')} type="number" step="any" value={value.latitude}
        hint={t('disaster.form.latitudeHint')} onChange={event => set('latitude', event.target.value)}
        error={errors.latitude} disabled={busy} required />
      <Field id="disaster-longitude" label={t('disaster.form.longitude')} type="number" step="any" value={value.longitude}
        hint={t('disaster.form.longitudeHint')} onChange={event => set('longitude', event.target.value)}
        error={errors.longitude} disabled={busy} required />
    </div>
    <LocationMap value={location} onChange={setLocation} disabled={busy} />
    {errors.form && <p className="field-error" role="alert">{errors.form}</p>}
    <div className="disaster-actions">
      <button type="submit" disabled={busy}>{busy ? t('disaster.form.saving') : editing ? t('disaster.form.save') : t('disaster.create')}</button>
      <button type="button" className="secondary" onClick={onCancel} disabled={busy}>{t('disaster.form.cancel')}</button>
    </div>
  </form>
}
