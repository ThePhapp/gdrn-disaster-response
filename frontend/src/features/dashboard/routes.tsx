import type { FeatureRoute } from '../../app/feature-routes'
import { DashboardPage } from './DashboardPage'

export const routes: FeatureRoute[] = [{
  path: '/operations/dashboard', label: 'Dashboard', roles: ['AUTHORITY'], element: <DashboardPage />,
}]
