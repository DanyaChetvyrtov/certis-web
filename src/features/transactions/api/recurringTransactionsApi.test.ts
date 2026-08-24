import {http, HttpResponse} from 'msw'
import {describe, expect, it} from 'vitest'
import {server} from '../../../test/server'
import {
    cancelRecurringTransaction,
    createRecurringTransaction,
    getRecurringTransactions,
    updateRecurringTransaction,
} from './recurringTransactionsApi'

const recurringTransaction = {
    id: 'recurring-id',
    accountId: 'account-id',
    categoryId: 'category-id',
    name: 'Apartment rent',
    type: 'EXPENSE' as const,
    amount: 35000,
    merchant: 'Landlord',
    note: null,
    status: 'ACTIVE' as const,
    frequency: 'MONTHLY' as const,
    intervalCount: 1,
    startDate: '2026-09-01',
    endDate: null,
    lastRunDate: null,
    nextRunDate: '2026-09-01',
    createdAt: '2026-08-12T18:00:00Z',
    updatedAt: '2026-08-12T18:00:00Z',
}

const request = {
    accountId: recurringTransaction.accountId,
    categoryId: recurringTransaction.categoryId,
    name: recurringTransaction.name,
    type: recurringTransaction.type,
    amount: recurringTransaction.amount,
    merchant: recurringTransaction.merchant,
    note: recurringTransaction.note,
    frequency: recurringTransaction.frequency,
    intervalCount: recurringTransaction.intervalCount,
    startDate: recurringTransaction.startDate,
    endDate: recurringTransaction.endDate,
}

describe('recurringTransactionsApi', () => {
    it('loads recurring transaction templates', async () => {
        server.use(http.get(
            '/api/v1/recurring-transactions',
            () => HttpResponse.json([recurringTransaction]),
        ))

        await expect(getRecurringTransactions())
            .resolves.toEqual([recurringTransaction])
    })

    it('creates and updates a recurring transaction', async () => {
        const bodies: unknown[] = []

        server.use(
            http.post('/api/v1/recurring-transactions', async ({request: apiRequest}) => {
                bodies.push(await apiRequest.json())
                return HttpResponse.json(recurringTransaction, {status: 201})
            }),
            http.put('/api/v1/recurring-transactions/:id', async ({request: apiRequest}) => {
                bodies.push(await apiRequest.json())
                return HttpResponse.json(recurringTransaction)
            }),
        )

        await createRecurringTransaction(request)
        await updateRecurringTransaction(recurringTransaction.id, {
            ...request,
            status: 'PAUSED',
        })

        expect(bodies).toEqual([
            request,
            {...request, status: 'PAUSED'},
        ])
    })

    it('cancels a recurring transaction with DELETE', async () => {
        server.use(http.delete(
            '/api/v1/recurring-transactions/:id',
            () => new HttpResponse(null, {status: 204}),
        ))

        await expect(cancelRecurringTransaction(recurringTransaction.id))
            .resolves.toBeUndefined()
    })
})
