import {ApiError} from '../../../shared/api/ApiError'
import {apiRequest} from '../../../shared/api/client'

export type BudgetCategoryType = 'FIXED' | 'VARIABLE'
export type BudgetAllocationStatus = 'ON_TRACK' | 'NEAR_LIMIT' | 'OVERSPENT'
export type BudgetOptimizationStatus = 'PROPOSED' | 'APPLIED' | 'DISMISSED'
export type BudgetOptimizationReason =
    | 'FIXED_PRESERVED' | 'LOW_UTILIZATION_REDUCTION'
    | 'OVERSPENDING_REALLOCATION' | 'NEAR_LIMIT_REALLOCATION'
    | 'RISK_UNCHANGED' | 'NO_CHANGE'

export type BudgetAllocation = {
    id: string
    categoryId: string
    categoryName: string
    categoryIcon: string
    categoryColor: string
    type: BudgetCategoryType
    limit: number
    spent: number
    status: BudgetAllocationStatus
}

export type Budget = {
    id: string
    month: string
    currency: string
    monthlyIncome: number
    savingsTarget: number
    allocations: BudgetAllocation[]
    createdAt: string
    updatedAt: string
}

export type SaveBudgetAllocationRequest = Pick<BudgetAllocation, 'categoryId' | 'type' | 'limit'>
export type SaveBudgetRequest = {
    monthlyIncome: number
    savingsTarget: number
    allocations: SaveBudgetAllocationRequest[]
}

export type BudgetOptimizationAllocation = {
    allocationId: string
    categoryId: string
    categoryName: string
    categoryIcon: string
    categoryColor: string
    type: BudgetCategoryType
    status: BudgetAllocationStatus
    currentLimit: number
    recommendedLimit: number
    change: number
    spent: number
    reason: BudgetOptimizationReason
}

export type BudgetOptimization = {
    id: string
    budgetId: string
    month: string
    currency: string
    algorithmVersion: string
    status: BudgetOptimizationStatus
    savingsBefore: number
    savingsAfter: number
    additionalSavings: number
    allocations: BudgetOptimizationAllocation[]
    createdAt: string
    appliedAt?: string | null
}

const budgetPath = (month: string) => `/api/v1/budgets/${month}`
const optimizationPath = (month: string, id: string) =>
    `${budgetPath(month)}/optimizations/${id}`

export async function getBudget(month: string, signal?: AbortSignal): Promise<Budget | null> {
    try {
        return await apiRequest<Budget>(budgetPath(month), {
            signal,
            fallbackMessage: 'We could not load your budget. Please try again.',
        })
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null
        throw error
    }
}

export const saveBudget = (month: string, request: SaveBudgetRequest) =>
    apiRequest<Budget>(budgetPath(month), {
        method: 'PUT',
        body: request,
        fallbackMessage: 'We could not save your budget. Please try again.',
    })

export async function getLatestOptimization(month: string, signal?: AbortSignal): Promise<BudgetOptimization | null> {
    try {
        return await apiRequest<BudgetOptimization>(`${budgetPath(month)}/optimizations/latest`, {
            signal,
            fallbackMessage: 'We could not load the latest optimization.',
        })
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null
        throw error
    }
}

export const generateOptimization = (month: string) =>
    apiRequest<BudgetOptimization>(`${budgetPath(month)}/optimizations`, {
        method: 'POST',
        fallbackMessage: 'We could not generate budget suggestions.',
    })

export const applyOptimization = (month: string, optimizationId: string) =>
    apiRequest<Budget>(`${optimizationPath(month, optimizationId)}/apply`, {
        method: 'POST',
        fallbackMessage: 'We could not apply these suggestions.',
    })

export const dismissOptimization = (month: string, optimizationId: string) =>
    apiRequest<void>(`${optimizationPath(month, optimizationId)}/dismiss`, {
        method: 'POST',
        fallbackMessage: 'We could not dismiss these suggestions.',
    })
