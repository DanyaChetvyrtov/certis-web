import {useMemo, useRef, useState} from 'react'
import type {FormEvent} from 'react'
import {Icon} from '../../../components/Icons'
import type {IconName} from '../../../components/Icons'
import type {Category} from '../../categories/api/categoriesApi'
import {isCategoryIcon} from '../../categories/api/categoriesApi'
import {useModalAccessibility} from '../../../shared/hooks/useModalAccessibility'
import type {Budget, BudgetCategoryType, SaveBudgetAllocationRequest} from '../api/budgetsApi'
import {saveBudget} from '../api/budgetsApi'
import './BudgetFormModal.css'
import './BudgetFormModalExtras.css'

type Props = {
    month: string
    budget: Budget | null
    categories: Category[]
    onClose: () => void
    onSaved: (budget: Budget) => void
    restoreFocus?: () => void
}

type DraftAllocation = SaveBudgetAllocationRequest & {key: string}
const iconName = (icon: string): IconName => isCategoryIcon(icon) ? icon : 'categories'

export function BudgetFormModal({month, budget, categories, onClose, onSaved, restoreFocus}: Props) {
    const [income, setIncome] = useState(String(budget?.monthlyIncome ?? 0))
    const [savings, setSavings] = useState(String(budget?.savingsTarget ?? 0))
    const [allocations, setAllocations] = useState<DraftAllocation[]>(
        budget?.allocations.map(({categoryId, type, limit}) => ({
            key: categoryId, categoryId, type, limit,
        })) ?? [],
    )
    const [isSaving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const incomeRef = useRef<HTMLInputElement>(null)
    const dialogRef = useModalAccessibility<HTMLDivElement>({
        canClose: !isSaving, initialFocusRef: incomeRef, onClose, restoreFocus,
    })
    const expenseCategories = useMemo(
        () => categories.filter((category) => category.type === 'EXPENSE' && !category.archivedAt),
        [categories],
    )
    const allocated = allocations.reduce((sum, item) => sum + item.limit, 0)
    const available = Number(income || 0) - Number(savings || 0) - allocated

    const update = (key: string, patch: Partial<DraftAllocation>) =>
        setAllocations((current) => current.map((item) => item.key === key ? {...item, ...patch} : item))
    const addAllocation = () => {
        const category = expenseCategories.find((candidate) =>
            !allocations.some((allocation) => allocation.categoryId === candidate.id),
        )
        if (category) setAllocations((current) => [...current, {
            key: category.id, categoryId: category.id, type: 'VARIABLE', limit: 0,
        }])
    }

    const submit = async (event: FormEvent) => {
        event.preventDefault()
        const monthlyIncome = Number(income)
        const savingsTarget = Number(savings)
        if (monthlyIncome < 0 || savingsTarget < 0 || available < 0) {
            setError(available < 0
                ? 'Reduce allocations or savings so the plan fits your income.'
                : 'Enter valid non-negative amounts.')
            return
        }
        if (new Set(allocations.map((item) => item.categoryId)).size !== allocations.length) {
            setError('Each category can only be allocated once.')
            return
        }
        setSaving(true)
        setError('')
        try {
            onSaved(await saveBudget(month, {
                monthlyIncome,
                savingsTarget,
                allocations: allocations.map(({categoryId, type, limit}) => ({categoryId, type, limit})),
            }))
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'We could not save your budget.')
        } finally {
            setSaving(false)
        }
    }

    return <div className="budget-modal-backdrop" onMouseDown={(event) =>
        event.target === event.currentTarget && !isSaving && onClose()
    }>
        <div ref={dialogRef} className="budget-modal" role="dialog" aria-modal="true" aria-labelledby="budget-modal-title" tabIndex={-1}>
            <header><div><span className="budget-modal-mark"><Icon name="gauge"/></span><div><p>MONTHLY PLAN</p><h2 id="budget-modal-title">{budget ? 'Edit budget' : 'Create budget'}</h2></div></div><button type="button" aria-label="Close budget form" onClick={onClose} disabled={isSaving}><Icon name="close"/></button></header>
            <form onSubmit={(event) => void submit(event)}>
                <section className="budget-modal-fields">
                    <label>Monthly income<span><input ref={incomeRef} type="number" min="0" step="0.01" value={income} onChange={(e) => setIncome(e.target.value)}/><b>{budget?.currency ?? ''}</b></span></label>
                    <label>Planned savings<span><input type="number" min="0" step="0.01" value={savings} onChange={(e) => setSavings(e.target.value)}/><b>{budget?.currency ?? ''}</b></span></label>
                </section>
                <section className="budget-modal-allocations">
                    <div className="budget-modal-section-title"><div><h3>Category allocation</h3><p>Set a limit and expense type for each category.</p></div><button type="button" className="budget-add-allocation" onClick={addAllocation} disabled={allocations.length >= expenseCategories.length}><Icon name="plus"/>Add</button></div>
                    {allocations.map((item) => {
                        const category = expenseCategories.find(({id}) => id === item.categoryId)
                        return <div className="budget-modal-allocation" key={item.key}>
                            <span className="budget-allocation-icon" style={{color: category?.color, background: `${category?.color ?? '#8892b0'}18`}}><Icon name={iconName(category?.icon ?? '')}/></span>
                            <span className="budget-allocation-details">
                                <select aria-label="Expense category" value={item.categoryId} onChange={(event) => update(item.key, {categoryId: event.target.value})}>
                                    {expenseCategories.map((option) => <option key={option.id} value={option.id} disabled={allocations.some((other) => other.key !== item.key && other.categoryId === option.id)}>{option.name}</option>)}
                                </select>
                                <select aria-label="Expense type" value={item.type} onChange={(event) => update(item.key, {type: event.target.value as BudgetCategoryType})}><option value="FIXED">Fixed</option><option value="VARIABLE">Variable</option></select>
                            </span>
                            <span className="budget-limit-input"><input aria-label={`${category?.name ?? 'Category'} limit`} type="number" min="0" step="0.01" value={item.limit} onChange={(e) => update(item.key, {limit: Math.max(0, Number(e.target.value))})}/><b>{budget?.currency ?? ''}</b></span>
                            <button type="button" className="budget-remove-allocation" aria-label={`Remove ${category?.name ?? 'allocation'}`} onClick={() => setAllocations((current) => current.filter(({key}) => key !== item.key))}><Icon name="trash"/></button>
                        </div>
                    })}
                </section>
                <div className={`budget-modal-balance ${available < 0 ? 'negative' : ''}`}><span>Available after allocations</span><strong>{available.toLocaleString('en-US')} {budget?.currency ?? ''}</strong></div>
                {error && <p className="budget-modal-error" role="alert">{error}</p>}
                <footer><button type="button" onClick={onClose} disabled={isSaving}>Cancel</button><button type="submit" disabled={isSaving}>{isSaving ? 'Saving…' : 'Save budget'}</button></footer>
            </form>
        </div>
    </div>
}
