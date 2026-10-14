
import type { FeatureRoute } from '../../app/feature-routes'
import { ReportingCitizenPage } from './ReportingCitizenPage'

export const routes: FeatureRoute[] = [
  {
    path: '/reports/new',
    label: 'Tạo báo cáo',
    roles: ['CITIZEN'],
    element: <ReportingCitizenPage />,
  },
  {
    path: '/my-reports',
    label: 'Báo cáo của tôi',
    roles: ['CITIZEN'],
    element: <ReportingCitizenPage />,
  },
]
