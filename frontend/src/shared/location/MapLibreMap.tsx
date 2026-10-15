import { useEffect, useRef } from 'react'
import {
  AttributionControl,
  Map,
  Marker,
  NavigationControl,
  setWorkerUrl,
  type ErrorEvent,
  type GeoJSONSource,
  type MapMouseEvent,
} from 'maplibre-gl'
import type { Feature, Polygon } from 'geojson'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { LocationValue } from './types'

setWorkerUrl(workerUrl)

const defaultCenter: [number, number] = [108, 16]
const mapTimeoutMs = 12_000
const earthRadiusMeters = 6_371_008.8
const locationSourceId = 'gdrn-location-radius'
const locationFillLayerId = 'gdrn-location-radius-fill'
const locationLineLayerId = 'gdrn-location-radius-line'

function radiusPolygon(value: LocationValue, radiusMeters: number): Polygon {
  const latitude = value.latitude * Math.PI / 180
  const longitude = value.longitude * Math.PI / 180
  const angularDistance = radiusMeters / earthRadiusMeters
  const coordinates: [number, number][] = []
  for (let step = 0; step <= 64; step += 1) {
    const bearing = step / 64 * Math.PI * 2
    const targetLatitude = Math.asin(Math.sin(latitude) * Math.cos(angularDistance)
      + Math.cos(latitude) * Math.sin(angularDistance) * Math.cos(bearing))
    const targetLongitude = longitude + Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latitude),
      Math.cos(angularDistance) - Math.sin(latitude) * Math.sin(targetLatitude),
    )
    const normalizedLongitude = (targetLongitude * 180 / Math.PI + 540) % 360 - 180
    coordinates.push([normalizedLongitude, targetLatitude * 180 / Math.PI])
  }
  return { type: 'Polygon', coordinates: [coordinates] }
}

export function MapLibreMap({ value, onChange, disabled = false, readOnly = false, radiusMeters, styleUrl, attribution,
  retryKey, label, onMapLoading, onMapReady, onMapError }: {
  value?: LocationValue
  onChange?: (value: LocationValue) => void
  disabled?: boolean
  readOnly?: boolean
  radiusMeters?: number
  styleUrl: string
  attribution: string
  retryKey: number
  label: string
  onMapLoading: () => void
  onMapReady: () => void
  onMapError: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | undefined>(undefined)
  const markerRef = useRef<Marker | undefined>(undefined)
  const valueRef = useRef(value)
  const radiusRef = useRef(radiusMeters)
  const onChangeRef = useRef(onChange)

  useEffect(() => { valueRef.current = value }, [value])
  useEffect(() => { radiusRef.current = radiusMeters }, [radiusMeters])
  useEffect(() => { onChangeRef.current = onChange }, [onChange])

  function renderLocation(map: Map) {
    const selected = valueRef.current
    if (!selected) {
      markerRef.current?.remove()
      markerRef.current = undefined
    } else if (markerRef.current) {
      markerRef.current.setLngLat([selected.longitude, selected.latitude])
    } else {
      const markerElement = document.createElement('span')
      markerElement.className = 'location-map__marker'
      markerElement.setAttribute('aria-hidden', 'true')
      markerRef.current = new Marker({ element: markerElement, anchor: 'center' })
        .setLngLat([selected.longitude, selected.latitude])
        .addTo(map)
    }

    const radius = radiusRef.current
    const source = map.getSource(locationSourceId) as GeoJSONSource | undefined
    if (!source) return
    const feature: Feature<Polygon> = {
      type: 'Feature',
      properties: {},
      geometry: selected && radius && Number.isFinite(radius) && radius > 0
        ? radiusPolygon(selected, radius)
        : { type: 'Polygon', coordinates: [] },
    }
    source.setData(feature)
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    onMapLoading()
    let ready = false
    let errored = false
    let timeout = 0
    let map: Map
    try {
      map = new Map({
        container,
        style: styleUrl,
        center: value ? [value.longitude, value.latitude] : defaultCenter,
        zoom: value ? 13 : 4.5,
        attributionControl: false,
        interactive: !disabled,
        dragRotate: false,
        touchPitch: false,
        pitchWithRotate: false,
        renderWorldCopies: false,
      })
    } catch {
      onMapError()
      return
    }
    mapRef.current = map
    map.getCanvas().setAttribute('aria-label', label)
    map.scrollZoom.disable()
    if (!disabled) map.addControl(new NavigationControl({ showCompass: false }), 'top-left')
    map.addControl(new AttributionControl({ compact: false, customAttribution: attribution }), 'bottom-right')

    const settleReady = () => {
      if (ready || errored) return
      ready = true
      window.clearTimeout(timeout)
      onMapReady()
    }
    const settleError = () => {
      if (errored) return
      errored = true
      window.clearTimeout(timeout)
      onMapError()
    }
    const handleError = (event: ErrorEvent) => {
      // Ignore non-network rendering warnings after startup, but retain provider failures.
      const failure = event.error as Error & { status?: number; url?: string }
      if (!ready || 'sourceId' in event || 'tile' in event || failure.status !== undefined || failure.url) settleError()
    }
    const handleLoad = () => {
      const style = getComputedStyle(container)
      const ocean = style.getPropertyValue('--gdrn-ocean').trim() || '#247ba0'
      map.addSource(locationSourceId, {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [] } },
      })
      map.addLayer({
        id: locationFillLayerId,
        type: 'fill',
        source: locationSourceId,
        paint: { 'fill-color': ocean, 'fill-opacity': .12 },
      })
      map.addLayer({
        id: locationLineLayerId,
        type: 'line',
        source: locationSourceId,
        paint: { 'line-color': ocean, 'line-width': 2 },
      })
      renderLocation(map)
      settleReady()
    }
    const handleClick = (event: MapMouseEvent) => {
      if (!disabled && !readOnly) onChangeRef.current?.({ latitude: event.lngLat.lat, longitude: event.lngLat.lng })
    }
    timeout = window.setTimeout(settleError, mapTimeoutMs)
    map.on('load', handleLoad)
    map.on('error', handleError)
    map.on('click', handleClick)
    const frame = requestAnimationFrame(() => map.resize())
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(() => map.resize())
    observer?.observe(container)

    return () => {
      window.clearTimeout(timeout)
      cancelAnimationFrame(frame)
      observer?.disconnect()
      map.off('load', handleLoad)
      map.off('error', handleError)
      map.off('click', handleClick)
      markerRef.current?.remove()
      markerRef.current = undefined
      map.remove()
      mapRef.current = undefined
    }
  // retryKey rebuilds the renderer, style request, controls and WebGL resources.
  }, [attribution, disabled, label, onMapError, onMapLoading, onMapReady, readOnly, retryKey, styleUrl])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const hadMarker = Boolean(markerRef.current)
    renderLocation(map)
    if (value) {
      if (!hadMarker) map.jumpTo({ center: [value.longitude, value.latitude], zoom: Math.max(map.getZoom(), 13) })
      else map.panTo([value.longitude, value.latitude])
    }
  }, [radiusMeters, value])

  return <div ref={containerRef} className="location-map__canvas" aria-label={label} />
}
