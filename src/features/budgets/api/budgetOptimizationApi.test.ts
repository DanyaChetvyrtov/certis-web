import {http, HttpResponse} from 'msw'
import {describe, expect, it} from 'vitest'
import {server} from '../../../test/server'
import {applyBudgetOptimization, dismissBudgetOptimization, generateBudgetOptimization, getBudgetOptimization, getBudgetPlan, getLatestBudgetOptimization} from './budgetOptimizationApi'

const planId = '00000000-0000-4000-8000-000000000010'
const base = `/api/v1/budget-plans/${planId}`
const run = {id: '00000000-0000-4000-8000-000000000020', planId, status: 'GENERATED', planVersion: 7, input: {targetSavingsAmount: 12000}, result: {actualSavings: 15000}, decisions: [], constraintChecks: [], violations: []}

describe('budgetOptimizationApi', () => {
    it('loads a plan and the latest persisted optimization', async () => {
        server.use(
            http.get(base, () => HttpResponse.json({id: planId, version: 6})),
            http.get(`${base}/optimizations/latest`, () => HttpResponse.json(run)),
        )
        await expect(getBudgetPlan(planId)).resolves.toMatchObject({id: planId, version: 6})
        await expect(getLatestBudgetOptimization(planId)).resolves.toMatchObject({id: run.id, status: 'GENERATED'})
    })

    it('treats a missing optimization as no prior run', async () => {
        server.use(http.get(`${base}/optimizations/latest`, () => HttpResponse.json({message: 'Not found'}, {status: 404})))
        await expect(getLatestBudgetOptimization(planId)).resolves.toBeNull()
    })

    it('sends the exact versioned generation command and idempotency key', async () => {
        const request = {expectedVersion: 6, forecastRevision: 2, constraintsRevision: 4, targetSavingsAmount: 12000}
        server.use(http.post(`${base}/optimizations`, async ({request: incoming}) => {
            expect(incoming.headers.get('Idempotency-Key')).toBe('generated-command-1')
            await expect(incoming.json()).resolves.toEqual(request)
            return HttpResponse.json(run, {status: 201})
        }))
        await expect(generateBudgetOptimization(planId, request, 'generated-command-1')).resolves.toMatchObject({id: run.id, planVersion: 7})
    })

    it('preserves an infeasible result as data rather than throwing', async () => {
        server.use(http.post(`${base}/optimizations`, () => HttpResponse.json({...run, status: 'INFEASIBLE', result: null, violations: [{code: 'MINIMUM_ALLOCATION_EXCEEDS_CAPACITY', shortfall: 1000}]}, {status: 201})))
        const result = await generateBudgetOptimization(planId, {expectedVersion: 6, forecastRevision: 2, constraintsRevision: 4, targetSavingsAmount: 30000}, 'command-infeasible')
        expect(result.status).toBe('INFEASIBLE')
        expect(result.result).toBeNull()
        expect(result.violations[0].shortfall).toBe(1000)
    })

    it('reads an immutable Review result by optimization id', async () => {
        server.use(http.get(`${base}/optimizations/${run.id}`, () => HttpResponse.json(run)))
        await expect(getBudgetOptimization(planId, run.id)).resolves.toMatchObject({id: run.id, planVersion: 7})
    })

    it('dismisses a generated run with an expected plan version', async () => {
        server.use(http.put(`${base}/optimizations/${run.id}/dismissal`, async ({request}) => {
            await expect(request.json()).resolves.toEqual({expectedVersion: 7})
            return HttpResponse.json({optimizationId: run.id, status: 'DISMISSED', planVersion: 8, currentStep: 'OPTIMIZE', dismissedAt: '2026-09-16T09:00:00Z'})
        }))
        await expect(dismissBudgetOptimization(planId, run.id, 7)).resolves.toMatchObject({status: 'DISMISSED', planVersion: 8})
    })

    it('applies the exact run using PUT, optimistic version and Idempotency-Key', async () => {
        const applied = {plan: {id: planId, version: 8, status: 'APPLIED', currentStep: 'APPLIED'}, optimization: {id: run.id, status: 'APPLIED'}, budget: {id: 'budget-id', month: '2026-10', currency: 'RUB', totalLimit: 25000, sourceOptimizationId: run.id, allocations: []}}
        server.use(http.put(`${base}/optimizations/${run.id}/budget-application`, async ({request}) => {
            expect(request.headers.get('Idempotency-Key')).toBe('apply-command-1')
            await expect(request.json()).resolves.toEqual({expectedVersion: 7})
            return HttpResponse.json(applied)
        }))
        await expect(applyBudgetOptimization(planId, run.id, 7, 'apply-command-1')).resolves.toEqual(applied)
    })
})
