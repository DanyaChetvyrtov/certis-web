import type {Budget} from '../budgets/api/budgetsApi'
import type {Currency} from '../../shared/currency'

export const formatDashboardMoney = (value: number, currency: Currency, locale: string) =>
    new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        currencyDisplay: 'narrowSymbol',
        minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
        maximumFractionDigits: 2,
    }).format(value)

export const getBudgetUsage = (budget: Budget) => {
    const totalBudget = budget.allocations.reduce((sum, allocation) => sum + Number(allocation.limit), 0)
    const spent = budget.allocations.reduce((sum, allocation) => sum + Number(allocation.spent), 0)
    const remaining = Math.max(0, totalBudget - spent)
    const percentage = totalBudget > 0 ? Math.min(100, Math.round(spent / totalBudget * 100)) : 0

    return {totalBudget, spent, remaining, percentage}
}

export const getSavingsRate = (budget: Budget | null) => {
    if (!budget || Number(budget.monthlyIncome) <= 0) return null
    return Number(budget.savingsTarget) / Number(budget.monthlyIncome) * 100
}

export const dashboardBudgetCopy = (locale: string) => locale.startsWith('ru') ? {
    savingsHint: (target: string, income: string) => `${target} из ${income} дохода`,
    savingsBasedOnBudget: 'По активному бюджету на этот месяц',
    noSavingsRate: 'Создайте и примените бюджет на месяц',
    loadingBudget: 'Загружаем бюджет',
    budgetLoadError: 'Не удалось загрузить бюджет.',
    spent: 'Потрачено',
    remaining: 'Осталось',
    categoryProgress: 'Прогресс по категориям',
    noAllocations: 'В бюджете пока нет категорий.',
    ofLimit: 'лимита',
} : {
    savingsHint: (target: string, income: string) => `${target} of ${income} income`,
    savingsBasedOnBudget: 'Based on the active budget for this month',
    noSavingsRate: 'Create and apply a monthly budget',
    loadingBudget: 'Loading budget',
    budgetLoadError: 'We could not load your budget.',
    spent: 'Spent',
    remaining: 'Remaining',
    categoryProgress: 'Category progress',
    noAllocations: 'There are no categories in this budget yet.',
    ofLimit: 'of limit',
}
