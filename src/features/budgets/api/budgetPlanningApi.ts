import {ApiError} from '../../../shared/api/ApiError'
import {apiRequest} from '../../../shared/api/client'
import i18n from '../../../i18n/i18n'
import type {Currency} from '../../../shared/currency'

export type BudgetPlanningStep =
    | 'FORECAST'
    | 'CONSTRAINTS'
    | 'OPTIMIZE'
    | 'REVIEW'
    | 'APPLIED'

export type BudgetPlanStatus =
    | 'DRAFT'
    | 'APPLIED'
    | 'SUPERSEDED'
    | 'CANCELLED'

export type BudgetForecastStatus = 'MISSING' | 'CURRENT' | 'STALE'
export type BudgetConstraintStatus = 'MISSING' | 'SUGGESTED' | 'CONFIRMED'
export type BudgetForecastSourceType =
    | 'RECURRING'
    | 'HISTORICAL_CATEGORY'
    | 'CURRENT_LIMIT'
    | 'MANUAL'
    | 'ACTUAL'
export type BudgetForecastOperationType = 'INCOME' | 'EXPENSE'
export type BudgetForecastConfidence = 'HIGH' | 'MEDIUM' | 'LOW'
export type BudgetAllocationType = 'FIXED' | 'VARIABLE'
export type BudgetConstraintRole = 'REQUIRED' | 'FLEXIBLE'
export type BudgetPriority = 'HIGH' | 'MEDIUM' | 'LOW'
export type BudgetFundingLevel = 'MINIMUM' | 'BALANCED' | 'COMFORTABLE'
export type BudgetFeasibilityStatus = 'FEASIBLE' | 'INFEASIBLE'

export type BudgetForecastCategory = {
    id: string
    name: string
    icon: string
    color: string
}

export type BudgetForecastHistoryWindow = {
    fromMonth: string
    toMonth: string
    monthsUsed: number
    method: string
}

export type BudgetForecastSummary = {
    forecastIncome: number
    recurringIncome?: number
    recurringExpenses: number
    flexibleEstimate: number
    forecastExpenses: number
    forecastSavings: number
    includedItemCount: number
    excludedItemCount: number
}

export type BudgetForecastItem = {
    sourceKey: string
    sourceType: BudgetForecastSourceType
    operationType: BudgetForecastOperationType
    title: string
    category: BudgetForecastCategory | null
    expectedDate: string | null
    originalAmount: number
    effectiveAmount: number
    included: boolean
    defaultConstraintRole: BudgetConstraintRole | null
    confidence: BudgetForecastConfidence
    recurring: {
        templateId: string
        frequency: string
    } | null
    history: {
        monthsUsed: number
        method: string
    } | null
}

export type BudgetForecastWarning = {
    code: string
    parameters: Record<string, unknown>
}

export type BudgetForecastPreview = {
    planId: string
    basedOnPlanVersion: number
    sourceFingerprint: string
    generatedAt: string
    historyWindow: BudgetForecastHistoryWindow
    summary: BudgetForecastSummary
    items: BudgetForecastItem[]
    warnings: BudgetForecastWarning[]
}

export type BudgetForecast = {
    planId: string
    revision: number
    status: Exclude<BudgetForecastStatus, 'MISSING'>
    sourceFingerprint: string
    inputFingerprint: string
    summary: BudgetForecastSummary
    items: BudgetForecastItem[]
    planVersion: number
    confirmedAt: string
}

export type BudgetFundingLevelDto = {
    level: BudgetFundingLevel
    amount: number
    coverage: number
}

export type BudgetCategoryConstraint = {
    category: BudgetForecastCategory
    allocationType: BudgetAllocationType
    constraintRole: BudgetConstraintRole
    requiredAmount: number
    priority: BudgetPriority | null
    fundingLevels: BudgetFundingLevelDto[]
    sourceKeys: string[]
}

export type BudgetPlanningViolation = {
    code: string
    shortfall?: number | null
    requiredAmount?: number | null
    availableAmount?: number | null
    parameters: Record<string, unknown>
}

export type BudgetFeasibility = {
    status: BudgetFeasibilityStatus
    forecastIncome: number
    requiredAmount: number
    variableMinimumAmount: number
    savingsFloorAmount: number
    maximumSavingsAmount: number
    capacityAtSavingsFloor: number
    shortfall: number
    violations: BudgetPlanningViolation[]
}

export type BudgetConstraintSet = {
    planId: string
    basedOnForecastRevision: number
    revision: number | null
    status: BudgetConstraintStatus
    savingsFloorAmount: number
    categories: BudgetCategoryConstraint[]
    feasibility: BudgetFeasibility
    planVersion: number
}

