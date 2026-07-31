import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import { useSession } from '../features/auth/session/SessionContext'
import { SessionCheckPage } from '../pages/SessionCheckPage'

export function ProtectedRoute() {
  const navigate = useNavigate()
  const { retry, status } = useSession()

  if (status === 'checking') {
    return <SessionCheckPage />
  }

  if (status === 'unavailable') {
    return (
      <SessionCheckPage
        hasError
        onRetry={() => void retry()}
        onBack={() => navigate('/', { replace: true })}
      />
    )
  }

  if (status === 'unauthenticated') {
    return (
      <Navigate
        to="/"
        replace
        state={{ notice: 'Your session could not be verified. Sign in again.' }}
      />
    )
  }

  return <Outlet />
}
