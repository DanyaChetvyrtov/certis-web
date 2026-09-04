import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react'
import {
    getTransactions,
} from '../../transactions/api/transactionsApi'
import type {
    Transaction,
} from '../../transactions/api/transactionsApi'

export type RecentTransactionsLoadState =
    | 'idle'
    | 'loading'
    | 'ready'
    | 'error'

const RECENT_TRANSACTION_LIMIT = 3

export function useRecentTransactions(enabled: boolean) {
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loadState, setLoadState] =
        useState<RecentTransactionsLoadState>(enabled ? 'loading' : 'idle')
    const [reloadRevision, setReloadRevision] = useState(0)
    const loadRequestIdRef = useRef(0)

    useEffect(() => {
        let isActive = true
        const requestId = ++loadRequestIdRef.current

        queueMicrotask(() => {
            if (!isActive) {
                return
            }

            if (!enabled) {
                setTransactions([])
                setLoadState('idle')
                return
            }

            setTransactions([])
            setLoadState('loading')

            // With no business filters, the API returns the user's newest
            // non-deleted transactions across every account and currency.
            void getTransactions(
                {
                    page: 0,
                    size: RECENT_TRANSACTION_LIMIT,
                },
            ).then(
                (response) => {
                    if (isActive && requestId === loadRequestIdRef.current) {
                        setTransactions(response.items)
                        setLoadState('ready')
                    }
                },
                () => {
                    if (isActive && requestId === loadRequestIdRef.current) {
                        setTransactions([])
                        setLoadState('error')
                    }
                },
            )
        })

        return () => {
            isActive = false
            loadRequestIdRef.current += 1
        }
    }, [enabled, reloadRevision])

    const reload = useCallback(() => {
        setReloadRevision((current) => current + 1)
    }, [])

    return {
        transactions,
        loadState,
        reload,
    }
}
