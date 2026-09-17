import {fireEvent, render, screen, waitFor, within} from '@testing-library/react'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {getCategoryOptions} from '../../categories/api/categoriesApi'
import {getBudgetConstraints, getConfirmedBudgetForecast, saveBudgetConstraints} from '../api/budgetPlanningApi'
import type {BudgetConstraintSet, BudgetForecast, BudgetPlan} from '../api/budgetPlanningApi'
import {selectOption} from '../../../test/selectOption'
import {BudgetConstraintsStep} from './BudgetConstraintsStep'

vi.mock('../api/budgetPlanningApi', () => ({
    getBudgetConstraints: vi.fn(),
    getConfirmedBudgetForecast: vi.fn(),
    saveBudgetConstraints: vi.fn(),
}))

vi.mock('../../categories/api/categoriesApi', () => ({
    getCategoryOptions: vi.fn(),
}))

const plan: BudgetPlan = {
    id: 'plan-id', previousPlanId: null, month: '2026-10', currency: 'RUB', revision: 1,
    status: 'DRAFT', currentStep: 'CONSTRAINTS', version: 1,
    forecast: {revision: 1, status: 'CURRENT', summary: null},
    constraints: {revision: null, status: 'SUGGESTED', feasibility: null},
    currentOptimization: null,
    capabilities: {canEditForecast: true, canEditConstraints: true, canRunOptimization: false, canApply: false, canCancel: true},
    createdAt: '2026-09-17T08:00:00Z', updatedAt: '2026-09-17T08:00:00Z',
}

const constraints: BudgetConstraintSet = {
    planId: plan.id,
    basedOnForecastRevision: 1,
    revision: null,
    status: 'SUGGESTED',
    savingsFloorAmount: 32937,
    categories: [{
        category: {id: 'housing-id', name: 'Housing', icon: 'home', color: '#8b5cf6'},
        allocationType: 'VARIABLE',
        constraintRole: 'FLEXIBLE',
        requiredAmount: 0,
        priority: 'MEDIUM',
        fundingLevels: [
            {level: 'MINIMUM', amount: 21150, coverage: 0.6},
            {level: 'BALANCED', amount: 29962.5, coverage: 0.85},
            {level: 'COMFORTABLE', amount: 35250, coverage: 1},
        ],
        sourceKeys: ['HISTORICAL_CATEGORY:housing-id'],
    }],
    feasibility: {
        status: 'INFEASIBLE',
        forecastIncome: 36000,
        requiredAmount: 0,
        variableMinimumAmount: 21150,
        savingsFloorAmount: 32937,
        maximumSavingsAmount: 14850,
        capacityAtSavingsFloor: 3063,
        shortfall: 18087,
        violations: [{code: 'MINIMUM_ALLOCATION_EXCEEDS_CAPACITY', shortfall: 18087, requiredAmount: 21150, availableAmount: 3063, parameters: {}}],
    },
    planVersion: 1,
}

const foodConstraints: BudgetConstraintSet = {
    ...constraints,
    savingsFloorAmount: 0,
    categories: [{
        category: {id: 'food-id', name: 'Food', icon: 'utensils', color: '#f59e0b'},
        allocationType: 'VARIABLE',
        constraintRole: 'FLEXIBLE',
        requiredAmount: 0,
        priority: 'HIGH',
        fundingLevels: [
            {level: 'MINIMUM', amount: 720, coverage: 0.6},
            {level: 'BALANCED', amount: 1020, coverage: 0.85},
            {level: 'COMFORTABLE', amount: 1200, coverage: 1},
        ],
        sourceKeys: ['HISTORICAL_CATEGORY:food-id'],
    }],
    feasibility: {
        ...constraints.feasibility,
        status: 'FEASIBLE',
        variableMinimumAmount: 720,
        savingsFloorAmount: 0,
        maximumSavingsAmount: 35280,
        capacityAtSavingsFloor: 36000,
        shortfall: 0,
        violations: [],
    },
}

