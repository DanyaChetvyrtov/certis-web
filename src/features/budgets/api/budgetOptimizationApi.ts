import {ApiError} from '../../../shared/api/ApiError'
import {apiRequest} from '../../../shared/api/client'
import type {BudgetAllocationType, BudgetConstraintRole, BudgetForecastCategory, BudgetFundingLevel, BudgetPlan, BudgetPlanningStep, BudgetPlanningViolation, BudgetPriority} from './budgetPlanningApi'

export type BudgetOptimizationStatus = 'GENERATED' | 'INFEASIBLE' | 'APPLIED' | 'DISMISSED' | 'STALE'

export type BudgetOptimizationRun = {
    id: string
    planId: string
    status: BudgetOptimizationStatus
    algorithmVersion: string
    inputFingerprint: string
    input: {
        planVersion: number
        forecastRevision: number
        constraintsRevision: number
        forecastIncome: number
        requiredAmount: number
        savingsFloorAmount: number
        targetSavingsAmount: number
        maximumSavingsAmount: number
        flexibleCapacity: number
        flexibleCategoryCount: number
        candidateOptionCount: number
    }
    result: {
        requiredAllocation: number
        flexibleAllocation: number
        totalAllocation: number
        targetSavings: number
        actualSavings: number
        additionalSavingsComparedWithCurrent: number
        coverageScore: number
        objectiveValue: number
        unusedCapacity: number
    } | null
    decisions: Array<{
        category: BudgetForecastCategory
        allocationType: BudgetAllocationType
        constraintRole: BudgetConstraintRole
        priority: BudgetPriority | null
        currentLimit: number
        requiredAmount: number
        selectedLevel: BudgetFundingLevel | null
        recommendedLimit: number
        change: number
        coverage: number
        optionValue: number | null
        reason: {code: string; parameters: Record<string, unknown>}
    }>
    constraintChecks: Array<{code: string; satisfied: boolean; actual: number; required: number}>
    violations: BudgetPlanningViolation[]
    planVersion: number
    createdAt: string
    staleAt: string | null
    dismissedAt: string | null
    appliedAt: string | null
}

export type GenerateBudgetOptimizationRequest = {
    expectedVersion: number
    forecastRevision: number
    constraintsRevision: number
    targetSavingsAmount: number
}

export type BudgetOptimizationDismissResponse = {
    optimizationId: string
    status: BudgetOptimizationStatus
    planVersion: number
    currentStep: BudgetPlanningStep
    dismissedAt: string
}

export type BudgetOptimizationApplyResponse = {
    plan: {id: string; revision: number; status: BudgetPlan['status']; currentStep: BudgetPlanningStep; version: number; appliedAt: string}
    optimization: {id: string; status: BudgetOptimizationStatus}
    budget: {
        id: string
        month: string
        currency: BudgetPlan['currency']
        totalLimit: number
        sourceOptimizationId: string
        allocations: Array<{categoryId: string; limit: number}>
    }
}

const planPath = (planId: string) => `/api/v1/budget-plans/${planId}`
const optimizationsPath = (planId: string) => `${planPath(planId)}/optimizations`
const optimizationPath = (planId: string, optimizationId: string) => `${optimizationsPath(planId)}/${optimizationId}`

export const getBudgetPlan = (planId: string, signal?: AbortSignal) =>
    apiRequest<BudgetPlan>(planPath(planId), {signal})

export async function getLatestBudgetOptimization(planId: string, signal?: AbortSignal): Promise<BudgetOptimizationRun | null> {
    try {
        return await apiRequest<BudgetOptimizationRun>(`${optimizationsPath(planId)}/latest`, {signal})
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null
        throw error
    }
}

export const getBudgetOptimization = (planId: string, optimizationId: string, signal?: AbortSignal) =>
    apiRequest<BudgetOptimizationRun>(optimizationPath(planId, optimizationId), {signal})

export const generateBudgetOptimization = (
    planId: string,
    request: GenerateBudgetOptimizationRequest,
    idempotencyKey: string,
) => apiRequest<BudgetOptimizationRun>(optimizationsPath(planId), {
    method: 'POST',
    headers: {'Idempotency-Key': idempotencyKey},
    body: request,
})

export const dismissBudgetOptimization = (planId: string, optimizationId: string, expectedVersion: number) =>
    apiRequest<BudgetOptimizationDismissResponse>(`${optimizationPath(planId, optimizationId)}/dismissal`, {
        method: 'PUT',
        body: {expectedVersion},
    })

export const applyBudgetOptimization = (
    planId: string,
    optimizationId: string,
    expectedVersion: number,
    idempotencyKey: string,
) => apiRequest<BudgetOptimizationApplyResponse>(`${optimizationPath(planId, optimizationId)}/budget-application`, {
    method: 'PUT',
    headers: {'Idempotency-Key': idempotencyKey},
    body: {expectedVersion},
})
