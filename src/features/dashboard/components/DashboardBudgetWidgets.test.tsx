import {fireEvent, render, screen, waitFor, within} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {getBudget} from '../../budgets/api/budgetsApi'
import type {Budget} from '../../budgets/api/budgetsApi'
import type {Currency} from '../../../shared/currency'
import {useDashboardBudget} from '../hooks/useDashboardBudget'
import {DashboardBudgetOverviewPanel, DashboardSavingsRateCard} from './DashboardBudgetWidgets'

vi.mock('../../budgets/api/budgetsApi', () => ({getBudget: vi.fn()}))
vi.mock('./BudgetRing', () => ({
    BudgetRing: ({percentage}: {percentage: number}) => <div role="img" aria-label={`Used ${percentage}%`} data-testid="budget-ring"/>,
}))

const mockGetBudget = vi.mocked(getBudget)

const budget: Budget = {
    id: 'budget-id', month: '2026-09', currency: 'EUR', monthlyIncome: 1000, savingsTarget: 250,
    createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z',
    allocations: [
        {id: 'housing', categoryId: 'h', categoryName: 'Housing', categoryIcon: 'home', categoryColor: '#965aba', type: 'FIXED', limit: 400, spent: 300, status: 'ON_TRACK'},
        {id: 'food', categoryId: 'f', categoryName: 'Food', categoryIcon: 'utensils', categoryColor: '#10b981', type: 'VARIABLE', limit: 200, spent: 100, status: 'ON_TRACK'},
    ],
}

function Widgets({currency = 'EUR'}: {currency?: Currency}) {
    const data = useDashboardBudget('2026-09', currency, true)
    return <MemoryRouter>
        <DashboardSavingsRateCard data={data} currency={currency}/>
        <DashboardBudgetOverviewPanel data={data} currency={currency}/>
    </MemoryRouter>
}

afterEach(() => mockGetBudget.mockReset())

describe('dashboard budget widgets', () => {
    it('shows real planned savings and category-level spending from one operational budget', async () => {
        mockGetBudget.mockResolvedValue(budget)
        render(<Widgets/>)
        expect(await screen.findByText('25%')).toBeInTheDocument()
        const panel = within(screen.getByText('Budget overview', {selector: 'h2'}).closest('article')!)
        expect(panel.getByTestId('budget-ring')).toHaveAttribute('aria-label', 'Used 66.66666666666666%')
        expect(panel.getByText('Housing')).toBeInTheDocument()
        expect(panel.getByText('Food')).toBeInTheDocument()
        expect(panel.getByRole('link', {name: /Manage/})).toHaveAttribute('href', '/budgets')
        expect(mockGetBudget).toHaveBeenCalledTimes(1)
        expect(mockGetBudget).toHaveBeenCalledWith('2026-09', expect.any(AbortSignal))
    })

    it('shows a meaningful empty state rather than invented zero balances', async () => {
        mockGetBudget.mockResolvedValue(null)
        render(<Widgets/>)
        const panel = within(screen.getByText('Budget overview', {selector: 'h2'}).closest('article')!)
        expect(await panel.findByText('Plan your month')).toBeInTheDocument()
        expect(panel.getByRole('link', {name: /Create a budget/})).toHaveAttribute('href', '/budgets')
        const savings = screen.getByText('Savings rate').closest('article')!
        expect(within(savings).getByText('—')).toBeInTheDocument()
        expect(panel.queryByTestId('budget-ring')).not.toBeInTheDocument()
    })

    it('never shows another currency’s budget', async () => {
        mockGetBudget.mockResolvedValue(budget)
        render(<Widgets currency="RUB"/>)
        const panel = within(screen.getByText('Budget overview', {selector: 'h2'}).closest('article')!)
        expect(await panel.findByText('A budget for this currency is not available.')).toBeInTheDocument()
        expect(screen.queryByText('Housing')).not.toBeInTheDocument()
        expect(screen.getByText('Savings rate').closest('article')).toHaveTextContent('—')
    })

    it('recovers from an API error when retry is clicked', async () => {
        mockGetBudget.mockRejectedValueOnce(new Error('Unavailable')).mockResolvedValueOnce(budget)
        render(<Widgets/>)
        const panel = within(screen.getByText('Budget overview', {selector: 'h2'}).closest('article')!)
        expect(await panel.findByText('We could not load your monthly budget.')).toBeInTheDocument()
        fireEvent.click(panel.getByRole('button', {name: 'Try again: Budget overview'}))
        await waitFor(() => expect(screen.getByText('25%')).toBeInTheDocument())
        expect(mockGetBudget).toHaveBeenCalledTimes(2)
    })

    it('aborts the previous request when the dashboard currency changes and on unmount', async () => {
        mockGetBudget.mockImplementation(() => new Promise<Budget | null>(() => {}))
        const view = render(<Widgets/>)
        await waitFor(() => expect(mockGetBudget).toHaveBeenCalledTimes(1))
        const firstSignal = mockGetBudget.mock.calls[0][1]
        expect(firstSignal?.aborted).toBe(false)
        view.rerender(<Widgets currency="RUB"/>)
        await waitFor(() => expect(mockGetBudget).toHaveBeenCalledTimes(2))
        expect(firstSignal?.aborted).toBe(true)
        const nextSignal = mockGetBudget.mock.calls[1][1]
        expect(nextSignal?.aborted).toBe(false)
        view.unmount()
        expect(nextSignal?.aborted).toBe(true)
    })
})
