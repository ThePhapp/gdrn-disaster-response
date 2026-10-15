export type LocationValue = Readonly<{
  latitude: number
  longitude: number
}>

export type LocationMapProps = {
  value?: LocationValue
  onChange?: (value: LocationValue) => void
  disabled?: boolean
  readOnly?: boolean
  radiusMeters?: number
  label?: string
  className?: string
}

export function isLocationValue(value: LocationValue | undefined): value is LocationValue {
  return Boolean(value
    && Number.isFinite(value.latitude) && value.latitude >= -90 && value.latitude <= 90
    && Number.isFinite(value.longitude) && value.longitude >= -180 && value.longitude <= 180)
}
