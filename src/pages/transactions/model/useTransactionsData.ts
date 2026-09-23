import {useEffect, useMemo, useState} from 'react'
import type {Account, Currency} from '../../../features/accounts/api/accountsApi'
import {getAccounts} from '../../../features/accounts/api/accountsApi'
import type {Category} from '../../../features/categories/api/categoriesApi'
import {getAllCategoryCards} from '../../../features/categories/api/categoriesApi'
import type {Transaction} from '../../../features/transactions/api/transactionsApi'
import {getAllTransactions} from '../../../features/transactions/api/transactionsApi'
import type {Transfer} from '../../../features/transactions/api/transfersApi'
import {getTransfers} from '../../../features/transactions/api/transfersApi'
import {ApiError} from '../../../shared/api/ApiError'
import type {PeriodRange} from './selectors'
import {parseLocalDate, resolveTransactionFilters} from './transactionFilters'
import type {CustomPeriod, PeriodPreset, TransactionFilterState} from './transactionFilters'

export type LoadState = 'loading' | 'ready' | 'error'

const toYearMonth = (date: Date): string =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

const startOfLocalDay = (date: Date): Date =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate())

const endOfLocalDay = (date: Date): Date =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)

export const getPeriodRange = (
    period: PeriodPreset,
    anchorDate: Date,
    customPeriod: CustomPeriod,
): PeriodRange => {
    if (period === 'ALL_TIME') return {}
    if (period === 'CUSTOM') {
        const start = parseLocalDate(customPeriod.from)
        const endDate = parseLocalDate(customPeriod.to)
        if (!start || !endDate || start > endDate) return {}
        const end = endOfLocalDay(endDate)
        return {from: start.toISOString(), to: end.toISOString(), start, end}
    }
    const end = endOfLocalDay(anchorDate)
    const start = period === 'THIS_MONTH'
        ? new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1)
        : startOfLocalDay(new Date(
            anchorDate.getFullYear(), anchorDate.getMonth(), anchorDate.getDate() - 29,
        ))
    return {from: start.toISOString(), to: end.toISOString(), start, end}
}

const loadErrorMessage = (error: unknown, fallback: string): string =>
    error instanceof ApiError ? error.message : fallback

export function useTransactionsData({
    anchorDate,
    preferredCurrency,
    parsedFilters,
    loadErrorFallback,
}: {
    anchorDate: Date
    preferredCurrency: Currency
    parsedFilters: TransactionFilterState
    loadErrorFallback: string
}) {
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [transfers, setTransfers] = useState<Transfer[]>([])
    const [accounts, setAccounts] = useState<Account[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [resourceState, setResourceState] = useState<LoadState>('loading')
    const [transactionState, setTransactionState] = useState<LoadState>('loading')
    const [loadedQueryKey, setLoadedQueryKey] = useState('')
    const [loadError, setLoadError] = useState('')
    const [reloadRevision, setReloadRevision] = useState(0)

    const accountIds = useMemo(() => accounts.map(({id}) => id), [accounts])
    const categoryIds = useMemo(() => categories.map(({id}) => id), [categories])
    const filters = useMemo(() => resolveTransactionFilters(parsedFilters, {
        accountIds: resourceState === 'ready' ? accountIds : undefined,
        categoryIds: resourceState === 'ready' ? categoryIds : undefined,
        preferredCurrency,
    }), [accountIds, categoryIds, parsedFilters, preferredCurrency, resourceState])
    const periodRange = useMemo(() => getPeriodRange(
        filters.period, anchorDate, filters.customPeriod,
    ), [anchorDate, filters.period, filters.customPeriod])
    const transactionQueryKey = JSON.stringify([
        filters.accountId,
        filters.categoryId,
        periodRange.from,
        periodRange.to,
        reloadRevision,
    ])

    useEffect(() => {
        let isActive = true
        void Promise.all([
            getAccounts(),
            getAllCategoryCards({
                month: toYearMonth(anchorDate),
                currency: preferredCurrency,
                sort: 'NAME',
            }),
            getTransfers(),
        ]).then(
            ([loadedAccounts, loadedCategories, loadedTransfers]) => {
                if (!isActive) return
                setAccounts(loadedAccounts)
                setCategories(loadedCategories)
                setTransfers(loadedTransfers)
                setResourceState('ready')
            },
            (error: unknown) => {
                if (!isActive) return
                setLoadError(loadErrorMessage(error, loadErrorFallback))
                setResourceState('error')
            },
        )
        return () => { isActive = false }
    }, [anchorDate, preferredCurrency, reloadRevision, loadErrorFallback])

    useEffect(() => {
        if (resourceState !== 'ready') return
        let isActive = true
        void getAllTransactions({
            accountId: filters.accountId || undefined,
            categoryId: filters.categoryId || undefined,
            from: periodRange.from,
            to: periodRange.to,
        }).then(
            (loadedTransactions) => {
                if (!isActive) return
                setTransactions(loadedTransactions)
                setLoadedQueryKey(transactionQueryKey)
                setTransactionState('ready')
            },
            (error: unknown) => {
                if (!isActive) return
                setLoadError(loadErrorMessage(error, loadErrorFallback))
                setLoadedQueryKey(transactionQueryKey)
                setTransactionState('error')
            },
        )
        return () => { isActive = false }
    }, [
        filters.accountId,
        filters.categoryId,
        periodRange.from,
        periodRange.to,
        resourceState,
        transactionQueryKey,
        loadErrorFallback,
    ])

    const reloadWorkspace = () => {
        setLoadError('')
        setResourceState('loading')
        setTransactionState('loading')
        setReloadRevision((current) => current + 1)
    }

    const loadState: LoadState = resourceState === 'error'
        || (transactionState === 'error' && loadedQueryKey === transactionQueryKey)
        ? 'error'
        : resourceState === 'loading' || loadedQueryKey !== transactionQueryKey
            ? 'loading' : 'ready'

    return {
        transactions,
        setTransactions,
        transfers,
        setTransfers,
        accounts,
        categories,
        resourceState,
        transactionState,
        loadedQueryKey,
        transactionQueryKey,
        loadError,
        filters,
        periodRange,
        loadState,
        reloadWorkspace,
    }
}
