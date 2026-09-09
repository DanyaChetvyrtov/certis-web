import {apiRequest} from '../../../shared/api/client'
import type {Currency} from '../../../shared/currency'

export const goalStatuses = [
    'ACTIVE',
    'PAUSED',
    'ACHIEVED',
    'CANCELLED',
] as const

export const goalPaceStatuses = [
    'ON_TRACK',
    'AHEAD',
    'ADJUST_PLAN',
] as const

export const goalSorts = [
    'TARGET_MONTH_ASC',
    'TARGET_MONTH_DESC',
    'PROGRESS_ASC',
    'PROGRESS_DESC',
    'CREATED_AT_DESC',
] as const

export type GoalStatus = (typeof goalStatuses)[number]
export type GoalPaceStatus = (typeof goalPaceStatuses)[number]
export type GoalSort = (typeof goalSorts)[number]
export type GoalPlanType = 'RECOMMENDED' | 'CUSTOM'
export type GoalTransactionType = 'CONTRIBUTION' | 'REFUND'

export type GoalContributionPlan = {
    type: GoalPlanType
    monthlyAmount: number
    recommendedMonthlyAmount: number
}

export type Goal = {
    id: string
    name: string
    currency: Currency
    targetAmount: number
    savedAmount: number
    remainingAmount: number
    progressPercentage: number
    targetMonth: string | null
    monthsRemaining: number | null
    contributionPlan: GoalContributionPlan
    status: GoalStatus
    paceStatus: GoalPaceStatus
    projectedCompletionMonth: string | null
    icon: string
    color: string
    createdAt: string
    updatedAt: string
    achievedAt?: string | null
    archivedAt?: string | null
}

export type GoalPage = {
    currency: Currency
    items: Goal[]
    statusCounts: {
        active: number
        completed: number
    }
    page: number
    size: number
    totalElements: number
    totalPages: number
}

export type GoalOverview = {
    month: string
    currency: Currency
    summary: {
        totalSavedAmount: number
        contributedThisMonthAmount: number
        plannedMonthlyAmount: number
        monthlyPlanCompletionPercentage: number
        activeGoalCount: number
        healthyGoalCount: number
        attentionGoalCount: number
    }
    nearestTarget: {
        goalId: string
        goalName: string
        targetMonth: string
        monthsRemaining: number
        targetAmount: number
        savedAmount: number
        remainingAmount: number
        progressPercentage: number
        monthlyContributionAmount: number
        paceStatus: GoalPaceStatus
        icon: string
        color: string
    } | null
    currentMonth: {
        plannedAmount: number
        contributedAmount: number
        remainingAmount: number
        progressPercentage: number
        contributions: Array<{
            goalId: string
            goalName: string
            amount: number
            color: string
        }>
    }
    recommendation: {
        type: 'INCREASE_MONTHLY_CONTRIBUTION'
        goalId: string
        goalName: string
        targetMonth: string
        currentMonthlyAmount: number
        recommendedMonthlyAmount: number
        differenceAmount: number
    } | null
}

export type GoalPlanRequest = {
    targetAmount: number
    initialAmount: number
    currency: Currency
    targetMonth: string
    contributionPlan: {
        type: GoalPlanType
        monthlyAmount?: number
    }
}

export type GoalPlanPreview = {
    currency: Currency
    targetAmount: number
    initialAmount: number
    remainingAmount: number
    progressPercentage: number
    targetMonth: string
    contributionMonths: number
    recommendedMonthlyAmount: number
    selectedMonthlyAmount: number
    projectedCompletionMonth: string | null
    paceStatus: GoalPaceStatus
}

export type CreateGoalRequest = {
    name: string
    targetAmount: number
    currency: Currency
    targetMonth: string
    contributionPlan: {
        type: GoalPlanType
        monthlyAmount?: number
    }
    initialContribution?: {
        accountId: string
        amount: number
        note?: string
        contributedAt?: string
    }
    icon: string
    color: string
}

export type UpdateGoalRequest = Partial<Pick<
    CreateGoalRequest,
    'name' | 'targetAmount' | 'targetMonth' | 'contributionPlan' | 'icon' | 'color'
