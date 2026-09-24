import {useEffect, useMemo, useState} from 'react'
import {useLocation, useSearchParams} from 'react-router-dom'
import type {Currency} from '../../../features/accounts/api/accountsApi'
import {rememberTransactionsDestination} from '../../../features/transaction-navigation'
import {
    getDefaultCustomPeriod,
    getDefaultSpendingCurrency,
    parseLocalDate,
    parseTransactionFilters,
    resolveTransactionFilters,
    serializeTransactionFilters,
} from './transactionFilters'
import type {CustomPeriod, TransactionFilterState} from './transactionFilters'
import type {LoadState} from './useTransactionsData'

export type TransactionView = 'HISTORY' | 'RECURRING'

export function useTransactionUrlState(profileId: string | undefined) {
    const [searchParams, setSearchParams] = useSearchParams()
    const location = useLocation()
    const [anchorDate] = useState(() => new Date())
    const parsedFilters = useMemo(
        () => parseTransactionFilters(searchParams, anchorDate),
        [searchParams, anchorDate],
    )
    const activeView: TransactionView = searchParams.get('view') === 'recurring'
        ? 'RECURRING' : 'HISTORY'
    const setActiveView = (view: TransactionView) => {
        const nextParams = new URLSearchParams(searchParams)
        if (view === 'RECURRING') nextParams.set('view', 'recurring')
        else nextParams.delete('view')
        rememberTransactionsDestination(profileId, nextParams)
        setSearchParams(nextParams)
    }
    useEffect(() => {
        rememberTransactionsDestination(profileId, searchParams)
    }, [profileId, searchParams])
    return {
        searchParams,
        setSearchParams,
        locationKey: location.key,
        anchorDate,
        parsedFilters,
        activeView,
        setActiveView,
    }
}

export function useTransactionFilterControls({
    searchParams,
    setSearchParams,
    locationKey,
    anchorDate,
    profileId,
    filters,
    preferredCurrency,
    spendingCurrencyOptions,
    resourceState,
    resultsMatchFilters,
}: {
    searchParams: URLSearchParams
    setSearchParams: ReturnType<typeof useSearchParams>[1]
    locationKey: string
    anchorDate: Date
    profileId: string | undefined
    filters: TransactionFilterState
    preferredCurrency: Currency
    spendingCurrencyOptions: Currency[]
    resourceState: LoadState
    resultsMatchFilters: boolean
}) {
    const [lastCustomPeriod, setLastCustomPeriod] = useState<CustomPeriod>(
        () => getDefaultCustomPeriod(anchorDate),
    )
    const [customPeriodDraftState, setCustomPeriodDraftState] = useState<{
        key: string, value: CustomPeriod
    }>(() => ({key: '', value: getDefaultCustomPeriod(anchorDate)}))
    const customPeriodDraftKey = [
        locationKey, filters.period, filters.customPeriod.from, filters.customPeriod.to,
    ].join(':')
    const customPeriodDraft = customPeriodDraftState.key === customPeriodDraftKey
        ? customPeriodDraftState.value : filters.customPeriod
    const setCustomPeriodDraft = (value: CustomPeriod) => {
        setCustomPeriodDraftState({key: customPeriodDraftKey, value})
    }
    const customPeriodStart = parseLocalDate(customPeriodDraft.from)
    const customPeriodEnd = parseLocalDate(customPeriodDraft.to)
    const customPeriodIsReversed = Boolean(
        customPeriodStart && customPeriodEnd && customPeriodStart > customPeriodEnd,
    )
    const canApplyCustomPeriod = Boolean(
        customPeriodStart && customPeriodEnd && !customPeriodIsReversed
        && (filters.customPeriod.from !== customPeriodDraft.from
            || filters.customPeriod.to !== customPeriodDraft.to),
    )
    const defaultSpendingCurrency = getDefaultSpendingCurrency(
        spendingCurrencyOptions, preferredCurrency,
    )
    const canonicalFilters = useMemo(() => resolveTransactionFilters(filters, {
        currencies: resultsMatchFilters ? spendingCurrencyOptions : undefined,
        preferredCurrency,
    }), [filters, preferredCurrency, resultsMatchFilters, spendingCurrencyOptions])

    useEffect(() => {
        if (resourceState !== 'ready') return
        const nextParams = serializeTransactionFilters(
            searchParams, canonicalFilters,
            resultsMatchFilters ? defaultSpendingCurrency : preferredCurrency,
        )
        if (nextParams.toString() !== searchParams.toString()) {
            rememberTransactionsDestination(profileId, nextParams)
            setSearchParams(nextParams, {replace: true})
        }
    }, [
        canonicalFilters, defaultSpendingCurrency, preferredCurrency,
        profileId, resourceState, resultsMatchFilters, searchParams, setSearchParams,
    ])

    const updateFilters = (
        changes: Partial<TransactionFilterState>, replace = false,
    ) => {
        const nextParams = serializeTransactionFilters(
            searchParams, {...canonicalFilters, ...changes}, defaultSpendingCurrency,
        )
        rememberTransactionsDestination(profileId, nextParams)
        setSearchParams(nextParams, {replace})
    }

    return {
        lastCustomPeriod,
        setLastCustomPeriod,
        customPeriodDraft,
        setCustomPeriodDraft,
        customPeriodIsReversed,
        canApplyCustomPeriod,
        defaultSpendingCurrency,
        canonicalFilters,
        updateFilters,
    }
}
