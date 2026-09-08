import {http, HttpResponse} from 'msw'
import {describe, expect, it} from 'vitest'
import {server} from '../../../test/server'
import {
    addGoalContribution,
    cancelGoal,
    createGoal,
    getGoalContributions,
    getGoalOverview,
    getGoals,
    previewGoalPlan,
    refundGoalContribution,
    updateGoal,
} from './goalsApi'

const goal = {
    id: 'goal-id',
    name: 'Emergency fund',
    currency: 'RUB' as const,
    targetAmount: 180000,
    savedAmount: 120000,
    remainingAmount: 60000,
    progressPercentage: 66.67,
    targetMonth: '2027-01',
    monthsRemaining: 4,
    contributionPlan: {
        type: 'CUSTOM' as const,
        monthlyAmount: 15000,
        recommendedMonthlyAmount: 15000,
    },
    status: 'ACTIVE' as const,
    paceStatus: 'ON_TRACK' as const,
    projectedCompletionMonth: '2027-01',
    icon: 'target',
    color: '#10B981',
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z',
}

describe('goalsApi', () => {
    it('loads goal cards and overview with their query contracts', async () => {
        server.use(
            http.get('/api/v1/goals', ({request}) => {
                expect(Object.fromEntries(new URL(request.url).searchParams)).toEqual({
                    currency: 'RUB',
                    status: 'ACTIVE',
                    sort: 'PROGRESS_DESC',
                    page: '0',
                    size: '20',
                })
                return HttpResponse.json({
                    currency: 'RUB', items: [goal], statusCounts: {active: 1, completed: 0},
                    page: 0, size: 20, totalElements: 1, totalPages: 1,
                })
            }),
            http.get('/api/v1/goals/overview', ({request}) => {
                expect(Object.fromEntries(new URL(request.url).searchParams)).toEqual({
                    month: '2026-09', currency: 'RUB',
                })
                return HttpResponse.json({month: '2026-09', currency: 'RUB'})
            }),
        )

        await expect(getGoals({
            currency: 'RUB', status: 'ACTIVE', sort: 'PROGRESS_DESC', page: 0, size: 20,
        })).resolves.toMatchObject({items: [goal]})
        await expect(getGoalOverview('2026-09', 'RUB')).resolves.toMatchObject({currency: 'RUB'})
    })

    it('previews and creates a goal with the backend request shape', async () => {
        const request = {
            targetAmount: 240000,
            initialAmount: 60000,
            currency: 'RUB' as const,
            targetMonth: '2027-08',
            contributionPlan: {type: 'RECOMMENDED' as const},
        }
        server.use(
            http.post('/api/v1/goals/plan-preview', async ({request: incoming}) => {
                await expect(incoming.json()).resolves.toEqual(request)
                return HttpResponse.json({
                    ...request, remainingAmount: 180000, progressPercentage: 25,
                    contributionMonths: 12, recommendedMonthlyAmount: 15000,
                    selectedMonthlyAmount: 15000, projectedCompletionMonth: '2027-08', paceStatus: 'ON_TRACK',
                })
            }),
            http.post('/api/v1/goals', async ({request: incoming}) => {
                await expect(incoming.json()).resolves.toEqual({
                    name: 'Travel to Iceland',
                    targetAmount: 240000,
                    currency: 'RUB',
                    targetMonth: '2027-08',
                    contributionPlan: {type: 'RECOMMENDED'},
                    initialContribution: {accountId: 'account-id', amount: 60000},
                    icon: 'target',
                    color: '#10B981',
                })
                return HttpResponse.json({...goal, name: 'Travel to Iceland'}, {status: 201})
            }),
        )

        await expect(previewGoalPlan(request)).resolves.toMatchObject({selectedMonthlyAmount: 15000})
        await expect(createGoal({
            name: 'Travel to Iceland',
            targetAmount: 240000,
            currency: 'RUB',
            targetMonth: '2027-08',
            contributionPlan: {type: 'RECOMMENDED'},
            initialContribution: {accountId: 'account-id', amount: 60000},
            icon: 'target',
            color: '#10B981',
        })).resolves.toMatchObject({name: 'Travel to Iceland'})
    })

    it('updates, contributes, loads history, refunds and cancels a goal', async () => {
        server.use(
            http.patch('/api/v1/goals/:goalId', async ({params, request}) => {
                expect(params.goalId).toBe('goal-id')
                await expect(request.json()).resolves.toEqual({status: 'PAUSED'})
                return HttpResponse.json({...goal, status: 'PAUSED'})
            }),
            http.post('/api/v1/goals/:goalId/contributions', async ({request}) => {
                expect(request.headers.get('Idempotency-Key')).toBe('contribution-key')
                await expect(request.json()).resolves.toEqual({accountId: 'account-id', amount: 5000})
                return HttpResponse.json({
                    contribution: {id: 'contribution-id'},
                    goal: {id: 'goal-id', savedAmount: 125000},
                }, {status: 201})
            }),
            http.get('/api/v1/goals/:goalId/contributions', ({request}) => {
                expect(Object.fromEntries(new URL(request.url).searchParams)).toEqual({
                    sort: 'CONTRIBUTED_AT_DESC', page: '0', size: '100',
                })
                return HttpResponse.json({items: [], page: 0, size: 100, totalElements: 0, totalPages: 0})
            }),
            http.delete('/api/v1/goals/:goalId/contributions/:contributionId', () => HttpResponse.json({
                id: 'goal-id', savedAmount: 120000, remainingAmount: 60000,
                progressPercentage: 66.67, status: 'ACTIVE', paceStatus: 'ON_TRACK',
            })),
            http.delete('/api/v1/goals/:goalId', () => new HttpResponse(null, {status: 204})),
        )

        await expect(updateGoal('goal-id', {status: 'PAUSED'})).resolves.toMatchObject({status: 'PAUSED'})
        await expect(addGoalContribution('goal-id', {accountId: 'account-id', amount: 5000}, 'contribution-key')).resolves.toMatchObject({goal: {savedAmount: 125000}})
        await expect(getGoalContributions('goal-id', {sort: 'CONTRIBUTED_AT_DESC', page: 0, size: 100})).resolves.toMatchObject({items: []})
        await expect(refundGoalContribution('goal-id', 'contribution-id')).resolves.toMatchObject({savedAmount: 120000})
        await expect(cancelGoal('goal-id')).resolves.toBeUndefined()
    })
})