>> & {
    status?: 'ACTIVE' | 'PAUSED'
}

export type GoalContribution = {
    id: string
    goalId: string
    accountId: string
    reversalOfContributionId?: string | null
    currency: Currency
    type: GoalTransactionType
    amount: number
    note?: string | null
    contributedAt: string
    createdAt: string
}

export type GoalContributionPage = {
    items: GoalContribution[]
    page: number
    size: number
    totalElements: number
    totalPages: number
}

export type GoalProgress = {
    id: string
    savedAmount: number
    remainingAmount: number
    progressPercentage: number
    status: GoalStatus
    paceStatus: GoalPaceStatus
}

export type GoalContributionResult = {
    contribution: GoalContribution
    goal: GoalProgress
}

const goalsPath = '/api/v1/goals'
const goalPath = (goalId: string) => `${goalsPath}/${goalId}`

const queryString = (
    parameters: Record<string, string | number | undefined>,
): string => {
    const query = new URLSearchParams()

    Object.entries(parameters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
            query.set(key, String(value))
        }
    })

    return query.size > 0 ? `?${query.toString()}` : ''
}

export const getGoals = (
    filters: {
        currency?: Currency
        status?: GoalStatus
        sort?: GoalSort
        page?: number
        size?: number
    },
    signal?: AbortSignal,
) => apiRequest<GoalPage>(`${goalsPath}${queryString(filters)}`, {
    signal,
    fallbackMessage: 'We could not load your goals. Please try again.',
})

export const getGoalOverview = (
    month: string,
    currency: Currency,
    signal?: AbortSignal,
) => apiRequest<GoalOverview>(
    `${goalsPath}/overview${queryString({month, currency})}`,
    {
        signal,
        fallbackMessage: 'We could not load your goal overview. Please try again.',
    },
)

export const previewGoalPlan = (
    request: GoalPlanRequest,
    signal?: AbortSignal,
) => apiRequest<GoalPlanPreview>(`${goalsPath}/plan-preview`, {
    method: 'POST',
    body: request,
    signal,
    fallbackMessage: 'We could not calculate this contribution plan.',
})

export const createGoal = (request: CreateGoalRequest) =>
    apiRequest<Goal>(goalsPath, {
        method: 'POST',
        body: request,
        fallbackMessage: 'We could not create this goal. Please try again.',
    })

export const getGoal = (goalId: string, signal?: AbortSignal) =>
    apiRequest<Goal>(goalPath(goalId), {
        signal,
        fallbackMessage: 'We could not load this goal. Please try again.',
    })

export const updateGoal = (
    goalId: string,
    request: UpdateGoalRequest,
) => apiRequest<Goal>(goalPath(goalId), {
    method: 'PATCH',
    body: request,
    fallbackMessage: 'We could not update this goal. Please try again.',
})

export const addGoalContribution = (
    goalId: string,
    request: {
        accountId: string
        amount: number
        contributedAt?: string
        note?: string
    },
    idempotencyKey: string,
) => apiRequest<GoalContributionResult>(`${goalPath(goalId)}/contributions`, {
    method: 'POST',
    headers: {'Idempotency-Key': idempotencyKey},
    body: request,
    fallbackMessage: 'We could not add this contribution. Please try again.',
})

export const getGoalContributions = (
    goalId: string,
    filters: {
        sort?: 'CONTRIBUTED_AT_ASC' | 'CONTRIBUTED_AT_DESC'
        page?: number
        size?: number
    } = {},
    signal?: AbortSignal,
) => apiRequest<GoalContributionPage>(
    `${goalPath(goalId)}/contributions${queryString(filters)}`,
    {
        signal,
        fallbackMessage: 'We could not load contribution history.',
    },
)

export const refundGoalContribution = (
    goalId: string,
    contributionId: string,
) => apiRequest<GoalProgress>(
    `${goalPath(goalId)}/contributions/${contributionId}`,
    {
        method: 'DELETE',
        fallbackMessage: 'We could not return this contribution.',
    },
)

export const cancelGoal = (goalId: string) =>
    apiRequest<void>(goalPath(goalId), {
        method: 'DELETE',
        fallbackMessage: 'We could not cancel this goal. Please try again.',
    })
