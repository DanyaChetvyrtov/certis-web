import {apiRequest} from '../../../shared/api/client'
import type {TransactionType} from './transactionsApi'

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
    apiRequest<RecurringTransaction[]>(
        RECURRING_TRANSACTIONS_PATH,
        {
            signal,
            fallbackMessage: 'We could not load your recurring transactions. Please try again.',
        },
    )

export const createRecurringTransaction = (
    request: RecurringTransactionRequest,
) => apiRequest<RecurringTransaction>(RECURRING_TRANSACTIONS_PATH, {
    method: 'POST',
    body: request,
    fallbackMessage: 'We could not create this schedule. Please try again.',
})

export const updateRecurringTransaction = (
    id: string,
    request: UpdateRecurringTransactionRequest,
) => apiRequest<RecurringTransaction>(recurringTransactionPath(id), {
    method: 'PUT',
    body: request,
    fallbackMessage: 'We could not update this schedule. Please try again.',
})

export const cancelRecurringTransaction = (id: string) =>
    apiRequest(recurringTransactionPath(id), {
        method: 'DELETE',
        fallbackMessage: 'We could not cancel this schedule. Please try again.',
    })
