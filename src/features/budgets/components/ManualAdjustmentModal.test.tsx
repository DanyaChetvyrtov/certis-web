import {fireEvent, render, screen, waitFor} from '@testing-library/react'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {getCategoryOptions} from '../../categories/api/categoriesApi'
import {ManualAdjustmentModal} from './ManualAdjustmentModal'

vi.mock('../../categories/api/categoriesApi', () => ({
    getCategoryOptions: vi.fn(),
}))

const expenseCategory = {id: 'food-id', name: 'Food', icon: 'utensils', color: '#10b981'}

beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getCategoryOptions).mockResolvedValue([expenseCategory])
})

describe('ManualAdjustmentModal', () => {
    it('loads matching category options and includes the selection in the adjustment', async () => {
        const onAdd = vi.fn()
        render(<ManualAdjustmentModal onClose={vi.fn()} onAdd={onAdd}/>)

        await waitFor(() => expect(getCategoryOptions).toHaveBeenCalledWith('EXPENSE', expect.any(AbortSignal)))
        fireEvent.change(screen.getByLabelText('Name'), {target: {value: 'Car maintenance'}})
        fireEvent.change(screen.getByLabelText('Category'), {target: {value: expenseCategory.id}})
        fireEvent.change(screen.getByLabelText('Amount'), {target: {value: '1250'}})
        fireEvent.click(screen.getByRole('button', {name: 'Add adjustment'}))

        expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({
            operationType: 'EXPENSE',
            title: 'Car maintenance',
            categoryId: expenseCategory.id,
            amount: 1250,
        }), expenseCategory)
    })

    it('requires a category for manual expenses before saving', async () => {
        const onAdd = vi.fn()
        render(<ManualAdjustmentModal onClose={vi.fn()} onAdd={onAdd}/>)
        await screen.findByRole('option', {name: 'Food'})
        fireEvent.change(screen.getByLabelText('Name'), {target: {value: 'Car maintenance'}})
        fireEvent.change(screen.getByLabelText('Amount'), {target: {value: '1250'}})

        fireEvent.click(screen.getByRole('button', {name: 'Add adjustment'}))

        expect(screen.getByRole('alert')).toHaveTextContent('Select a category for an expense adjustment.')
        expect(onAdd).not.toHaveBeenCalled()
    })

    it('reloads options for the selected operation type', async () => {
        vi.mocked(getCategoryOptions).mockImplementation(async (type) => type === 'EXPENSE' ? [expenseCategory] : [{id: 'salary-id', name: 'Salary', icon: 'cash', color: '#2563eb'}])
        render(<ManualAdjustmentModal onClose={vi.fn()} onAdd={vi.fn()}/>)
        await screen.findByRole('option', {name: 'Food'})

        fireEvent.click(screen.getByRole('button', {name: 'Income'}))

        await waitFor(() => expect(getCategoryOptions).toHaveBeenLastCalledWith('INCOME', expect.any(AbortSignal)))
        expect(await screen.findByRole('option', {name: 'Salary'})).toBeInTheDocument()
    })
})
