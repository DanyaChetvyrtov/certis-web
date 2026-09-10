import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import { useSession } from '../features/auth/session/SessionContext'
import { SessionCheckPage } from '../pages/SessionCheckPage'
import { useTranslation } from 'react-i18next'

export function ProtectedRoute() {
  const { t } = useTranslation()
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
        to="/auth#sign-in"
        replace
        state={{ notice: t('common.sessionVerifyError') }}
      />
    )
  }

  return <Outlet />
}
