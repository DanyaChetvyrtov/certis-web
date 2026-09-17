import {fireEvent, render, screen, waitFor, within} from '@testing-library/react'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {cancelBudgetPlan, createBudgetPlan, getBudgetPlanRevisions} from '../api/budgetPlanningApi'
import type {BudgetPlan} from '../api/budgetPlanningApi'
import {BudgetPlanActions} from './BudgetPlanActions'

vi.mock('../api/budgetPlanningApi', () => ({
    cancelBudgetPlan: vi.fn(),
    createBudgetPlan: vi.fn(),
    getBudgetPlanRevisions: vi.fn(),
}))

const plan: BudgetPlan = {
    id: 'plan-2', previousPlanId: 'plan-1', month: '2026-10', currency: 'RUB', revision: 2,
    status: 'DRAFT', currentStep: 'FORECAST', version: 7,
    forecast: {revision: null, status: 'MISSING', summary: null},
    constraints: {revision: null, status: 'MISSING', feasibility: null},
    currentOptimization: null,
    capabilities: {canEditForecast: true, canEditConstraints: false, canRunOptimization: false, canApply: false, canCancel: true},
    createdAt: '2026-09-17T10:00:00Z', updatedAt: '2026-09-17T10:00:00Z',
}

const renderActions = (currentPlan: BudgetPlan = plan) => {
    const onPlanCreated = vi.fn()
    const onPlanCancelled = vi.fn()
    render(<BudgetPlanActions plan={currentPlan} month="2026-10" currency="RUB" locale="en-US" onPlanCreated={onPlanCreated} onPlanCancelled={onPlanCancelled}/>)
    return {onPlanCreated, onPlanCancelled}
}

beforeEach(() => {
    vi.resetAllMocks()
})

describe('BudgetPlanActions', () => {
    it('loads and renders the server revision history on demand', async () => {
        vi.mocked(getBudgetPlanRevisions).mockResolvedValue({items: [{
            id: plan.id,
            revision: plan.revision,
            status: plan.status,
            currentStep: plan.currentStep,
            createdAt: plan.createdAt,
            appliedAt: null,
        }]})
        renderActions()

        fireEvent.click(screen.getByRole('button', {name: 'Revision history'}))

        await waitFor(() => expect(getBudgetPlanRevisions).toHaveBeenCalledWith('2026-10', 'RUB'))
        const dialog = await screen.findByRole('dialog', {name: 'Revision history'})
        expect(within(dialog).getByText('Revision 2')).toBeInTheDocument()
        expect(within(dialog).getByText('Current')).toBeInTheDocument()
    })

    it('cancels the current draft only after confirmation', async () => {
        const cancelled = {...plan, status: 'CANCELLED' as const, version: 8, capabilities: {...plan.capabilities, canCancel: false}}
        vi.mocked(cancelBudgetPlan).mockResolvedValue(cancelled)
        const {onPlanCancelled} = renderActions()

        fireEvent.click(screen.getByRole('button', {name: 'Cancel draft'}))
        expect(cancelBudgetPlan).not.toHaveBeenCalled()
        fireEvent.click(within(screen.getByRole('dialog', {name: 'Cancel this draft?'})).getByRole('button', {name: 'Cancel draft'}))

        await waitFor(() => expect(cancelBudgetPlan).toHaveBeenCalledWith(plan.id, plan.version))
        expect(onPlanCancelled).toHaveBeenCalledWith(cancelled)
    })

    it('creates a fresh revision after an applied plan', async () => {
        const applied = {...plan, status: 'APPLIED' as const, currentStep: 'APPLIED' as const, capabilities: {...plan.capabilities, canCancel: false}}
        const created = {...plan, id: 'plan-3', revision: 3, previousPlanId: applied.id, version: 0}
        vi.mocked(createBudgetPlan).mockResolvedValue(created)
        const {onPlanCreated} = renderActions(applied)

        fireEvent.click(screen.getByRole('button', {name: 'Create new revision'}))

        await waitFor(() => expect(createBudgetPlan).toHaveBeenCalledWith('2026-10', 'RUB', expect.any(String)))
        expect(onPlanCreated).toHaveBeenCalledWith(created)
    })
})
