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
import {server} from '../../../test/server'
import {CategoriesPage} from './CategoriesPage'

vi.mock('../../auth/session/SessionContext', () => ({
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

const renderPage = () =>
    render(
        <MemoryRouter>
            <CategoriesPage/>
        </MemoryRouter>,
    )

const categoryCardsResponse = (
    categories: Array<Record<string, unknown>>,
    pagination: Partial<{
        page: number
        size: number
        totalElements: number
        totalPages: number
    }> = {},
) => ({
    month: '2026-09',
    currency: 'RUB',
    categories: categories.map((category) => ({
        monthlyTransactionCount: 0,
        monthlyAmount: 0,
        monthlySharePercentage: 0,
        ...category,
    })),
    page: 0,
    size: 20,
    totalElements: categories.length,
    totalPages: categories.length === 0 ? 0 : 1,
    ...pagination,
})

const emptyAnalyticsResponse = {
    month: '2026-09',
    currency: 'RUB',
    type: 'EXPENSE',
    totalTransactionCount: 0,
    categorizedTransactionCount: 0,
    uncategorizedTransactionCount: 0,
    totalSum: 0,
    categorizedSum: 0,
    uncategorizedSum: 0,
    coveragePercentage: null,
    topExpenseCategories: [],
}

describe('CategoriesPage', () => {
    beforeEach(() => {
        server.use(
            http.get(
                '/api/v1/categories/analytics',
                () => HttpResponse.json(emptyAnalyticsResponse),
            ),
        )
    })

    it('renders category coverage and top categories', async () => {
        const requestedTypes: string[] = []

        server.use(
            http.get(
                '/api/v1/categories',
                () => HttpResponse.json(categoryCardsResponse([
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
                ])),
            ),
            http.get('/api/v1/categories/analytics', ({request}) => {
                const searchParams = new URL(request.url).searchParams
                const type = searchParams.get('type') ?? ''
                requestedTypes.push(type)

                expect(searchParams.get('month')).toBe('2026-09')
                expect(searchParams.get('currency')).toBe('RUB')
                expect(searchParams.get('topLimit')).toBe('4')

                return HttpResponse.json({
                    ...emptyAnalyticsResponse,
                    type,
                    totalTransactionCount: 4,
                    categorizedTransactionCount: 3,
                    uncategorizedTransactionCount: 1,
                    totalSum: 200,
                    categorizedSum: 150,
                    coveragePercentage: 75,
                    topExpenseCategories: [{
                        categoryId: type === 'EXPENSE'
                            ? 'groceries'
                            : 'salary',
                        name: type === 'EXPENSE'
                            ? 'Groceries'
                            : 'Salary',
                        color: type === 'EXPENSE'
                            ? '#E6655A'
                            : '#10B981',
                        amount: 100,
                        sharePercentage: 50,
                    }],
                })
            }),
        )

        renderPage()

        const insights = screen.getByRole('complementary', {
            name: 'Category statistics',
        })

        expect(
            await within(insights).findByText('75%'),
        ).toBeInTheDocument()
        expect(
            within(insights).getByText('1 transaction needs a category'),
        ).toBeInTheDocument()
        expect(
            within(insights).getByRole('heading', {
                name: 'Top expense categories',
            }),
        ).toBeInTheDocument()
        expect(within(insights).getByText('Groceries')).toBeInTheDocument()
        expect(within(insights).getByText('50%')).toBeInTheDocument()

        fireEvent.click(
            screen.getByRole('tab', {name: 'Income · 1'}),
        )

        expect(
            await within(insights).findByRole('heading', {
                name: 'Top income categories',
            }),
        ).toBeInTheDocument()
        expect(await within(insights).findByText('Salary')).toBeInTheDocument()
        expect(requestedTypes).toEqual(['EXPENSE', 'INCOME'])
    })

    it('opens category creation from the statistics sidebar', async () => {
        server.use(
            http.get(
                '/api/v1/categories',
                () => HttpResponse.json(categoryCardsResponse([{
                    id: 'groceries',
                    name: 'Groceries',
                    type: 'EXPENSE',
                    icon: 'shopping-cart',
                    color: '#E6655A',
                    archivedAt: null,
                }])),
            ),
        )

        renderPage()

        expect(await screen.findByText('Groceries')).toBeInTheDocument()

        const insights = screen.getByRole('complementary', {
            name: 'Category statistics',
        })
        const addCategoryButton = within(insights).getByRole(
            'button',
            {name: 'Add category'},
        )

        expect(
            within(insights).getByText('Need another category?'),
        ).toBeInTheDocument()

        fireEvent.click(addCategoryButton)

        expect(
            screen.getByRole('dialog', {name: 'New category'}),
        ).toBeInTheDocument()
    })

    it('opens uncategorized transactions from the coverage panel', async () => {
        let uncategorizedQuery: Record<string, string> = {}

        server.use(
            http.get(
                '/api/v1/categories',
                () => HttpResponse.json(categoryCardsResponse([{
                    id: 'groceries',
                    name: 'Groceries',
                    type: 'EXPENSE',
                    icon: 'shopping-cart',
                    color: '#E6655A',
                    archivedAt: null,
                }])),
            ),
            http.get(
                '/api/v1/categories/analytics',
                () => HttpResponse.json({
                    ...emptyAnalyticsResponse,
                    totalTransactionCount: 2,
                    categorizedTransactionCount: 1,
                    uncategorizedTransactionCount: 1,
                    totalSum: 1000,
                    categorizedSum: 500,
                    uncategorizedSum: 500,
                    coveragePercentage: 50,
                }),
            ),
            http.get(
                '/api/v1/categories/options',
                () => HttpResponse.json([{
                    id: 'groceries',
                    name: 'Groceries',
                    icon: 'shopping-cart',
                    color: '#E6655A',
                }]),
            ),
            http.get(
                '/api/v1/accounts',
                () => HttpResponse.json([]),
            ),
            http.get(
                '/api/v1/transactions/uncategorized',
                ({request}) => {
                    uncategorizedQuery = Object.fromEntries(
                        new URL(request.url).searchParams,
                    )

                    return HttpResponse.json({
                        month: '2026-09',
                        currency: 'RUB',
                        type: 'EXPENSE',
                        items: [],
                        page: 0,
                        size: 20,
                        totalElements: 0,
                        totalPages: 0,
                    })
                },
            ),
        )

        renderPage()

        const reviewButton = await screen.findByRole('button', {
            name: 'Categorize 1 transaction',
        })
        fireEvent.click(reviewButton)

        expect(
            screen.getByRole('dialog', {
                name: 'Uncategorized transactions',
            }),
        ).toBeInTheDocument()
        await waitFor(() => {
            expect(uncategorizedQuery).toEqual({
                month: '2026-09',
                currency: 'RUB',
                type: 'EXPENSE',
                page: '0',
                size: '20',
            })
        })

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Close uncategorized transactions',
            }),
        )

        expect(reviewButton).toHaveFocus()
    })

    it('retries category analytics independently from category cards', async () => {
        let analyticsAttempts = 0

        server.use(
            http.get(
                '/api/v1/categories',
                () => HttpResponse.json(categoryCardsResponse([{
                    id: 'groceries',
                    name: 'Groceries',
                    type: 'EXPENSE',
                    icon: 'shopping-cart',
                    color: '#E6655A',
                    archivedAt: null,
                }])),
            ),
            http.get('/api/v1/categories/analytics', () => {
                analyticsAttempts += 1

                if (analyticsAttempts === 1) {
                    return HttpResponse.json(
                        {message: 'Statistics are temporarily unavailable.'},
                        {status: 500},
                    )
                }

                return HttpResponse.json({
                    ...emptyAnalyticsResponse,
                    totalTransactionCount: 1,
                    categorizedTransactionCount: 1,
                    totalSum: 100,
                    categorizedSum: 100,
                    coveragePercentage: 100,
                })
            }),
        )

        renderPage()

        expect(await screen.findByText('Groceries')).toBeInTheDocument()

        const insights = screen.getByRole('complementary', {
            name: 'Category statistics',
        })
        expect(
            await within(insights).findAllByText(
                'Statistics are temporarily unavailable.',
            ),
        ).toHaveLength(2)

        fireEvent.click(
            within(insights).getAllByRole('button', {
                name: 'Try again',
            })[0],
        )

        expect(await within(insights).findByText('100%')).toBeInTheDocument()
        expect(analyticsAttempts).toBe(2)
    })

    it('loads the preferred currency and switches statistics currency', async () => {
        const requestedCurrencies: string[] = []
        const analyticsCurrencies: string[] = []

        server.use(
            http.get('/api/v1/categories', ({request}) => {
                const currency = new URL(request.url)
                    .searchParams.get('currency') ?? ''
                requestedCurrencies.push(currency)

                return HttpResponse.json({
                    ...categoryCardsResponse([{
                        id: 'groceries',
                        name: 'Groceries',
                        type: 'EXPENSE',
                        icon: 'shopping-cart',
                        color: '#E6655A',
                        archivedAt: null,
                        monthlyAmount: currency === 'USD' ? 250 : 200,
                    }]),
                    currency,
                })
            }),
            http.get('/api/v1/categories/analytics', ({request}) => {
                const currency = new URL(request.url)
                    .searchParams.get('currency') ?? ''
                analyticsCurrencies.push(currency)

                return HttpResponse.json({
                    ...emptyAnalyticsResponse,
                    currency,
                })
            }),
        )

        renderPage()

        expect(await screen.findByText('₽200')).toBeInTheDocument()
        expect(requestedCurrencies).toEqual(['RUB'])
        await waitFor(() => {
            expect(analyticsCurrencies).toEqual(['RUB'])
        })

        fireEvent.change(
            screen.getByRole('combobox', {name: 'Statistics currency'}),
            {target: {value: 'USD'}},
        )

        expect(await screen.findByText('$250')).toBeInTheDocument()
        expect(requestedCurrencies).toEqual(['RUB', 'USD'])
        await waitFor(() => {
            expect(analyticsCurrencies).toEqual(['RUB', 'USD'])
        })
    })

    it('separates active and archived categories', async () => {
        server.use(
            http.get('/api/v1/categories', () => HttpResponse.json(categoryCardsResponse([
                {
                    id: 'groceries',
                    name: 'Groceries',
                    type: 'EXPENSE',
                    icon: 'shopping-cart',
                    color: '#E6655A',
                    archivedAt: null,
                    monthlyTransactionCount: 11,
                    monthlyAmount: 40470,
                    monthlySharePercentage: 32,
                },
                {
                    id: 'salary',
                    name: 'Salary',
                    type: 'INCOME',
                    icon: 'briefcase',
                    color: '#10B981',
                    archivedAt: null,
                },
                {
                    id: 'old-expense',
                    name: 'Old expense',
                    type: 'EXPENSE',
                    icon: 'gift',
                    color: '#8C9AB8',
                    archivedAt: '2026-08-08T17:00:00Z',
                },
            ]))),
        )

        renderPage()

        expect(
            await screen.findByText('Groceries'),
        ).toBeInTheDocument()
        expect(screen.getByText('11 transactions')).toBeInTheDocument()
        expect(screen.getByText('₽40,470')).toBeInTheDocument()
        expect(screen.getByText('32%')).toBeInTheDocument()
        expect(
            screen.getByRole('progressbar', {
                name: 'Groceries share this month',
            }),
        ).toHaveAttribute('aria-valuenow', '32')

        expect(
            screen.getByRole('tab', {name: 'Expenses · 1'}),
        ).toBeInTheDocument()

        expect(
            screen.getByRole('tab', {name: 'Income · 1'}),
        ).toBeInTheDocument()

        expect(
            screen.queryByText('Old expense'),
        ).not.toBeInTheDocument()

        fireEvent.click(
            screen.getByRole('button', {name: 'Archived · 1'}),
        )

        expect(screen.getByText('Old expense')).toBeInTheDocument()
        expect(screen.queryByText('Groceries')).not.toBeInTheDocument()

        fireEvent.click(
            screen.getByRole('button', {name: 'Active · 2'}),
        )

        fireEvent.click(
            screen.getByRole('tab', {name: 'Income · 1'}),
        )

        expect(screen.getByText('Salary')).toBeInTheDocument()
        expect(screen.queryByText('Groceries')).not.toBeInTheDocument()
    })

    it('requests category cards using the selected server sort', async () => {
        const requestedSorts: string[] = []

        server.use(
            http.get(
                '/api/v1/categories',
                ({request}) => {
                    const sort = new URL(request.url)
                        .searchParams.get('sort') ?? ''
                    requestedSorts.push(sort)

                    const categories = sort === 'AMOUNT_ASC'
                        ? [
                            {
                                id: 'groceries',
                                name: 'Groceries',
                                type: 'EXPENSE',
                                icon: 'shopping-cart',
                                color: '#E6655A',
                                archivedAt: null,
                                monthlyAmount: 100,
                            },
                            {
                                id: 'utilities',
                                name: 'Utilities',
                                type: 'EXPENSE',
                                icon: 'home',
                                color: '#5982B3',
                                archivedAt: null,
                                monthlyAmount: 300,
                            },
                        ]
                        : [
                            {
                                id: 'utilities',
                                name: 'Utilities',
                                type: 'EXPENSE',
                                icon: 'home',
                                color: '#5982B3',
                                archivedAt: null,
                                monthlyAmount: 300,
                            },
                            {
                                id: 'groceries',
                                name: 'Groceries',
                                type: 'EXPENSE',
                                icon: 'shopping-cart',
                                color: '#E6655A',
                                archivedAt: null,
                                monthlyAmount: 100,
                            },
                        ]

                    return HttpResponse.json(
                        categoryCardsResponse(categories),
                    )
                },
            ),
        )

        renderPage()

        await screen.findByText('Groceries')

        expect(
            screen.getAllByRole('heading', {level: 3})
                .map((heading) => heading.textContent),
        ).toEqual(['Utilities', 'Groceries'])

        fireEvent.change(
            screen.getByRole('combobox', {name: 'Sort categories'}),
            {target: {value: 'AMOUNT_ASC'}},
        )

        expect(
            await screen.findByText('₽100'),
        ).toBeInTheDocument()

        expect(screen.getAllByRole('heading', {level: 3})
            .map((heading) => heading.textContent),
        ).toEqual(['Groceries', 'Utilities'])
        expect(requestedSorts).toEqual([
            'AMOUNT_DESC',
            'AMOUNT_ASC',
        ])
    })

    it('loads another page through the server contract', async () => {
        const requestedPages: string[] = []

        server.use(
            http.get('/api/v1/categories', ({request}) => {
                const page = new URL(request.url)
                    .searchParams.get('page') ?? '0'
                requestedPages.push(page)

                return HttpResponse.json(categoryCardsResponse([
                    {
                        id: `category-${page}`,
                        name: page === '0' ? 'Groceries' : 'Transport',
                        type: 'EXPENSE',
                        icon: 'shopping-cart',
                        color: '#E6655A',
                        archivedAt: null,
                    },
                ], {
                    page: Number(page),
                    size: 20,
                    totalElements: 21,
                    totalPages: 2,
                }))
            }),
        )

        renderPage()

        expect(await screen.findByText('Groceries')).toBeInTheDocument()
        expect(screen.getByText('Showing 1–20 of 21')).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', {name: 'Next'}))

        expect(await screen.findByText('Transport')).toBeInTheDocument()
        expect(screen.getByText('Page 2 of 2')).toBeInTheDocument()
        expect(screen.getByText('Showing 21–21 of 21')).toBeInTheDocument()
        expect(requestedPages).toEqual(['0', '1'])
    })

    it('creates a category and switches to its type', async () => {
        let requestBody: unknown

        server.use(
            http.get(
                '/api/v1/categories',
                () => HttpResponse.json(categoryCardsResponse([])),
            ),
            http.post(
                '/api/v1/categories',
                async ({request}) => {
                    requestBody = await request.json()

                    return HttpResponse.json(
                        {
                            id: 'freelance',
                            name: 'Freelance',
                            type: 'INCOME',
                            icon: 'briefcase',
                            color: '#10B981',
                            archivedAt: null,
                        },
                        {status: 201},
                    )
                },
            ),
        )

        renderPage()

        await screen.findByText('Create your first category')

        fireEvent.click(
            screen.getByRole('button', {name: 'New category'}),
        )

        expect(
            screen.getByRole('dialog', {name: 'New category'}),
        ).toBeInTheDocument()

        fireEvent.change(
            screen.getByLabelText('Name'),
            {target: {value: 'Freelance'}},
        )

        fireEvent.click(
            screen.getByRole('radio', {name: 'Income'}),
        )

        fireEvent.click(
            screen.getByRole('radio', {name: 'Work'}),
        )

        fireEvent.click(
            screen.getByRole('radio', {name: 'Emerald'}),
        )

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Create category',
            }),
        )

        expect(
            await screen.findByText('Category created.'),
        ).toBeInTheDocument()

        expect(
            screen.getByText('Freelance'),
        ).toBeInTheDocument()

        expect(requestBody).toEqual({
            name: 'Freelance',
            type: 'INCOME',
            icon: 'briefcase',
            color: '#10B981',
        })

        expect(
            screen.getByRole('tab', {name: 'Income · 1'}),
        ).toHaveAttribute('aria-selected', 'true')
    })

    it('edits an active category and updates its card', async () => {
        let requestBody: unknown

        server.use(
            http.get('/api/v1/categories', () => HttpResponse.json(categoryCardsResponse([
                {
                    id: 'groceries',
                    name: 'Groceries',
                    type: 'EXPENSE',
                    icon: 'shopping-cart',
                    color: '#E6655A',
                    archivedAt: null,
                    monthlyTransactionCount: 4,
                    monthlyAmount: 1200,
                    monthlySharePercentage: 25,
                },
            ]))),
            http.put(
                '/api/v1/categories/:categoryId',
                async ({params, request}) => {
                    expect(params.categoryId).toBe('groceries')
                    requestBody = await request.json()

                    return HttpResponse.json({
                        id: 'groceries',
                        name: 'Food',
                        type: 'EXPENSE',
                        icon: 'utensils',
                        color: '#E58E4E',
                        archivedAt: null,
                    })
                },
            ),
        )

        renderPage()

        await screen.findByText('Groceries')

        fireEvent.click(
            screen.getByRole('button', {name: 'Edit Groceries'}),
        )

        expect(
            screen.getByRole('dialog', {name: 'Edit category'}),
        ).toBeInTheDocument()

        fireEvent.change(
            screen.getByLabelText('Name'),
            {target: {value: 'Food'}},
        )
        fireEvent.click(
            screen.getByRole('radio', {name: 'Dining'}),
        )
        fireEvent.click(
            screen.getByRole('radio', {name: 'Orange'}),
        )
        fireEvent.click(
            screen.getByRole('button', {name: 'Save changes'}),
        )

        expect(
            await screen.findByText('Category updated.'),
        ).toBeInTheDocument()
        expect(screen.getByText('Food')).toBeInTheDocument()
        expect(screen.queryByText('Groceries')).not.toBeInTheDocument()
        expect(screen.getByText('4 transactions')).toBeInTheDocument()
        expect(screen.getByText('₽1,200')).toBeInTheDocument()
        expect(screen.getByText('25%')).toBeInTheDocument()
        expect(requestBody).toEqual({
            name: 'Food',
            icon: 'utensils',
            color: '#E58E4E',
        })
    })

    it('archives a category and keeps it available in the archive', async () => {
        let archivedCategoryId = ''

        server.use(
            http.get('/api/v1/categories', () => HttpResponse.json(categoryCardsResponse([
                {
                    id: 'groceries',
                    name: 'Groceries',
                    type: 'EXPENSE',
                    icon: 'shopping-cart',
                    color: '#E6655A',
                    archivedAt: null,
                },
            ]))),
            http.delete(
                '/api/v1/categories/:categoryId',
                ({params}) => {
                    archivedCategoryId = String(params.categoryId)
                    return new HttpResponse(null, {status: 204})
                },
            ),
        )

        renderPage()

        await screen.findByText('Groceries')

        fireEvent.click(
            screen.getByRole('button', {name: 'Archive Groceries'}),
        )

        expect(
            screen.getByRole('alertdialog', {
                name: 'Archive “Groceries”?',
            }),
        ).toBeInTheDocument()

        fireEvent.click(
            screen.getByRole('button', {name: 'Archive category'}),
        )

        expect(
            await screen.findByText(
                'Category archived. You can restore it from Archived.',
            ),
        ).toBeInTheDocument()
        expect(archivedCategoryId).toBe('groceries')
        expect(screen.queryByText('Groceries')).not.toBeInTheDocument()

        fireEvent.click(
            screen.getByRole('button', {name: 'Archived · 1'}),
        )

        expect(screen.getByText('Groceries')).toBeInTheDocument()
    })

    it('restores an archived category', async () => {
        let restoredCategoryId = ''

        server.use(
            http.get('/api/v1/categories', () => HttpResponse.json(categoryCardsResponse([
                {
                    id: 'old-expense',
                    name: 'Old expense',
                    type: 'EXPENSE',
                    icon: 'gift',
                    color: '#8C9AB8',
                    archivedAt: '2026-08-08T17:00:00Z',
                },
            ]))),
            http.post(
                '/api/v1/categories/:categoryId/restore',
                ({params}) => {
                    restoredCategoryId = String(params.categoryId)
                    return new HttpResponse(null, {status: 204})
                },
            ),
        )

        renderPage()

        await screen.findByText('No active categories on this page')

        fireEvent.click(
            screen.getByRole('button', {name: 'Archived · 1'}),
        )
        fireEvent.click(
            screen.getByRole('button', {name: 'Restore Old expense'}),
        )

        expect(
            await screen.findByText('Category restored.'),
        ).toBeInTheDocument()
        expect(restoredCategoryId).toBe('old-expense')
        expect(screen.queryByText('Old expense')).not.toBeInTheDocument()

        fireEvent.click(
            screen.getByRole('button', {name: 'Active · 1'}),
        )

        expect(screen.getByText('Old expense')).toBeInTheDocument()
    })

    it('retries the initial load after an error', async () => {
        let loadAttempts = 0

        server.use(
            http.get('/api/v1/categories', () => {
                loadAttempts += 1

                if (loadAttempts === 1) {
                    return HttpResponse.json(
                        {message: 'Categories are temporarily unavailable.'},
                        {status: 500},
                    )
                }

                return HttpResponse.json(categoryCardsResponse([
                    {
                        id: 'groceries',
                        name: 'Groceries',
                        type: 'EXPENSE',
                        icon: 'shopping-cart',
                        color: '#E6655A',
                        archivedAt: null,
                    },
                ]))
            }),
        )

        renderPage()

        expect(
            await screen.findByText(
                'Categories are temporarily unavailable.',
            ),
        ).toBeInTheDocument()

        fireEvent.click(
            screen.getByRole('button', {name: 'Try again'}),
        )

        expect(await screen.findByText('Groceries')).toBeInTheDocument()
        expect(loadAttempts).toBe(2)
    })

    it('shows a created category after the initial load failed', async () => {
        server.use(
            http.get(
                '/api/v1/categories',
                () => HttpResponse.json(
                    {message: 'Categories could not be fetched.'},
                    {status: 500},
                ),
            ),
            http.post(
                '/api/v1/categories',
                () => HttpResponse.json(
                    {
                        id: 'recovered',
                        name: 'Recovered',
                        type: 'EXPENSE',
                        icon: 'gift',
                        color: '#E6655A',
                        archivedAt: null,
                    },
                    {status: 201},
                ),
            ),
        )

        renderPage()

        await screen.findByText('Categories could not be fetched.')
        fireEvent.click(
            screen.getByRole('button', {name: 'New category'}),
        )
        fireEvent.change(
            screen.getByLabelText('Name'),
            {target: {value: 'Recovered'}},
        )
        fireEvent.click(
            screen.getByRole('button', {name: 'Create category'}),
        )

        expect(
            await screen.findByText('Category created.'),
        ).toBeInTheDocument()
        expect(screen.getByText('Recovered')).toBeInTheDocument()
        expect(
            screen.queryByText('Categories could not be loaded'),
        ).not.toBeInTheDocument()
    })

    it('keeps an archived category visible when restore fails', async () => {
        server.use(
            http.get('/api/v1/categories', () => HttpResponse.json(categoryCardsResponse([
                {
                    id: 'old-expense',
                    name: 'Old expense',
                    type: 'EXPENSE',
                    icon: 'gift',
                    color: '#8C9AB8',
                    archivedAt: '2026-08-08T17:00:00Z',
                },
            ]))),
            http.post(
                '/api/v1/categories/:categoryId/restore',
                () => HttpResponse.json(
                    {message: 'This category cannot be restored yet.'},
                    {status: 409},
                ),
            ),
        )

        renderPage()

        await screen.findByText('No active categories on this page')
        fireEvent.click(
            screen.getByRole('button', {name: 'Archived · 1'}),
        )
        fireEvent.click(
            screen.getByRole('button', {name: 'Restore Old expense'}),
        )

        expect(
            await screen.findByText(
                'This category cannot be restored yet.',
            ),
        ).toBeInTheDocument()
        expect(screen.getByText('Old expense')).toBeInTheDocument()
        expect(
            screen.getByRole('button', {name: 'Restore Old expense'}),
        ).toBeEnabled()
    })
})
