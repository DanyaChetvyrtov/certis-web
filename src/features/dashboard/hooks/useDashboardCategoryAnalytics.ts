import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react'
import {
    getCategoryAnalytics,
} from '../../categories/api/categoriesApi'
import type {
    CategoryAnalytics,
} from '../../categories/api/categoriesApi'
import type {Currency} from '../../../shared/currency'

export type DashboardCategoryAnalyticsLoadState =
    | 'idle'
    | 'loading'
    | 'ready'
    | 'error'

export function useDashboardCategoryAnalytics(
    month: string,
    currency: Currency,
    enabled: boolean,
    refreshRevision = 0,
) {
    const [analytics, setAnalytics] =
        useState<CategoryAnalytics | null>(null)
    const [loadState, setLoadState] =
        useState<DashboardCategoryAnalyticsLoadState>(
            enabled ? 'loading' : 'idle',
        )
    const [retryRevision, setRetryRevision] = useState(0)
    const loadRequestIdRef = useRef(0)

    const reload = useCallback(() => {
        setRetryRevision((revision) => revision + 1)
    }, [])

    useEffect(() => {
        let isActive = true
        const requestId = ++loadRequestIdRef.current

        queueMicrotask(() => {
            if (!isActive) {
                return
            }

            if (!enabled) {
                setAnalytics(null)
                setLoadState('idle')
                return
            }

            setAnalytics(null)
            setLoadState('loading')

            void getCategoryAnalytics({
                month,
                currency,
                type: 'EXPENSE',
                topLimit: 4,
            }).then(
                (response) => {
                    if (isActive && requestId === loadRequestIdRef.current) {
                        setAnalytics(response)
                        setLoadState('ready')
                    }
                },
                () => {
                    if (isActive && requestId === loadRequestIdRef.current) {
                        setAnalytics(null)
                        setLoadState('error')
                    }
                },
            )
        })

        return () => {
            isActive = false
            loadRequestIdRef.current += 1
        }
    }, [currency, enabled, month, refreshRevision, retryRevision])

    return {
        analytics,
        loadState,
        reload,
    }
}
