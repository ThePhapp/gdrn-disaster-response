import { StrictMode } from 'react'
import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const maplibre = vi.hoisted(() => {
  const maps: any[] = []
  const markers: any[] = []
  const Map = vi.fn(function () {
    const source = { setData: vi.fn() }
    const instance = {
      on: vi.fn(), off: vi.fn(), remove: vi.fn(), resize: vi.fn(), addControl: vi.fn(),
      addSource: vi.fn(), addLayer: vi.fn(), getSource: vi.fn(() => source),
      isStyleLoaded: vi.fn(() => true), jumpTo: vi.fn(), panTo: vi.fn(), getZoom: vi.fn(() => 5),
      getCanvas: vi.fn(() => document.createElement('canvas')), scrollZoom: { disable: vi.fn() }, source,
    }
    maps.push(instance)
    return instance
  })
  const Marker = vi.fn(function () {
    const instance = { setLngLat: vi.fn(), addTo: vi.fn(), remove: vi.fn() }
    instance.setLngLat.mockReturnValue(instance)
    instance.addTo.mockReturnValue(instance)
    markers.push(instance)
    return instance
  })
  return {
    maps, markers, Map, Marker,
    NavigationControl: vi.fn(), AttributionControl: vi.fn(), setWorkerUrl: vi.fn(),
  }
})

vi.mock('maplibre-gl', () => maplibre)

import { MapLibreMap } from './MapLibreMap'

describe('MapLibreMap lifecycle', () => {
  const props = {
    styleUrl: 'https://maps.example/style.json', attribution: 'Example', retryKey: 0,
    label: 'Map', onMapLoading: vi.fn(), onMapReady: vi.fn(), onMapError: vi.fn(),
  }
  beforeEach(() => {
    maplibre.maps.length = 0
    maplibre.markers.length = 0
    vi.clearAllMocks()
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1 })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.stubGlobal('ResizeObserver', class { observe = vi.fn(); disconnect = vi.fn() })
  })

  it('updates and clears selection while provider tiles are loading', () => {
    const view = render(<MapLibreMap {...props} value={{ latitude: 10, longitude: 20 }} />)
    const map = maplibre.maps.at(-1)!
    map.isStyleLoaded.mockReturnValue(false)
    view.rerender(<MapLibreMap {...props} value={{ latitude: 30, longitude: 40 }} radiusMeters={1000} />)
    const marker = maplibre.markers.at(-1)!
    expect(marker.setLngLat).toHaveBeenLastCalledWith([40, 30])
    expect(map.source.setData).toHaveBeenLastCalledWith(expect.objectContaining({
      geometry: expect.objectContaining({ coordinates: [expect.any(Array)] }),
    }))
    view.rerender(<MapLibreMap {...props} />)
    expect(marker.remove).toHaveBeenCalled()
    expect(map.source.setData).toHaveBeenLastCalledWith(expect.objectContaining({
      geometry: { type: 'Polygon', coordinates: [] },
    }))
  })

  it('reports provider failures after the initial load but ignores rendering warnings', () => {
    render(<MapLibreMap {...props} />)
    const map = maplibre.maps.at(-1)!
    const emit = (name: string, event?: unknown) => act(() => map.on.mock.calls.find((call: any[]) => call[0] === name)[1](event))
    emit('load')
    expect(props.onMapReady).toHaveBeenCalled()
    emit('error', { error: new Error('render warning') })
    expect(props.onMapError).not.toHaveBeenCalled()
    emit('error', { sourceId: 'provider', error: new Error('network disconnected') })
    expect(props.onMapError).toHaveBeenCalledTimes(1)
  })

  it('does not create interactive zoom controls or accept selection when disabled', () => {
    const change = vi.fn()
    render(<MapLibreMap {...props} disabled onChange={change} />)
    expect(maplibre.NavigationControl).not.toHaveBeenCalled()
    expect(maplibre.Map).toHaveBeenLastCalledWith(expect.objectContaining({ interactive: false }))
    const map = maplibre.maps.at(-1)!
    act(() => map.on.mock.calls.find((call: any[]) => call[0] === 'click')[1]({ lngLat: { lat: 1, lng: 2 } }))
    expect(change).not.toHaveBeenCalled()
  })

  it('releases listeners, marker and WebGL resources under StrictMode and unmount', () => {
    const props = {
      value: { latitude: 0, longitude: 0 }, onChange: vi.fn(), styleUrl: 'https://maps.example/style.json',
      attribution: 'Example', retryKey: 0, label: 'Chọn vị trí', onMapLoading: vi.fn(),
      onMapReady: vi.fn(), onMapError: vi.fn(),
    }
    const view = render(<StrictMode><MapLibreMap {...props} /></StrictMode>)
    expect(maplibre.maps.length).toBeGreaterThanOrEqual(2)
    view.unmount()
    for (const map of maplibre.maps) {
      expect(map.off).toHaveBeenCalledWith('click', expect.any(Function))
      expect(map.off).toHaveBeenCalledWith('error', expect.any(Function))
      expect(map.remove).toHaveBeenCalledTimes(1)
    }
  })

  it('uses longitude-latitude order, draws the meter radius and reports provider errors', () => {
    const change = vi.fn()
    const mapError = vi.fn()
    render(<MapLibreMap value={{ latitude: 0, longitude: 0 }} onChange={change} radiusMeters={100000}
      styleUrl="https://maps.example/style.json" attribution="Example" retryKey={0} label="Chọn vị trí"
      onMapLoading={vi.fn()} onMapReady={vi.fn()} onMapError={mapError} />)
    const map = maplibre.maps.at(-1)!
    expect(maplibre.Map).toHaveBeenLastCalledWith(expect.objectContaining({ center: [0, 0], interactive: true }))
    const errorHandler = map.on.mock.calls.find((call: unknown[]) => call[0] === 'error')?.[1]
    act(() => errorHandler({ error: new Error('provider failed') }))
    expect(mapError).toHaveBeenCalledTimes(1)
    const loadHandler = map.on.mock.calls.find((call: unknown[]) => call[0] === 'load')?.[1]
    act(() => loadHandler())
    expect(maplibre.markers.at(-1).setLngLat).toHaveBeenCalledWith([0, 0])
    expect(map.source.setData).toHaveBeenCalledWith(expect.objectContaining({
      geometry: expect.objectContaining({ type: 'Polygon', coordinates: [expect.any(Array)] }),
    }))
    const clickHandler = map.on.mock.calls.find((call: unknown[]) => call[0] === 'click')?.[1]
    act(() => clickHandler({ lngLat: { lat: -12.3456789, lng: 179.9999999 } }))
    expect(change).toHaveBeenCalledWith({ latitude: -12.3456789, longitude: 179.9999999 })
  })
})
