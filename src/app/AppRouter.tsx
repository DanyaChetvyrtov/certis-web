import {
    lazy,
    Suspense,
} from 'react'
import {
    Navigate,
    Route,
    Routes,
} from 'react-router-dom'
import {AuthPage} from '../features/auth/pages/AuthPage'
import {SessionCheckPage} from '../pages/SessionCheckPage'
import {ProtectedRoute} from './ProtectedRoute'
import {PublicRoute} from './PublicRoute'

const DashboardPage = lazy(() =>
    import('../pages/DashboardPage').then((module) => ({
        default: module.DashboardPage,
    })),
)

const AccountsPage = lazy(() =>
    import('../features/accounts/pages/AccountsPage').then(
        (module) => ({
            default: module.AccountsPage,
        }),
    ),
)

const CategoriesPage = lazy(() =>
    import('../features/categories/pages/CategoriesPage').then(
        (module) => ({
            default: module.CategoriesPage,
        }),
    ),
)

export function AppRouter() {
    return (
        <Routes>
            <Route element={<PublicRoute/>}>
                <Route
                    path="/"
                    element={<AuthPage/>}
                />
            </Route>

            <Route element={<ProtectedRoute/>}>
                <Route
                    path="/dashboard"
                    element={
                        <Suspense fallback={<SessionCheckPage/>}>
                            <DashboardPage/>
                        </Suspense>
                    }
                />

                <Route
                    path="/accounts"
                    element={
                        <Suspense fallback={<SessionCheckPage/>}>
                            <AccountsPage/>
                        </Suspense>
                    }
                />

                <Route
                    path="/categories"
                    element={
                        <Suspense fallback={<SessionCheckPage/>}>
                            <CategoriesPage/>
                        </Suspense>
                    }
                />
            </Route>

            <Route
                path="*"
                element={
                    <Navigate to="/" replace/>
                }
            />
        </Routes>
    )
}
