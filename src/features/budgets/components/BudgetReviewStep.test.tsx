import {fireEvent, render, screen, waitFor, within} from '@testing-library/react'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import type {BudgetPlan} from '../api/budgetPlanningApi'
import type {BudgetOptimizationRun} from '../api/budgetOptimizationApi'
import {applyBudgetOptimization, dismissBudgetOptimization, getBudgetOptimization, getBudgetPlan, getLatestBudgetOptimization} from '../api/budgetOptimizationApi'
import {BudgetReviewStep} from './BudgetReviewStep'

vi.mock('../api/budgetOptimizationApi', () => ({
    getBudgetPlan: vi.fn(),
    getLatestBudgetOptimization: vi.fn(),
    getBudgetOptimization: vi.fn(),
    applyBudgetOptimization: vi.fn(),
    dismissBudgetOptimization: vi.fn(),
}))

const planId = '00000000-0000-4000-8000-000000000010'
const optimizationId = '00000000-0000-4000-8000-000000000020'
const plan: BudgetPlan = {
    id: planId, previousPlanId: null, month: '2026-10', currency: 'RUB', revision: 1,
    status: 'DRAFT', currentStep: 'REVIEW', version: 7,
    forecast: {revision: 2, status: 'CURRENT', summary: null},
    constraints: {revision: 4, status: 'CONFIRMED', feasibility: null},
    currentOptimization: {id: optimizationId, status: 'GENERATED', targetSavingsAmount: 12000, actualSavingsAmount: 15000, createdAt: '2026-09-16T09:00:00Z'},
    capabilities: {canEditForecast: true, canEditConstraints: true, canRunOptimization: true, canApply: true, canCancel: true},
    createdAt: '2026-09-15T09:00:00Z', updatedAt: '2026-09-16T09:00:00Z',
}
const run: BudgetOptimizationRun = {
    id: optimizationId, planId, status: 'GENERATED', algorithmVersion: 'mckp-v1', inputFingerprint: 'fingerprint',
    input: {planVersion: 6, forecastRevision: 2, constraintsRevision: 4, forecastIncome: 50000, requiredAmount: 10000, savingsFloorAmount: 5000, targetSavingsAmount: 12000, maximumSavingsAmount: 20000, flexibleCapacity: 28000, flexibleCategoryCount: 1, candidateOptionCount: 3},
    result: {requiredAllocation: 10000, flexibleAllocation: 25000, totalAllocation: 35000, targetSavings: 12000, actualSavings: 15000, additionalSavingsComparedWithCurrent: 3000, coverageScore: 0.85, objectiveValue: 2.55, unusedCapacity: 3000},
    decisions: [{category: {id: 'food-id', name: 'Food', icon: 'utensils', color: '#10b981'}, allocationType: 'VARIABLE', constraintRole: 'FLEXIBLE', priority: 'HIGH', currentLimit: 28000, requiredAmount: 0, selectedLevel: 'BALANCED', recommendedLimit: 25000, change: -3000, coverage: 0.85, optionValue: 2.55, reason: {code: 'PRIORITY_WEIGHTED_LEVEL_SELECTED', parameters: {}}}],
    constraintChecks: [{code: 'REQUIRED_PAYMENTS_FUNDED', satisfied: true, actual: 10000, required: 10000}, {code: 'SAVINGS_TARGET_REACHED', satisfied: true, actual: 15000, required: 12000}, {code: 'ALLOCATION_WITHIN_CAPACITY', satisfied: true, actual: 25000, required: 28000}],
    violations: [], planVersion: 7, createdAt: '2026-09-16T09:00:00Z', staleAt: null, dismissedAt: null, appliedAt: null,
}
const callbacks = () => ({onBack: vi.fn(), onEditForecast: vi.fn(), onEditConstraints: vi.fn(), onDismissed: vi.fn(), onApplied: vi.fn()})
const renderReview = (props = callbacks()) => render(<BudgetReviewStep plan={plan} currency="RUB" optimizationId={optimizationId} {...props}/> )
const mockRead = (optimization: BudgetOptimizationRun = run, currentPlan: BudgetPlan = plan) => {
    vi.mocked(getLatestBudgetOptimization).mockResolvedValue(optimization)
    vi.mocked(getBudgetPlan).mockResolvedValue(currentPlan)
    vi.mocked(getBudgetOptimization).mockResolvedValue(optimization)
}

