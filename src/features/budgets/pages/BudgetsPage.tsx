import {useCallback, useEffect, useMemo, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Icon} from '../../../components/Icons'
import {LoadingIndicator} from '../../../components/LoadingIndicator'
import type {IconName} from '../../../components/Icons'
import {WorkspaceSidebar} from '../../../widgets/workspace-shell'
import {useSession} from '../../auth/session/SessionContext'
import type {CategoryOption} from '../../categories/api/categoriesApi'
import {useLanguage} from '../../../i18n/useLanguage'
import type {Currency} from '../../../shared/currency'
import {confirmBudgetForecast, createBudgetPlan, getBudgetForecastPreview, getCurrentBudgetPlan} from '../api/budgetPlanningApi'
import {getBudgetPlan} from '../api/budgetOptimizationApi'
import type {BudgetConstraintSet, BudgetForecastItem, BudgetForecastManualAdjustmentRequest, BudgetForecastOperationType, BudgetForecastPreview, BudgetPlan} from '../api/budgetPlanningApi'
import {BudgetConstraintsStep} from '../components/BudgetConstraintsStep'
import {BudgetOptimizeStep} from '../components/BudgetOptimizeStep'
import {BudgetPlanActions} from '../components/BudgetPlanActions'
import {BudgetReviewStep} from '../components/BudgetReviewStep'
import {ManualAdjustmentModal} from '../components/ManualAdjustmentModal'
import './BudgetsPage.css'

type OperationFilter = 'ALL' | BudgetForecastOperationType
type DraftItem = BudgetForecastItem & {pendingManual?: boolean}
type VisibleStep = 'FORECAST' | 'CONSTRAINTS' | 'OPTIMIZE' | 'REVIEW'

const nextMonth = () => {
    const date = new Date()
    date.setMonth(date.getMonth() + 1, 1)
    return date.toISOString().slice(0, 7)
}
const formatMoney = (value: number, currency: string, locale: string) => new Intl.NumberFormat(locale, {style: 'currency', currency, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0}).format(value)
const formatMonth = (month: string, locale: string) => new Intl.DateTimeFormat(locale, {month: 'long', year: 'numeric'}).format(new Date(`${month}-01T00:00:00`))
const formatDate = (date: string | null, locale: string, fallback: string) => date ? new Intl.DateTimeFormat(locale, {month: 'short', day: 'numeric'}).format(new Date(`${date}T00:00:00`)) : fallback
const categoryIcon = (icon?: string | null): IconName => {
    const supported: IconName[] = ['briefcase', 'cash', 'card', 'home', 'shopping-cart', 'transport', 'utensils', 'gift', 'heart', 'repeat', 'wallet', 'categories']
    return icon && supported.includes(icon as IconName) ? icon as IconName : 'wallet'
}
const stepForPlan = (plan: BudgetPlan): VisibleStep => plan.forecast.status === 'MISSING' ? 'FORECAST' : plan.currentStep === 'REVIEW' || plan.currentStep === 'APPLIED' ? 'REVIEW' : plan.currentStep === 'OPTIMIZE' ? 'OPTIMIZE' : 'CONSTRAINTS'

