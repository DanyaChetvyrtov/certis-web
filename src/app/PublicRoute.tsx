import {
    Navigate,
    Outlet,
} from 'react-router-dom'
import {useSession} from '../features/auth/session/SessionContext'
import {SessionCheckPage} from '../pages/SessionCheckPage'

export function PublicRoute() {
    const {retry, status} = useSession()

    if (status === 'checking') {
        return <SessionCheckPage/>
    }

    if (status === 'unavailable') {
        return (
            <SessionCheckPage
                hasError
                onRetry={() => void retry()}
            />
        )
    }

    if (status === 'authenticated') {
        return (
            <Navigate
                to="/dashboard"
                replace
            />
        )
    }

    return <Outlet/>
}