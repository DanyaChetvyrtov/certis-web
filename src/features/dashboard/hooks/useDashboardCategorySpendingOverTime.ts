import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react'
import {
    getCategorySpendingOverTime,
} from '../../categories/api/categoriesApi'
import type {
    CategorySpendingOverTime,
} from '../../categories/api/categoriesApi'
import type {Currency} from '../../../shared/currency'

export type DashboardCategorySpendingOverTimeLoadState =
    | 'idle'
    | 'loading'
    | 'ready'
    | 'error'

export function useDashboardCategorySpendingOverTime(
    month: string,
    currency: Currency,
    enabled: boolean,
    refreshKey?: unknown,
) {
    const [spendingOverTime, setSpendingOverTime] =
        useState<CategorySpendingOverTime | null>(null)
    const [loadState, setLoadState] =
        useState<DashboardCategorySpendingOverTimeLoadState>(
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
                setSpendingOverTime(null)
                setLoadState('idle')
                return
            }

            setSpendingOverTime(null)
            setLoadState('loading')

            void getCategorySpendingOverTime({
                month,
                currency,
                type: 'EXPENSE',
                bucketCount: 6,
                topLimit: 4,
            }).then(
                (response) => {
                    if (isActive && requestId === loadRequestIdRef.current) {
                        setSpendingOverTime(response)
                        setLoadState('ready')
                    }
                },
                () => {
                    if (isActive && requestId === loadRequestIdRef.current) {
                        setSpendingOverTime(null)
                        setLoadState('error')
                    }
                },
            )
        })

        return () => {
            isActive = false
            loadRequestIdRef.current += 1
        }
    }, [currency, enabled, month, refreshKey, retryRevision])

    return {
        spendingOverTime,
        loadState,
        reload,
    }
}
