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
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest'
import {server} from '../test/server'
import type {Transaction, TransactionRequest} from '../features/transactions/api/transactionsApi'
import {DashboardPage} from './DashboardPage'

vi.mock('../features/auth/session/SessionContext', () => ({
    useSession: () => ({
        profile: {
            id: 'profile-id',
            name: 'Daniel',
            surname: 'Carter',
            dateOfBirth: '2000-01-01',
            preferredCurrency: 'EUR',
        },
        profilePhotoRevision: 0,
        refreshProfilePhoto: vi.fn(),
        setProfile: vi.fn(),
        signOut: vi.fn(),
    }),
}))

const accounts = [
    {
        id: 'rub-account',
        name: 'RUB card',
        type: 'CARD',
        openingBalance: 1000,
        balance: 1250,
        currency: 'RUB',
        createdAt: '2026-08-01T10:00:00Z',
    },
    {
        id: 'eur-account',
        name: 'EUR card',
        type: 'CARD',
        openingBalance: 500,
        balance: 700,
        currency: 'EUR',
        createdAt: '2026-08-01T10:00:00Z',
    },
]

const currentMonth = (): string => {
    const now = new Date()

    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const renderPage = () => render(
    <MemoryRouter>
        <DashboardPage/>
    </MemoryRouter>,
)

describe('DashboardPage', () => {
    beforeEach(() => {
        server.use(
            http.get('/api/v1/accounts', () => HttpResponse.json(accounts)),
            http.get('/api/v1/transactions/analytics/monthly', () => HttpResponse.json({
                month: currentMonth(), currency: 'EUR',
                income: {transactionCount: 0, amount: 0},
                expenses: {transactionCount: 0, amount: 0}, netCashFlow: 0,
            })),
            http.get('/api/v1/transactions/analytics/cash-flow', () => HttpResponse.json({
                granularity: 'MONTH', totals: {income: 0, expenses: 0, netCashFlow: 0}, points: [],
            })),
            http.get('/api/v1/transactions', () => HttpResponse.json({
                items: [],
                page: 0,
                size: 3,
                totalElements: 0,
                totalPages: 0,
            })),
        )
    })

    it.each(['EXPENSE', 'INCOME'] as const)('creates %s on dashboard and refreshes its panels', async type => {
        let saved: Transaction | null = null
        const categoryTypes: string[] = []
        const cashFlowRanges: string[] = []
        server.use(
            http.get('/api/v1/accounts', () => HttpResponse.json([
                accounts[0],
                {...accounts[1], balance: 700 + (saved ? (type === 'INCOME' ? 12.5 : -12.5) : 0)},
                {...accounts[0], id: 'closed', name: 'Closed account', closedAt: '2026-08-02T00:00:00Z'},
            ])),
            http.get('/api/v1/categories/options', ({request}) => {
                const categoryType = new URL(request.url).searchParams.get('type') ?? ''
                categoryTypes.push(categoryType)
                return HttpResponse.json([{
                    id: categoryType, name: categoryType === 'INCOME' ? 'Salary' : 'Groceries',
                    icon: 'gift', color: '#10b981',
                }])
            }),
            http.post('/api/v1/transactions', async ({request}) => {
                const body = await request.json() as TransactionRequest
                saved = {...body, id: 'created', createdAt: body.occurredAt, updatedAt: body.occurredAt}
                return HttpResponse.json(saved, {status: 201})
            }),
            http.get('/api/v1/transactions', () => HttpResponse.json({
                items: saved ? [saved] : [], page: 0, size: 3, totalPages: saved ? 1 : 0,
                totalElements: saved ? 1 : 0,
            })),
            http.get('/api/v1/transactions/analytics/monthly', () => HttpResponse.json({
                month: currentMonth(), currency: 'EUR',
                income: {amount: saved && type === 'INCOME' ? 12.5 : 0, transactionCount: saved && type === 'INCOME' ? 1 : 0},
                expenses: {amount: saved && type === 'EXPENSE' ? 12.5 : 0, transactionCount: saved && type === 'EXPENSE' ? 1 : 0},
                netCashFlow: saved ? (type === 'INCOME' ? 12.5 : -12.5) : 0,
            })),
            http.get('/api/v1/transactions/analytics/cash-flow', ({request}) => {
                cashFlowRanges.push(new URL(request.url).searchParams.get('range') ?? '')
                return HttpResponse.json({granularity: 'MONTH', points: [], totals: {
                    income: saved && type === 'INCOME' ? 12.5 : 0,
                    expenses: saved && type === 'EXPENSE' ? 12.5 : 0,
                    netCashFlow: saved ? (type === 'INCOME' ? 12.5 : -12.5) : 0,
                }})
            }),
        )
        renderPage()
        await screen.findByText('No transactions yet')
        const accountsPanel = within(screen.getByText('Accounts', {selector: 'h2'}).closest('article')!)
        expect(accountsPanel.getByRole('link', {name: /View all/})).toHaveAttribute('href', '/accounts')
        expect(categoryTypes).toEqual([])
        fireEvent.change(screen.getByLabelText('Cash flow range'), {target: {value: 'YEAR'}})
        await screen.findByRole('img', {name: 'Income and expenses: Year'})
        const addButton = screen.getByRole('button', {name: 'Add transaction'})
        fireEvent.click(addButton)
        const form = within(await screen.findByRole('dialog', {name: 'New transaction'}))
        expect(form.getByLabelText('Amount')).toHaveFocus()
        expect(categoryTypes.sort()).toEqual(['EXPENSE', 'INCOME'])
        const accountSelect = within(form.getByLabelText('Account'))
        expect(accountSelect.getByRole('option', {name: 'RUB card · RUB'})).toBeInTheDocument()
        expect(accountSelect.getByRole('option', {name: 'EUR card · EUR'})).toBeInTheDocument()
        expect(accountSelect.queryByRole('option', {name: /Closed account/})).not.toBeInTheDocument()
        if (type === 'INCOME') fireEvent.click(form.getByRole('radio', {name: 'Income'}))
        fireEvent.change(form.getByLabelText('Amount'), {target: {value: '12.5'}})
        fireEvent.change(form.getByLabelText('Account'), {target: {value: 'eur-account'}})
        fireEvent.change(form.getByLabelText(/Category/), {target: {value: type}})
        fireEvent.change(form.getByLabelText(/Merchant/), {target: {value: 'Dashboard entry'}})
        fireEvent.click(form.getByRole('button', {name: 'Add transaction'}))
        await screen.findByText('Transaction added.')
        expect(saved).toMatchObject({accountId: 'eur-account', type, categoryId: type, amount: 12.5, merchant: 'Dashboard entry'})
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect(addButton).toHaveFocus()
        await screen.findByText('Dashboard entry')
        await screen.findByText('1 transaction this month')
        await waitFor(() => expect(accountsPanel.getByText(type === 'INCOME' ? '€712.50' : '€687.50', {selector: 'strong'})).toBeInTheDocument())
        await screen.findByText(type === 'INCOME' ? 'Net €12.5' : 'Net -€12.5')
        expect(screen.getByLabelText('Cash flow range')).toHaveValue('YEAR')
        expect(cashFlowRanges).toEqual(['SIX_MONTHS', 'YEAR', 'YEAR'])
    })

    it('keeps the form and values on save failure and restores focus on cancel', async () => {
        let attempts = 0
        server.use(
            http.get('/api/v1/categories/options', () => HttpResponse.json([])),
            http.post('/api/v1/transactions', () => {
                attempts++
                return HttpResponse.json({message: 'Could not save transaction'}, {status: 500})
            }),
        )
        renderPage()
        const addButton = screen.getByRole('button', {name: 'Add transaction'})
        fireEvent.click(addButton)
        const dialog = await screen.findByRole('dialog', {name: 'New transaction'})
        const form = within(dialog)
        fireEvent.click(form.getByRole('button', {name: 'Add transaction'}))
        expect(attempts).toBe(0)
        expect(form.getByText('Select an account.')).toBeInTheDocument()
        fireEvent.change(form.getByLabelText('Amount'), {target: {value: '12.5'}})
        fireEvent.change(form.getByLabelText('Account'), {target: {value: 'rub-account'}})
        fireEvent.click(form.getByRole('button', {name: 'Add transaction'}))
        await form.findByText('Could not save transaction')
        expect(form.getByLabelText('Amount')).toHaveValue(12.5)
        expect(screen.queryByText('Transaction added.')).not.toBeInTheDocument()
        fireEvent.keyDown(dialog, {key: 'Escape'})
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect(addButton).toHaveFocus()
    })

    it('allows retry when transaction categories fail to load', async () => {
        let failed = true
        server.use(http.get('/api/v1/categories/options', () => failed
            ? HttpResponse.json({message: 'Categories unavailable'}, {status: 500})
            : HttpResponse.json([])))
        renderPage()
        fireEvent.click(screen.getByRole('button', {name: 'Add transaction'}))
        await screen.findByText('Categories unavailable')
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        failed = false
        fireEvent.click(screen.getByRole('button', {name: 'Try again'}))
        await screen.findByRole('dialog', {name: 'New transaction'})
    })

    it('offers a link to accounts when there are no active accounts', async () => {
        server.use(
            http.get('/api/v1/accounts', () => HttpResponse.json([
                {...accounts[0], closedAt: '2026-09-01T00:00:00Z'},
            ])),
            http.get('/api/v1/categories/options', () => HttpResponse.json([])),
        )
        renderPage()
        fireEvent.click(screen.getByRole('button', {name: 'Add transaction'}))
        expect(await screen.findByRole('link', {name: 'Go to accounts'})).toHaveAttribute('href', '/accounts')
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('shows monthly income and expenses in the preferred currency', async () => {
        let analyticsQuery: Record<string, string> | undefined

        server.use(
            http.get('/api/v1/accounts', () => HttpResponse.json(accounts)),
            http.get('/api/v1/transactions/analytics/monthly', ({request}) => {
                const query = new URL(request.url).searchParams

                analyticsQuery = Object.fromEntries(query)

                return HttpResponse.json({
                    month: currentMonth(),
                    currency: 'EUR',
                    income: {
                        transactionCount: 2,
                        amount: 2500,
                    },
                    expenses: {
                        transactionCount: 3,
                        amount: 750,
                    },
                    netCashFlow: 1750,
                })
            }),
        )

        renderPage()

        const incomeCard = screen
            .getByText('Income', {selector: '.summary-card p'})
            .closest('article')
        const expenseCard = screen
            .getByText('Expenses', {selector: '.summary-card p'})
            .closest('article')

        await waitFor(() => {
            expect(incomeCard).toHaveTextContent('€2,500')
            expect(expenseCard).toHaveTextContent('€750')
        })
        expect(screen.getByText('2 transactions this month')).toBeInTheDocument()
        expect(screen.getByText('3 transactions this month')).toBeInTheDocument()
        expect(analyticsQuery).toEqual({
            month: currentMonth(),
            currency: 'EUR',
        })
    })

    it('reloads monthly analytics when the dashboard currency changes', async () => {
        const requestedCurrencies: string[] = []

        server.use(
            http.get('/api/v1/accounts', () => HttpResponse.json(accounts)),
            http.get('/api/v1/transactions/analytics/monthly', ({request}) => {
                const currency = new URL(request.url).searchParams.get('currency') ?? ''
                requestedCurrencies.push(currency)

                return HttpResponse.json({
                    month: currentMonth(),
                    currency,
                    income: {
                        transactionCount: 1,
                        amount: currency === 'EUR' ? 2500 : 100000,
                    },
                    expenses: {
                        transactionCount: 1,
                        amount: currency === 'EUR' ? 750 : 40000,
                    },
                    netCashFlow: currency === 'EUR' ? 1750 : 60000,
                })
            }),
        )

        renderPage()

        expect(await screen.findByText('€2,500')).toBeInTheDocument()

        fireEvent.change(
            screen.getByLabelText('Balance currency'),
            {target: {value: 'RUB'}},
        )

        expect(await screen.findByText('₽100,000')).toBeInTheDocument()
        expect(await screen.findByText('₽40,000')).toBeInTheDocument()
        expect(requestedCurrencies).toEqual(['EUR', 'RUB'])
    })

    it('shows an unavailable state when monthly analytics cannot be loaded', async () => {
        server.use(
            http.get('/api/v1/accounts', () => HttpResponse.json(accounts)),
            http.get(
                '/api/v1/transactions/analytics/monthly',
                () => HttpResponse.json(
                    {message: 'Analytics unavailable'},
                    {status: 500},
                ),
            ),
        )

        renderPage()

        expect(
            await screen.findAllByText('Monthly summary unavailable'),
        ).toHaveLength(2)
    })

    it('shows recent transactions from every account and currency without filters', async () => {
        let transactionQuery: Record<string, string> | undefined

        server.use(
            http.get('/api/v1/accounts', () => HttpResponse.json(accounts)),
            http.get('/api/v1/transactions/analytics/monthly', () =>
                HttpResponse.json({
                    month: currentMonth(),
                    currency: 'EUR',
                    income: {transactionCount: 0, amount: 0},
                    expenses: {transactionCount: 0, amount: 0},
                    netCashFlow: 0,
                }),
            ),
            http.get('/api/v1/transactions', ({request}) => {
                transactionQuery = Object.fromEntries(
                    new URL(request.url).searchParams,
                )

                return HttpResponse.json({
                    items: [
                        {
                            id: 'rub-expense',
                            accountId: 'rub-account',
                            type: 'EXPENSE',
                            amount: 1250,
                            categoryId: null,
                            merchant: 'Grocery store',
                            note: null,
                            occurredAt: '2026-09-04T12:00:00Z',
                            createdAt: '2026-09-04T12:00:00Z',
                            updatedAt: '2026-09-04T12:00:00Z',
                            transferId: null,
                        },
                        {
                            id: 'eur-income',
                            accountId: 'eur-account',
                            type: 'INCOME',
                            amount: 200,
                            categoryId: null,
                            merchant: 'Freelance payment',
                            note: null,
                            occurredAt: '2026-09-03T12:00:00Z',
                            createdAt: '2026-09-03T12:00:00Z',
                            updatedAt: '2026-09-03T12:00:00Z',
                            transferId: null,
                        },
                    ],
                    page: 0,
                    size: 3,
                    totalElements: 2,
                    totalPages: 1,
                })
            }),
        )

        renderPage()

        const panel = screen.getByText('Recent transactions').closest('article')

        expect(panel).not.toBeNull()

        const recentPanel = within(panel as HTMLElement)

        expect(await recentPanel.findByText('Grocery store')).toBeInTheDocument()
        expect(recentPanel.getByText('Freelance payment')).toBeInTheDocument()
        expect(recentPanel.getByText('−₽1,250')).toBeInTheDocument()
        expect(recentPanel.getByText('+€200')).toBeInTheDocument()
        expect(recentPanel.getByRole('link', {name: /View all/}))
            .toHaveAttribute('href', '/transactions')
        expect(transactionQuery).toEqual({
            page: '0',
            size: '3',
        })
    })

    it('shows an empty recent-transactions state', async () => {
        server.use(
            http.get('/api/v1/accounts', () => HttpResponse.json(accounts)),
            http.get('/api/v1/transactions/analytics/monthly', () =>
                HttpResponse.json({
                    month: currentMonth(),
                    currency: 'EUR',
                    income: {transactionCount: 0, amount: 0},
                    expenses: {transactionCount: 0, amount: 0},
                    netCashFlow: 0,
                }),
            ),
        )

        renderPage()

        expect(await screen.findByText('No transactions yet')).toBeInTheDocument()
    })
})