const forecast: BudgetForecast = {
    planId: plan.id,
    revision: 1,
    status: 'CURRENT',
    sourceFingerprint: 'source-fingerprint',
    inputFingerprint: 'input-fingerprint',
    summary: {
        forecastIncome: 36000,
        recurringExpenses: 1700,
        flexibleEstimate: 0,
        forecastExpenses: 1700,
        forecastSavings: 34300,
        includedItemCount: 3,
        excludedItemCount: 0,
    },
    items: [{
        sourceKey: 'RECURRING:groceries:2026-10-05',
        sourceType: 'RECURRING',
        operationType: 'EXPENSE',
        title: 'Weekly groceries',
        category: {id: 'food-id', name: 'Food', icon: 'utensils', color: '#f59e0b'},
        expectedDate: '2026-10-05',
        originalAmount: 1000,
        effectiveAmount: 1000,
        included: true,
        defaultConstraintRole: 'FLEXIBLE',
        confidence: 'HIGH',
        recurring: {templateId: 'groceries', frequency: 'WEEKLY'},
        history: null,
    }, {
        sourceKey: 'RECURRING:groceries:2026-10-12',
        sourceType: 'RECURRING',
        operationType: 'EXPENSE',
        title: 'Weekly groceries',
        category: {id: 'food-id', name: 'Food', icon: 'utensils', color: '#f59e0b'},
        expectedDate: '2026-10-12',
        originalAmount: 1000,
        effectiveAmount: 1000,
        included: true,
        defaultConstraintRole: 'FLEXIBLE',
        confidence: 'HIGH',
        recurring: {templateId: 'groceries', frequency: 'WEEKLY'},
        history: null,
    }, {
        sourceKey: 'RECURRING:rent:2026-10-01',
        sourceType: 'RECURRING',
        operationType: 'EXPENSE',
        title: 'Rent',
        category: {id: 'housing-id', name: 'Housing', icon: 'home', color: '#8b5cf6'},
        expectedDate: '2026-10-01',
        originalAmount: 12000,
        effectiveAmount: 12000,
        included: true,
        defaultConstraintRole: 'REQUIRED',
        confidence: 'HIGH',
        recurring: {templateId: 'rent', frequency: 'MONTHLY'},
        history: null,
    }],
    planVersion: 1,
    confirmedAt: '2026-09-17T08:00:00Z',
}

const renderStep = (onContinue = vi.fn()) => {
    render(<BudgetConstraintsStep plan={plan} currency="RUB" onBack={vi.fn()} onSaved={vi.fn()} onContinue={onContinue}/>)
    return {onContinue}
}

beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getBudgetConstraints).mockResolvedValue(constraints)
    vi.mocked(getConfirmedBudgetForecast).mockResolvedValue(forecast)
    vi.mocked(getCategoryOptions).mockResolvedValue([
        {id: 'food-id', name: 'Food', icon: 'utensils', color: '#f59e0b'},
        {id: 'travel-id', name: 'Travel', icon: 'transport', color: '#2563eb'},
    ])
})

