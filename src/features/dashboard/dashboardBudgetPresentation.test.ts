import {describe, expect, it} from 'vitest'
import type {Budget} from '../budgets/api/budgetsApi'
import {getBudgetUsage, getSavingsRate} from './dashboardBudgetPresentation'

const budget: Budget = {
    id: 'budget-1',
    month: '2026-09',
    currency: 'RUB',
    monthlyIncome: 185000,
    savingsTarget: 30500,
    allocations: [
        {id: '1', categoryId: 'housing', categoryName: 'Housing', categoryIcon: 'home', categoryColor: '#9270c9', type: 'FIXED', limit: 55000, spent: 55000, status: 'OVERSPENT'},
        {id: '2', categoryId: 'food', categoryName: 'Food', categoryIcon: 'utensils', categoryColor: '#10b981', type: 'VARIABLE', limit: 28500, spent: 19000, status: 'ON_TRACK'},
        {id: '3', categoryId: 'transport', categoryName: 'Transport', categoryIcon: 'transport', categoryColor: '#5b9bea', type: 'VARIABLE', limit: 16500, spent: 8600, status: 'ON_TRACK'},
    ],
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
}

describe('dashboardBudgetPresentation', () => {
    it('calculates the planned savings rate from the active budget', () => {
        expect(getSavingsRate(budget)).toBeCloseTo(16.486, 3)
    })

    it('returns no savings rate when the planned income is zero', () => {
        expect(getSavingsRate({...budget, monthlyIncome: 0})).toBeNull()
    })

    it('calculates budget usage from allocation limits and actual spending', () => {
        expect(getBudgetUsage(budget)).toEqual({
            totalBudget: 100000,
            spent: 82600,
            remaining: 17400,
            percentage: 83,
        })
    })

    it('never exposes a negative remaining budget', () => {
        expect(getBudgetUsage({...budget, allocations: [{...budget.allocations[0], limit: 100, spent: 250}]}).remaining).toBe(0)
    })
})