beforeEach(() => {
    vi.resetAllMocks()
})

describe('BudgetReviewStep', () => {
    it('renders server recommendations and applies only after explicit confirmation', async () => {
        mockRead()
        const actions = callbacks()
        const applied = {plan: {id: planId, version: 8, revision: 1, status: 'APPLIED' as const, currentStep: 'APPLIED' as const, appliedAt: '2026-09-16T10:00:00Z'}, optimization: {id: optimizationId, status: 'APPLIED' as const}, budget: {id: 'budget-1', month: '2026-10', currency: 'RUB' as const, totalLimit: 35000, sourceOptimizationId: optimizationId, allocations: [{categoryId: 'food-id', limit: 25000}]}}
        vi.mocked(applyBudgetOptimization).mockResolvedValue(applied)
        renderReview(actions)
        expect((await screen.findAllByText('Food')).length).toBeGreaterThan(0)
        expect(screen.getByText(/Selected funding level: Balanced/)).toBeInTheDocument()
        expect(screen.getByText('Recommended allocation')).toBeInTheDocument()
        const applyButton = screen.getByRole('button', {name: /^Apply budget ·/})
        fireEvent.click(applyButton)
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(applyBudgetOptimization).not.toHaveBeenCalled()
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', {name: 'Yes, apply budget'}))
        await waitFor(() => expect(applyBudgetOptimization).toHaveBeenCalledWith(planId, optimizationId, 7, expect.any(String)))
        await waitFor(() => expect(actions.onApplied).toHaveBeenCalledWith(applied))
        expect(screen.getByText('Recommended category limits were saved to your monthly budget.')).toBeInTheDocument()
        expect(screen.getByRole('button', {name: /^Apply budget ·/})).toBeDisabled()
    })

    it('allows filtering the saved server decisions and inspecting the calculation', async () => {
        mockRead()
        renderReview()
        expect(await screen.findByText('Recommended allocation')).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', {name: 'Required'}))
        expect(screen.getByText('No categories in this group.')).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', {name: 'Flexible'}))
        expect((screen.getAllByText('Food')).length).toBeGreaterThan(0)
        fireEvent.click(screen.getByRole('button', {name: 'View calculation'}))
        expect(screen.getByRole('region', {name: 'View calculation'})).toBeInTheDocument()
        expect(screen.getByText('mckp-v1')).toBeInTheDocument()
        expect(applyBudgetOptimization).not.toHaveBeenCalled()
    })

    it('prevents applying an optimization that has become stale', async () => {
        const stale = {...run, status: 'STALE' as const, staleAt: '2026-09-16T10:00:00Z'}
        mockRead(stale, {...plan, currentStep: 'OPTIMIZE', capabilities: {...plan.capabilities, canApply: false}, currentOptimization: {...plan.currentOptimization!, status: 'STALE'}})
        const actions = callbacks()
        renderReview(actions)
        expect((await screen.findAllByText(/This result is no longer current/)).length).toBeGreaterThan(0)
        expect(screen.getByRole('button', {name: /^Apply budget ·/})).toBeDisabled()
        fireEvent.click(screen.getByRole('button', {name: 'Run optimization'}))
        expect(actions.onBack).toHaveBeenCalledTimes(1)
        expect(applyBudgetOptimization).not.toHaveBeenCalled()
    })

    it('dismisses only after confirmation and returns to Optimize', async () => {
        mockRead()
        const actions = callbacks()
        vi.mocked(dismissBudgetOptimization).mockResolvedValue({optimizationId, status: 'DISMISSED', planVersion: 8, currentStep: 'OPTIMIZE', dismissedAt: '2026-09-16T10:00:00Z'})
        renderReview(actions)
        fireEvent.click(await screen.findByRole('button', {name: 'Dismiss proposal'}))
        expect(dismissBudgetOptimization).not.toHaveBeenCalled()
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', {name: 'Dismiss proposal'}))
        await waitFor(() => expect(dismissBudgetOptimization).toHaveBeenCalledWith(planId, optimizationId, 7))
        await waitFor(() => expect(actions.onDismissed).toHaveBeenCalledWith(8))
    })
})
