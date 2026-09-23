import {selectOption} from '../../../test/selectOption'
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
import {
    MemoryRouter,
    Route,
    Routes,
    useLocation,
    useNavigate,
} from 'react-router-dom'
import {
    describe,
    expect,
    it,
    vi,
} from 'vitest'
import {server} from '../../../test/server'
import {TransactionsPage} from './TransactionsPage'

vi.mock('../../../features/auth/session/SessionContext', () => ({
    useSession: () => ({
        profile: {
            id: 'profile-id',
            name: 'Daniel',
            surname: 'Carter',
            dateOfBirth: '2000-01-01',
            preferredCurrency: 'RUB',
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

const categoryCardsResponse = {
    month: '2026-09',
    currency: 'RUB',
    categories: categories.map((category) => ({
        ...category,
        monthlyTransactionCount: 0,
        monthlyAmount: 0,
        monthlySharePercentage: 0,
    })),
    page: 0,
    size: 100,
    totalElements: categories.length,
    totalPages: 1,
}

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
            () => HttpResponse.json({accounts}),
        ),
        http.get(
            '/api/v1/categories',
            () => HttpResponse.json(categoryCardsResponse),
        ),
        http.get(
            '/api/v1/transactions',
            () => HttpResponse.json(
                transactionPage(transactionItems),
            ),
        ),
        http.get(
            '/api/v1/transfers',
            () => HttpResponse.json({transfers: transferItems}),
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
        expect(screen.getByText('+₽185,000'))
            .toHaveClass('transaction-amount', 'income')
        expect(screen.getByText('−₽4,860'))
            .toHaveClass('transaction-amount', 'expense')
        expect(
            screen.getByRole('link', {name: 'Transactions'}),
        ).toHaveAttribute('aria-current', 'page')
    })

    it('loads transactions for a custom date range', async () => {
        const queries: Array<Record<string, string>> = []

        useWorkspaceHandlers([
            expenseTransaction,
            incomeTransaction,
        ])
        server.use(
            http.get('/api/v1/transactions', ({request}) => {
                queries.push(Object.fromEntries(
                    new URL(request.url).searchParams,
                ))

                return HttpResponse.json(transactionPage([
                    expenseTransaction,
                    incomeTransaction,
                ]))
            }),
        )

        renderPage()

        await screen.findByText('Greenfield Market')
        await selectOption(
            screen.getByLabelText('Period'),
            'Custom range',
        )

        fireEvent.change(
            screen.getByLabelText('From'),
            {target: {value: '2026-07-10'}},
        )
        fireEvent.change(
            screen.getByLabelText('To'),
            {target: {value: '2026-08-12'}},
        )
        fireEvent.click(
            screen.getByRole('button', {name: 'Apply range'}),
        )

        await waitFor(() => {
            expect(queries.at(-1)).toEqual({
                from: new Date(
                    2026,
                    6,
                    10,
                ).toISOString(),
                to: new Date(
                    2026,
                    7,
                    12,
                    23,
                    59,
                    59,
                    999,
                ).toISOString(),
                page: '0',
                size: '100',
            })
        })

        expect(
            screen.getByRole('button', {name: /Jul 10 – Aug 12, 2026/}),
        ).toBeInTheDocument()
    })

    it('switches category spending between currencies without mixing amounts', async () => {
        const usdAccount = {
            ...accounts[0],
            id: 'usd-account',
            name: 'Dollar card',
            currency: 'USD',
        }
        useWorkspaceHandlers([
            expenseTransaction,
            {
                ...expenseTransaction,
                id: 'euro-expense',
                accountId: 'eur-account',
                amount: 25,
                merchant: 'Airport cafe',
            },
            {
                ...expenseTransaction,
                id: 'usd-expense',
                accountId: 'usd-account',
                amount: 40,
                merchant: 'Online store',
            },
        ])
        server.use(http.get('/api/v1/accounts', () => HttpResponse.json({
            accounts: [
                ...accounts,
                usdAccount,
            ],
        })))

        renderPage()

        await screen.findByText('Airport cafe')
        const panel = within(screen.getByText('Spending by category').closest('section')!)
        const currencySelect = panel.getByLabelText('Spending currency')

        expect(currencySelect).toHaveTextContent('RUB')
        expect(panel.getByText('₽4,860 · 100%')).toBeInTheDocument()
        expect(panel.queryByText(/mixing currencies/)).not.toBeInTheDocument()

        await selectOption(currencySelect, 'EUR')
        expect(panel.getByText('€25 · 100%')).toBeInTheDocument()
        expect(panel.queryByText('₽4,860 · 100%')).not.toBeInTheDocument()

        await selectOption(currencySelect, 'USD')
        expect(panel.getByText('$40 · 100%')).toBeInTheDocument()
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
        await selectOption(form.getByLabelText('Account'), 'Main card · RUB')
        await selectOption(form.getByLabelText(/Category/), 'Groceries')
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

    it('edits a transaction from its row action menu', async () => {
        let updatedId = ''
        let requestBody: unknown
        useWorkspaceHandlers([expenseTransaction])
        server.use(http.put('/api/v1/transactions/:transactionId', async ({params, request}) => {
            updatedId = String(params.transactionId)
            requestBody = await request.json()
            return HttpResponse.json({
                ...expenseTransaction,
                merchant: 'Updated market',
            })
        }))

        renderRoutedPage('/transactions?period=all-time')
        await screen.findByText('Greenfield Market')
        fireEvent.click(screen.getByRole('button', {
            name: 'Actions for Greenfield Market',
        }))
        fireEvent.click(screen.getByRole('menuitem', {name: 'Edit'}))
        const dialog = screen.getByRole('dialog', {name: 'Edit transaction'})
        fireEvent.change(within(dialog).getByLabelText(/Merchant/), {
            target: {value: 'Updated market'},
        })
        fireEvent.click(within(dialog).getByRole('button', {name: 'Save changes'}))

        expect(await screen.findByText('Updated market')).toBeInTheDocument()
        expect(updatedId).toBe('expense-id')
        expect(requestBody).toMatchObject({merchant: 'Updated market'})
    })

    it('retries a failed transaction request', async () => {
        let requestCount = 0
        useWorkspaceHandlers([expenseTransaction])
        server.use(http.get('/api/v1/transactions', () => {
            requestCount += 1
            return requestCount === 1
                ? HttpResponse.json({message: 'Temporary error'}, {status: 500})
                : HttpResponse.json(transactionPage([expenseTransaction]))
        }))

        renderPage()
        fireEvent.click(await screen.findByRole('button', {name: 'Try again'}))
        expect(await screen.findByText('Greenfield Market')).toBeInTheDocument()
        expect(requestCount).toBeGreaterThanOrEqual(2)
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

        await selectOption(form.getByLabelText('From account'), 'Main card · RUB')
        fireEvent.keyDown(form.getByLabelText('To account'), {key: 'ArrowDown'})
        expect(await screen.findByRole('option', {name: /Savings/})).toBeInTheDocument()
        expect(
            screen.queryByRole('option', {name: 'Travel cash · EUR'}),
        ).not.toBeInTheDocument()
        fireEvent.click(screen.getByRole('option', {name: /Savings/}))
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

function HistoryControls() {
    const navigate = useNavigate()
    const location = useLocation()

    return (
        <div>
            <output data-testid="route-location">
                {location.pathname + location.search}
            </output>
            <button type="button" onClick={() => navigate('/dashboard')}>
                Leave page
            </button>
            <button type="button" onClick={() => navigate(-1)}>
                Back
            </button>
            <button type="button" onClick={() => navigate(1)}>
                Forward
            </button>
        </div>
    )
}

const renderRoutedPage = (initialUrl: string) =>
    render(
        <MemoryRouter initialEntries={[initialUrl]}>
            <HistoryControls/>
            <Routes>
                <Route path="/transactions" element={<TransactionsPage/>}/>
                <Route path="/dashboard" element={<p>Dashboard route</p>}/>
            </Routes>
        </MemoryRouter>,
    )

describe('Transactions URL filters', () => {
    it('ignores an older response after the account filter changes quickly', async () => {
        let releaseSlowRequest = () => {}
        const slowRequest = new Promise<void>((resolve) => {
            releaseSlowRequest = resolve
        })
        const queries: string[] = []
        const euroExpense = {
            ...expenseTransaction,
            id: 'euro-expense',
            accountId: 'eur-account',
            merchant: 'Airport cafe',
        }
        useWorkspaceHandlers([])
        server.use(http.get('/api/v1/transactions', async ({request}) => {
            const accountId = new URL(request.url).searchParams.get('accountId') ?? ''
            queries.push(accountId)
            if (accountId === 'rub-account') {
                await slowRequest
                return HttpResponse.json(transactionPage([expenseTransaction]))
            }
            return HttpResponse.json(transactionPage(
                accountId === 'eur-account' ? [euroExpense] : [],
            ))
        }))

        renderRoutedPage('/transactions?period=all-time')
        await screen.findByText('No transactions yet')
        await selectOption(screen.getByLabelText('Account'), 'Main card · RUB')
        await waitFor(() => expect(queries).toContain('rub-account'))
        await selectOption(screen.getByLabelText('Account'), 'Travel cash · EUR')
        expect(await screen.findByText('Airport cafe')).toBeInTheDocument()
        releaseSlowRequest()
        await new Promise((resolve) => window.setTimeout(resolve, 50))
        await waitFor(() => {
            expect(screen.getByText('Airport cafe')).toBeInTheDocument()
            expect(screen.queryByText('Greenfield Market')).not.toBeInTheDocument()
        })
    })
    it('restores a direct filtered URL after remount and keeps server and list filters', async () => {
        const queries: URLSearchParams[] = []

        useWorkspaceHandlers([expenseTransaction, incomeTransaction])
        server.use(http.get('/api/v1/transactions', ({request}) => {
            queries.push(new URL(request.url).searchParams)
            return HttpResponse.json(transactionPage([
                expenseTransaction,
                incomeTransaction,
            ]))
        }))

        const url = '/transactions?period=all-time&account=rub-account'
            + '&category=groceries&type=expense&q=Greenfield'
        const page = renderRoutedPage(url)

        await screen.findByText('Greenfield Market')
        expect(screen.getByLabelText('Period')).toHaveTextContent('All time')
        expect(screen.getByLabelText('Account')).toHaveTextContent('Main card')
        expect(screen.getByLabelText('Category filter')).toHaveTextContent('Groceries')
        expect(screen.getByRole('tab', {name: 'Expense'}))
            .toHaveAttribute('aria-selected', 'true')
        expect(screen.getByRole('searchbox', {name: 'Search transactions'}))
            .toHaveValue('Greenfield')
        expect(screen.queryByText('Salary')).not.toBeInTheDocument()
        expect(queries.at(-1)?.get('accountId')).toBe('rub-account')
        expect(queries.at(-1)?.get('categoryId')).toBe('groceries')
        expect(queries.at(-1)?.has('from')).toBe(false)

        const currentUrl = screen.getByTestId('route-location').textContent!
        page.unmount()
        renderRoutedPage(currentUrl)

        await screen.findByText('Greenfield Market')
        expect(screen.getByRole('searchbox', {name: 'Search transactions'}))
            .toHaveValue('Greenfield')
        expect(screen.getByRole('tab', {name: 'Expense'}))
            .toHaveAttribute('aria-selected', 'true')
    })

    it('restores discrete filters with Back and Forward, including after leaving', async () => {
        useWorkspaceHandlers([expenseTransaction])
        renderRoutedPage('/transactions')

        await screen.findByText('Greenfield Market')
        await selectOption(screen.getByLabelText('Period'), 'All time')
        expect(screen.getByTestId('route-location'))
            .toHaveTextContent('/transactions?period=all-time')

        fireEvent.click(screen.getByRole('button', {name: 'Back'}))
        await waitFor(() => {
            expect(screen.getByTestId('route-location'))
                .toHaveTextContent('/transactions')
            expect(screen.getByLabelText('Period'))
                .toHaveTextContent('This month')
        })

        fireEvent.click(screen.getByRole('button', {name: 'Forward'}))
        await waitFor(() => {
            expect(screen.getByLabelText('Period'))
                .toHaveTextContent('All time')
        })

        fireEvent.click(screen.getByRole('button', {name: 'Leave page'}))
        expect(screen.getByText('Dashboard route')).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', {name: 'Back'}))
        await waitFor(() => {
            expect(screen.getByLabelText('Period'))
                .toHaveTextContent('All time')
        })
    })

    it('keeps custom date edits out of the URL until Apply range', async () => {
        useWorkspaceHandlers([expenseTransaction])
        renderRoutedPage(
            '/transactions?period=custom&from=2026-07-10&to=2026-08-12',
        )

        await screen.findByText('Greenfield Market')
        const before = screen.getByTestId('route-location').textContent

        fireEvent.change(screen.getByLabelText('From'), {
            target: {value: '2026-07-11'},
        })
        expect(screen.getByTestId('route-location').textContent).toBe(before)

        fireEvent.click(screen.getByRole('button', {name: 'Apply range'}))
        await waitFor(() => {
            expect(screen.getByTestId('route-location'))
                .toHaveTextContent('from=2026-07-11')
        })
    })

    it('resets all controls and preserves unrelated params and Back history', async () => {
        const euroExpense = {
            ...expenseTransaction,
            id: 'euro-expense',
            accountId: 'eur-account',
            merchant: 'Airport cafe',
            amount: 25,
        }
        useWorkspaceHandlers([
            expenseTransaction,
            incomeTransaction,
            euroExpense,
        ])
        renderRoutedPage(
            '/transactions?period=all-time&type=income&q=Salary'
            + '&currency=EUR&extra=keep',
        )

        await screen.findAllByText('Salary')
        await waitFor(() => {
            expect(screen.getByLabelText('Spending currency'))
                .toHaveTextContent('EUR')
        })
        fireEvent.click(screen.getByRole('button', {name: 'Clear filters'}))

        await waitFor(() => {
            expect(screen.getByTestId('route-location'))
                .toHaveTextContent('/transactions?extra=keep')
            expect(screen.getByRole('searchbox', {name: 'Search transactions'}))
                .toHaveValue('')
            expect(screen.getByRole('tab', {name: 'All'}))
                .toHaveAttribute('aria-selected', 'true')
            expect(screen.getByLabelText('Period'))
                .toHaveTextContent('This month')
            expect(screen.getByLabelText('Spending currency'))
                .toHaveTextContent('RUB')
        })

        fireEvent.click(screen.getByRole('button', {name: 'Back'}))
        await waitFor(() => {
            expect(screen.getByRole('searchbox', {name: 'Search transactions'}))
                .toHaveValue('Salary')
            expect(screen.getByRole('tab', {name: 'Income'}))
                .toHaveAttribute('aria-selected', 'true')
        })
    })

    it('removes invalid values before querying and keeps unrelated params', async () => {
        const queries: URLSearchParams[] = []

        useWorkspaceHandlers([expenseTransaction])
        server.use(http.get('/api/v1/transactions', ({request}) => {
            queries.push(new URL(request.url).searchParams)
            return HttpResponse.json(transactionPage([expenseTransaction]))
        }))
        renderRoutedPage(
            '/transactions?period=custom&from=bad&to=2026-08-12'
            + '&account=deleted&category=deleted&currency=EUR&extra=keep',
        )

        await screen.findByText('Greenfield Market')
        await waitFor(() => {
            expect(screen.getByTestId('route-location'))
                .toHaveTextContent('/transactions?extra=keep')
        })
        expect(screen.getByLabelText('Period'))
            .toHaveTextContent('This month')
        expect(queries.length).toBeGreaterThan(0)
        expect(queries.every((query) =>
            query.has('from')
            && query.has('to')
            && !query.has('accountId')
            && !query.has('categoryId'),
        )).toBe(true)
    })
})

describe('Transactions URL destination rules', () => {
    it('keeps an explicit link ahead of a remembered menu destination', async () => {
        window.sessionStorage.setItem(
            'certis.transactions.lastUrl.profile-id',
            '/transactions?q=old',
        )
        useWorkspaceHandlers([expenseTransaction])
        renderRoutedPage('/transactions?q=Greenfield')

        await screen.findByText('Greenfield Market')
        expect(screen.getByRole('searchbox', {name: 'Search transactions'}))
            .toHaveValue('Greenfield')
        expect(screen.getByTestId('route-location'))
            .toHaveTextContent('/transactions?q=Greenfield')
        expect(window.sessionStorage.getItem(
            'certis.transactions.lastUrl.profile-id',
        )).toBe('/transactions?q=Greenfield')
    })

    it('shows Reset when only the activity type is selected', async () => {
        useWorkspaceHandlers([expenseTransaction])
        renderRoutedPage('/transactions?type=expense')

        await screen.findByText('Greenfield Market')
        fireEvent.click(screen.getByRole('button', {name: 'Clear filters'}))

        await waitFor(() => {
            expect(screen.getByTestId('route-location'))
                .toHaveTextContent('/transactions')
            expect(screen.getByRole('tab', {name: 'All'}))
                .toHaveAttribute('aria-selected', 'true')
        })
    })
})
