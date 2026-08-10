import {
    http,
    HttpResponse,
} from 'msw'
import {
    describe,
    expect,
    it,
} from 'vitest'
import {server} from '../../../test/server'
import {
    createTransaction,
    deleteTransaction,
    getAllTransactions,
    getTransactions,
    updateTransaction,
} from './transactionsApi'

const transaction = {
    id: 'transaction-id',
    accountId: 'account-id',
    type: 'EXPENSE' as const,
    amount: 42.5,
    categoryId: 'category-id',
    merchant: 'Coffee shop',
    note: 'Lunch',
    date: '2026-08-08T12:30:00Z',
    createdAt: '2026-08-08T12:31:00Z',
    recurringTransactionId: null,
}

const transactionRequest = {
    accountId: transaction.accountId,
    type: transaction.type,
    amount: transaction.amount,
    categoryId: transaction.categoryId,
    merchant: transaction.merchant,
    note: transaction.note,
    date: transaction.date,
}

describe('transactionsApi', () => {
    it('loads a filtered page using the backend query contract', async () => {
        server.use(
            http.get('/api/v1/transactions', ({request}) => {
                const query = new URL(request.url).searchParams

                expect(query.get('accountId')).toBe('account-id')
                expect(query.get('categoryId')).toBe('category-id')
                expect(query.get('type')).toBe('EXPENSE')
                expect(query.get('from')).toBe('2026-08-01T00:00:00Z')
                expect(query.get('to')).toBe('2026-08-09T23:59:59Z')
                expect(query.get('page')).toBe('2')
                expect(query.get('size')).toBe('50')

                return HttpResponse.json({
                    items: [transaction],
                    page: 2,
                    size: 50,
                    totalElements: 101,
                    totalPages: 3,
                })
            }),
        )

        await expect(getTransactions({
            accountId: 'account-id',
            categoryId: 'category-id',
            type: 'EXPENSE',
            from: '2026-08-01T00:00:00Z',
            to: '2026-08-09T23:59:59Z',
            page: 2,
            size: 50,
        })).resolves.toMatchObject({
            items: [transaction],
            totalPages: 3,
        })
    })

    it('loads every page needed by the transaction overview', async () => {
        const requestedPages: string[] = []

        server.use(
            http.get('/api/v1/transactions', ({request}) => {
                const page = new URL(request.url)
                    .searchParams
                    .get('page') ?? '0'

                requestedPages.push(page)

                return HttpResponse.json({
                    items: [{
                        ...transaction,
                        id: `transaction-${page}`,
                    }],
                    page: Number(page),
                    size: 100,
                    totalElements: 3,
                    totalPages: 3,
                })
            }),
        )

        const result = await getAllTransactions()

        expect(result.map((item) => item.id)).toEqual([
            'transaction-0',
            'transaction-1',
            'transaction-2',
        ])
        expect(requestedPages.sort()).toEqual(['0', '1', '2'])
    })

    it('creates and updates transactions using the same request shape', async () => {
        const requestBodies: unknown[] = []

        server.use(
            http.post('/api/v1/transactions', async ({request}) => {
                requestBodies.push(await request.json())
                return HttpResponse.json(transaction, {status: 201})
            }),
            http.put(
                '/api/v1/transactions/:transactionId',
                async ({params, request}) => {
                    expect(params.transactionId).toBe(transaction.id)
                    requestBodies.push(await request.json())
                    return HttpResponse.json(transaction)
                },
            ),
        )

        await expect(
            createTransaction(transactionRequest),
        ).resolves.toEqual(transaction)

        await expect(
            updateTransaction(transaction.id, transactionRequest),
        ).resolves.toEqual(transaction)

        expect(requestBodies).toEqual([
            transactionRequest,
            transactionRequest,
        ])
    })

    it('deletes a transaction with DELETE', async () => {
        server.use(
            http.delete(
                '/api/v1/transactions/:transactionId',
                ({params}) => {
                    expect(params.transactionId).toBe(transaction.id)
                    return new HttpResponse(null, {status: 204})
                },
            ),
        )

        await expect(
            deleteTransaction(transaction.id),
        ).resolves.toBeUndefined()
    })
})