export type BudgetPlan = {
    id: string
    previousPlanId: string | null
    month: string
    currency: Currency
    revision: number
    status: BudgetPlanStatus
    currentStep: BudgetPlanningStep
    version: number
    forecast: {
        revision: number | null
        status: BudgetForecastStatus
        summary: BudgetForecastSummary | null
    }
    constraints: {
        revision: number | null
        status: BudgetConstraintStatus
        feasibility: BudgetFeasibility | null
    }
    currentOptimization: {
        id: string
        status: string
        targetSavingsAmount: number
        actualSavingsAmount: number | null
        createdAt: string
    } | null
    capabilities: {
        canEditForecast: boolean
        canEditConstraints: boolean
        canRunOptimization: boolean
        canApply: boolean
        canCancel: boolean
    }
    createdAt: string
    updatedAt: string
}

export type BudgetPlanRevision = {
    id: string
    revision: number
    status: BudgetPlanStatus
    currentStep: BudgetPlanningStep
    createdAt: string
    appliedAt: string | null
}

export type BudgetPlanRevisions = {
    items: BudgetPlanRevision[]
}

export type BudgetForecastOverrideRequest = {
    sourceKey: string
    included: boolean
    amount: number | null
}

export type BudgetForecastManualAdjustmentRequest = {
    clientId: string
    operationType: BudgetForecastOperationType
    title: string
    categoryId: string | null
    expectedDate: string | null
    amount: number
}

export type ConfirmBudgetForecastRequest = {
    expectedVersion: number
    sourceFingerprint: string
    overrides: BudgetForecastOverrideRequest[]
    manualAdjustments: BudgetForecastManualAdjustmentRequest[]
}

export type SaveBudgetConstraintsRequest = {
    expectedVersion: number
    forecastRevision: number
    savingsFloorAmount: number
    categories: Array<{
        categoryId: string
        allocationType: BudgetAllocationType
        constraintRole: BudgetConstraintRole
        requiredAmount: number
        priority: BudgetPriority | null
        fundingLevels: Array<{
            level: BudgetFundingLevel
            amount: number
        }>
    }>
}

const budgetPlansPath = '/api/v1/budget-plans'
const planPath = (planId: string) => `${budgetPlansPath}/${planId}`
const forecastPath = (planId: string) => `${planPath(planId)}/forecast`
const constraintsPath = (planId: string) => `${planPath(planId)}/constraints`

export async function getCurrentBudgetPlan(
    month: string,
    currency: Currency,
    signal?: AbortSignal,
): Promise<BudgetPlan | null> {
    const query = new URLSearchParams({month, currency})

    try {
        return await apiRequest<BudgetPlan>(
            `${budgetPlansPath}/current?${query}`,
            {
                signal,
                fallbackMessage: i18n.t('budgets.planning.loadError'),
            },
        )
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null
        throw error
    }
}

export const getBudgetPlanRevisions = (
    month: string,
    currency: Currency,
    signal?: AbortSignal,
) => {
    const query = new URLSearchParams({month, currency})

    return apiRequest<BudgetPlanRevisions>(`${budgetPlansPath}?${query}`, {
        signal,
        fallbackMessage: i18n.t('budgets.planning.lifecycle.historyLoadError'),
    })
}

export const createBudgetPlan = (
    month: string,
    currency: Currency,
    idempotencyKey: string,
) => apiRequest<BudgetPlan>(budgetPlansPath, {
    method: 'POST',
    headers: {'Idempotency-Key': idempotencyKey},
    body: {month, currency},
    fallbackMessage: i18n.t('budgets.planning.createError'),
})

export const cancelBudgetPlan = (
    planId: string,
    expectedVersion: number,
) => apiRequest<BudgetPlan>(`${planPath(planId)}/cancellation`, {
    method: 'PUT',
    body: {expectedVersion},
    fallbackMessage: i18n.t('budgets.planning.lifecycle.cancelError'),
})

export const getBudgetForecastPreview = (
    planId: string,
    signal?: AbortSignal,
) => apiRequest<BudgetForecastPreview>(`${forecastPath(planId)}/preview`, {
    signal,
    fallbackMessage: i18n.t('budgets.planning.forecastLoadError'),
})

export async function getConfirmedBudgetForecast(
    planId: string,
    signal?: AbortSignal,
): Promise<BudgetForecast | null> {
    try {
        return await apiRequest<BudgetForecast>(forecastPath(planId), {
            signal,
            fallbackMessage: i18n.t('budgets.planning.forecastLoadError'),
        })
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null
        throw error
    }
}

export const confirmBudgetForecast = (
    planId: string,
    request: ConfirmBudgetForecastRequest,
) => apiRequest<BudgetForecast>(forecastPath(planId), {
    method: 'PUT',
    body: request,
    fallbackMessage: i18n.t('budgets.planning.saveError'),
})

export const getBudgetConstraints = (
    planId: string,
    signal?: AbortSignal,
) => apiRequest<BudgetConstraintSet>(constraintsPath(planId), {
    signal,
    fallbackMessage: i18n.t('budgets.constraints.loadError'),
})

export const saveBudgetConstraints = (
    planId: string,
    request: SaveBudgetConstraintsRequest,
) => apiRequest<BudgetConstraintSet>(constraintsPath(planId), {
    method: 'PUT',
    body: request,
    fallbackMessage: i18n.t('budgets.constraints.saveError'),
})
