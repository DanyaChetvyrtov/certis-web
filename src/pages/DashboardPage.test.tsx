import {selectOption} from '../test/selectOption'
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

const dashboardGoal = {
    id: 'goal-id',
    name: 'Emergency fund',
    currency: 'EUR',
    targetAmount: 2000,
    savedAmount: 700,
    remainingAmount: 1300,
    progressPercentage: 35,
    targetMonth: '2027-01',
    monthsRemaining: 4,
    contributionPlan: {
        type: 'CUSTOM',
        monthlyAmount: 325,
        recommendedMonthlyAmount: 325,
    },
    status: 'ACTIVE',
    paceStatus: 'ON_TRACK',
    projectedCompletionMonth: '2027-01',
    icon: 'target',
    color: '#10B981',
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z',
}

const currentMonth = (): string => {
    const now = new Date()

    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const emptyCategoryAnalytics = (currency = 'EUR') => ({
    month: currentMonth(),
    currency,
    type: 'EXPENSE',
    totalTransactionCount: 0,
    categorizedTransactionCount: 0,
    uncategorizedTransactionCount: 0,
    totalSum: 0,
    categorizedSum: 0,
    uncategorizedSum: 0,
    coveragePercentage: null,
    topExpenseCategories: [],
})

const renderPage = () => render(
    <MemoryRouter>
        <DashboardPage/>
    </MemoryRouter>,
)

describe('DashboardPage', () => {
    beforeEach(() => {
        server.use(
            http.get('/api/v1/accounts', () => HttpResponse.json({accounts})),
            http.get('/api/v1/transactions/analytics/monthly', () => HttpResponse.json({
                month: currentMonth(), currency: 'EUR',
                income: {transactionCount: 0, amount: 0},
                expenses: {transactionCount: 0, amount: 0}, netCashFlow: 0,
            })),
            http.get('/api/v1/transactions/analytics/cash-flow', () => HttpResponse.json({
                granularity: 'MONTH', totals: {income: 0, expenses: 0, netCashFlow: 0}, points: [],
            })),
            http.get('/api/v1/categories/analytics', () =>
                HttpResponse.json(emptyCategoryAnalytics()),
            ),
            http.get('/api/v1/transactions', () => HttpResponse.json({
                items: [],
                page: 0,
                size: 3,
                totalElements: 0,
                totalPages: 0,
            })),
            http.get('/api/v1/goals', () => HttpResponse.json({
                currency: 'EUR',
                items: [],
                statusCounts: {active: 0, completed: 0},
                page: 0,
                size: 2,
                totalElements: 0,
                totalPages: 0,
            })),
        )
    })

    it('shows active goal progress and reloads it for the dashboard currency', async () => {
        const goalQueries: Record<string, string>[] = []
        server.use(http.get('/api/v1/goals', ({request}) => {
            const query = Object.fromEntries(new URL(request.url).searchParams)
            const currency = query.currency
            goalQueries.push(query)

            const items = currency === 'EUR'
                ? [
                    dashboardGoal,
                    {
                        ...dashboardGoal,
                        id: 'trip-goal',
                        name: 'Japan trip',
                        savedAmount: 500,
                        remainingAmount: 1500,
                        progressPercentage: 25,
                        targetMonth: '2027-04',
                        icon: 'briefcase',
                        color: '#B78B4B',
                    },
                ]
                : [{
                    ...dashboardGoal,
                    id: 'home-goal',
                    name: 'Home deposit',
                    currency: 'RUB',
                    targetAmount: 100000,
                    savedAmount: 40000,
                    remainingAmount: 60000,
                    progressPercentage: 40,
                }]

            return HttpResponse.json({
                currency,
                items,
                statusCounts: {active: currency === 'EUR' ? 4 : 1, completed: 0},
                page: 0,
                size: 2,
                totalElements: currency === 'EUR' ? 4 : 1,
                totalPages: currency === 'EUR' ? 2 : 1,
            })
        }))

        renderPage()
        const panel = within(screen.getByText('Goals', {selector: 'h2'}).closest('article')!)

        expect(await panel.findByText('Emergency fund')).toBeInTheDocument()
        expect(panel.getByText('€700 saved')).toBeInTheDocument()
        expect(panel.getByText('€1,300 left')).toBeInTheDocument()
        expect(panel.getByText('+2 more active')).not.toHaveAttribute('href')
        expect(panel.getByRole('link', {name: /View all/})).toHaveAttribute('href', '/goals')
        expect(panel.queryByRole('link', {name: /View Emergency fund/})).not.toBeInTheDocument()
        const createGoalButton = panel.getByRole('button', {name: 'Create a goal'})
        fireEvent.click(createGoalButton)

        const goalDialog = within(screen.getByRole('dialog', {name: 'Create a goal'}))
        expect(goalDialog.getByLabelText('Currency')).toHaveTextContent('EUR')
        fireEvent.click(goalDialog.getByRole('button', {name: 'Close goal form'}))
        expect(createGoalButton).toHaveFocus()
        expect(goalQueries[0]).toEqual({
            currency: 'EUR',
            status: 'ACTIVE',
            sort: 'TARGET_MONTH_ASC',
            page: '0',
            size: '2',
        })

        await selectOption(screen.getByLabelText('Dashboard currency'), 'RUB')

        expect(await panel.findByText('Home deposit')).toBeInTheDocument()
        expect(panel.getByText('₽40,000 saved')).toBeInTheDocument()
        expect(goalQueries[1]).toMatchObject({currency: 'RUB'})
    })

    it('allows retry when dashboard goals cannot be loaded', async () => {
        let shouldFail = true
        server.use(http.get('/api/v1/goals', () => shouldFail
            ? HttpResponse.json({message: 'Goals unavailable'}, {status: 500})
            : HttpResponse.json({
                currency: 'EUR',
                items: [],
                statusCounts: {active: 0, completed: 0},
                page: 0,
                size: 2,
                totalElements: 0,
                totalPages: 0,
            })))

        renderPage()
        const panel = within(screen.getByText('Goals', {selector: 'h2'}).closest('article')!)

        expect(await panel.findByText('We could not load your goals.')).toBeInTheDocument()
        shouldFail = false
        fireEvent.click(panel.getByRole('button', {name: 'Try again'}))

        expect(await panel.findByText('No savings goals yet')).toBeInTheDocument()
    })

    it.each(['EXPENSE', 'INCOME'] as const)('creates %s on dashboard and refreshes its panels', async type => {
        let saved: Transaction | null = null
        const categoryTypes: string[] = []
        const cashFlowRanges: string[] = []
        server.use(
            http.get('/api/v1/accounts', () => HttpResponse.json({
                accounts: [
                    accounts[0],
                    {...accounts[1], balance: 700 + (saved ? (type === 'INCOME' ? 12.5 : -12.5) : 0)},
                    {...accounts[0], id: 'closed', name: 'Closed account', closedAt: '2026-08-02T00:00:00Z'},
                ],
            })),
            http.get('/api/v1/categories/options', ({request}) => {
                const categoryType = new URL(request.url).searchParams.get('type') ?? ''
                categoryTypes.push(categoryType)
                return HttpResponse.json({
                    categoryOptions: [{
                        id: categoryType, name: categoryType === 'INCOME' ? 'Salary' : 'Groceries',
                        icon: 'gift', color: '#10b981',
                    }],
                })
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
        await selectOption(screen.getByLabelText('Cash flow range'), 'Year')
        await screen.findByRole('img', {name: 'Income and expenses: Year'})
        const addButton = screen.getByRole('button', {name: 'Add transaction'})
        fireEvent.click(addButton)
        const form = within(await screen.findByRole('dialog', {name: 'New transaction'}))
        expect(form.getByLabelText('Amount')).toHaveFocus()
        expect(categoryTypes.sort()).toEqual(['EXPENSE', 'INCOME'])
        fireEvent.keyDown(form.getByLabelText('Account'), {key: 'ArrowDown'})
        const accountSelect = within(await screen.findByRole('listbox'))
        expect(accountSelect.getByRole('option', {name: 'RUB card · RUB'})).toBeInTheDocument()
        expect(accountSelect.getByRole('option', {name: 'EUR card · EUR'})).toBeInTheDocument()
        expect(accountSelect.queryByRole('option', {name: /Closed account/})).not.toBeInTheDocument()
        fireEvent.keyDown(screen.getByRole('listbox'), {key: 'Escape'})
        await waitFor(() => expect(form.getByLabelText('Account')).toHaveFocus())
        if (type === 'INCOME') fireEvent.click(form.getByRole('radio', {name: 'Income'}))
        fireEvent.change(form.getByLabelText('Amount'), {target: {value: '12.5'}})
        await selectOption(form.getByLabelText('Account'), 'EUR card · EUR')
        await selectOption(form.getByLabelText(/Category/), type === 'INCOME' ? 'Salary' : 'Groceries')
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
        expect(screen.getByLabelText('Cash flow range')).toHaveTextContent('Year')
        expect(cashFlowRanges).toEqual(['MONTH', 'YEAR', 'YEAR'])
    })

    it('keeps the form and values on save failure and restores focus on cancel', async () => {
        let attempts = 0
        server.use(
            http.get('/api/v1/categories/options', () => HttpResponse.json({
                categoryOptions: [],
            })),
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
        await selectOption(form.getByLabelText('Account'), 'RUB card · RUB')
        fireEvent.click(form.getByRole('button', {name: 'Add transaction'}))
        await form.findByText('Could not save transaction')
        expect(form.getByLabelText('Amount')).toHaveValue(12.5)
        expect(screen.queryByText('Transaction added.')).not.toBeInTheDocument()
        fireEvent.keyDown(dialog, {key: 'Escape'})
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect(addButton).toHaveFocus()
    })

    it('creates an account from the dashboard and shows its balance immediately', async () => {
        let requestBody: unknown
        const createdAccount = {
            id: 'usd-account',
            name: 'USD savings',
            type: 'CARD',
            openingBalance: 2500,
            balance: 2500,
            currency: 'USD',
            createdAt: '2026-09-07T08:00:00Z',
            closedAt: null,
        }
        server.use(http.post('/api/v1/accounts', async ({request}) => {
            requestBody = await request.json()
            return HttpResponse.json(createdAccount, {status: 201})
        }))

        renderPage()
        await screen.findByText('EUR card')
        const accountsPanel = within(screen.getByText('Accounts', {selector: 'h2'}).closest('article')!)
        const addButton = accountsPanel.getByRole('button', {name: 'Add new account'})
        fireEvent.click(addButton)

        const form = within(await screen.findByRole('dialog', {name: 'Create a new account'}))
        expect(form.getByLabelText('Account name')).toHaveFocus()
        fireEvent.change(form.getByLabelText('Account name'), {target: {value: 'USD savings'}})
        fireEvent.change(form.getByLabelText('Opening balance'), {target: {value: '2500'}})
        await selectOption(form.getByLabelText('Currency'), 'USD')
        fireEvent.click(form.getByRole('button', {name: 'Create account'}))

        await waitFor(() => expect(screen.queryByRole('dialog', {name: 'Create a new account'})).not.toBeInTheDocument())
        expect(requestBody).toEqual({
            name: 'USD savings',
            type: 'CARD',
            openingBalance: 2500,
            currency: 'USD',
        })
        expect(addButton).toHaveFocus()
        expect(accountsPanel.getByText('USD savings')).toBeInTheDocument()
        expect(accountsPanel.getAllByText('$2,500').length).toBeGreaterThan(0)
        expect(screen.getByLabelText('Dashboard currency')).toHaveTextContent('USD')
    })

    it('allows retry when transaction categories fail to load', async () => {
        let failed = true
        server.use(http.get('/api/v1/categories/options', () => failed
            ? HttpResponse.json({message: 'Categories unavailable'}, {status: 500})
            : HttpResponse.json({categoryOptions: []})))
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
            http.get('/api/v1/accounts', () => HttpResponse.json({
                accounts: [
                    {...accounts[0], closedAt: '2026-09-01T00:00:00Z'},
                ],
            })),
            http.get('/api/v1/categories/options', () => HttpResponse.json({
                categoryOptions: [],
            })),
        )
        renderPage()
        fireEvent.click(screen.getByRole('button', {name: 'Add transaction'}))
        expect(await screen.findByRole('link', {name: 'Go to accounts'})).toHaveAttribute('href', '/accounts')
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('shows monthly income and expenses in the preferred currency', async () => {
        let analyticsQuery: Record<string, string> | undefined

        server.use(
            http.get('/api/v1/accounts', () => HttpResponse.json({accounts})),
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
            http.get('/api/v1/accounts', () => HttpResponse.json({accounts})),
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

        const accountsPanel = screen.getByText('Accounts', {selector: 'h2'}).closest('article')
        const currencySelect = screen.getByLabelText('Dashboard currency')
        expect(within(accountsPanel as HTMLElement).queryByRole('combobox')).not.toBeInTheDocument()
        expect(currencySelect.closest('.dashboard-actions')).not.toBeNull()

        await selectOption(currencySelect, 'RUB')

        expect(await screen.findByText('₽100,000')).toBeInTheDocument()
        expect(await screen.findByText('₽40,000')).toBeInTheDocument()
        expect(requestedCurrencies).toEqual(['EUR', 'RUB'])
    })

    it('shows the category placeholder and expense breakdown from analytics', async () => {
        let analyticsQuery: Record<string, string> | undefined

        server.use(
            http.get('/api/v1/categories/analytics', ({request}) => {
                analyticsQuery = Object.fromEntries(
                    new URL(request.url).searchParams,
                )

                return HttpResponse.json({
                    month: currentMonth(),
                    currency: 'EUR',
                    type: 'EXPENSE',
                    totalTransactionCount: 5,
                    categorizedTransactionCount: 4,
                    uncategorizedTransactionCount: 1,
                    totalSum: 1000,
                    categorizedSum: 950,
                    uncategorizedSum: 50,
                    coveragePercentage: 95,
                    topExpenseCategories: [
                        {
                            categoryId: 'housing',
                            name: 'Housing',
                            color: '#9a72d8',
                            amount: 600,
                            sharePercentage: 60,
                        },
                        {
                            categoryId: 'food',
                            name: 'Food',
                            color: '#d4a95e',
                            amount: 250,
                            sharePercentage: 25,
                        },
                    ],
                })
            }),
        )

        renderPage()

        const historyPanel = screen
            .getByText('Category spending over time', {selector: 'h2'})
            .closest('article')
        expect(historyPanel).not.toBeNull()
        expect(within(historyPanel as HTMLElement).getByText('Coming soon'))
            .toBeInTheDocument()
        expect(within(historyPanel as HTMLElement).getByText('Category history is on the way'))
            .toBeInTheDocument()

        const spendingPanel = screen
            .getByText('Spending by category', {selector: 'h2'})
            .closest('article')
        expect(spendingPanel).not.toBeNull()
        const breakdown = within(spendingPanel as HTMLElement)

        expect(await breakdown.findByText('€1,000')).toBeInTheDocument()
        expect(breakdown.getByLabelText('Housing: €600, 60%')).toBeInTheDocument()
        expect(breakdown.getByLabelText('Food: €250, 25%')).toBeInTheDocument()
        expect(breakdown.getByLabelText('Other: €150, 15%')).toBeInTheDocument()
        expect(breakdown.getByRole('link', {name: /View all/}))
            .toHaveAttribute('href', '/categories')
        expect(analyticsQuery).toEqual({
            month: currentMonth(),
            currency: 'EUR',
            type: 'EXPENSE',
            topLimit: '4',
        })
    })

    it('reloads category spending for the selected dashboard currency', async () => {
        const requestedCurrencies: string[] = []

        server.use(
            http.get('/api/v1/categories/analytics', ({request}) => {
                const currency = new URL(request.url).searchParams.get('currency') ?? ''
                requestedCurrencies.push(currency)
                const total = currency === 'EUR' ? 1000 : 5000

                return HttpResponse.json({
                    ...emptyCategoryAnalytics(currency),
                    totalTransactionCount: 1,
                    categorizedTransactionCount: 1,
                    totalSum: total,
                    categorizedSum: total,
                    coveragePercentage: 100,
                    topExpenseCategories: [{
                        categoryId: `${currency}-category`,
                        name: currency === 'EUR' ? 'Housing' : 'Transport',
                        color: '#5d8fc5',
                        amount: total,
                        sharePercentage: 100,
                    }],
                })
            }),
        )

        renderPage()
        const panel = within(
            screen.getByText('Spending by category', {selector: 'h2'}).closest('article')!,
        )

        expect(await panel.findByRole('img', {
            name: '€1,000 spent across categories this month',
        })).toBeInTheDocument()
        await selectOption(screen.getByLabelText('Dashboard currency'), 'RUB')

        expect(await panel.findByRole('img', {
            name: '₽5,000 spent across categories this month',
        })).toBeInTheDocument()
        expect(panel.getByText('Transport')).toBeInTheDocument()
        expect(requestedCurrencies).toEqual(['EUR', 'RUB'])
    })

    it('allows retry when category spending cannot be loaded', async () => {
        let shouldFail = true

        server.use(
            http.get('/api/v1/categories/analytics', () => {
                if (shouldFail) {
                    return HttpResponse.json(
                        {message: 'Category analytics unavailable'},
                        {status: 500},
                    )
                }

                return HttpResponse.json(emptyCategoryAnalytics())
            }),
        )

        renderPage()
        const panel = within(
            screen.getByText('Spending by category', {selector: 'h2'}).closest('article')!,
        )

        expect(await panel.findByText('We could not load spending by category.'))
            .toBeInTheDocument()
        shouldFail = false
        fireEvent.click(panel.getByRole('button', {name: 'Try again'}))

        expect(await panel.findByText('No spending this month')).toBeInTheDocument()
    })

    it('shows an unavailable state when monthly analytics cannot be loaded', async () => {
        server.use(
            http.get('/api/v1/accounts', () => HttpResponse.json({accounts})),
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
            http.get('/api/v1/accounts', () => HttpResponse.json({accounts})),
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
        expect(recentPanel.getByRole('button', {name: 'Add transaction'}))
            .toHaveClass('dashboard-secondary-action')
        expect(transactionQuery).toEqual({
            page: '0',
            size: '3',
        })
    })

    it('shows an empty recent-transactions state', async () => {
        server.use(
            http.get('/api/v1/accounts', () => HttpResponse.json({accounts})),
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
