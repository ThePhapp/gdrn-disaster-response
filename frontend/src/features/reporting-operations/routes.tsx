import type { FeatureRoute } from '../../app/feature-routes'
import { ReportingOperationsPage } from './ReportingOperationsPage'

export const routes: FeatureRoute[] = [{
  path: '/operations/reports', label: 'Báo cáo', roles: ['AUTHORITY'], element: <ReportingOperationsPage />,
}]
