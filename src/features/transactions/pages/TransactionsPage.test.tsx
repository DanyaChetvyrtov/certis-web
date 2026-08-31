import {
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react'
import {
    http,
    HttpResponse,
} from 'msw'
import {MemoryRouter} from 'react-router-dom'
import {
    describe,
    expect,
    it,
    vi,
} from 'vitest'
import {server} from '../../../test/server'
import {TransactionsPage} from './TransactionsPage'

vi.mock('../../auth/session/SessionContext', () => ({
    useSession: () => ({
        profile: {
            id: 'profile-id',
            name: 'Daniel',
            surname: 'Carter',
            dateOfBirth: '2000-01-01',
        },
    }),
}))

vi.mock('../../../layouts/WorkspaceSidebar', () => ({
    WorkspaceSidebar: ({
        activePage,
    }: {
        activePage: string
    }) => (
        <a
            href={`/${activePage}`}
            aria-current="page"
        >
            Transactions
        </a>
    ),
}))

const accounts = [
    {
        id: 'rub-account',
        name: 'Main card',
        type: 'CARD',
        openingBalance: 100,
        balance: 125.5,
        currency: 'RUB',
        createdAt: '2026-08-01T10:00:00Z',
    },
    {
        id: 'eur-account',
        name: 'Travel cash',
        type: 'CASH',
        openingBalance: 900,
        balance: 900,
        currency: 'EUR',
        createdAt: '2026-07-31T10:00:00Z',
    },
    {
        id: 'savings-account',
        name: 'Savings',
        type: 'BANK',
        openingBalance: 500,
        balance: 500,
        currency: 'RUB',
        createdAt: '2026-08-02T10:00:00Z',
    },
]

const categories = [
    {
        id: 'groceries',
        name: 'Groceries',
        type: 'EXPENSE',
        icon: 'shopping-cart',
        color: '#E6655A',
        archivedAt: null,
    },
    {
        id: 'salary',
        name: 'Salary',
        type: 'INCOME',
        icon: 'briefcase',
        color: '#10B981',
        archivedAt: null,
    },
]

const expenseTransaction = {
    id: 'expense-id',
    accountId: 'rub-account',
    type: 'EXPENSE',
    amount: 4860,
    categoryId: 'groceries',
    merchant: 'Greenfield Market',
    note: 'Weekly groceries',
    occurredAt: '2026-08-08T10:20:00Z',
    createdAt: '2026-08-08T10:21:00Z',
    updatedAt: '2026-08-08T10:21:00Z',
    recurringTransactionTemplateId: null,
    scheduledFor: null,
    transferId: null,
}

const incomeTransaction = {
    id: 'income-id',
    accountId: 'rub-account',
    type: 'INCOME',
    amount: 185000,
    categoryId: 'salary',
    merchant: 'Salary',
    note: 'August payroll',
    occurredAt: '2026-08-08T09:00:00Z',
    createdAt: '2026-08-08T09:01:00Z',
    updatedAt: '2026-08-08T09:01:00Z',
    recurringTransactionTemplateId: null,
    scheduledFor: null,
    transferId: null,
}

const transfer = {
    id: 'transfer-id',
    sourceAccountId: 'rub-account',
    destinationAccountId: 'savings-account',
    reversalOfTransferId: null,
    currency: 'RUB',
    amount: 250,
    note: 'Monthly savings',
    occurredAt: '2026-08-08T11:00:00Z',
    createdAt: '2026-08-08T11:00:01Z',
}

const transferPostings = [
    {
        ...expenseTransaction,
        id: 'transfer-expense-id',
        amount: 250,
        categoryId: null,
        merchant: null,
        note: 'Monthly savings',
        transferId: 'transfer-id',
        occurredAt: transfer.occurredAt,
    },
    {
        ...incomeTransaction,
        id: 'transfer-income-id',
        accountId: 'savings-account',
        amount: 250,
        categoryId: null,
        merchant: null,
        note: 'Monthly savings',
        transferId: 'transfer-id',
        occurredAt: transfer.occurredAt,
    },
]

const transactionPage = (
    items: unknown[],
) => ({
    items,
    page: 0,
    size: 100,
    totalElements: items.length,
    totalPages: items.length === 0 ? 0 : 1,
})

const useWorkspaceHandlers = (
    transactionItems: unknown[],
    transferItems: unknown[] = [],
) => {
    server.use(
        http.get(
            '/api/v1/accounts',
            () => HttpResponse.json(accounts),
        ),
        http.get(
            '/api/v1/categories',
            () => HttpResponse.json(categories),
        ),
        http.get(
            '/api/v1/transactions',
            () => HttpResponse.json(
                transactionPage(transactionItems),
            ),
        ),
        http.get(
            '/api/v1/transfers',
            () => HttpResponse.json(transferItems),
        ),
    )
}

const renderPage = () =>
    render(
        <MemoryRouter>
            <TransactionsPage/>
        </MemoryRouter>,
    )

describe('TransactionsPage', () => {
    it('renders real activity and summary data from the API', async () => {
        useWorkspaceHandlers([
            expenseTransaction,
            incomeTransaction,
        ])

        renderPage()

        expect(
            await screen.findByText('Greenfield Market'),
        ).toBeInTheDocument()
        expect(screen.getByText('Weekly groceries')).toBeInTheDocument()
        expect(screen.getAllByText('Main card').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Groceries').length).toBeGreaterThan(0)
        expect(screen.getAllByText('₽185,000').length).toBeGreaterThan(0)
        expect(screen.getAllByText('₽4,860').length).toBeGreaterThan(0)
        expect(
            screen.getByRole('link', {name: 'Transactions'}),
        ).toHaveAttribute('aria-current', 'page')
    })

    it('does not compare category spending across currencies', async () => {
        useWorkspaceHandlers([
            expenseTransaction,
            {
                ...expenseTransaction,
                id: 'euro-expense',
                accountId: 'eur-account',
                amount: 25,
                merchant: 'Airport cafe',
            },
        ])

        renderPage()

        expect(
            await screen.findByText('Airport cafe'),
        ).toBeInTheDocument()
        expect(
            screen.getByText(
                'Select one account to compare categories without mixing currencies.',
            ),
        ).toBeInTheDocument()
        expect(screen.queryByText('₽4,885')).not.toBeInTheDocument()
    })

    it('creates a transaction with account and category data', async () => {
        let requestBody: unknown

        useWorkspaceHandlers([])
        server.use(
            http.post(
                '/api/v1/transactions',
                async ({request}) => {
                    requestBody = await request.json()
                    const createdTransaction = requestBody as {
                        occurredAt: string
                    }

                    return HttpResponse.json(
                        {
                            ...expenseTransaction,
                            occurredAt: createdTransaction.occurredAt,
                        },
                        {status: 201},
                    )
                },
            ),
        )

        renderPage()

        await screen.findByText('No transactions yet')
        fireEvent.click(
            screen.getByRole('button', {name: 'New transaction'}),
        )

        const dialog = screen.getByRole('dialog', {
            name: 'New transaction',
        })
        const form = within(dialog)

        expect(dialog).toBeInTheDocument()

        fireEvent.change(
            form.getByLabelText('Amount'),
            {target: {value: '4860'}},
        )
        fireEvent.change(
            form.getByLabelText('Account'),
            {target: {value: 'rub-account'}},
        )
        fireEvent.change(
            form.getByLabelText(/Category/),
            {target: {value: 'groceries'}},
        )
        fireEvent.change(
            form.getByLabelText(/Merchant/),
            {target: {value: 'Greenfield Market'}},
        )
        fireEvent.change(
            form.getByLabelText(/Note/),
            {target: {value: 'Weekly groceries'}},
        )
        fireEvent.click(
            form.getByRole('button', {name: 'Add transaction'}),
        )

        expect(
            await screen.findByText('Transaction added.'),
        ).toBeInTheDocument()
        expect(screen.getByText('Greenfield Market')).toBeInTheDocument()
        expect(requestBody).toEqual({
            accountId: 'rub-account',
            type: 'EXPENSE',
            amount: 4860,
            categoryId: 'groceries',
            merchant: 'Greenfield Market',
            note: 'Weekly groceries',
            occurredAt: expect.any(String),
        })
    })

    it('deletes a transaction from its row action menu', async () => {
        let deletedTransactionId = ''

        useWorkspaceHandlers([expenseTransaction])
        server.use(
            http.delete(
                '/api/v1/transactions/:transactionId',
                ({params}) => {
                    deletedTransactionId = String(params.transactionId)
                    return new HttpResponse(null, {status: 204})
                },
            ),
        )

        renderPage()

        await screen.findByText('Greenfield Market')
        fireEvent.click(
            screen.getByRole('button', {
                name: 'Actions for Greenfield Market',
            }),
        )
        fireEvent.click(
            screen.getByRole('menuitem', {name: 'Delete'}),
        )

        expect(
            screen.getByRole('alertdialog', {
                name: 'Delete “Greenfield Market”?',
            }),
        ).toBeInTheDocument()

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Delete transaction',
            }),
        )

        expect(
            await screen.findByText('Transaction deleted.'),
        ).toBeInTheDocument()

        await waitFor(() => {
            expect(
                screen.queryByText('Greenfield Market'),
            ).not.toBeInTheDocument()
        })
        expect(deletedTransactionId).toBe('expense-id')
    })

    it('creates a same-currency transfer from the transaction page', async () => {
        let requestBody: unknown

        useWorkspaceHandlers([])
        server.use(
            http.post('/api/v1/transfers', async ({request}) => {
                requestBody = await request.json()
                return HttpResponse.json(transfer, {status: 201})
            }),
        )

        renderPage()

        await screen.findByText('No transactions yet')
        fireEvent.click(screen.getByRole('button', {name: 'Transfer'}))
        const dialog = screen.getByRole('dialog', {name: 'Transfer money'})
        const form = within(dialog)

        fireEvent.change(form.getByLabelText('From account'), {
            target: {value: 'rub-account'},
        })
        expect(
            within(form.getByLabelText('To account'))
                .queryByRole('option', {name: 'Travel cash · EUR'}),
        ).not.toBeInTheDocument()
        fireEvent.change(form.getByLabelText('To account'), {
            target: {value: 'savings-account'},
        })
        fireEvent.change(form.getByLabelText('Amount'), {
            target: {value: '250'},
        })
        fireEvent.change(form.getByLabelText(/Note/), {
            target: {value: 'Monthly savings'},
        })
        fireEvent.click(form.getByRole('button', {name: 'Transfer money'}))

        expect(await screen.findByText('Transfer completed.')).toBeInTheDocument()
        expect(requestBody).toEqual({
            sourceAccountId: 'rub-account',
            destinationAccountId: 'savings-account',
            amount: 250,
            note: 'Monthly savings',
            occurredAt: expect.any(String),
        })
    })

    it('collapses transfer postings, excludes them from totals, and reverses the transfer', async () => {
        const transferItems: unknown[] = [transfer]
        let reverseRequest: unknown
        const reversal = {
            ...transfer,
            id: 'reversal-id',
            sourceAccountId: 'savings-account',
            destinationAccountId: 'rub-account',
            reversalOfTransferId: 'transfer-id',
        }

        useWorkspaceHandlers(transferPostings, transferItems)
        server.use(
            http.post('/api/v1/transfers/:transferId/reversal', async ({request}) => {
                reverseRequest = await request.json()
                transferItems.push(reversal)
                return HttpResponse.json(reversal, {status: 201})
            }),
        )

        renderPage()

        expect(
            (await screen.findAllByText('Main card → Savings')).length,
        ).toBeGreaterThan(0)
        expect(screen.getAllByText('Monthly savings')).toHaveLength(1)
        const summary = screen.getByRole('region', {name: 'Transaction summary'})
        expect(within(summary).getAllByText('—')).toHaveLength(4)

        fireEvent.click(screen.getByRole('button', {
            name: 'Actions for Main card → Savings',
        }))
        fireEvent.click(screen.getByRole('menuitem', {name: 'Reverse'}))
        const dialog = screen.getByRole('dialog', {name: 'Reverse transfer'})
        fireEvent.change(within(dialog).getByLabelText(/Reason/), {
            target: {value: 'Transferred by mistake'},
        })
        fireEvent.click(within(dialog).getByRole('button', {name: 'Reverse transfer'}))

        expect(
            await screen.findByText('Transfer reversed. Both account balances were restored.'),
        ).toBeInTheDocument()
        expect(reverseRequest).toEqual({
            note: 'Transferred by mistake',
            occurredAt: expect.any(String),
        })
    })
})
