import {
    useEffect,
    useRef,
    useState,
} from 'react'
import type {Currency} from '../../../shared/currency'
import {
    getMonthlyTransactionAnalytics,
} from '../../transactions/api/transactionsApi'
import type {
    MonthlyTransactionAnalytics,
} from '../../transactions/api/transactionsApi'

export type MonthlyAnalyticsLoadState =
    | 'idle'
    | 'loading'
    | 'ready'
    | 'error'

export function useMonthlyTransactionAnalytics(
    month: string,
    currency: Currency,
    enabled: boolean,
    refreshRevision = 0,
) {
    const [analytics, setAnalytics] =
        useState<MonthlyTransactionAnalytics | null>(null)
    const [loadState, setLoadState] =
        useState<MonthlyAnalyticsLoadState>(enabled ? 'loading' : 'idle')
    const loadRequestIdRef = useRef(0)

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

            void getMonthlyTransactionAnalytics(
                {month, currency},
            ).then(
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
    }, [currency, enabled, month, refreshRevision])

    return {
        analytics,
        loadState,
    }
}
