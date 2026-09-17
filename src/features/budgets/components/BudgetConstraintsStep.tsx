import {useCallback, useEffect, useMemo, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Icon} from '../../../components/Icons'
import {LoadingIndicator} from '../../../components/LoadingIndicator'
import {Select, SelectOption} from '../../../components/Select'
import type {IconName} from '../../../components/Icons'
import {useLanguage} from '../../../i18n/useLanguage'
import type {Currency} from '../../../shared/currency'
import {getBudgetConstraints, getConfirmedBudgetForecast, saveBudgetConstraints} from '../api/budgetPlanningApi'
import type {BudgetCategoryConstraint, BudgetConstraintSet, BudgetForecastItem, BudgetFundingLevel, BudgetPlan, BudgetPriority} from '../api/budgetPlanningApi'
import {AddConstraintModal} from './AddConstraintModal'
import {RecurringConstraintModal} from './RecurringConstraintModal'
import './BudgetConstraintsStep.css'
import './BudgetConstraintsSelect.css'

type DraftConstraint = BudgetCategoryConstraint
const formatMoney = (value: number, currency: string, locale: string) => new Intl.NumberFormat(locale, {style: 'currency', currency, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0}).format(value)
const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 10_000) / 10_000
const categoryIcon = (icon?: string | null): IconName => {
    const supported: IconName[] = ['briefcase', 'cash', 'card', 'home', 'shopping-cart', 'transport', 'utensils', 'gift', 'heart', 'repeat', 'wallet', 'categories']
    return icon && supported.includes(icon as IconName) ? icon as IconName : 'wallet'
}
const fundingAmount = (category: DraftConstraint, level: BudgetFundingLevel) => category.fundingLevels.find((item) => item.level === level)?.amount ?? 0
const minimumAmount = (category: DraftConstraint) => category.allocationType === 'FIXED' ? category.requiredAmount : fundingAmount(category, 'MINIMUM')
const maximumAmount = (category: DraftConstraint) => category.allocationType === 'FIXED' ? category.requiredAmount : Math.max(...category.fundingLevels.map((item) => item.amount), 0)
const priorityIcon = (priority: BudgetPriority | null): IconName => priority === 'HIGH' ? 'trend-up' : priority === 'MEDIUM' ? 'gauge' : 'trend-up'