describe('BudgetConstraintsStep', () => {
    it('keeps an arbitrary category minimum and raises lower funding levels before saving', async () => {
        const saved = {
            ...foodConstraints,
            status: 'CONFIRMED' as const,
            categories: foodConstraints.categories.map((category) => ({
                ...category,
                fundingLevels: category.fundingLevels.map((level) => ({...level, amount: 7000})),
            })),
        }
        vi.mocked(getBudgetConstraints).mockResolvedValue(foodConstraints)
        vi.mocked(saveBudgetConstraints).mockResolvedValue(saved)
        renderStep()

        const minimumInput = await screen.findByLabelText('Food: Minimum')
        fireEvent.change(minimumInput, {target: {value: '7000'}})

        expect(minimumInput).toHaveValue(7000)
        fireEvent.click(screen.getByRole('button', {name: 'Save draft'}))
        await waitFor(() => expect(saveBudgetConstraints).toHaveBeenCalledWith(plan.id, expect.objectContaining({
            categories: [expect.objectContaining({
                categoryId: 'food-id',
                fundingLevels: [
                    {level: 'MINIMUM', amount: 7000},
                    {level: 'BALANCED', amount: 7000},
                    {level: 'COMFORTABLE', amount: 7000},
                ],
            })],
        })))
    })

    it('lets the user protect a flexible category minimum as a required payment', async () => {
        const saved: BudgetConstraintSet = {
            ...foodConstraints,
            status: 'CONFIRMED',
            categories: foodConstraints.categories.map((category) => ({
                ...category,
                constraintRole: 'REQUIRED',
                requiredAmount: 7000,
                fundingLevels: category.fundingLevels.map((level) => ({...level, amount: 7000})),
            })),
            feasibility: {
                ...foodConstraints.feasibility,
                requiredAmount: 7000,
                variableMinimumAmount: 0,
                maximumSavingsAmount: 29000,
            },
        }
        vi.mocked(getBudgetConstraints).mockResolvedValue(foodConstraints)
        vi.mocked(saveBudgetConstraints).mockResolvedValue(saved)
        renderStep()

        const classification = await screen.findByRole('combobox', {name: 'Food: Classification'})
        await selectOption(classification, 'Required')

        expect(classification).toHaveTextContent('Required')
        const protectedAmount = screen.getByLabelText('Food: Protected amount')
        expect(protectedAmount).toHaveValue(720)
        expect(screen.getByText('Protected minimum with flexible upgrades')).toBeInTheDocument()
        expect(screen.getByText('1 protected categories')).toBeInTheDocument()
        fireEvent.change(protectedAmount, {target: {value: '7000'}})
        expect(protectedAmount).toHaveValue(7000)

        fireEvent.click(screen.getByRole('button', {name: 'Save draft'}))
        await waitFor(() => expect(saveBudgetConstraints).toHaveBeenCalledWith(plan.id, expect.objectContaining({
            categories: [expect.objectContaining({
                categoryId: 'food-id',
                allocationType: 'VARIABLE',
                constraintRole: 'REQUIRED',
                requiredAmount: 7000,
            })],
        })))
    })

    it('builds a protected category minimum from recurring forecast occurrences', async () => {
        vi.mocked(getBudgetConstraints).mockResolvedValue(foodConstraints)
        vi.mocked(saveBudgetConstraints).mockResolvedValue(foodConstraints)
        renderStep()

        fireEvent.click(await screen.findByRole('button', {name: 'Review Food recurring payments'}))

        expect(screen.getByRole('dialog', {name: 'Food recurring payments'})).toBeInTheDocument()
        const payments = screen.getAllByRole('checkbox', {name: /Weekly groceries/})
        expect(payments).toHaveLength(2)
        fireEvent.click(payments[0])
        fireEvent.click(payments[1])
        expect(screen.getByText(/2,000/)).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', {name: 'Apply protected minimum'}))

        expect(screen.queryByRole('dialog', {name: 'Food recurring payments'})).not.toBeInTheDocument()
        expect(screen.getByLabelText('Food: Protected amount')).toHaveValue(2000)
        expect(screen.getByRole('combobox', {name: 'Food: Classification'})).toHaveTextContent('Required')

        fireEvent.click(screen.getByRole('button', {name: 'Save draft'}))
        await waitFor(() => expect(saveBudgetConstraints).toHaveBeenCalledWith(plan.id, expect.objectContaining({
            categories: [expect.objectContaining({
                categoryId: 'food-id',
                constraintRole: 'REQUIRED',
                requiredAmount: 2000,
            })],
        })))
    })

    it('adds an expense category outside the forecast with generated funding levels', async () => {
        vi.mocked(getBudgetConstraints).mockResolvedValue(foodConstraints)
        vi.mocked(saveBudgetConstraints).mockResolvedValue(foodConstraints)
        renderStep()

        fireEvent.click(await screen.findByRole('button', {name: 'Add category constraint'}))
        const dialog = await screen.findByRole('dialog', {name: 'Add category constraint'})
        const categorySelect = await within(dialog).findByRole('combobox', {name: 'Category'})
        await selectOption(categorySelect, 'Travel')
        expect(categorySelect).toHaveTextContent('Travel')
        fireEvent.change(within(dialog).getByLabelText('Minimum amount'), {target: {value: '6000'}})
        fireEvent.change(within(dialog).getByLabelText('Comfortable amount'), {target: {value: '10000'}})
        await selectOption(within(dialog).getByRole('combobox', {name: 'Priority'}), 'High')
        fireEvent.click(within(dialog).getByRole('button', {name: 'Add constraint'}))

        expect(screen.queryByRole('dialog', {name: 'Add category constraint'})).not.toBeInTheDocument()
        expect(screen.getByText('Travel')).toBeInTheDocument()
        expect(screen.getByText('Manually added category')).toBeInTheDocument()
        expect(screen.getByRole('button', {name: 'Remove Travel constraint'})).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', {name: 'Save draft'}))
        await waitFor(() => expect(saveBudgetConstraints).toHaveBeenCalledWith(plan.id, expect.objectContaining({
            categories: expect.arrayContaining([expect.objectContaining({
                categoryId: 'travel-id',
                allocationType: 'VARIABLE',
                constraintRole: 'FLEXIBLE',
                requiredAmount: 0,
                priority: 'HIGH',
                fundingLevels: [
                    {level: 'MINIMUM', amount: 6000},
                    {level: 'BALANCED', amount: 8500},
                    {level: 'COMFORTABLE', amount: 10000},
                ],
            })]),
        })))
    })

    it('explains an infeasible draft and recalculates it while the user edits savings', async () => {
        renderStep()

        const continueButton = await screen.findByRole('button', {name: 'Continue to optimize'})
        expect(continueButton).toBeDisabled()
        expect(screen.getAllByText(/18,087/)).toHaveLength(2)
        expect(screen.queryByText('MINIMUM_ALLOCATION_EXCEEDS_CAPACITY')).not.toBeInTheDocument()
        expect(screen.getByText('Savings target conflicts with minimum limits').closest('li')).toHaveClass('fail')

        fireEvent.change(screen.getByLabelText('Minimum savings'), {target: {value: '10000'}})

        expect(continueButton).toBeEnabled()
        expect(screen.getByText('Savings target can be reached').closest('li')).toHaveClass('pass')
        expect(screen.queryByText(/18,087/)).not.toBeInTheDocument()
    })

    it('saves the edited savings floor before advancing to optimization', async () => {
        const saved: BudgetConstraintSet = {
            ...constraints,
            revision: 1,
            status: 'CONFIRMED',
            savingsFloorAmount: 10000,
            feasibility: {
                ...constraints.feasibility,
                status: 'FEASIBLE',
                savingsFloorAmount: 10000,
                capacityAtSavingsFloor: 26000,
                shortfall: 0,
                violations: [],
            },
            planVersion: 2,
        }
        vi.mocked(saveBudgetConstraints).mockResolvedValue(saved)
        const {onContinue} = renderStep()
        fireEvent.change(await screen.findByLabelText('Minimum savings'), {target: {value: '10000'}})

        fireEvent.click(screen.getByRole('button', {name: 'Continue to optimize'}))

        await waitFor(() => expect(saveBudgetConstraints).toHaveBeenCalledWith(plan.id, expect.objectContaining({
            expectedVersion: constraints.planVersion,
            forecastRevision: constraints.basedOnForecastRevision,
            savingsFloorAmount: 10000,
        })))
        await waitFor(() => expect(onContinue).toHaveBeenCalledTimes(1))
    })
})
