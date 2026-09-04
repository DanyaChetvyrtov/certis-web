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
    archiveCategory,
    createCategory,
    getAllCategoryCards,
    getCategoryAnalytics,
    getCategoryCards,
    getCategory,
    getCategoryOptions,
    restoreCategory,
    updateCategory,
} from './categoriesApi'

const category = {
    id: 'category-id',
    name: 'Groceries',
    type: 'EXPENSE' as const,
    icon: 'shopping-cart',
    color: '#E6655A',
    archivedAt: null,
    monthlyTransactionCount: 11,
    monthlyAmount: 40470,
    monthlySharePercentage: 32,
}

const categoryCards = {
    month: '2026-09',
    currency: 'RUB',
    categories: [category],
    page: 1,
    size: 10,
    totalElements: 11,
    totalPages: 2,
}

const categoryAnalytics = {
    month: '2026-09',
    currency: 'RUB',
    type: 'EXPENSE',
    totalTransactionCount: 4,
    categorizedTransactionCount: 3,
    uncategorizedTransactionCount: 1,
    totalSum: 200,
    categorizedSum: 150,
    uncategorizedSum: 50,
    coveragePercentage: 75,
    topExpenseCategories: [{
        categoryId: category.id,
        name: category.name,
        color: category.color,
        amount: 100,
        sharePercentage: 50,
    }],
}

describe('categoriesApi', () => {
    it('loads category cards for the requested month', async () => {
        server.use(
            http.get(
                '/api/v1/categories',
                ({request}) => {
                    expect(
                        Object.fromEntries(
                            new URL(request.url).searchParams,
                        ),
                    ).toEqual({
                        month: '2026-09',
                        currency: 'EUR',
                        page: '1',
                        size: '10',
                        sort: 'AMOUNT_ASC',
                    })

                    return HttpResponse.json(categoryCards)
                },
            ),
        )

        await expect(
            getCategoryCards({
                month: '2026-09',
                currency: 'EUR',
                page: 1,
                size: 10,
                sort: 'AMOUNT_ASC',
            }),
        ).resolves.toEqual(categoryCards)
    })

    it('uses backend defaults for omitted paging and sorting values', async () => {
        server.use(
            http.get('/api/v1/categories', ({request}) => {
                expect(
                    Object.fromEntries(
                        new URL(request.url).searchParams,
                    ),
                ).toEqual({
                    month: '2026-09',
                    currency: 'RUB',
                    page: '0',
                    size: '20',
                    sort: 'AMOUNT_DESC',
                })

                return HttpResponse.json({
                    ...categoryCards,
                    page: 0,
                    size: 20,
                })
            }),
        )

        await getCategoryCards({
            month: '2026-09',
            currency: 'RUB',
        })
    })

    it('loads every category page for selection controls', async () => {
        const requestedPages: string[] = []

        server.use(
            http.get('/api/v1/categories', ({request}) => {
                const page = new URL(request.url).searchParams.get('page') ?? ''
                requestedPages.push(page)

                return HttpResponse.json({
                    ...categoryCards,
                    categories: [{
                        ...category,
                        id: `category-${page}`,
                    }],
                    page: Number(page),
                    size: 100,
                    totalElements: 201,
                    totalPages: 3,
                })
            }),
        )

        await expect(getAllCategoryCards({
            month: '2026-09',
            currency: 'RUB',
            sort: 'NAME',
        })).resolves.toHaveLength(3)
        expect(requestedPages).toEqual(['0', '1', '2'])
    })

    it('loads category analytics using the backend contract', async () => {
        server.use(
            http.get('/api/v1/categories/analytics', ({request}) => {
                expect(
                    Object.fromEntries(
                        new URL(request.url).searchParams,
                    ),
                ).toEqual({
                    month: '2026-09',
                    currency: 'RUB',
                    type: 'EXPENSE',
                    topLimit: '4',
                })

                return HttpResponse.json(categoryAnalytics)
            }),
        )

        await expect(getCategoryAnalytics({
            month: '2026-09',
            currency: 'RUB',
            type: 'EXPENSE',
        })).resolves.toEqual(categoryAnalytics)
    })

    it('loads active category options for a transaction type', async () => {
        const options = [{
            id: category.id,
            name: category.name,
            icon: category.icon,
            color: category.color,
        }]

        server.use(
            http.get('/api/v1/categories/options', ({request}) => {
                expect(
                    Object.fromEntries(
                        new URL(request.url).searchParams,
                    ),
                ).toEqual({type: 'EXPENSE'})

                return HttpResponse.json(options)
            }),
        )

        await expect(
            getCategoryOptions('EXPENSE'),
        ).resolves.toEqual(options)
    })

    it('loads one category by id', async () => {
        server.use(
            http.get(
                '/api/v1/categories/:categoryId',
                ({params}) => {
                    expect(params.categoryId).toBe(category.id)
                    return HttpResponse.json(category)
                },
            ),
        )

        await expect(getCategory(category.id)).resolves.toEqual(category)
    })

    it('creates a category using the backend contract', async () => {
        server.use(
            http.post(
                '/api/v1/categories',
                async ({request}) => {
                    await expect(request.json()).resolves.toEqual({
                        name: category.name,
                        type: category.type,
                        icon: category.icon,
                        color: category.color,
                    })

                    return HttpResponse.json(
                        category,
                        {status: 201},
                    )
                },
            ),
        )

        await expect(createCategory({
            name: category.name,
            type: category.type,
            icon: 'shopping-cart',
            color: category.color,
        })).resolves.toEqual(category)
    })

    it('updates category fields without sending its type', async () => {
        server.use(
            http.put(
                '/api/v1/categories/:categoryId',
                async ({request}) => {
                    await expect(request.json()).resolves.toEqual({
                        name: 'Food',
                        icon: 'utensils',
                        color: '#E58E4E',
                    })

                    return HttpResponse.json({
                        ...category,
                        name: 'Food',
                        icon: 'utensils',
                        color: '#E58E4E',
                    })
                },
            ),
        )

        await expect(updateCategory(category.id, {
            name: 'Food',
            icon: 'utensils',
            color: '#E58E4E',
        })).resolves.toMatchObject({
            name: 'Food',
            type: 'EXPENSE',
        })
    })

    it('archives a category with DELETE', async () => {
        server.use(
            http.delete(
                '/api/v1/categories/:categoryId',
                () => new HttpResponse(null, {status: 204}),
            ),
        )

        await expect(
            archiveCategory(category.id),
        ).resolves.toBeUndefined()
    })

    it('restores a category with POST', async () => {
        server.use(
            http.post(
                '/api/v1/categories/:categoryId/restore',
                ({params}) => {
                    expect(params.categoryId).toBe(category.id)
                    return new HttpResponse(null, {status: 204})
                },
            ),
        )

        await expect(
            restoreCategory(category.id),
        ).resolves.toBeUndefined()
    })
})
