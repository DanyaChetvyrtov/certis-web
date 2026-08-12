import {apiRequest} from '../../../shared/api/client'

export const transactionTypes = [
    'EXPENSE',
    'INCOME',
] as const

export type TransactionType =
    (typeof transactionTypes)[number]

export type Transaction = {
    id: string
    accountId: string
    type: TransactionType
    amount: number
    categoryId?: string | null
    merchant?: string | null
    note?: string | null
    occurredAt: string
    createdAt: string
    updatedAt: string
    recurringTransactionTemplateId?: string | null
    scheduledFor?: string | null
}

export type TransactionRequest = {
    accountId: string
    type: TransactionType
    amount: number
    categoryId: string | null
    merchant: string | null
    note: string | null
    occurredAt: string
}

export type TransactionFilters = {
    accountId?: string
    categoryId?: string
    type?: TransactionType
    from?: string
    to?: string
    page?: number
    size?: number
}

export type TransactionPage = {
    items: Transaction[]
    page: number
    size: number
    totalElements: number
    totalPages: number
}

const TRANSACTIONS_PATH = '/api/v1/transactions'
const MAX_PAGE_SIZE = 100

const transactionPath = (
    transactionId: string,
): string =>
    `${TRANSACTIONS_PATH}/${transactionId}`

const addQueryParameter = (
    query: URLSearchParams,
    key: string,
    value: string | number | undefined,
): void => {
    if (value !== undefined && value !== '') {
        query.set(key, String(value))
    }
}

const transactionsPath = (
    filters: TransactionFilters,
): string => {
    const query = new URLSearchParams()

    addQueryParameter(query, 'accountId', filters.accountId)
    addQueryParameter(query, 'categoryId', filters.categoryId)
    addQueryParameter(query, 'type', filters.type)
    addQueryParameter(query, 'from', filters.from)
    addQueryParameter(query, 'to', filters.to)
    addQueryParameter(query, 'page', filters.page)
    addQueryParameter(query, 'size', filters.size)

    const queryString = query.toString()

    return queryString
        ? `${TRANSACTIONS_PATH}?${queryString}`
        : TRANSACTIONS_PATH
}

export const getTransactions = (
    filters: TransactionFilters = {},
    signal?: AbortSignal,
) =>
    apiRequest<TransactionPage>(
        transactionsPath(filters),
        {
            signal,
            fallbackMessage: 'We could not load your transactions. Please try again.',
        },
    )

export const getAllTransactions = async (
    filters: Omit<TransactionFilters, 'page' | 'size'> = {},
    signal?: AbortSignal,
): Promise<Transaction[]> => {
    const firstPage = await getTransactions({
        ...filters,
        page: 0,
        size: MAX_PAGE_SIZE,
    }, signal)

    if (firstPage.totalPages <= 1) {
        return firstPage.items
    }

    const remainingPages = await Promise.all(
        Array.from(
            {length: firstPage.totalPages - 1},
            (_, index) => getTransactions({
                ...filters,
                page: index + 1,
                size: MAX_PAGE_SIZE,
            }, signal),
        ),
    )

    return [
        ...firstPage.items,
        ...remainingPages.flatMap((page) => page.items),
    ]
}

export const createTransaction = (
    request: TransactionRequest,
) =>
    apiRequest<Transaction>(TRANSACTIONS_PATH, {
        method: 'POST',
        body: request,
        fallbackMessage: 'We could not create this transaction. Please try again.',
    })

export const updateTransaction = (
    transactionId: string,
    request: TransactionRequest,
) =>
    apiRequest<Transaction>(transactionPath(transactionId), {
        method: 'PUT',
        body: request,
        fallbackMessage: 'We could not update this transaction. Please try again.',
    })

export const deleteTransaction = (
    transactionId: string,
) =>
    apiRequest(transactionPath(transactionId), {
        method: 'DELETE',
        fallbackMessage: 'We could not delete this transaction. Please try again.',
    })
