import type { ReactElement } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../../features/auth'

export function ProtectedRoute({ children }: { children: ReactElement }) {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/owner/login" replace />
  }

  return children
}
