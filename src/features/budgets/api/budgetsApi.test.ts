import {http, HttpResponse} from 'msw'
import {describe, expect, it} from 'vitest'
import {server} from '../../../test/server'
import {
    applyOptimization,
    dismissOptimization,
    generateOptimization,
    getBudget,
    getLatestOptimization,
    saveBudget,
} from './budgetsApi'

const budget = {
    id: 'budget-id',
    month: '2026-08',
    currency: 'RUB',
    monthlyIncome: 185000,
    savingsTarget: 30500,
    allocations: [],
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
}
const optimization = {
    id: 'optimization-id',
    budgetId: budget.id,
    month: budget.month,
    currency: budget.currency,
    algorithmVersion: 'v1',
    status: 'PROPOSED' as const,
    savingsBefore: 30500,
    savingsAfter: 35000,
    additionalSavings: 4500,
    allocations: [],
    createdAt: '2026-08-01T00:00:00Z',
    appliedAt: null,
}

describe('budgetsApi', () => {
    it('loads a monthly budget and treats a missing month as empty', async () => {
        server.use(http.get('/api/v1/budgets/:month', ({params}) =>
            params.month === budget.month
                ? HttpResponse.json(budget)
                : HttpResponse.json({message: 'Not found'}, {status: 404}),
        ))
        await expect(getBudget(budget.month)).resolves.toEqual(budget)
        await expect(getBudget('2026-09')).resolves.toBeNull()
    })

    it('saves only fields accepted by the backend', async () => {
        server.use(http.put('/api/v1/budgets/:month', async ({params, request}) => {
            expect(params.month).toBe(budget.month)
            await expect(request.json()).resolves.toEqual({
                monthlyIncome: 185000,
                savingsTarget: 30500,
                allocations: [{categoryId: 'food', type: 'VARIABLE', limit: 32000}],
            })
            return HttpResponse.json(budget)
        }))
        await expect(saveBudget(budget.month, {
            monthlyIncome: 185000,
            savingsTarget: 30500,
            allocations: [{categoryId: 'food', type: 'VARIABLE', limit: 32000}],
        })).resolves.toEqual(budget)
    })

    it('supports the complete optimization lifecycle', async () => {
        server.use(
            http.get('/api/v1/budgets/:month/optimizations/latest', () => HttpResponse.json(optimization)),
            http.post('/api/v1/budgets/:month/optimizations', () => HttpResponse.json(optimization, {status: 201})),
            http.post('/api/v1/budgets/:month/optimizations/:id/apply', () => HttpResponse.json(budget)),
            http.post('/api/v1/budgets/:month/optimizations/:id/dismiss', () => new HttpResponse(null, {status: 204})),
        )
        await expect(getLatestOptimization(budget.month)).resolves.toEqual(optimization)
        await expect(generateOptimization(budget.month)).resolves.toEqual(optimization)
        await expect(applyOptimization(budget.month, optimization.id)).resolves.toEqual(budget)
        await expect(dismissOptimization(budget.month, optimization.id)).resolves.toBeUndefined()
    })
})
