import { describe, expect, it } from 'vitest'
import { featureRoutes, landingPath } from './feature-routes'

describe('feature route registry', () => {
  it('publishes only implemented screens with the intended role boundary', () => {
    expect(featureRoutes.map(route => [route.path, [...route.roles]]).sort((a, b) => String(a[0]).localeCompare(String(b[0])))).toEqual([
      ['/my-reports', ['CITIZEN']],
      ['/operations/disasters', ['AUTHORITY']],
      ['/operations/reports', ['AUTHORITY']],
      ['/operations/rescue', ['AUTHORITY']],
      ['/reports/new', ['CITIZEN']],
    ])
  })

  it('selects a real role landing screen after login', () => {
    expect(landingPath('CITIZEN')).toBe('/my-reports')
    expect(landingPath('AUTHORITY')).toBe('/operations/reports')
  })
})
