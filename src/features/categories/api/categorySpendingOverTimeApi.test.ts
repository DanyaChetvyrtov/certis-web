import {http, HttpResponse} from 'msw'
import {describe, expect, it} from 'vitest'
import {server} from '../../../test/server'
import {getCategorySpendingOverTime} from './categoriesApi'

const response = {
    month: '2026-09',
    currency: 'RUB',
    type: 'EXPENSE',
    totalSum: 1250,
    series: [
        {
            categoryId: 'category-id',
            categoryName: 'Groceries',
            categoryColor: '#E6655A',
            total: 1000,
            points: [
                {bucketMonth: '2026-08', amount: 400},
                {bucketMonth: '2026-09', amount: 600},
            ],
        },
        {
            categoryId: null,
            categoryName: 'Other',
            categoryColor: null,
            total: 250,
            points: [
                {bucketMonth: '2026-08', amount: 100},
                {bucketMonth: '2026-09', amount: 150},
            ],
        },
    ],
}

describe('category spending over time API', () => {
    it('loads the dashboard trend using the backend contract', async () => {
        server.use(
            http.get(
                '/api/v1/categories/analytics/spending-over-time',
                ({request}) => {
                    expect(Object.fromEntries(
                        new URL(request.url).searchParams,
                    )).toEqual({
                        month: '2026-09',
                        currency: 'RUB',
                        type: 'EXPENSE',
                        bucketCount: '6',
                        topLimit: '4',
                    })

                    return HttpResponse.json(response)
                },
            ),
        )

        await expect(getCategorySpendingOverTime({
            month: '2026-09',
            currency: 'RUB',
            type: 'EXPENSE',
        })).resolves.toEqual(response)
    })
})