export function BudgetsPage() {
    const {t} = useTranslation()
    const {locale} = useLanguage()
    const {profile} = useSession()
    const currency = (profile?.preferredCurrency ?? 'RUB') as Currency
    const [month, setMonth] = useState(nextMonth)
    const [plan, setPlan] = useState<BudgetPlan | null>(null)
    const [preview, setPreview] = useState<BudgetForecastPreview | null>(null)
    const [items, setItems] = useState<DraftItem[]>([])
    const [filter, setFilter] = useState<OperationFilter>('ALL')
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [manualOpen, setManualOpen] = useState(false)
    const [visibleStep, setVisibleStep] = useState<VisibleStep>('FORECAST')
    const [reviewOptimizationId, setReviewOptimizationId] = useState<string | null>(null)

    const applyLoadedPlan = useCallback((current: BudgetPlan, loadedPreview: BudgetForecastPreview) => {
        setPlan(current)
        setPreview(loadedPreview)
        setItems(loadedPreview.items)
        setReviewOptimizationId(current.currentOptimization?.id ?? null)
        setVisibleStep(stepForPlan(current))
        setError('')
        setStatus('ready')
    }, [])

    const fetchCurrentPlan = useCallback(async (signal?: AbortSignal) => {
        let current = await getCurrentBudgetPlan(month, currency, signal)
        if (signal?.aborted) return null
        if (!current) current = await createBudgetPlan(month, currency, crypto.randomUUID())
        if (signal?.aborted) return null
        const loadedPreview = await getBudgetForecastPreview(current.id, signal)
        if (signal?.aborted) return null
        return {current, loadedPreview}
    }, [currency, month])

    const load = useCallback(async (signal?: AbortSignal) => {
        try {
            const loaded = await fetchCurrentPlan(signal)
            if (loaded) applyLoadedPlan(loaded.current, loaded.loadedPreview)
        } catch (caught) {
            if (signal?.aborted || (caught instanceof Error && caught.name === 'AbortError')) return
            setError(caught instanceof Error ? caught.message : t('budgets.planning.loadError'))
            setStatus('error')
        }
    }, [applyLoadedPlan, fetchCurrentPlan, t])
    useEffect(() => {
        const controller = new AbortController()
        void fetchCurrentPlan(controller.signal).then((loaded) => {
            if (loaded) applyLoadedPlan(loaded.current, loaded.loadedPreview)
        }).catch((caught: unknown) => {
            if (controller.signal.aborted || (caught instanceof Error && caught.name === 'AbortError')) return
            setError(caught instanceof Error ? caught.message : t('budgets.planning.loadError'))
            setStatus('error')
        })
        return () => controller.abort()
    }, [applyLoadedPlan, fetchCurrentPlan, t])

    const baseItems = useMemo(() => new Map(preview?.items.map((item) => [item.sourceKey, item]) ?? []), [preview])
    const visibleItems = items.filter((item) => filter === 'ALL' || item.operationType === filter)
    const incomeCount = items.filter((item) => item.operationType === 'INCOME').length
    const expenseCount = items.filter((item) => item.operationType === 'EXPENSE').length
    const recurringCount = items.filter((item) => item.sourceType === 'RECURRING').length
    const recurringExpenseCount = items.filter((item) => item.included && item.sourceType === 'RECURRING' && item.operationType === 'EXPENSE').length
    const manualCount = items.filter((item) => item.sourceType === 'MANUAL').length
    const liveSummary = useMemo(() => {
        const included = items.filter((item) => item.included)
        const income = included.filter((item) => item.operationType === 'INCOME').reduce((sum, item) => sum + item.effectiveAmount, 0)
        const expenses = included.filter((item) => item.operationType === 'EXPENSE').reduce((sum, item) => sum + item.effectiveAmount, 0)
        const recurringExpenses = included.filter((item) => item.operationType === 'EXPENSE' && item.sourceType === 'RECURRING').reduce((sum, item) => sum + item.effectiveAmount, 0)
        return {forecastIncome: income, recurringExpenses, flexibleEstimate: Math.max(0, expenses - recurringExpenses)}
    }, [items])
    const updateItem = (sourceKey: string, update: Partial<Pick<DraftItem, 'included' | 'effectiveAmount'>>) => setItems((current) => current.map((item) => item.sourceKey === sourceKey ? {...item, ...update} : item))
    const addManual = (adjustment: BudgetForecastManualAdjustmentRequest, category: CategoryOption | null) => {
        const item: DraftItem = {sourceKey: `MANUAL:${adjustment.clientId}`, sourceType: 'MANUAL', operationType: adjustment.operationType, title: adjustment.title, category, expectedDate: adjustment.expectedDate, originalAmount: adjustment.amount, effectiveAmount: adjustment.amount, included: true, defaultConstraintRole: adjustment.operationType === 'EXPENSE' ? 'FLEXIBLE' : null, confidence: 'HIGH', recurring: null, history: null, pendingManual: true}
        setItems((current) => [...current, item])
        setManualOpen(false)
    }
    const saveForecast = async (advance: boolean) => {
        if (!plan || !preview || saving) return false
        setSaving(true)
        setError('')
        try {
            const overrides = items.filter((item) => !item.pendingManual).filter((item) => {
                const base = baseItems.get(item.sourceKey)
                return base && (base.included !== item.included || base.effectiveAmount !== item.effectiveAmount)
            }).map((item) => ({sourceKey: item.sourceKey, included: item.included, amount: item.effectiveAmount}))
            const manualAdjustments = items.filter((item) => item.pendingManual).map((item) => ({clientId: item.sourceKey.replace('MANUAL:', ''), operationType: item.operationType, title: item.title, categoryId: item.category?.id ?? null, expectedDate: item.expectedDate, amount: item.effectiveAmount}))
            const saved = await confirmBudgetForecast(plan.id, {expectedVersion: plan.version, sourceFingerprint: preview.sourceFingerprint, overrides, manualAdjustments})
            setPlan((current) => current ? {...current, version: saved.planVersion, currentStep: 'CONSTRAINTS', forecast: {...current.forecast, revision: saved.revision, status: saved.status, summary: saved.summary}, currentOptimization: null} : current)
            setReviewOptimizationId(null)
            const refreshed = await getBudgetForecastPreview(plan.id)
            setPreview(refreshed)
            setItems(refreshed.items)
            if (advance) setVisibleStep('CONSTRAINTS')
            return true
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : t('budgets.planning.saveError'))
            return false
        } finally {
            setSaving(false)
        }
    }
    const sourceLabel = (item: DraftItem) => {
        if (item.sourceType === 'RECURRING') return t('budgets.planning.sourceRecurring', {frequency: item.recurring?.frequency?.toLowerCase() ?? ''})
        if (item.sourceType === 'HISTORICAL_CATEGORY') return t('budgets.planning.sourceHistory', {count: item.history?.monthsUsed ?? preview?.historyWindow.monthsUsed ?? 0})
        if (item.sourceType === 'CURRENT_LIMIT') return t('budgets.planning.sourceCurrentLimit')
        if (item.sourceType === 'ACTUAL') return t('budgets.planning.sourceActual')
        return t('budgets.planning.sourceManual')
    }
    const onConstraintsSaved = (constraints: BudgetConstraintSet) => setPlan((current) => current ? {...current, version: constraints.planVersion, currentStep: constraints.status === 'CONFIRMED' && constraints.feasibility.status === 'FEASIBLE' ? 'OPTIMIZE' : 'CONSTRAINTS', constraints: {revision: constraints.revision, status: constraints.status, feasibility: constraints.feasibility}, currentOptimization: null} : current)
    const editFromReview = async (step: 'FORECAST' | 'CONSTRAINTS') => {
        if (!plan) return
        try {
            const fresh = await getBudgetPlan(plan.id)
            setPlan(fresh)
            if (step === 'FORECAST') {
                const nextPreview = await getBudgetForecastPreview(plan.id)
                setPreview(nextPreview)
                setItems(nextPreview.items)
            }
            setVisibleStep(step)
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : t('budgets.planning.loadError'))
        }
    }
    const activatePlan = async (created: BudgetPlan) => {
        setStatus('loading')
        setError('')
        try {
            const loadedPreview = await getBudgetForecastPreview(created.id)
            applyLoadedPlan(created, loadedPreview)
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : t('budgets.planning.loadError'))
            setStatus('error')
            throw caught
        }
    }
    const markPlanCancelled = (cancelled: BudgetPlan) => {
        setPlan(cancelled)
        setReviewOptimizationId(null)
        setManualOpen(false)
        setError('')
        setStatus('ready')
    }
    const activeStepIndex = visibleStep === 'FORECAST' ? 0 : visibleStep === 'CONSTRAINTS' ? 1 : visibleStep === 'OPTIMIZE' ? 2 : 3
    return <div className="budgets-workspace"><WorkspaceSidebar activePage="budgets"/><main className="budgets-main forecast-page">
        <header className="forecast-header">
            <div className="forecast-title"><h1>{t('budgets.title')}</h1><p>{visibleStep === 'FORECAST' ? t('budgets.planning.subtitle') : visibleStep === 'CONSTRAINTS' ? t('budgets.constraints.subtitle') : visibleStep === 'REVIEW' ? locale.startsWith('ru') ? 'Проверьте расчёт перед применением бюджета.' : 'Review your allocation before applying your budget.' : locale.startsWith('ru') ? 'Подготовьте цель накоплений и изучите варианты распределения.' : 'Prepare your savings target and explore allocation options.'}</p></div>
            <nav className="forecast-steps" aria-label={t('budgets.planning.stepsLabel')}>{['Forecast', 'Constraints', 'Optimize', 'Review'].map((label, index) => <div key={label} className={index === activeStepIndex ? 'active' : index < activeStepIndex ? 'completed' : ''}><span>{index < activeStepIndex ? <Icon name="check-circle"/> : index + 1}</span><b>{t(`budgets.planning.steps.${label.toLowerCase()}`)}</b>{index < 3 && <i/>}</div>)}</nav>
            <label className="forecast-month"><Icon name="calendar"/><span>{formatMonth(month, locale)}</span><Icon name="chevron-down"/><input aria-label={t('budgets.monthLabel')} type="month" value={month} onChange={(event) => {setStatus('loading'); setError(''); setMonth(event.target.value)}}/></label>
        </header>
        {status === 'ready' && plan && <BudgetPlanActions plan={plan} month={month} currency={currency} locale={locale} onPlanCreated={activatePlan} onPlanCancelled={markPlanCancelled}/>}
        {status === 'loading' && <div className="budget-state"><LoadingIndicator label={t('budgets.planning.loading')} layout="panel" showLabel size="medium"/></div>}
        {status === 'error' && <div className="budget-state error" role="alert">{error}<button type="button" onClick={() => {setStatus('loading'); setError(''); void load()}}>{t('budgets.tryAgain')}</button></div>}
        {status === 'ready' && error && <div className="budget-action-error" role="alert">{error}</div>}
        {status === 'ready' && plan?.status === 'CANCELLED' && <div className="budget-state budget-terminal-state"><Icon name="alert"/><h2>{t('budgets.planning.lifecycle.cancelledTitle')}</h2><p>{t('budgets.planning.lifecycle.cancelledDescription')}</p></div>}
        {status === 'ready' && preview && plan?.status !== 'CANCELLED' && plan?.status !== 'SUPERSEDED' && plan && visibleStep === 'FORECAST' && <>
            <div className="forecast-layout"><div className="forecast-primary">
                <section className="forecast-summary">
                    <article><span className="green"><Icon name="cash"/></span><p>{t('budgets.planning.forecastIncome')}</p><strong>{formatMoney(liveSummary.forecastIncome, currency, locale)}</strong><small>{t('budgets.planning.recurringSalary')}</small></article>
                    <article><span className="blue"><Icon name="card"/></span><p>{t('budgets.planning.recurringExpenses')}</p><strong>{formatMoney(liveSummary.recurringExpenses, currency, locale)}</strong><small>{t('budgets.planning.requiredPayments', {count: recurringExpenseCount})}</small></article>
                    <article><span className="gold"><Icon name="trend-up"/></span><p>{t('budgets.planning.flexibleEstimate')}</p><strong>{formatMoney(liveSummary.flexibleEstimate, currency, locale)}</strong><small>{t('budgets.planning.historyBasis', {count: preview.historyWindow.monthsUsed})}</small></article>
                </section>
                <section className="forecast-operations-card"><header><div><h2>{t('budgets.planning.operations')}</h2><p>{t('budgets.planning.operationsDescription')}</p></div><button type="button" onClick={() => setManualOpen(true)}><Icon name="plus"/>{t('budgets.planning.addManual')}</button></header>
                    <div className="forecast-filter-tabs">{(['ALL', 'INCOME', 'EXPENSE'] as const).map((value) => {
                        const count = value === 'ALL' ? items.length : value === 'INCOME' ? incomeCount : expenseCount
                        return <button type="button" key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{value === 'ALL' ? t('budgets.planning.all') : value === 'INCOME' ? t('budgets.planning.income') : t('budgets.planning.expenses')} <span>{count}</span></button>
                    })}</div>
                    <div className="forecast-table-head"><span>{t('budgets.planning.operation')}</span><span>{t('budgets.planning.source')}</span><span>{t('budgets.planning.expectedDate')}</span><span>{t('budgets.planning.amount')}</span><span>{t('budgets.planning.included')}</span><span/></div>
                    <div className="forecast-operation-list">{visibleItems.map((item) => <article className={!item.included ? 'excluded' : ''} key={item.sourceKey}>
                        <div className="forecast-operation-name"><span style={{color: item.category?.color}}><Icon name={categoryIcon(item.category?.icon)}/></span><strong>{item.title}</strong></div>
                        <div className="forecast-source"><Icon name={item.sourceType === 'RECURRING' ? 'repeat' : item.sourceType === 'MANUAL' ? 'edit' : 'trend-up'}/><span>{sourceLabel(item)}</span></div>
                        <time>{formatDate(item.expectedDate, locale, t('budgets.planning.throughoutMonth'))}</time>
                        <label className={`forecast-amount ${item.operationType.toLowerCase()}`}><span>{item.operationType === 'INCOME' ? '+' : '−'}</span><input aria-label={t('budgets.planning.amount')} type="number" min="0" step="0.01" value={item.effectiveAmount} onChange={(event) => updateItem(item.sourceKey, {effectiveAmount: Math.max(0, Number(event.target.value) || 0)})}/></label>
                        <button type="button" role="switch" aria-checked={item.included} className={`forecast-toggle ${item.included ? 'on' : ''}`} onClick={() => updateItem(item.sourceKey, {included: !item.included})}><i/></button>
                        <button type="button" className="forecast-more" aria-label={t('budgets.planning.more')}><Icon name="more"/></button>
                    </article>)}</div>
                </section>
                <section className="forecast-basis-card coming-soon-card"><div><span className="coming-soon-badge">{t('budgets.planning.comingSoon')}</span><h2>{t('budgets.planning.forecastBasis')}</h2><p>{t('budgets.planning.forecastBasisDescription', {count: preview.historyWindow.monthsUsed})}</p></div><div className="forecast-chart-placeholder"><span/><span/><span/><span/><span/><span/><i/></div></section>
            </div><aside className="forecast-insights">
                <section className="forecast-sources-card"><h2>{t('budgets.planning.sources')}</h2><div><strong>{recurringCount}</strong><span>{t('budgets.planning.recurringOperations')}</span></div><div><strong>{preview.historyWindow.monthsUsed}</strong><span>{t('budgets.planning.monthsHistory')}</span></div><div><strong>{manualCount}</strong><span>{t('budgets.planning.manualAdjustments')}</span></div><a href="/transactions">{t('budgets.planning.reviewRecurring')} <Icon name="arrow-right"/></a></section>
                <section className="forecast-checks-card coming-soon-card"><span className="coming-soon-badge">{t('budgets.planning.comingSoon')}</span><header><Icon name="check-circle"/><h2>{t('budgets.planning.checks')}</h2></header><p>{t('budgets.planning.checksDescription')}</p><ul><li><Icon name="check-circle"/>{t('budgets.planning.checkIncome')}</li><li><Icon name="check-circle"/>{t('budgets.planning.checkRecurring')}</li><li><Icon name="check-circle"/>{t('budgets.planning.checkDuplicates')}</li></ul></section>
                <section className="forecast-change-card coming-soon-card"><span className="coming-soon-badge">{t('budgets.planning.comingSoon')}</span><header><Icon name="alert"/><h2>{t('budgets.planning.amountChanged')}</h2></header><p>{t('budgets.planning.amountChangedDescription')}</p></section>
            </aside></div>
            <footer className="forecast-footer"><div/><button type="button" className="secondary" disabled={saving} onClick={() => void saveForecast(false)}>{saving ? t('budgets.planning.saving') : t('budgets.planning.saveDraft')}</button><button type="button" className="primary" disabled={saving} onClick={() => void saveForecast(true)}>{t('budgets.planning.continue')}<Icon name="arrow-right"/></button><small>{t('budgets.planning.adjustLater')}</small></footer>
        </>}
        {status === 'ready' && plan?.status === 'DRAFT' && visibleStep === 'CONSTRAINTS' && <BudgetConstraintsStep plan={plan} currency={currency} onBack={() => setVisibleStep('FORECAST')} onSaved={onConstraintsSaved} onContinue={() => setVisibleStep('OPTIMIZE')}/>}
        {status === 'ready' && plan?.status === 'DRAFT' && visibleStep === 'OPTIMIZE' && <BudgetOptimizeStep plan={plan} currency={currency} onBack={() => setVisibleStep('CONSTRAINTS')} onReview={(optimizationId) => {setReviewOptimizationId(optimizationId); setVisibleStep('REVIEW')}}/>}
        {status === 'ready' && plan && (plan.status === 'DRAFT' || plan.status === 'APPLIED') && visibleStep === 'REVIEW' && <BudgetReviewStep plan={plan} currency={currency} optimizationId={reviewOptimizationId} onBack={() => setVisibleStep('OPTIMIZE')} onEditForecast={() => void editFromReview('FORECAST')} onEditConstraints={() => void editFromReview('CONSTRAINTS')} onDismissed={(planVersion) => {setPlan((current) => current ? {...current, version: planVersion, currentStep: 'OPTIMIZE', currentOptimization: current.currentOptimization ? {...current.currentOptimization, status: 'DISMISSED'} : null} : current); setReviewOptimizationId(null); setVisibleStep('OPTIMIZE')}} onApplied={() => {void getBudgetPlan(plan.id).then(setPlan).catch(() => {})}}/>}
    </main>{manualOpen && <ManualAdjustmentModal onClose={() => setManualOpen(false)} onAdd={addManual}/>}</div>
}
