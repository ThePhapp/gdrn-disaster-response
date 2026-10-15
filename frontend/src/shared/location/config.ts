export type MapTileConfig = {
  styleUrl: string
  attribution: string
  error?: string
}

const mapTilerAttribution = '<a href="https://www.maptiler.com/copyright/">&copy; MapTiler</a> '
  + '<a href="https://www.openstreetmap.org/copyright">&copy; OpenStreetMap contributors</a>'

export function readMapTileConfig(env: Record<string, string | boolean | undefined>): MapTileConfig {
  const configuredStyleUrl = typeof env.VITE_MAP_STYLE_URL === 'string' ? env.VITE_MAP_STYLE_URL.trim() : ''
  const mapTilerKey = typeof env.VITE_MAPTILER_KEY === 'string' ? env.VITE_MAPTILER_KEY.trim() : ''
  const configuredAttribution = typeof env.VITE_MAP_ATTRIBUTION === 'string' ? env.VITE_MAP_ATTRIBUTION.trim() : ''
  const styleUrl = configuredStyleUrl || (mapTilerKey
    ? `https://api.maptiler.com/maps/streets-v4/style.json?key=${encodeURIComponent(mapTilerKey)}`
    : '')
  const attribution = configuredAttribution || (mapTilerKey ? mapTilerAttribution : '')
  if (!styleUrl) {
    return { styleUrl: '', attribution: '', error: 'Chưa cấu hình style bản đồ hoặc khóa MapTiler.' }
  }
  if (!styleUrl.startsWith('https://')) {
    return { styleUrl, attribution, error: 'Địa chỉ style bản đồ phải dùng HTTPS.' }
  }
  if (!attribution) return { styleUrl, attribution, error: 'Nhà cung cấp bản đồ chưa được cấu hình ghi công.' }
  return { styleUrl, attribution }
}

export const mapTileConfig = readMapTileConfig(import.meta.env)
