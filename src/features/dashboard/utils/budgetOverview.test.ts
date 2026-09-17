import {describe, expect, it} from 'vitest'
import type {Budget} from '../../budgets/api/budgetsApi'
import {allocationUtilization, budgetOverview, topBudgetCategories} from './budgetOverview'

const budget: Budget = {
    id: 'budget', month: '2026-09', currency: 'RUB', monthlyIncome: 185000, savingsTarget: 30500,
    createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z',
    allocations: [
        {id: 'housing', categoryId: '1', categoryName: 'Housing', categoryIcon: 'home', categoryColor: '#af83c1', type: 'FIXED', limit: 55000, spent: 55000, status: 'ON_TRACK'},
        {id: 'food', categoryId: '2', categoryName: 'Food', categoryIcon: 'utensils', categoryColor: '#10b981', type: 'VARIABLE', limit: 28500, spent: 19000, status: 'ON_TRACK'},
        {id: 'transport', categoryId: '3', categoryName: 'Transport', categoryIcon: 'transport', categoryColor: '#528cca', type: 'VARIABLE', limit: 16500, spent: 8600, status: 'ON_TRACK'},
    ],
}

describe('dashboard budget calculations', () => {
    it('derives planned savings and real category totals from the operational budget', () => {
        const summary = budgetOverview(budget)
        expect(summary).toEqual({total: 100000, spent: 82600, remaining: 17400,
            usedPercentage: 82.6, plannedSavingsPercentage: 30500 / 185000 * 100})
        expect(topBudgetCategories(budget.allocations).map(category => category.id)).toEqual(['housing', 'food', 'transport'])
    })

    it('does not manufacture a savings rate or utilization when denominators are zero', () => {
        const summary = budgetOverview({...budget, monthlyIncome: 0, allocations: []})
        expect(summary.plannedSavingsPercentage).toBeNull()
        expect(summary.usedPercentage).toBeNull()
        expect(allocationUtilization({...budget.allocations[0], limit: 0, spent: 200})).toBeNull()
    })

    it('does not hide overspending or clamp the actual budget percentage', () => {
        const summary = budgetOverview({...budget, allocations: [{...budget.allocations[0], limit: 100, spent: 125}]})
        expect(summary.remaining).toBe(-25)
        expect(summary.usedPercentage).toBe(125)
        expect(allocationUtilization({...budget.allocations[0], limit: 100, spent: 125})).toBe(125)
    })
})
