import {apiRequest} from '../../../shared/api/client'
import type {TransactionType} from './transactionsApi'
import i18n from '../../../i18n/i18n'

export const recurringFrequencies = [
    'DAILY',
    'WEEKLY',
    'MONTHLY',
    'YEARLY',
] as const

export type RecurringFrequency =
    (typeof recurringFrequencies)[number]

export type RecurringStatus =
    | 'ACTIVE'
    | 'PAUSED'
    | 'COMPLETED'
    | 'CANCELLED'

export type RecurringTransaction = {
    id: string
    accountId: string
    categoryId?: string | null
    name: string
    type: TransactionType
    amount: number
    merchant?: string | null
    note?: string | null
    status: RecurringStatus
    frequency: RecurringFrequency
    intervalCount: number
    startDate: string
    endDate?: string | null
    lastRunDate?: string | null
    nextRunDate?: string | null
    createdAt: string
    updatedAt: string
}

type RecurringTransactionsResponse = {
    recurringTransactions: RecurringTransaction[]
}

export type RecurringTransactionRequest = {
    accountId: string
    categoryId: string | null
    name: string
    type: TransactionType
    amount: number
    merchant: string | null
    note: string | null
    frequency: RecurringFrequency
    intervalCount: number
    startDate: string
    endDate: string | null
}

export type UpdateRecurringTransactionRequest =
    RecurringTransactionRequest & {
        status: 'ACTIVE' | 'PAUSED'
    }

const RECURRING_TRANSACTIONS_PATH =
    '/api/v1/recurring-transactions'

const recurringTransactionPath = (id: string) =>
    `${RECURRING_TRANSACTIONS_PATH}/${id}`

export const getRecurringTransactions = (signal?: AbortSignal) =>
    apiRequest<RecurringTransactionsResponse>(
        RECURRING_TRANSACTIONS_PATH,
        {
            signal,
            fallbackMessage: i18n.t('transactions.api.recurringLoad'),
        },
    ).then((response) => response.recurringTransactions)

export const createRecurringTransaction = (
    request: RecurringTransactionRequest,
) => apiRequest<RecurringTransaction>(RECURRING_TRANSACTIONS_PATH, {
    method: 'POST',
    body: request,
    fallbackMessage: i18n.t('transactions.api.recurringCreate'),
})

export const updateRecurringTransaction = (
    id: string,
    request: UpdateRecurringTransactionRequest,
) => apiRequest<RecurringTransaction>(recurringTransactionPath(id), {
    method: 'PUT',
    body: request,
    fallbackMessage: i18n.t('transactions.api.recurringUpdate'),
})

export const cancelRecurringTransaction = (id: string) =>
    apiRequest(recurringTransactionPath(id), {
        method: 'DELETE',
        fallbackMessage: i18n.t('transactions.api.recurringCancel'),
    })
