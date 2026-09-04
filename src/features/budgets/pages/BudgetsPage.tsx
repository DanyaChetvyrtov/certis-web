import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {Icon} from '../../../components/Icons'
import type {IconName} from '../../../components/Icons'
import {WorkspaceSidebar} from '../../../layouts/WorkspaceSidebar'
import {useSession} from '../../auth/session/SessionContext'
import {getAllCategoryCards, isCategoryIcon} from '../../categories/api/categoriesApi'
import type {Category} from '../../categories/api/categoriesApi'
import type {Budget, BudgetAllocation, BudgetCategoryType, BudgetOptimization} from '../api/budgetsApi'
import {applyOptimization, dismissOptimization, generateOptimization, getBudget, getLatestOptimization} from '../api/budgetsApi'
import {BudgetFormModal} from '../components/BudgetFormModal'
import './BudgetsPage.css'

type Filter = 'ALL' | BudgetCategoryType
const todayMonth = () => new Date().toISOString().slice(0, 7)
const formatMoney = (value: number, currency: string) =>
    new Intl.NumberFormat('en-US', {style: 'currency', currency, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0}).format(value)
const formatMonth = (month: string) =>
    new Intl.DateTimeFormat('en-US', {month: 'long', year: 'numeric'}).format(new Date(`${month}-01T00:00:00`))
const iconName = (icon: string): IconName => isCategoryIcon(icon) ? icon : 'categories'

function AllocationRow({item, currency}: {item: BudgetAllocation; currency: string}) {
    const remaining = item.limit - item.spent
    const progress = item.limit ? Math.min(item.spent / item.limit * 100, 100) : item.spent ? 100 : 0
    const status = item.status === 'OVERSPENT' ? 'over' : item.status === 'NEAR_LIMIT' ? 'near' : 'safe'
    return <article className={`budget-allocation-row ${status}`}>
        <div className="budget-category-cell"><span className="budget-category-icon" style={{color: item.categoryColor, background: `${item.categoryColor}18`}}><Icon name={iconName(item.categoryIcon)}/></span><div className="budget-category-copy"><strong>{item.categoryName}</strong><small>{item.status === 'OVERSPENT' ? 'Over budget' : item.status === 'NEAR_LIMIT' ? 'Near limit' : 'On track'}</small><span><i style={{width: `${progress}%`, background: status === 'over' ? '#d8665b' : item.categoryColor}}/></span></div></div>
        <span className={`budget-type ${item.type.toLowerCase()}`}>{item.type === 'FIXED' ? 'Fixed' : 'Variable'}</span>
        <strong>{formatMoney(item.spent, currency)}</strong><span>{formatMoney(item.limit, currency)}</span>
        <strong className="budget-remaining">{remaining < 0 ? '−' : ''}{formatMoney(Math.abs(remaining), currency)}</strong><span/>
    </article>
}

