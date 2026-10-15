import { Component, lazy, Suspense, useCallback, useState, type ReactNode } from 'react'
import { mapTileConfig } from './config'
import { isLocationValue, type LocationMapProps } from './types'
import './location.css'

const createLazyMap = () => lazy(async () => {
  const module = await import('./MapLibreMap')
  return { default: module.MapLibreMap }
})

class MapBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onError() }
  render() {
    return this.state.failed
      ? <div className="location-map__unavailable" role="status">Không thể mở bản đồ. Bạn vẫn có thể nhập tọa độ.</div>
      : this.props.children
  }
}

type TileState = 'loading' | 'ready' | 'error'

export function LocationMap({ value, onChange, disabled = false, readOnly = false, radiusMeters,
  label = readOnly ? 'Bản đồ vị trí chỉ đọc' : 'Chọn vị trí trên bản đồ', className = '' }: LocationMapProps) {
  const selected = isLocationValue(value) ? value : undefined
  const [tileState, setTileState] = useState<TileState>(mapTileConfig.error ? 'error' : 'loading')
  const [retryKey, setRetryKey] = useState(0)
  const [LazyMapLibreMap, setLazyMap] = useState(createLazyMap)
  const mapLoading = useCallback(() => setTileState('loading'), [])
  const mapReady = useCallback(() => setTileState('ready'), [])
  const mapError = useCallback(() => setTileState('error'), [])
  const retry = () => {
    if (mapTileConfig.error) return
    setTileState('loading')
    setRetryKey(current => current + 1)
    // React.lazy caches rejected promises; retry needs a fresh lazy component.
    setLazyMap(() => createLazyMap())
  }

  return <section className={`location-map ${className}`.trim()} aria-label={label}>
    <div className="location-map__frame" aria-disabled={disabled || undefined}>
      {mapTileConfig.error
        ? <div className="location-map__unavailable" role="status">Không thể mở bản đồ vì cấu hình chưa hợp lệ.</div>
        : <MapBoundary key={retryKey} onError={mapError}><Suspense fallback={<div className="location-map__unavailable" role="status">Đang tải bản đồ…</div>}>
          <LazyMapLibreMap key={retryKey} value={selected} onChange={onChange} disabled={disabled} readOnly={readOnly}
            radiusMeters={radiusMeters} styleUrl={mapTileConfig.styleUrl} attribution={mapTileConfig.attribution}
            retryKey={retryKey} label={label} onMapLoading={mapLoading} onMapReady={mapReady} onMapError={mapError} />
        </Suspense></MapBoundary>}
    </div>
    <div className="location-map__footer">
      <span className="location-map__hint">
        {readOnly ? 'Vị trí chỉ để xem.' : disabled ? 'Bản đồ tạm khóa trong khi xử lý.' : 'Bấm bản đồ để chọn; có thể tiếp tục dùng hai ô tọa độ.'}
      </span>
      {tileState === 'loading' && !mapTileConfig.error && <span role="status">Đang tải lớp bản đồ…</span>}
      {tileState === 'error' && <span className="location-map__tile-error" role="status">
        {mapTileConfig.error ?? 'Không tải được lớp bản đồ. Nhập tọa độ vẫn hoạt động.'}
        {!mapTileConfig.error && <button type="button" className="secondary" onClick={retry} disabled={disabled}>Thử tải lại</button>}
      </span>}
    </div>
  </section>
}

export type { LocationMapProps, LocationValue } from './types'