export function BudgetConstraintsStep({plan, currency, onBack, onSaved, onContinue}: {
    plan: BudgetPlan
    currency: Currency
    onBack: () => void
    onSaved: (constraints: BudgetConstraintSet) => void
    onContinue: () => void
}) {
    const {t} = useTranslation()
    const {locale} = useLanguage()
    const [constraints, setConstraints] = useState<BudgetConstraintSet | null>(null)
    const [categories, setCategories] = useState<DraftConstraint[]>([])
    const [savingsFloorAmount, setSavingsFloorAmount] = useState(0)
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [forecastItems, setForecastItems] = useState<BudgetForecastItem[]>([])
    const [forecastStatus, setForecastStatus] = useState<'loading' | 'ready' | 'error'>('loading')
    const [forecastPlanId, setForecastPlanId] = useState<string | null>(null)
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
    const [recurringSelections, setRecurringSelections] = useState<Record<string, string[]>>({})
    const [addCategoryOpen, setAddCategoryOpen] = useState(false)

    const load = useCallback(async (signal?: AbortSignal) => {
        try {
            const loaded = await getBudgetConstraints(plan.id, signal)
            if (signal?.aborted) return
            setConstraints(loaded)
            setCategories(loaded.categories)
            setSavingsFloorAmount(loaded.savingsFloorAmount)
            setError('')
            setStatus('ready')
        } catch (caught) {
            if (signal?.aborted || (caught instanceof Error && caught.name === 'AbortError')) return
            setError(caught instanceof Error ? caught.message : t('budgets.constraints.loadError'))
            setStatus('error')
        }
    }, [plan.id, t])

    useEffect(() => {
        const controller = new AbortController()
        getBudgetConstraints(plan.id, controller.signal).then((loaded) => {
            if (controller.signal.aborted) return
            setConstraints(loaded)
            setCategories(loaded.categories)
            setSavingsFloorAmount(loaded.savingsFloorAmount)
            setError('')
            setStatus('ready')
        }).catch((caught: unknown) => {
            if (controller.signal.aborted || (caught instanceof Error && caught.name === 'AbortError')) return
            setError(caught instanceof Error ? caught.message : t('budgets.constraints.loadError'))
            setStatus('error')
        })
        return () => controller.abort()
    }, [plan.id, t])

    useEffect(() => {
        const controller = new AbortController()
        getConfirmedBudgetForecast(plan.id, controller.signal).then((forecast) => {
            if (controller.signal.aborted) return
            setForecastItems(forecast?.items ?? [])
            setForecastPlanId(plan.id)
            setForecastStatus('ready')
        }).catch((caught: unknown) => {
            if (controller.signal.aborted || (caught instanceof Error && caught.name === 'AbortError')) return
            setForecastPlanId(plan.id)
            setForecastStatus('error')
        })
        return () => controller.abort()
    }, [plan.id])

    const retryForecast = async () => {
        setForecastStatus('loading')
        try {
            const forecast = await getConfirmedBudgetForecast(plan.id)
            setForecastItems(forecast?.items ?? [])
            setForecastPlanId(plan.id)
            setForecastStatus('ready')
        } catch {
            setForecastPlanId(plan.id)
            setForecastStatus('error')
        }
    }

    const updatePriority = (categoryId: string, priority: BudgetPriority) => setCategories((current) => current.map((category) => category.category.id === categoryId ? {...category, priority} : category))
    const updateConstraintRole = (categoryId: string, constraintRole: 'REQUIRED' | 'FLEXIBLE') => setCategories((current) => current.map((category) => {
        if (category.category.id !== categoryId || category.allocationType !== 'VARIABLE') return category
        return {
            ...category,
            constraintRole,
            priority: constraintRole === 'REQUIRED' ? 'HIGH' : category.priority,
            requiredAmount: constraintRole === 'REQUIRED' ? minimumAmount(category) : 0,
        }
    }))
    const updateMinimum = (categoryId: string, value: number) => setCategories((current) => current.map((category) => {
        if (category.category.id !== categoryId || category.allocationType !== 'VARIABLE') return category
        const amount = Math.max(0, value)
        return {
            ...category,
            requiredAmount: category.constraintRole === 'REQUIRED' ? amount : 0,
            fundingLevels: category.fundingLevels.map((level) => ({
                ...level,
                amount: level.level === 'MINIMUM' ? amount : Math.max(level.amount, amount),
            })),
        }
    }))
    const applyRecurringMinimum = (categoryId: string, amount: number, sourceKeys: string[]) => {
        setRecurringSelections((current) => ({...current, [categoryId]: sourceKeys}))
        setCategories((current) => current.map((category) => {
            if (category.category.id !== categoryId || category.allocationType !== 'VARIABLE') return category
            return {
                ...category,
                constraintRole: amount > 0 ? 'REQUIRED' : 'FLEXIBLE',
                priority: amount > 0 ? 'HIGH' : category.priority,
                requiredAmount: amount,
                fundingLevels: category.fundingLevels.map((level) => ({
                    ...level,
                    amount: level.level === 'MINIMUM' ? amount : Math.max(level.amount, amount),
                })),
            }
        }))
        setSelectedCategoryId(null)
    }
    const addCategory = (category: DraftConstraint) => {
        setCategories((current) => [...current, category].sort((left, right) => left.category.name.localeCompare(right.category.name, locale)))
        setAddCategoryOpen(false)
    }
    const removeManualCategory = (categoryId: string) => {
        setCategories((current) => current.filter((category) => category.category.id !== categoryId))
        setRecurringSelections((current) => {
            const next = {...current}
            delete next[categoryId]
            return next
        })
        if (selectedCategoryId === categoryId) setSelectedCategoryId(null)
    }

    const liveSummary = useMemo(() => {
        if (!constraints) return null
        const requiredAmount = categories.reduce((sum, category) => sum + category.requiredAmount, 0)
        const variableMinimumAmount = categories.filter((category) => category.allocationType === 'VARIABLE').reduce((sum, category) => sum + Math.max(0, fundingAmount(category, 'MINIMUM') - category.requiredAmount), 0)
        const forecastIncome = constraints.feasibility.forecastIncome
        const maximumAllocatable = Math.max(0, forecastIncome - savingsFloorAmount)
        const maximumSavingsAmount = roundMoney(forecastIncome - requiredAmount - variableMinimumAmount)
        const remainingAboveMinimums = roundMoney(maximumSavingsAmount - savingsFloorAmount)
        const shortfall = Math.max(0, roundMoney(-remainingAboveMinimums))
        return {
            requiredAmount,
            variableMinimumAmount,
            maximumAllocatable,
            maximumSavingsAmount,
            remainingAboveMinimums,
            shortfall,
            requiredFunded: forecastIncome >= requiredAmount,
            minimumsFit: maximumSavingsAmount >= 0,
            savingsReachable: shortfall === 0,
            feasible: shortfall === 0,
        }
    }, [categories, constraints, savingsFloorAmount])

    const save = async (advance: boolean) => {
        if (!constraints || saving) return false
        setSaving(true)
        setError('')
        try {
            const saved = await saveBudgetConstraints(plan.id, {
                expectedVersion: constraints.planVersion,
                forecastRevision: constraints.basedOnForecastRevision,
                savingsFloorAmount,
                categories: categories.map((category) => ({
                    categoryId: category.category.id,
                    allocationType: category.allocationType,
                    constraintRole: category.constraintRole,
                    requiredAmount: category.requiredAmount,
                    priority: category.priority,
                    fundingLevels: category.fundingLevels.map((level) => ({level: level.level, amount: level.amount})),
                })),
            })
            setConstraints(saved)
            setCategories(saved.categories)
            setSavingsFloorAmount(saved.savingsFloorAmount)
            onSaved(saved)
            if (advance && saved.status === 'CONFIRMED' && saved.feasibility.status === 'FEASIBLE') onContinue()
            return true
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : t('budgets.constraints.saveError'))
            return false
        } finally {
            setSaving(false)
        }
    }

    if (status === 'loading') return <div className="budget-state"><LoadingIndicator label={t('budgets.constraints.loading')} layout="panel" showLabel size="medium"/></div>
    if (status === 'error' || !constraints || !liveSummary) return <div className="budget-state error" role="alert">{error}<button type="button" onClick={() => {setStatus('loading'); setError(''); void load()}}>{t('budgets.tryAgain')}</button></div>

    const protectedCategories = categories.filter((category) => category.requiredAmount > 0)
    const selectedCategory = categories.find((category) => category.category.id === selectedCategoryId) ?? null
    const selectedRecurringItems = selectedCategory && forecastPlanId === plan.id ? forecastItems
        .filter((item) => item.sourceType === 'RECURRING' && item.operationType === 'EXPENSE' && item.category?.id === selectedCategory.category.id)
        .sort((left, right) => (left.expectedDate ?? '').localeCompare(right.expectedDate ?? '') || left.title.localeCompare(right.title)) : []
    const initialRecurringSelection = selectedCategory ? recurringSelections[selectedCategory.category.id] ?? (() => {
        const included = selectedRecurringItems.filter((item) => item.included)
        const recurringTotal = roundMoney(included.reduce((sum, item) => sum + item.effectiveAmount, 0))
        if (recurringTotal > 0 && recurringTotal === roundMoney(selectedCategory.requiredAmount)) return included.map((item) => item.sourceKey)
        return included.filter((item) => item.defaultConstraintRole === 'REQUIRED').map((item) => item.sourceKey)
    })() : []
    const feasible = liveSummary.feasible
    return <>
        {error && <div className="budget-action-error" role="alert">{error}</div>}
        <div className="constraints-layout"><div className="constraints-primary">
            <section className="forecast-summary constraints-summary-cards">
                <article><span className="green"><Icon name="cash"/></span><p>{t('budgets.planning.forecastIncome')}</p><strong>{formatMoney(constraints.feasibility.forecastIncome, currency, locale)}</strong><small>{t('budgets.constraints.confirmedForecast')}</small></article>
                <article><span className="blue"><Icon name="card"/></span><p>{t('budgets.constraints.requiredPayments')}</p><strong>{formatMoney(liveSummary.requiredAmount, currency, locale)}</strong><small>{t('budgets.constraints.recurringProtected', {count: protectedCategories.length})}</small></article>
                <article><span className="gold"><Icon name="piggy-bank"/></span><p>{t('budgets.constraints.minimumSavings')}</p><label className="constraints-savings-input"><span>{new Intl.NumberFormat(locale, {style: 'currency', currency, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0}).formatToParts(0).find((part) => part.type === 'currency')?.value}</span><input aria-label={t('budgets.constraints.minimumSavings')} type="number" min="0" step="100" value={savingsFloorAmount} onChange={(event) => setSavingsFloorAmount(Math.max(0, Number(event.target.value) || 0))}/></label><small>{t('budgets.constraints.savingsTargetRate', {value: constraints.feasibility.forecastIncome ? (savingsFloorAmount / constraints.feasibility.forecastIncome * 100).toFixed(1) : 0})}</small></article>
            </section>
            <section className="constraints-card"><header><div><h2>{t('budgets.constraints.categoryConstraints')}</h2><p>{t('budgets.constraints.categoryConstraintsDescription')}</p></div><button type="button" onClick={() => setAddCategoryOpen(true)}><Icon name="plus"/>{t('budgets.constraints.addCategory')}</button></header>
                <div className="constraints-table-head"><span>{t('budgets.constraints.category')}</span><span>{t('budgets.constraints.classification')}</span><span>{t('budgets.constraints.minimum')}</span><span>{t('budgets.constraints.priority')}</span><span>{t('budgets.constraints.fundingRange')}</span></div>
                <div className="constraints-list">{categories.map((category) => {
                    const fixed = category.allocationType === 'FIXED'
                    const manuallyAdded = category.sourceKeys.length === 0
                    const min = minimumAmount(category)
                    const max = maximumAmount(category)
                    return <article key={category.category.id}>
                        <button type="button" className="constraint-category" aria-label={t('budgets.constraints.recurringModal.open', {category: category.category.name})} onClick={() => setSelectedCategoryId(category.category.id)}><span style={{color: category.category.color}}><Icon name={categoryIcon(category.category.icon)}/></span><div><strong>{category.category.name}</strong><small>{manuallyAdded ? t('budgets.constraints.manualCategory') : fixed ? t('budgets.constraints.protectedRecurring') : category.constraintRole === 'REQUIRED' ? t('budgets.constraints.protectedMinimum') : t('budgets.constraints.flexibleHistory')}</small></div><Icon className="constraint-category-open" name="chevron-right"/></button>
                        {fixed ? <span className="constraint-classification fixed">{t('budgets.constraints.classificationFixed')} · {t('budgets.constraints.classificationRequired')}</span> : <div className={`constraint-classification-control ${category.constraintRole.toLowerCase()}`}><Icon name={category.constraintRole === 'REQUIRED' ? 'shield' : 'trend-up'}/><Select value={category.constraintRole} onValueChange={(value) => updateConstraintRole(category.category.id, value as 'REQUIRED' | 'FLEXIBLE')} className="constraint-classification-select" aria-label={`${category.category.name}: ${t('budgets.constraints.classification')}`}><SelectOption value="FLEXIBLE">{t('budgets.constraints.classificationFlexible')}</SelectOption><SelectOption value="REQUIRED">{t('budgets.constraints.classificationRequired')}</SelectOption></Select></div>}
                        <div className="constraint-minimum">{fixed ? <><strong>{formatMoney(min, currency, locale)}</strong><Icon name="lock"/></> : <label><span>{new Intl.NumberFormat(locale, {style: 'currency', currency, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0}).formatToParts(0).find((part) => part.type === 'currency')?.value}</span><input aria-label={`${category.category.name}: ${t(category.constraintRole === 'REQUIRED' ? 'budgets.constraints.protectedAmount' : 'budgets.constraints.minimum')}`} type="number" min="0" step="100" value={min} onChange={(event) => updateMinimum(category.category.id, Number(event.target.value) || 0)}/></label>}</div>
                        <div className="constraint-priority">{fixed ? <span className="critical"><Icon name="alert"/>{t('budgets.constraints.critical')}</span> : <div className={`constraint-priority-control ${(category.priority ?? 'LOW').toLowerCase()}`}><Icon name={priorityIcon(category.priority)}/><Select value={category.priority ?? 'LOW'} onValueChange={(value) => updatePriority(category.category.id, value as BudgetPriority)} className="constraint-priority-select" aria-label={`${category.category.name}: ${t('budgets.constraints.priority')}`}><SelectOption value="HIGH">{t('budgets.constraints.high')}</SelectOption><SelectOption value="MEDIUM">{t('budgets.constraints.medium')}</SelectOption><SelectOption value="LOW">{t('budgets.constraints.low')}</SelectOption></Select></div>}</div>
                        <span className="constraint-range constraint-range-group"><span>{fixed ? t('budgets.constraints.fixedAmount', {amount: formatMoney(min, currency, locale)}) : `${formatMoney(min, currency, locale)} – ${formatMoney(max, currency, locale)}`}</span>{manuallyAdded && <button type="button" className="constraint-remove" aria-label={t('budgets.constraints.removeCategory', {category: category.category.name})} title={t('budgets.constraints.removeCategory', {category: category.category.name})} onClick={() => removeManualCategory(category.category.id)}><Icon name="trash"/></button>}</span>
                    </article>
                })}</div>
            </section>
            <section className="allocation-levels-card"><header><h2>{t('budgets.constraints.allocationLevels')}</h2><p>{t('budgets.constraints.allocationLevelsDescription')}</p></header><div>
                <article><span className="blue"><Icon name="shield"/></span><div><strong>{t('budgets.constraints.levelMinimum')}</strong><small>{t('budgets.constraints.levelMinimumSubtitle')}</small><p>{t('budgets.constraints.levelMinimumDescription')}</p></div></article>
                <article><span className="blue"><Icon name="trend-up"/></span><div><strong>{t('budgets.constraints.levelBalanced')}</strong><small>{t('budgets.constraints.levelBalancedSubtitle')}</small><p>{t('budgets.constraints.levelBalancedDescription')}</p></div></article>
                <article><span className="gold"><Icon name="target"/></span><div><strong>{t('budgets.constraints.levelComfortable')}</strong><small>{t('budgets.constraints.levelComfortableSubtitle')}</small><p>{t('budgets.constraints.levelComfortableDescription')}</p></div></article>
            </div></section>
        </div><aside className="constraints-insights">
            <section className="constraint-summary-card"><header><Icon name="gauge"/><h2>{t('budgets.constraints.summary')}</h2></header><dl><div><dt>{t('budgets.constraints.requiredLocked')}</dt><dd>{formatMoney(liveSummary.requiredAmount, currency, locale)}</dd></div><div><dt>{t('budgets.constraints.variableMinimums')}</dt><dd>{formatMoney(liveSummary.variableMinimumAmount, currency, locale)}</dd></div><div><dt>{t('budgets.constraints.savingsFloor')}</dt><dd>{formatMoney(savingsFloorAmount, currency, locale)}</dd></div><div className="strong"><dt>{t('budgets.constraints.maximumAllocatable')}</dt><dd>{formatMoney(liveSummary.maximumAllocatable, currency, locale)}</dd></div></dl><p>{t('budgets.constraints.maximumAllocatableHint')}</p></section>
            <section className={`feasibility-card ${feasible ? 'feasible' : 'infeasible'}`}><header><div><Icon name={feasible ? 'check-circle' : 'alert'}/><h2>{t('budgets.constraints.feasibility')}</h2></div><span className={feasible ? 'feasible' : 'infeasible'}>{feasible ? t('budgets.constraints.feasible') : t('budgets.constraints.infeasible')}</span></header><ul><li className={liveSummary.requiredFunded ? 'pass' : 'fail'}><Icon name={liveSummary.requiredFunded ? 'check-circle' : 'alert'}/>{liveSummary.requiredFunded ? t('budgets.constraints.requiredFunded') : t('budgets.constraints.requiredNotFunded')}</li><li className={liveSummary.minimumsFit ? 'pass' : 'fail'}><Icon name={liveSummary.minimumsFit ? 'check-circle' : 'alert'}/>{liveSummary.minimumsFit ? t('budgets.constraints.minimumFits') : t('budgets.constraints.minimumsExceedIncome')}</li><li className={liveSummary.savingsReachable ? 'pass' : 'fail'}><Icon name={liveSummary.savingsReachable ? 'check-circle' : 'alert'}/>{liveSummary.savingsReachable ? t('budgets.constraints.savingsReachable') : t('budgets.constraints.savingsNotReachable')}</li><li className={feasible ? 'pass' : 'fail'}><Icon name={feasible ? 'check-circle' : 'alert'}/>{feasible ? t('budgets.constraints.remainingAboveMinimums', {amount: formatMoney(liveSummary.remainingAboveMinimums, currency, locale)}) : t('budgets.constraints.minimumShortfall', {amount: formatMoney(liveSummary.shortfall, currency, locale)})}</li></ul>{!feasible && <div className="feasibility-violations"><p>{t('budgets.constraints.minimumAllocationViolation', {amount: formatMoney(liveSummary.shortfall, currency, locale)})}</p></div>}<footer>{t('budgets.constraints.basedOnIncome', {amount: formatMoney(constraints.feasibility.forecastIncome, currency, locale)})}<br/>{feasible ? t('budgets.constraints.canProceed') : t('budgets.constraints.resolveBeforeProceeding')}</footer></section>
            <section className="recurring-protection-card"><header><Icon name="shield"/><h2>{t('budgets.constraints.recurringProtection')}</h2></header>{protectedCategories.map((category) => <div key={category.category.id}><span>{category.category.name}</span><strong>{formatMoney(category.requiredAmount, currency, locale)}</strong></div>)}<p>{t('budgets.constraints.recurringProtectionHint')}</p></section>
        </aside></div>
        <footer className="constraints-footer"><button type="button" className="secondary back" onClick={onBack}><Icon name="arrow-down-left"/>{t('budgets.constraints.back')}</button><div/><button type="button" className="secondary" disabled={saving} onClick={() => void save(false)}>{saving ? t('budgets.constraints.saving') : t('budgets.planning.saveDraft')}</button><button type="button" className="primary" disabled={saving || !feasible} onClick={() => void save(true)}>{t('budgets.constraints.continue')}<Icon name="arrow-right"/></button></footer>
        {selectedCategory && <RecurringConstraintModal
            key={selectedCategory.category.id}
            category={selectedCategory}
            currency={currency}
            initialSelectedSourceKeys={initialRecurringSelection}
            items={selectedRecurringItems}
            locale={locale}
            month={plan.month}
            status={forecastPlanId === plan.id ? forecastStatus : 'loading'}
            onApply={selectedCategory.allocationType === 'VARIABLE' ? (amount, sourceKeys) => applyRecurringMinimum(selectedCategory.category.id, amount, sourceKeys) : null}
            onClose={() => setSelectedCategoryId(null)}
            onRetry={() => void retryForecast()}
        />}
        {addCategoryOpen && <AddConstraintModal
            currency={currency}
            existingCategoryIds={categories.map((category) => category.category.id)}
            locale={locale}
            onAdd={addCategory}
            onClose={() => setAddCategoryOpen(false)}
        />}
    </>
}
