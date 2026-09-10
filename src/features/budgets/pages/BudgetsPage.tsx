import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Icon} from '../../../components/Icons'
import {LoadingIndicator} from '../../../components/LoadingIndicator'
import type {IconName} from '../../../components/Icons'
import {WorkspaceSidebar} from '../../../layouts/WorkspaceSidebar'
import {useSession} from '../../auth/session/SessionContext'
import {getAllCategoryCards, isCategoryIcon} from '../../categories/api/categoriesApi'
import type {Category} from '../../categories/api/categoriesApi'
import type {Budget, BudgetAllocation, BudgetCategoryType, BudgetOptimization} from '../api/budgetsApi'
import {applyOptimization, dismissOptimization, generateOptimization, getBudget, getLatestOptimization} from '../api/budgetsApi'
import {BudgetFormModal} from '../components/BudgetFormModal'
import {useLanguage} from '../../../i18n/useLanguage'
import './BudgetsPage.css'

type Filter = 'ALL' | BudgetCategoryType
const todayMonth = () => new Date().toISOString().slice(0, 7)
const formatMoney = (value: number, currency: string, locale: string) =>
    new Intl.NumberFormat(locale, {style: 'currency', currency, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0}).format(value)
const formatMonth = (month: string, locale: string) =>
    new Intl.DateTimeFormat(locale, {month: 'long', year: 'numeric'}).format(new Date(`${month}-01T00:00:00`))
const formatMonthName = (month: string, locale: string) =>
    new Intl.DateTimeFormat(locale, {month: 'long'}).format(new Date(`${month}-01T00:00:00`))
const iconName = (icon: string): IconName => isCategoryIcon(icon) ? icon : 'categories'

function AllocationRow({item, currency}: {item: BudgetAllocation; currency: string}) {
    const {t} = useTranslation()
    const {locale} = useLanguage()
    const remaining = item.limit - item.spent
    const progress = item.limit ? Math.min(item.spent / item.limit * 100, 100) : item.spent ? 100 : 0
    const status = item.status === 'OVERSPENT' ? 'over' : item.status === 'NEAR_LIMIT' ? 'near' : 'safe'
    return <article className={`budget-allocation-row ${status}`}>
        <div className="budget-category-cell"><span className="budget-category-icon" style={{color: item.categoryColor, background: `${item.categoryColor}18`}}><Icon name={iconName(item.categoryIcon)}/></span><div className="budget-category-copy"><strong>{item.categoryName}</strong><small>{item.status === 'OVERSPENT' ? t('budgets.overBudget') : item.status === 'NEAR_LIMIT' ? t('budgets.nearLimit') : t('budgets.onTrack')}</small><span><i style={{width: `${progress}%`, background: status === 'over' ? '#d8665b' : item.categoryColor}}/></span></div></div>
        <span className={`budget-type ${item.type.toLowerCase()}`}>{item.type === 'FIXED' ? t('budgets.fixed') : t('budgets.variable')}</span>
        <strong>{formatMoney(item.spent, currency, locale)}</strong><span>{formatMoney(item.limit, currency, locale)}</span>
        <strong className="budget-remaining">{remaining < 0 ? '−' : ''}{formatMoney(Math.abs(remaining), currency, locale)}</strong><span/>
    </article>
}

