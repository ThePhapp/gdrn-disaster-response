import type { FeatureRoute } from '../../app/feature-routes'
import { RescuePage } from './RescuePage'

export const routes: FeatureRoute[] = [{
  path: '/operations/rescue',
  label: 'Cứu hộ',
  roles: ['AUTHORITY'],
  element: <RescuePage />,
}]
