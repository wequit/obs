import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from '../widgets/layout'
import { ProtectedRoute } from '../widgets/protected-route'
import {
  ClubDetailsPage,
  ClubsPage,
  NotFoundPage,
  OwnerClubStudioPage,
  OwnerDashboardPage,
  OwnerHistoryPage,
  OwnerLoginPage,
  OwnerRegisterPage,
} from '../pages'

export function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<ClubsPage />} />
        <Route path="/clubs/:clubId" element={<ClubDetailsPage />} />

        <Route path="/owner/login" element={<OwnerLoginPage />} />
        <Route path="/owner/register" element={<OwnerRegisterPage />} />
        <Route
          path="/owner/dashboard"
          element={
            <ProtectedRoute>
              <OwnerDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/history"
          element={
            <ProtectedRoute>
              <OwnerHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/studio"
          element={
            <ProtectedRoute>
              <OwnerClubStudioPage />
            </ProtectedRoute>
          }
        />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  )
}