export function BudgetsPage() {
    const {profile} = useSession()
    const preferredCurrency = profile?.preferredCurrency ?? 'RUB'
    const [month, setMonth] = useState(todayMonth)
    const [budget, setBudget] = useState<Budget | null>(null)
    const [categories, setCategories] = useState<Category[]>([])
    const [optimization, setOptimization] = useState<BudgetOptimization | null>(null)
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
    const [action, setAction] = useState<'generate' | 'apply' | 'dismiss' | null>(null)
    const [error, setError] = useState('')
    const [filter, setFilter] = useState<Filter>('ALL')
    const [isModalOpen, setModalOpen] = useState(false)
    const editButtonRef = useRef<HTMLButtonElement>(null)

    const load = useCallback(async (signal?: AbortSignal) => {
        try {
            const [loadedBudget, loadedCategories] = await Promise.all([
                getBudget(month, signal),
                getAllCategoryCards({
                    month,
                    currency: preferredCurrency,
                    sort: 'NAME',
                }, signal),
            ])
            setBudget(loadedBudget)
            setCategories(loadedCategories)
            setOptimization(loadedBudget ? await getLatestOptimization(month, signal) : null)
            setStatus('ready')
        } catch (caught) {
            if (caught instanceof Error && caught.name === 'AbortError') return
            setError(caught instanceof Error ? caught.message : 'We could not load your budget.')
            setStatus('error')
        }
    }, [month, preferredCurrency])

    useEffect(() => {
        const controller = new AbortController()
        queueMicrotask(() => void load(controller.signal))
        return () => controller.abort()
    }, [load])

    const totals = useMemo(() => {
        const allocations = budget?.allocations ?? []
        return {
            allocated: allocations.reduce((sum, item) => sum + item.limit, 0),
            spent: allocations.reduce((sum, item) => sum + item.spent, 0),
        }
    }, [budget])
    const visible = budget?.allocations.filter((item) => filter === 'ALL' || item.type === filter) ?? []
    const risks = budget?.allocations.filter(({status: allocationStatus}) => allocationStatus !== 'ON_TRACK') ?? []

    const runOptimization = async () => {
        setAction('generate'); setError('')
        try { setOptimization(await generateOptimization(month)) }
        catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not generate suggestions.') }
        finally { setAction(null) }
    }
    const acceptOptimization = async () => {
        if (!optimization) return
        setAction('apply'); setError('')
        try { setBudget(await applyOptimization(month, optimization.id)); setOptimization(null) }
        catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not apply suggestions.') }
        finally { setAction(null) }
    }
    const rejectOptimization = async () => {
        if (!optimization) return
        setAction('dismiss'); setError('')
        try { await dismissOptimization(month, optimization.id); setOptimization(null) }
        catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not dismiss suggestions.') }
        finally { setAction(null) }
    }

    return <div className="budgets-workspace"><WorkspaceSidebar activePage="budgets"/><main className="budgets-main">
        <header className="budgets-header"><div><h1>Budgets</h1><p>Plan your month, track actual spending and protect your savings.</p></div><div className="budgets-header-actions"><label className="budget-month"><Icon name="calendar"/><span>{formatMonth(month)}</span><input aria-label="Budget month" type="month" value={month} onChange={(event) => {setStatus('loading'); setError(''); setMonth(event.target.value)}}/></label><button ref={editButtonRef} type="button" className="edit-budget" onClick={() => setModalOpen(true)} disabled={status !== 'ready'}><Icon name={budget ? 'edit' : 'plus'}/>{budget ? 'Edit budget' : 'Create budget'}</button></div></header>
        {status === 'loading' && <div className="budget-state" role="status">Loading your budget…</div>}
        {status === 'error' && <div className="budget-state error" role="alert">{error}<button type="button" onClick={() => {setStatus('loading'); setError(''); void load()}}>Try again</button></div>}
        {status === 'ready' && !budget && <div className="budget-state budget-empty"><Icon name="gauge"/><h2>No budget for {formatMonth(month)}</h2><p>Create a monthly plan and allocate your expense categories.</p><button type="button" onClick={() => setModalOpen(true)}>Create budget</button></div>}
        {budget && <>
            {error && <div className="budget-action-error" role="alert">{error}</div>}
            <section className="budget-summary" aria-label="Budget summary">
                <article><span className="green"><Icon name="cash"/></span><p>MONTHLY INCOME</p><strong>{formatMoney(budget.monthlyIncome, budget.currency)}</strong><small>Available monthly income</small></article>
                <article><span className="navy"><Icon name="gauge"/></span><p>ALLOCATED</p><strong>{formatMoney(totals.allocated, budget.currency)}</strong><small>{budget.monthlyIncome ? (totals.allocated / budget.monthlyIncome * 100).toFixed(1) : 0}% of monthly income</small></article>
                <article><span className="red"><Icon name="wallet"/></span><p>SPENT</p><strong>{formatMoney(totals.spent, budget.currency)}</strong><div className="summary-progress"><i style={{width: `${totals.allocated ? Math.min(totals.spent / totals.allocated * 100, 100) : 0}%`}}/></div><small>{totals.allocated ? Math.round(totals.spent / totals.allocated * 100) : 0}% of allocation</small></article>
                <article><span className="gold"><Icon name="piggy-bank"/></span><p>PLANNED SAVINGS</p><strong>{formatMoney(budget.savingsTarget, budget.currency)}</strong><small>{budget.monthlyIncome ? (budget.savingsTarget / budget.monthlyIncome * 100).toFixed(1) : 0}% savings rate</small></article>
            </section>
            <div className="budget-content"><section className="budget-allocation-card"><header><div><h2>Category allocation</h2><p>Limits are compared with actual expense transactions in {formatMonth(month).split(' ')[0]}.</p></div><button type="button" onClick={() => setModalOpen(true)}><Icon name="plus"/>Add allocation</button></header><div className="budget-filters" role="group" aria-label="Allocation type">{(['ALL','FIXED','VARIABLE'] as const).map((value) => <button key={value} className={filter === value ? 'active' : ''} type="button" onClick={() => setFilter(value)}>{value === 'ALL' ? 'All' : value === 'FIXED' ? 'Fixed' : 'Variable'}</button>)}<span>{visible.length} categories</span></div><div className="budget-table-head"><span>CATEGORY</span><span>TYPE</span><span>SPENT</span><span>LIMIT</span><span>REMAINING</span><span/></div><div className="budget-allocation-list">{visible.map((item) => <AllocationRow key={item.id} item={item} currency={budget.currency}/>)}{visible.length === 0 && <p className="budget-list-empty">No allocations match this filter.</p>}</div></section>
                <aside className="budget-insights"><section className="savings-card"><span><Icon name="piggy-bank"/></span><p>SAVINGS GOAL</p><strong>{formatMoney(budget.savingsTarget, budget.currency)}</strong><small>Planned for {formatMonth(month)}</small><div><i style={{width: `${budget.monthlyIncome ? Math.min(budget.savingsTarget / budget.monthlyIncome * 100, 100) : 0}%`}}/></div><b>{budget.monthlyIncome ? (budget.savingsTarget / budget.monthlyIncome * 100).toFixed(1) : 0}% of income</b></section>
                    <section className="optimization-card"><span><Icon name="trend-up"/></span><h2>Optimization mode</h2>{optimization?.status === 'PROPOSED' ? <><p>Save an additional <strong>{formatMoney(optimization.additionalSavings, budget.currency)}</strong> with {optimization.allocations.filter(({change}) => change !== 0).length} suggested adjustments.</p><div className="optimization-actions"><button type="button" onClick={() => void acceptOptimization()} disabled={action !== null}>{action === 'apply' ? 'Applying…' : 'Apply'}</button><button type="button" onClick={() => void rejectOptimization()} disabled={action !== null}>Dismiss</button></div></> : <><p>Certis can suggest category adjustments to protect your savings target.</p><button type="button" onClick={() => void runOptimization()} disabled={action !== null}>{action === 'generate' ? 'Generating…' : 'Generate suggestions'}<Icon name="arrow-right"/></button></>}</section>
                    <section className="risk-card"><header><span><Icon name="alert"/></span><div><h3>Spending risks</h3><p>{risks.length ? `${risks.length} categories need attention` : 'Everything is on track'}</p></div></header>{risks.slice(0, 3).map((item) => <div key={item.id}><strong>{item.categoryName}</strong><span>{item.limit ? Math.round(item.spent / item.limit * 100) : 100}% used</span></div>)}</section>
                </aside>
            </div>
        </>}
    </main>{isModalOpen && <BudgetFormModal month={month} budget={budget} categories={categories} onClose={() => setModalOpen(false)} onSaved={(saved) => {setBudget(saved); setOptimization(null); setModalOpen(false)}} restoreFocus={() => editButtonRef.current?.focus()}/>}</div>
}
