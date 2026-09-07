import {useState} from 'react'
import {fireEvent, render, screen, waitFor} from '@testing-library/react'
import {describe, expect, it, vi} from 'vitest'
import {useModalAccessibility} from '../shared/hooks/useModalAccessibility'
import {selectOption} from '../test/selectOption'
import {Select, SelectOption} from './Select'

function CategoryField({disabled = false, onClose}: {disabled?: boolean; onClose?: () => void}) {
    const [value, setValue] = useState('')
    const dialogRef = useModalAccessibility<HTMLDivElement>({onClose})
    return (
        <div ref={dialogRef} role="dialog" aria-label="Transaction" tabIndex={-1}>
            <form aria-label="Transaction form">
                <label htmlFor="category">Category</label>
                <Select id="category" name="categoryId" value={value} onValueChange={setValue} disabled={disabled}>
                    <SelectOption value="">No category</SelectOption>
                    <SelectOption value="food">Food</SelectOption>
                    <SelectOption value="archived" disabled>Archived</SelectOption>
                    <SelectOption value="transport">Transport</SelectOption>
                </Select>
                <button type="button">Cancel</button>
            </form>
        </div>
    )
}

describe('Select', () => {
    it('selects and clears a category while preserving form values', async () => {
        render(<CategoryField />)
        const trigger = screen.getByRole('combobox', {name: 'Category'})
        const form = screen.getByRole('form') as HTMLFormElement

        await selectOption(trigger, 'Food')
        expect(trigger).toHaveTextContent('Food')
        expect(new FormData(form).get('categoryId')).toBe('food')
        await selectOption(trigger, 'No category')
        expect(trigger).toHaveTextContent('No category')
        expect(new FormData(form).get('categoryId')).toBe('')
        await waitFor(() => expect(trigger).toHaveFocus())
    })

    it('portals outside the scrollable dialog and closes on outside interaction', async () => {
        render(<CategoryField />)
        const trigger = screen.getByRole('combobox', {name: 'Category'})
        fireEvent.keyDown(trigger, {key: 'ArrowDown'})
        const list = await screen.findByRole('listbox')
        expect(list.closest('[role="dialog"]')).toBeNull()
        fireEvent.pointerDown(document.body, {pointerType: 'mouse'})
        await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
        await waitFor(() => expect(trigger).toHaveFocus())
    })

    it('supports keyboard navigation, skips disabled options and restores focus on Escape', async () => {
        const onClose = vi.fn()
        render(<CategoryField onClose={onClose} />)
        const trigger = screen.getByRole('combobox', {name: 'Category'})
        fireEvent.keyDown(trigger, {key: 'ArrowDown'})
        const food = await screen.findByRole('option', {name: 'Food'})
        await waitFor(() => expect(screen.getByRole('option', {name: 'No category'})).toHaveFocus())
        fireEvent.keyDown(document.activeElement!, {key: 'ArrowDown'})
        await waitFor(() => expect(food).toHaveFocus())
        fireEvent.keyDown(food, {key: 'ArrowDown'})
        await waitFor(() => expect(screen.getByRole('option', {name: 'Transport'})).toHaveFocus())
        fireEvent.keyDown(document.activeElement!, {key: 'Home'})
        await waitFor(() => expect(screen.getByRole('option', {name: 'No category'})).toHaveFocus())
        fireEvent.keyDown(document.activeElement!, {key: 'End'})
        await waitFor(() => expect(screen.getByRole('option', {name: 'Transport'})).toHaveFocus())
        fireEvent.keyDown(document.activeElement!, {key: 'f'})
        await waitFor(() => expect(food).toHaveFocus())
        fireEvent.keyDown(food, {key: 'Escape'})
        await waitFor(() => expect(trigger).toHaveFocus())
        expect(trigger).toHaveTextContent('No category')
        expect(onClose).not.toHaveBeenCalled()
        fireEvent.keyDown(trigger, {key: 'Escape'})
        expect(onClose).toHaveBeenCalledOnce()
    })

    it('confirms keyboard selection without submitting the surrounding form', async () => {
        const submit = vi.fn((event: React.FormEvent) => event.preventDefault())
        const change = vi.fn()
        render(<form onSubmit={submit}><Select aria-label="Currency" value="RUB" onValueChange={change}>
            <SelectOption value="RUB">RUB</SelectOption>
            <SelectOption value="EUR">EUR</SelectOption>
        </Select></form>)
        const trigger = screen.getByRole('combobox', {name: 'Currency'})
        fireEvent.keyDown(trigger, {key: 'Enter'})
        const euro = await screen.findByRole('option', {name: 'EUR'})
        fireEvent.keyDown(euro, {key: 'Enter'})
        expect(change).toHaveBeenCalledWith('EUR')
        expect(submit).not.toHaveBeenCalled()
        await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'false'))
    })

    it('keeps disabled controls out of the tab order and form submission', () => {
        render(<CategoryField disabled />)
        const trigger = screen.getByRole('combobox', {name: 'Category'})
        expect(trigger).toBeDisabled()
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
        expect(new FormData(screen.getByRole('form') as HTMLFormElement).has('categoryId')).toBe(false)
        expect(screen.getByRole('button', {name: 'Cancel'})).toHaveFocus()
    })
})
