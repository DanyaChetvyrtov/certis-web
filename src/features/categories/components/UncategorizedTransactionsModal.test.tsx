import {
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react'
import {
    http,
    HttpResponse,
} from 'msw'
import {
    describe,
    expect,
    it,
    vi,
} from 'vitest'
import {server} from '../../../test/server'
import type {CategoryAnalytics} from '../api/categoriesApi'
import {
    UncategorizedTransactionsModal,
} from './UncategorizedTransactionsModal'

const analytics: CategoryAnalytics = {
    month: '2026-09',
    currency: 'RUB',
    type: 'EXPENSE',
    totalTransactionCount: 10,
    categorizedTransactionCount: 8,
    uncategorizedTransactionCount: 2,
    totalSum: 10000,
    categorizedSum: 8500,
    uncategorizedSum: 1500,
    coveragePercentage: 85,
    topExpenseCategories: [],
}

const categoryOptions = [
    {
        id: 'food',
        name: 'Food',
        icon: 'utensils',
        color: '#10B981',
    },
    {
        id: 'transport',
        name: 'Transport',
        icon: 'transport',
        color: '#5982B3',
    },
]

const transactions = [
    {
        id: 'transaction-one',
        merchant: 'Pyaterochka',
        note: 'Card purchase',
        amount: 500,
        occurredAt: '2026-09-03T14:32:00Z',
        account: {
            id: 'account-id',
            name: 'Tinkoff Black',
            type: 'CARD',
        },
    },
    {
        id: 'transaction-two',
        merchant: 'Metro',
        note: 'Train ticket',
        amount: 1000,
        occurredAt: '2026-09-04T08:15:00Z',
        account: {
            id: 'account-id',
            name: 'Tinkoff Black',
            type: 'CARD',
        },
    },
]

const useLoadHandlers = (
    getItems: () => typeof transactions = () => transactions,
) => {
    server.use(
        http.get(
            '/api/v1/categories/options',
            () => HttpResponse.json(categoryOptions),
        ),
        http.get(
            '/api/v1/accounts',
            () => HttpResponse.json([{
                id: 'account-id',
                name: 'Tinkoff Black',
                type: 'CARD',
                openingBalance: 0,
                balance: 5000,
                currency: 'RUB',
                createdAt: '2026-01-01T00:00:00Z',
                closedAt: null,
            }]),
        ),
        http.get(
            '/api/v1/transactions/uncategorized',
            () => {
                const items = getItems()

                return HttpResponse.json({
                    month: '2026-09',
                    currency: 'RUB',
                    type: 'EXPENSE',
                    items,
                    page: 0,
                    size: 20,
                    totalElements: items.length,
                    totalPages: items.length > 0 ? 1 : 0,
                })
            },
        ),
    )
}

const renderModal = (
    onAssigned = vi.fn(async () => undefined),
) => {
    render(
        <UncategorizedTransactionsModal
            analytics={analytics}
            currency="RUB"
            month="2026-09"
            type="EXPENSE"
            onAssigned={onAssigned}
            onClose={vi.fn()}
        />,
    )

    return onAssigned
}

describe('UncategorizedTransactionsModal', () => {
    it('assigns a different category to each selected transaction', async () => {
        let assigned = false
        let requestBody: unknown

        useLoadHandlers(() => assigned ? [] : transactions)
        server.use(
            http.patch(
                '/api/v1/transactions/category-assignments',
                async ({request}) => {
                    requestBody = await request.json()
                    assigned = true

                    return new HttpResponse(null, {status: 204})
                },
            ),
        )

        const onAssigned = renderModal()

        expect(
            await screen.findByText('Pyaterochka'),
        ).toBeInTheDocument()
        expect(screen.getByText('−₽1,500 remains uncategorized'))
            .toBeInTheDocument()

        const firstCategory = screen.getByRole('combobox', {
            name: 'Category for Pyaterochka',
        })
        const secondCategory = screen.getByRole('combobox', {
            name: 'Category for Metro',
        })

        await waitFor(() => {
            expect(firstCategory).toBeEnabled()
            expect(secondCategory).toBeEnabled()
        })

        fireEvent.change(firstCategory, {target: {value: 'food'}})
        fireEvent.change(secondCategory, {target: {value: 'transport'}})
        fireEvent.click(
            screen.getByRole('button', {name: 'Assign 2'}),
        )

        await waitFor(() => {
            expect(requestBody).toEqual({
                assignments: [
                    {
                        transactionId: 'transaction-one',
                        categoryId: 'food',
                    },
                    {
                        transactionId: 'transaction-two',
                        categoryId: 'transport',
                    },
                ],
            })
        })
        expect(onAssigned).toHaveBeenCalledOnce()
        expect(
            await screen.findByText('Nothing left to categorize'),
        ).toBeInTheDocument()
        expect(
            screen.getByText('2 transactions categorized.'),
        ).toBeInTheDocument()
    })

    it('keeps the selection actionable when assignment fails', async () => {
        useLoadHandlers()
        server.use(
            http.patch(
                '/api/v1/transactions/category-assignments',
                () => HttpResponse.json(
                    {message: 'One transaction was already categorized.'},
                    {status: 409},
                ),
            ),
        )

        const onAssigned = renderModal()

        const categorySelect = await screen.findByRole('combobox', {
            name: 'Category for Pyaterochka',
        })
        await waitFor(() => expect(categorySelect).toBeEnabled())

        fireEvent.change(categorySelect, {target: {value: 'food'}})
        fireEvent.click(
            screen.getByRole('button', {name: 'Assign 1'}),
        )

        expect(
            await screen.findByText(
                'One transaction was already categorized.',
            ),
        ).toBeInTheDocument()
        expect(onAssigned).not.toHaveBeenCalled()
        expect(
            screen.getByRole('button', {name: 'Assign 1'}),
        ).toBeEnabled()
    })
})
