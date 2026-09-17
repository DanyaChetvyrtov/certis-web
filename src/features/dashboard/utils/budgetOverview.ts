import type {Budget, BudgetAllocation} from '../../budgets/api/budgetsApi'

const safeAmount = (amount: number) => Number.isFinite(amount) ? Math.max(0, amount) : 0

export function budgetOverview(budget: Budget) {
    const total = budget.allocations.reduce((sum, allocation) => sum + safeAmount(allocation.limit), 0)
    const spent = budget.allocations.reduce((sum, allocation) => sum + safeAmount(allocation.spent), 0)
    return {
        total,
        spent,
        remaining: total - spent,
        usedPercentage: total > 0 ? spent / total * 100 : null,
        plannedSavingsPercentage: budget.monthlyIncome > 0 ? budget.savingsTarget / budget.monthlyIncome * 100 : null,
    }
}

export function allocationUtilization(allocation: BudgetAllocation): number | null {
    return allocation.limit > 0 ? safeAmount(allocation.spent) / allocation.limit * 100 : null
}

/** Show high-spend categories first; use a stable tie-break for equal amounts. */
export function topBudgetCategories(allocations: BudgetAllocation[], count = 4) {
    return [...allocations].sort((a, b) => b.spent - a.spent || a.categoryName.localeCompare(b.categoryName)).slice(0, count)
}
