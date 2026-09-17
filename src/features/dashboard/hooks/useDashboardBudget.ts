import {useEffect, useRef, useState} from 'react'
import {getBudget} from '../../budgets/api/budgetsApi'
import type {Budget} from '../../budgets/api/budgetsApi'
import type {Currency} from '../../../shared/currency'

export type DashboardBudgetLoadState = 'idle' | 'loading' | 'ready' | 'error'

export function useDashboardBudget(
    month: string,
    currency: Currency,
    enabled: boolean,
    refreshRevision = 0,
) {
    const [budget, setBudget] = useState<Budget | null>(null)
    const [loadState, setLoadState] = useState<DashboardBudgetLoadState>(enabled ? 'loading' : 'idle')
    const loadRequestIdRef = useRef(0)

    useEffect(() => {
        let isActive = true
        const requestId = ++loadRequestIdRef.current
        const controller = new AbortController()

        queueMicrotask(() => {
            if (!isActive) return

            if (!enabled) {
                setBudget(null)
                setLoadState('idle')
                return
            }

            setBudget(null)
            setLoadState('loading')

            void getBudget(month, controller.signal).then(
                (response) => {
                    if (!isActive || requestId !== loadRequestIdRef.current) return

                    // The legacy operational budget endpoint is month-scoped only.
                    // Never render a budget under a different dashboard currency.
                    setBudget(response?.currency === currency ? response : null)
                    setLoadState('ready')
                },
                () => {
                    if (controller.signal.aborted) return
                    if (isActive && requestId === loadRequestIdRef.current) {
                        setBudget(null)
                        setLoadState('error')
                    }
                },
            )
        })

        return () => {
            isActive = false
            controller.abort()
            loadRequestIdRef.current += 1
        }
    }, [currency, enabled, month, refreshRevision])

    return {budget, loadState}
}
