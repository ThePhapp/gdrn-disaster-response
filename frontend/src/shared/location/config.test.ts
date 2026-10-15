import { describe, expect, it } from 'vitest'
import { readMapTileConfig } from './config'

describe('map tile configuration', () => {
  it('builds the MapTiler streets style without leaking the key into attribution', () => {
    const config = readMapTileConfig({ VITE_MAPTILER_KEY: ' browser-key ' })
    expect(config.styleUrl).toBe('https://api.maptiler.com/maps/streets-v4/style.json?key=browser-key')
    expect(config.attribution).toContain('MapTiler')
    expect(config.attribution).toContain('OpenStreetMap')
    expect(config.attribution).not.toContain('browser-key')
  })

  it('requires a provider, HTTPS and visible attribution for a custom style', () => {
    expect(readMapTileConfig({}).error).toContain('Chưa cấu hình')
    expect(readMapTileConfig({ VITE_MAP_STYLE_URL: 'http://maps.example/style.json', VITE_MAP_ATTRIBUTION: 'Example' }).error)
      .toContain('HTTPS')
    expect(readMapTileConfig({ VITE_MAP_STYLE_URL: 'https://maps.example/style.json' }).error)
      .toContain('ghi công')
    expect(readMapTileConfig({ VITE_MAP_STYLE_URL: ' https://maps.example/style.json ', VITE_MAP_ATTRIBUTION: ' Example ' }))
      .toEqual({ styleUrl: 'https://maps.example/style.json', attribution: 'Example' })
  })
})
