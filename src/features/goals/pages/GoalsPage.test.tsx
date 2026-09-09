import {
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react'
import {http, HttpResponse} from 'msw'
import {MemoryRouter} from 'react-router-dom'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {selectOption} from '../../../test/selectOption'
import {server} from '../../../test/server'
import {currentMonth} from '../goalPresentation'
import {GoalsPage} from './GoalsPage'

vi.mock('../../auth/session/SessionContext', () => ({
    useSession: () => ({
        profile: {
            id: 'profile-id',
            name: 'Daniel',
            surname: 'Carter',
            dateOfBirth: '2000-01-01',
            preferredCurrency: 'RUB',
        },
        profilePhotoRevision: 0,
        refreshProfilePhoto: vi.fn(),
        setProfile: vi.fn(),
        signOut: vi.fn(),
    }),
}))

const account = {
    id: 'account-id',
    name: 'Main card',
    type: 'CARD',
    openingBalance: 200000,
    balance: 150000,
    currency: 'RUB',
    createdAt: '2026-08-01T10:00:00Z',
    closedAt: null,
}

const goal = {
    id: 'goal-id',
    name: 'Emergency fund',
    currency: 'RUB',
    targetAmount: 180000,
    savedAmount: 120000,
    remainingAmount: 60000,
    progressPercentage: 66.67,
    targetMonth: '2027-01',
    monthsRemaining: 4,
    contributionPlan: {
        type: 'CUSTOM',
        monthlyAmount: 15000,
        recommendedMonthlyAmount: 15000,
    },
    status: 'ACTIVE',
    paceStatus: 'ON_TRACK',
    projectedCompletionMonth: '2027-01',
    icon: 'target',
    color: '#10B981',
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z',
    achievedAt: null,
    archivedAt: null,
}

const goalPage = (items = [goal]) => ({
    currency: 'RUB',
    items,
    statusCounts: {active: items.length, completed: 0},
    page: 0,
    size: 20,
    totalElements: items.length,
    totalPages: items.length ? 1 : 0,
})

const overview = {
    month: currentMonth(),
    currency: 'RUB',
    summary: {
        totalSavedAmount: 120000,
        contributedThisMonthAmount: 15000,
        plannedMonthlyAmount: 15000,
        monthlyPlanCompletionPercentage: 100,
        activeGoalCount: 1,
        healthyGoalCount: 1,
        attentionGoalCount: 0,
    },
    nearestTarget: {
        goalId: 'goal-id',
        goalName: 'Emergency fund',
        targetMonth: '2027-01',
        monthsRemaining: 4,
        targetAmount: 180000,
        savedAmount: 120000,
        remainingAmount: 60000,
        progressPercentage: 66.67,
        monthlyContributionAmount: 15000,
        paceStatus: 'ON_TRACK',
        icon: 'target',
        color: '#10B981',
    },
    currentMonth: {
        plannedAmount: 15000,
        contributedAmount: 15000,
        remainingAmount: 0,
        progressPercentage: 100,
        contributions: [{goalId: 'goal-id', goalName: 'Emergency fund', amount: 15000, color: '#10B981'}],
    },
    recommendation: null,
}

const renderPage = (initialEntry = '/goals') => render(
    <MemoryRouter initialEntries={[initialEntry]}><GoalsPage/></MemoryRouter>,
)

describe('GoalsPage', () => {
    beforeEach(() => {
        server.use(
            http.get('/api/v1/accounts', () => HttpResponse.json([account])),
            http.get('/api/v1/goals', () => HttpResponse.json(goalPage())),
            http.get('/api/v1/goals/overview', () => HttpResponse.json(overview)),
        )
    })

    it('opens the create form when requested from the dashboard', async () => {
        renderPage('/goals?create=true&currency=EUR')

        const form = within(await screen.findByRole('dialog', {name: 'Create a goal'}))
        expect(form.getByLabelText('Goal name')).toHaveFocus()
        expect(form.getByLabelText('Currency')).toHaveTextContent('EUR')
    })

    it('renders overview, goal cards and uses the preferred currency', async () => {
        let requestedGoals: Record<string, string> = {}
        let requestedOverview: Record<string, string> = {}
        server.use(
            http.get('/api/v1/goals', ({request}) => {
                requestedGoals = Object.fromEntries(new URL(request.url).searchParams)
                return HttpResponse.json(goalPage())
            }),
            http.get('/api/v1/goals/overview', ({request}) => {
                requestedOverview = Object.fromEntries(new URL(request.url).searchParams)
                return HttpResponse.json(overview)
            }),
        )

        renderPage()

        expect(await screen.findByRole('heading', {name: 'Your goals'})).toBeInTheDocument()
        expect((await screen.findAllByText('Emergency fund')).length).toBeGreaterThan(0)
        expect(screen.getByText('₽120,000', {selector: '.goal-card-amount strong'})).toBeInTheDocument()
        expect(screen.getByText('1 of 1')).toBeInTheDocument()
        expect(screen.getByRole('link', {name: 'Goals'})).toHaveAttribute('aria-current', 'page')
        const currencyControl = screen.getByText('Currency', {
            selector: '.goals-currency-action > span',
        }).closest('label')
        expect(currencyControl).not.toBeNull()
        expect(within(currencyControl as HTMLElement).getByLabelText('Goals currency'))
            .toHaveTextContent('RUB')
        expect(requestedGoals).toEqual({
            currency: 'RUB', status: 'ACTIVE', sort: 'TARGET_MONTH_ASC', page: '0', size: '20',
        })
        expect(requestedOverview).toEqual({month: currentMonth(), currency: 'RUB'})
    })

    it('creates a goal from the design modal with a calculated preview', async () => {
        let createRequest: unknown
        let previewRequests = 0
        server.use(
            http.post('/api/v1/goals/plan-preview', async ({request}) => {
                previewRequests += 1
                const body = await request.json() as {
                    targetAmount: number
                    initialAmount: number
                    currency: string
                    targetMonth: string
                }
                return HttpResponse.json({
                    ...body,
                    remainingAmount: body.targetAmount - body.initialAmount,
                    progressPercentage: 0,
                    contributionMonths: 12,
                    recommendedMonthlyAmount: 20000,
                    selectedMonthlyAmount: 20000,
                    projectedCompletionMonth: body.targetMonth,
                    paceStatus: 'ON_TRACK',
                })
            }),
            http.post('/api/v1/goals', async ({request}) => {
                createRequest = await request.json()
                return HttpResponse.json({
                    ...goal,
                    id: 'new-goal',
                    name: 'Travel to Iceland',
                    targetAmount: 240000,
                    savedAmount: 0,
                    remainingAmount: 240000,
                    progressPercentage: 0,
                }, {status: 201})
            }),
        )

        renderPage()
        await screen.findByRole('heading', {name: 'Your goals'})
        const openButton = screen.getByRole('button', {name: 'New goal'})
        fireEvent.click(openButton)

        const dialog = within(screen.getByRole('dialog', {name: 'Create a goal'}))
        expect(dialog.getByLabelText('Goal name')).toHaveFocus()
        fireEvent.change(dialog.getByLabelText('Goal name'), {target: {value: 'Travel to Iceland'}})
        fireEvent.change(dialog.getByLabelText('Target amount'), {target: {value: '240000'}})

        await waitFor(() => expect(previewRequests).toBeGreaterThan(0))
        expect(await dialog.findByText('₽20,000 / month')).toBeInTheDocument()
        fireEvent.click(dialog.getByRole('button', {name: 'Create goal'}))

        expect(await screen.findByText('Travel to Iceland was created.')).toBeInTheDocument()
        expect(createRequest).toMatchObject({
            name: 'Travel to Iceland',
            targetAmount: 240000,
            currency: 'RUB',
            contributionPlan: {type: 'RECOMMENDED'},
            icon: 'target',
            color: '#10B981',
        })
        expect(createRequest).not.toHaveProperty('initialContribution')
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect(openButton).toHaveFocus()
    })

    it('adds progress from a same-currency account with an idempotency key', async () => {
        let contributionRequest: unknown
        let idempotencyHeader: string | null = null
        server.use(
            http.post('/api/v1/goals/:goalId/contributions', async ({request}) => {
                contributionRequest = await request.json()
                idempotencyHeader = request.headers.get('Idempotency-Key')
                return HttpResponse.json({
                    contribution: {
                        id: 'contribution-id', goalId: 'goal-id', accountId: 'account-id', currency: 'RUB',
                        type: 'CONTRIBUTION', amount: 5000, note: 'Monthly savings',
                        contributedAt: '2026-09-08T10:00:00Z', createdAt: '2026-09-08T10:00:00Z',
                    },
                    goal: {
                        id: 'goal-id', savedAmount: 125000, remainingAmount: 55000,
                        progressPercentage: 69.44, status: 'ACTIVE', paceStatus: 'ON_TRACK',
                    },
                }, {status: 201})
            }),
        )

        renderPage()
        const addButton = await screen.findByRole('button', {name: 'Add progress'})
        fireEvent.click(addButton)

        const dialog = within(screen.getByRole('dialog', {name: 'Add progress'}))
        fireEvent.change(dialog.getByLabelText('Contribution amount'), {target: {value: '5000'}})
        await selectOption(dialog.getByLabelText('Contribution account'), 'Main card · ₽150,000')
        fireEvent.change(dialog.getByLabelText(/Note/), {target: {value: 'Monthly savings'}})
        fireEvent.click(dialog.getByRole('button', {name: 'Add contribution'}))

        expect(await screen.findByText('Progress added to Emergency fund.')).toBeInTheDocument()
        expect(contributionRequest).toEqual({
            accountId: 'account-id', amount: 5000, note: 'Monthly savings',
        })
        expect(idempotencyHeader).toBeTruthy()
    })

    it('opens goal details, returns a contribution and pauses the goal', async () => {
        let refundedContribution = ''
        let requestedStatus = ''
        let wasRefunded = false
        const contribution = {
            id: 'contribution-id',
            goalId: 'goal-id',
            accountId: 'account-id',
            reversalOfContributionId: null,
            currency: 'RUB',
            type: 'CONTRIBUTION',
            amount: 15000,
            note: 'Monthly savings',
            contributedAt: '2026-09-08T10:00:00Z',
            createdAt: '2026-09-08T10:00:00Z',
        }
        server.use(
            http.get('/api/v1/goals/:goalId/contributions', () => HttpResponse.json({
                items: wasRefunded
                    ? [
                        {...contribution},
                        {
                            ...contribution,
                            id: 'refund-id',
                            type: 'REFUND',
                            reversalOfContributionId: 'contribution-id',
                        },
                    ]
                    : [contribution],
                page: 0,
                size: 100,
                totalElements: wasRefunded ? 2 : 1,
                totalPages: 1,
            })),
            http.delete('/api/v1/goals/:goalId/contributions/:contributionId', ({params}) => {
                refundedContribution = String(params.contributionId)
                wasRefunded = true
                return HttpResponse.json({
                    id: 'goal-id', savedAmount: 105000, remainingAmount: 75000,
                    progressPercentage: 58.33, status: 'ACTIVE', paceStatus: 'ON_TRACK',
                })
            }),
            http.get('/api/v1/goals/:goalId', () => HttpResponse.json({
                ...goal,
                savedAmount: 105000,
                remainingAmount: 75000,
                progressPercentage: 58.33,
            })),
            http.patch('/api/v1/goals/:goalId', async ({request}) => {
                const body = await request.json() as {status: string}
                requestedStatus = body.status
                return HttpResponse.json({...goal, status: 'PAUSED'})
            }),
        )

        renderPage()
        const goalButton = await screen.findByRole('button', {name: 'Emergency fund'})
        fireEvent.click(goalButton)

        const dialog = within(screen.getByRole('dialog', {name: 'Emergency fund'}))
        expect(await dialog.findByText('Monthly savings')).toBeInTheDocument()
        fireEvent.click(dialog.getByRole('button', {name: 'Return'}))
        await waitFor(() => expect(refundedContribution).toBe('contribution-id'))
        expect(await dialog.findByRole('button', {name: 'Returned'})).toBeDisabled()

        fireEvent.click(dialog.getByRole('button', {name: 'Pause'}))
        expect(await dialog.findByRole('button', {name: 'Resume'})).toBeInTheDocument()
        expect(requestedStatus).toBe('PAUSED')
    })
})
