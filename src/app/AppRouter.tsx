import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthPage } from '../features/auth/pages/AuthPage'
import { DashboardPage } from '../pages/DashboardPage'
import { ProtectedRoute } from './ProtectedRoute'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<AuthPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
