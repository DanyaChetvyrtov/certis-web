import {http, HttpResponse} from 'msw'
import {describe, expect, it} from 'vitest'
import {server} from '../../../test/server'
import {cancelBudgetPlan, getBudgetPlanRevisions, getCurrentBudgetPlan} from './budgetPlanningApi'

const planId = '00000000-0000-4000-8000-000000000010'

describe('budgetPlanningApi', () => {
    it('loads all revisions for the exact month and currency scope', async () => {
        const revisions = [{
            id: planId,
            revision: 2,
            status: 'DRAFT',
            currentStep: 'FORECAST',
            createdAt: '2026-09-17T10:00:00Z',
            appliedAt: null,
        }]
        server.use(http.get('/api/v1/budget-plans', ({request}) => {
            expect(Object.fromEntries(new URL(request.url).searchParams)).toEqual({
                month: '2026-10',
                currency: 'EUR',
            })
            return HttpResponse.json({items: revisions})
        }))

        await expect(getBudgetPlanRevisions('2026-10', 'EUR')).resolves.toEqual({items: revisions})
    })

    it('cancels a draft using optimistic plan versioning', async () => {
        server.use(http.put('/api/v1/budget-plans/:planId/cancellation', async ({params, request}) => {
            expect(params.planId).toBe(planId)
            await expect(request.json()).resolves.toEqual({expectedVersion: 7})
            return HttpResponse.json({id: planId, status: 'CANCELLED', version: 8})
        }))

        await expect(cancelBudgetPlan(planId, 7)).resolves.toMatchObject({
            id: planId,
            status: 'CANCELLED',
            version: 8,
        })
    })

    it('returns null when the selected scope has no current plan', async () => {
        server.use(http.get('/api/v1/budget-plans/current', () => HttpResponse.json({message: 'Not found'}, {status: 404})))

        await expect(getCurrentBudgetPlan('2026-10', 'RUB')).resolves.toBeNull()
    })
})
