import type {Currency} from '../../shared/currency'
import type {TransactionType} from './api/transactionsApi'

export type ActivityType = 'ALL' | TransactionType | 'TRANSFER'
export type PeriodPreset =
    | 'THIS_MONTH'
    | 'LAST_30_DAYS'
    | 'CUSTOM'
    | 'ALL_TIME'

export type CustomPeriod = {
    from: string
    to: string
}

export type TransactionFilterState = {
    period: PeriodPreset
    customPeriod: CustomPeriod
    accountId: string
    categoryId: string
    activityType: ActivityType
    searchQuery: string
    currency: Currency | null
}

export const periodPresets: PeriodPreset[] = [
    'THIS_MONTH',
    'LAST_30_DAYS',
    'CUSTOM',
    'ALL_TIME',
]

const filterKeys = [
    'period',
    'from',
    'to',
    'account',
    'category',
    'type',
    'q',
    'currency',
] as const

const periodQueryValues: Record<PeriodPreset, string> = {
    THIS_MONTH: 'this-month',
    LAST_30_DAYS: 'last-30-days',
    CUSTOM: 'custom',
    ALL_TIME: 'all-time',
}

const activityQueryValues: Record<ActivityType, string> = {
    ALL: 'all',
    INCOME: 'income',
    EXPENSE: 'expense',
    TRANSFER: 'transfer',
}

const currencies: Currency[] = ['RUB', 'EUR', 'USD']

const toDateInputValue = (date: Date): string => [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
].join('-')

export const parseLocalDate = (value: string): Date | undefined => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return undefined
    }

    const [year, month, day] = value.split('-').map(Number)
    const date = new Date(year, month - 1, day)

    return date.getFullYear() === year
        && date.getMonth() === month - 1
        && date.getDate() === day
        ? date
        : undefined
}

export const getDefaultCustomPeriod = (anchorDate: Date): CustomPeriod => ({
    from: toDateInputValue(new Date(
        anchorDate.getFullYear(),
        anchorDate.getMonth(),
        1,
    )),
    to: toDateInputValue(anchorDate),
})

export const getDefaultTransactionFilters = (
    anchorDate: Date,
): TransactionFilterState => ({
    period: 'THIS_MONTH',
    customPeriod: getDefaultCustomPeriod(anchorDate),
    accountId: '',
    categoryId: '',
    activityType: 'ALL',
    searchQuery: '',
    currency: null,
})

export const parseTransactionFilters = (
    params: URLSearchParams,
    anchorDate: Date,
): TransactionFilterState => {
    const defaults = getDefaultTransactionFilters(anchorDate)
    const period = periodPresets.find(
        (value) => periodQueryValues[value] === params.get('period'),
    ) ?? defaults.period
    const from = params.get('from') ?? ''
    const to = params.get('to') ?? ''
    const start = parseLocalDate(from)
    const end = parseLocalDate(to)
    const validCustomPeriod = period === 'CUSTOM'
        && start
        && end
        && start <= end
    const activityType = (Object.keys(activityQueryValues) as ActivityType[])
        .find((value) => activityQueryValues[value] === params.get('type'))
        ?? 'ALL'
    const currency = currencies.find(
        (value) => value === params.get('currency'),
    ) ?? null

    return {
        period: period === 'CUSTOM' && !validCustomPeriod
            ? 'THIS_MONTH'
            : period,
        customPeriod: validCustomPeriod
            ? {from, to}
            : defaults.customPeriod,
        accountId: params.get('account') ?? '',
        categoryId: params.get('category') ?? '',
        activityType,
        searchQuery: params.get('q') ?? '',
        currency,
    }
}

export const getDefaultSpendingCurrency = (
    options: readonly Currency[],
    preferredCurrency: Currency,
): Currency =>
    options.includes(preferredCurrency)
        ? preferredCurrency
        : options[0] ?? preferredCurrency

export const resolveTransactionFilters = (
    filters: TransactionFilterState,
    options: {
        accountIds?: readonly string[]
        categoryIds?: readonly string[]
        currencies?: readonly Currency[]
        preferredCurrency: Currency
    },
): TransactionFilterState => {
    const defaultCurrency = options.currencies
        ? getDefaultSpendingCurrency(
            options.currencies,
            options.preferredCurrency,
        )
        : options.preferredCurrency

    return {
        ...filters,
        accountId: options.accountIds
            && !options.accountIds.includes(filters.accountId)
            ? ''
            : filters.accountId,
        categoryId: options.categoryIds
            && !options.categoryIds.includes(filters.categoryId)
            ? ''
            : filters.categoryId,
        currency: filters.currency
            && (!options.currencies
                || options.currencies.includes(filters.currency))
            && filters.currency !== defaultCurrency
            ? filters.currency
            : null,
    }
}

export const serializeTransactionFilters = (
    params: URLSearchParams,
    filters: TransactionFilterState,
    defaultCurrency: Currency,
): URLSearchParams => {
    const nextParams = new URLSearchParams(params)

    filterKeys.forEach((key) => nextParams.delete(key))

    if (filters.period !== 'THIS_MONTH') {
        nextParams.set('period', periodQueryValues[filters.period])
    }

    if (filters.period === 'CUSTOM') {
        nextParams.set('from', filters.customPeriod.from)
        nextParams.set('to', filters.customPeriod.to)
    }

    if (filters.accountId) nextParams.set('account', filters.accountId)
    if (filters.categoryId) nextParams.set('category', filters.categoryId)
    if (filters.activityType !== 'ALL') {
        nextParams.set('type', activityQueryValues[filters.activityType])
    }
    if (filters.searchQuery) nextParams.set('q', filters.searchQuery)
    if (filters.currency && filters.currency !== defaultCurrency) {
        nextParams.set('currency', filters.currency)
    }

    return nextParams
}

export const hasActiveTransactionFilters = (
    filters: TransactionFilterState,
): boolean =>
    filters.period !== 'THIS_MONTH'
    || Boolean(filters.accountId)
    || Boolean(filters.categoryId)
    || filters.activityType !== 'ALL'
    || Boolean(filters.searchQuery)
    || Boolean(filters.currency)
