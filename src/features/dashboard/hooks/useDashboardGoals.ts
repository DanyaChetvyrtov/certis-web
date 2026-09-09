import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react'
import type {Currency} from '../../../shared/currency'
import {getGoals} from '../../goals/api/goalsApi'
import type {Goal} from '../../goals/api/goalsApi'

export type DashboardGoalsLoadState =
    | 'idle'
    | 'loading'
    | 'ready'
    | 'error'

const DASHBOARD_GOAL_LIMIT = 2

export function useDashboardGoals(currency: Currency, enabled: boolean) {
    const [goals, setGoals] = useState<Goal[]>([])
    const [totalGoals, setTotalGoals] = useState(0)
    const [loadState, setLoadState] = useState<DashboardGoalsLoadState>(
        enabled ? 'loading' : 'idle',
    )
    const [reloadRevision, setReloadRevision] = useState(0)
    const loadRequestIdRef = useRef(0)

    useEffect(() => {
        let isActive = true
        const requestId = ++loadRequestIdRef.current

        queueMicrotask(() => {
            if (!isActive) return

            if (!enabled) {
                setGoals([])
                setTotalGoals(0)
                setLoadState('idle')
                return
            }

            setGoals([])
            setTotalGoals(0)
            setLoadState('loading')

            void getGoals({
                currency,
                status: 'ACTIVE',
                sort: 'TARGET_MONTH_ASC',
                page: 0,
                size: DASHBOARD_GOAL_LIMIT,
            }).then(
                (response) => {
                    if (isActive && requestId === loadRequestIdRef.current) {
                        setGoals(response.items)
                        setTotalGoals(response.totalElements)
                        setLoadState('ready')
                    }
                },
                () => {
                    if (isActive && requestId === loadRequestIdRef.current) {
                        setGoals([])
                        setTotalGoals(0)
                        setLoadState('error')
                    }
                },
            )
        })

        return () => {
            isActive = false
            loadRequestIdRef.current += 1
        }
    }, [currency, enabled, reloadRevision])

    const reload = useCallback(() => {
        setReloadRevision((current) => current + 1)
    }, [])

    return {
        goals,
        totalGoals,
        loadState,
        reload,
    }
}
