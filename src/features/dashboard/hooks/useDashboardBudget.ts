import {useEffect, useRef, useState} from 'react'
import {getBudget} from '../../budgets/api/budgetsApi'
import type {Budget} from '../../budgets/api/budgetsApi'
import type {Currency} from '../../../shared/currency'

type BudgetState = 'idle' | 'loading' | 'ready' | 'missing' | 'currency-mismatch' | 'error'
type LoadedBudget = {key: string; budget: Budget | null; state: BudgetState}

/** The operational budget endpoint is currently month-scoped. Never render another currency's budget. */
export function useDashboardBudget(month: string, currency: Currency, enabled: boolean, refreshRevision = 0) {
    const key = `${month}:${currency}:${refreshRevision}`
    const [loaded, setLoaded] = useState<LoadedBudget | null>(null)
    const [retryRevision, setRetryRevision] = useState(0)
    const requestId = useRef(0)

    useEffect(() => {
        let cancelled = false
        const controller = new AbortController()
        const id = ++requestId.current
        queueMicrotask(() => {
            if (cancelled) return
            if (!enabled) {
                setLoaded({key, budget: null, state: 'idle'})
                return
            }
            setLoaded({key, budget: null, state: 'loading'})
            void getBudget(month, controller.signal).then((budget) => {
                if (cancelled || id !== requestId.current) return
                if (!budget) {
                    setLoaded({key, budget: null, state: 'missing'})
                } else if (budget.currency !== currency) {
                    setLoaded({key, budget: null, state: 'currency-mismatch'})
                } else {
                    setLoaded({key, budget, state: 'ready'})
                }
            }, () => {
                if (cancelled || controller.signal.aborted) return
                if (id === requestId.current) {
                    setLoaded({key, budget: null, state: 'error'})
                }
            })
        })
        return () => {
            cancelled = true
            controller.abort()
            requestId.current += 1
        }
    }, [currency, enabled, key, month, retryRevision])

    const current = loaded?.key === key ? loaded : null
    return {
        budget: current?.budget ?? null,
        loadState: current?.state ?? (enabled ? 'loading' : 'idle'),
        retry: () => setRetryRevision(value => value + 1),
    }
}