export function BudgetsPage() {
    const {t} = useTranslation()
    const {locale} = useLanguage()
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
            setError(caught instanceof Error ? caught.message : t('budgets.loadError'))
            setStatus('error')
        }
    }, [month, preferredCurrency, t])

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
        catch (caught) { setError(caught instanceof Error ? caught.message : t('budgets.generateError')) }
        finally { setAction(null) }
    }
    const acceptOptimization = async () => {
        if (!optimization) return
        setAction('apply'); setError('')
        try { setBudget(await applyOptimization(month, optimization.id)); setOptimization(null) }
        catch (caught) { setError(caught instanceof Error ? caught.message : t('budgets.applyError')) }
        finally { setAction(null) }
    }
    const rejectOptimization = async () => {
        if (!optimization) return
        setAction('dismiss'); setError('')
        try { await dismissOptimization(month, optimization.id); setOptimization(null) }
        catch (caught) { setError(caught instanceof Error ? caught.message : t('budgets.dismissError')) }
        finally { setAction(null) }
    }

    return <div className="budgets-workspace"><WorkspaceSidebar activePage="budgets"/><main className="budgets-main">
        <header className="budgets-header"><div><h1>{t('budgets.title')}</h1><p>{t('budgets.subtitle')}</p></div><div className="budgets-header-actions"><label className="budget-month"><Icon name="calendar"/><span>{formatMonth(month, locale)}</span><input aria-label={t('budgets.monthLabel')} type="month" value={month} onChange={(event) => {setStatus('loading'); setError(''); setMonth(event.target.value)}}/></label><button ref={editButtonRef} type="button" className="edit-budget" onClick={() => setModalOpen(true)} disabled={status !== 'ready'}><Icon name={budget ? 'edit' : 'plus'}/>{budget ? t('budgets.edit') : t('budgets.create')}</button></div></header>
        {status === 'loading' && (
            <div className="budget-state budget-loading-state">
                <LoadingIndicator
                    label={t('budgets.loading')}
                    layout="panel"
                    showLabel
                    size="medium"
                />
            </div>
        )}
        {status === 'error' && <div className="budget-state error" role="alert">{error}<button type="button" onClick={() => {setStatus('loading'); setError(''); void load()}}>{t('budgets.tryAgain')}</button></div>}
        {status === 'ready' && !budget && <div className="budget-state budget-empty"><Icon name="gauge"/><h2>{t('budgets.noBudget', {month: formatMonth(month, locale)})}</h2><p>{t('budgets.emptyDescription')}</p><button type="button" onClick={() => setModalOpen(true)}>{t('budgets.create')}</button></div>}
        {budget && <>
            {error && <div className="budget-action-error" role="alert">{error}</div>}
            <section className="budget-summary" aria-label={t('budgets.summaryLabel')}>
                <article><span className="green"><Icon name="cash"/></span><p>{t('budgets.monthlyIncome')}</p><strong>{formatMoney(budget.monthlyIncome, budget.currency, locale)}</strong><small>{t('budgets.availableIncome')}</small></article>
                <article><span className="navy"><Icon name="gauge"/></span><p>{t('budgets.allocated')}</p><strong>{formatMoney(totals.allocated, budget.currency, locale)}</strong><small>{t('budgets.percentIncome', {value: budget.monthlyIncome ? (totals.allocated / budget.monthlyIncome * 100).toFixed(1) : 0})}</small></article>
                <article><span className="red"><Icon name="wallet"/></span><p>{t('budgets.spent')}</p><strong>{formatMoney(totals.spent, budget.currency, locale)}</strong><div className="summary-progress"><i style={{width: `${totals.allocated ? Math.min(totals.spent / totals.allocated * 100, 100) : 0}%`}}/></div><small>{t('budgets.percentAllocation', {value: totals.allocated ? Math.round(totals.spent / totals.allocated * 100) : 0})}</small></article>
                <article><span className="gold"><Icon name="piggy-bank"/></span><p>{t('budgets.plannedSavings')}</p><strong>{formatMoney(budget.savingsTarget, budget.currency, locale)}</strong><small>{t('budgets.savingsRate', {value: budget.monthlyIncome ? (budget.savingsTarget / budget.monthlyIncome * 100).toFixed(1) : 0})}</small></article>
            </section>
            <div className="budget-content"><section className="budget-allocation-card"><header><div><h2>{t('budgets.allocation')}</h2><p>{t('budgets.limitsCompared', {month: formatMonthName(month, locale)})}</p></div><button type="button" onClick={() => setModalOpen(true)}><Icon name="plus"/>{t('budgets.addAllocation')}</button></header><div className="budget-filters" role="group" aria-label={t('budgets.allocationType')}>{(['ALL','FIXED','VARIABLE'] as const).map((value) => <button key={value} className={filter === value ? 'active' : ''} type="button" onClick={() => setFilter(value)}>{value === 'ALL' ? t('budgets.all') : value === 'FIXED' ? t('budgets.fixed') : t('budgets.variable')}</button>)}<span>{t('budgets.categoryCount', {count: visible.length})}</span></div><div className="budget-table-head"><span>{t('budgets.category')}</span><span>{t('budgets.type')}</span><span>{t('budgets.spent')}</span><span>{t('budgets.limit')}</span><span>{t('budgets.remaining')}</span><span/></div><div className="budget-allocation-list">{visible.map((item) => <AllocationRow key={item.id} item={item} currency={budget.currency}/>)}{visible.length === 0 && <p className="budget-list-empty">{t('budgets.noAllocations')}</p>}</div></section>
                <aside className="budget-insights"><section className="savings-card"><span><Icon name="piggy-bank"/></span><p>{t('budgets.savingsGoal')}</p><strong>{formatMoney(budget.savingsTarget, budget.currency, locale)}</strong><small>{t('budgets.plannedFor', {month: formatMonth(month, locale)})}</small><div><i style={{width: `${budget.monthlyIncome ? Math.min(budget.savingsTarget / budget.monthlyIncome * 100, 100) : 0}%`}}/></div><b>{t('budgets.percentOfIncome', {value: budget.monthlyIncome ? (budget.savingsTarget / budget.monthlyIncome * 100).toFixed(1) : 0})}</b></section>
                    <section className="optimization-card"><span><Icon name="trend-up"/></span><h2>{t('budgets.optimization')}</h2>{optimization?.status === 'PROPOSED' ? <><p>{t('budgets.optimizationProposed', {amount: formatMoney(optimization.additionalSavings, budget.currency, locale), count: optimization.allocations.filter(({change}) => change !== 0).length})}</p><div className="optimization-actions"><button type="button" onClick={() => void acceptOptimization()} disabled={action !== null}>{action === 'apply' ? t('budgets.applying') : t('budgets.apply')}</button><button type="button" onClick={() => void rejectOptimization()} disabled={action !== null}>{t('budgets.dismiss')}</button></div></> : <><p>{t('budgets.optimizationDescription')}</p><button type="button" onClick={() => void runOptimization()} disabled={action !== null}>{action === 'generate' ? t('budgets.generating') : t('budgets.generate')}<Icon name="arrow-right"/></button></>}</section>
                    <section className="risk-card"><header><span><Icon name="alert"/></span><div><h3>{t('budgets.risks')}</h3><p>{risks.length ? t('budgets.risksCount', {count: risks.length}) : t('budgets.everythingOnTrack')}</p></div></header>{risks.slice(0, 3).map((item) => <div key={item.id}><strong>{item.categoryName}</strong><span>{t('budgets.percentUsed', {value: item.limit ? Math.round(item.spent / item.limit * 100) : 100})}</span></div>)}</section>
                </aside>
            </div>
        </>}
    </main>{isModalOpen && <BudgetFormModal month={month} budget={budget} categories={categories} onClose={() => setModalOpen(false)} onSaved={(saved) => {setBudget(saved); setOptimization(null); setModalOpen(false)}} restoreFocus={() => editButtonRef.current?.focus()}/>}</div>
}
