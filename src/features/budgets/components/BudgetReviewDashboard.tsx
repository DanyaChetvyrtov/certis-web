import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {Icon} from '../../../components/Icons'
import type {IconName} from '../../../components/Icons'
import {LoadingIndicator} from '../../../components/LoadingIndicator'
import {useLanguage} from '../../../i18n/useLanguage'
import {ApiError} from '../../../shared/api/ApiError'
import type {Currency} from '../../../shared/currency'
import {getConfirmedBudgetForecast} from '../api/budgetPlanningApi'
import type {BudgetForecast, BudgetForecastItem, BudgetPlan} from '../api/budgetPlanningApi'
import {applyBudgetOptimization, dismissBudgetOptimization, getBudgetOptimization, getBudgetPlan, getLatestBudgetOptimization} from '../api/budgetOptimizationApi'
import type {BudgetOptimizationApplyResponse, BudgetOptimizationRun} from '../api/budgetOptimizationApi'
import './BudgetOptimizeStep.css'
import './BudgetReviewStep.css'
import './BudgetReviewDashboard.css'

const en = {
    title: 'Review your budget', subtitle: 'Review the proposed category limits before applying them to your monthly budget.',
    loading: 'Loading the saved optimization', loadError: 'Could not load the optimization.', retry: 'Try again', back: 'Back to Optimize', editForecast: 'Edit forecast', editConstraints: 'Edit constraints', rerun: 'Run optimization',
    noRun: 'There is no generated optimization to review. Return to Optimize and generate one.', stale: 'This result is no longer current. Return to Optimize and generate a new allocation.', infeasible: 'This result is infeasible. Adjust your target or constraints and generate again.', dismissed: 'This proposal was dismissed. Generate another allocation to continue.', changed: 'Another optimization replaced this proposal. Return to Optimize to review the latest result.', unavailable: 'The current plan does not allow applying this proposal.',
    income: 'Forecast income', incomeHint: 'Confirmed monthly forecast', required: 'Mandatory payments', requiredHint: 'Protected required allocation', floor: 'Minimum savings', floorHint: 'Confirmed savings floor',
    allocation: 'Recommended allocation', allocationHelp: 'Current category limits compared with the server-optimized budget.', calculation: 'View calculation', hideCalculation: 'Hide calculation', all: 'All', requiredFilter: 'Required', flexibleFilter: 'Flexible', categories: 'categories', category: 'Category', constraint: 'Constraint', current: 'Current', recommended: 'Recommended', change: 'Change', total: 'Total allocation', noCategories: 'No categories in this group.', protected: 'Protected', fixed: 'Fixed', variable: 'Variable', requiredRole: 'Required', flexibleRole: 'Flexible', minimum: 'Minimum', balanced: 'Balanced', comfortable: 'Comfortable', currentLevel: 'Selected funding level',
    target: 'Savings target', actual: 'Optimized savings', savingsFloor: 'Savings floor', capacity: 'Flexible capacity', unused: 'Unused capacity', coverage: 'Priority-weighted coverage', algorithm: 'Algorithm', generated: 'Generated',
    recurring: 'Recurring commitments', recurringHelp: 'Included operations in the confirmed forecast.', recurringIncome: 'Recurring income', recurringExpense: 'Required expense', recurringOther: 'Recurring expense', recurringEmpty: 'No recurring operations in the confirmed forecast.', recurringUnavailable: 'Confirmed recurring details are unavailable.', recurringMore: 'More recurring operations', recurringLink: 'Review recurring', recurringNote: 'Applying a budget changes limits only; recurring operations remain unchanged.',
    optimization: 'Optimization result', savingDelta: 'Savings change vs current limits', flexibleAdjusted: 'Flexible categories adjusted', actualLabel: 'Actual savings', unusedLabel: 'Unallocated capacity',
    checks: 'Constraints satisfied', checksFailed: 'Constraint checks', checksEmpty: 'The optimization did not return constraint checks.', requiredCheck: 'Required payments fully funded', savingsCheck: 'Savings target reached', capacityCheck: 'Allocation within capacity', allChecks: 'All returned checks passed', violations: 'Constraint violations', shortfall: 'Shortfall',
    changes: 'Spending changes to watch', changesHelp: 'Largest reductions in category limits; this is not a spending forecast.', changesEmpty: 'No category limits are being reduced.', reduction: 'Limit reduced by',
    basis: 'Forecast basis', basisHelp: 'Amounts from the confirmed forecast. A month-by-month history chart needs a separate API series.', basisUnavailable: 'Confirmed forecast details are unavailable.', sourceIncome: 'Recurring income', sourceExpenses: 'Recurring expenses', sourceFlexible: 'Flexible estimate', trendSoon: 'Monthly history chart coming soon',
    keep: 'Keep as draft', keepHint: 'This generated proposal is already saved on the server.', apply: 'Apply budget', applying: 'Applying…', dismiss: 'Dismiss proposal', dismissing: 'Dismissing…', confirmation: 'Apply this budget?', confirmHelp: 'The monthly category limits shown above will replace the current limits. Transactions and recurring templates will not change.', confirmApply: 'Yes, apply budget', confirmDismiss: 'Dismiss this proposal?', confirmDismissHelp: 'This saved recommendation will be dismissed. You can generate a new one from Optimize.', confirmDiscard: 'Dismiss proposal', cancel: 'Cancel', applied: 'Budget applied', appliedHelp: 'Recommended category limits were saved to your monthly budget.', budgetId: 'Budget', viewDashboard: 'Go to dashboard', alreadyApplied: 'This optimization has already been applied.', conflict: 'The plan changed while you were reviewing it. Reload the latest optimization before applying.',
}
type Copy = {[Key in keyof typeof en]: string}
const ru: Copy = {
    title: 'Проверка бюджета', subtitle: 'Проверьте рекомендуемые лимиты категорий перед применением месячного бюджета.',
    loading: 'Загружаем сохранённую оптимизацию', loadError: 'Не удалось загрузить оптимизацию.', retry: 'Повторить', back: 'Назад к Optimize', editForecast: 'Изменить прогноз', editConstraints: 'Изменить ограничения', rerun: 'Запустить оптимизацию',
    noRun: 'Пока нет рассчитанного варианта. Вернитесь в Optimize и запустите оптимизацию.', stale: 'Расчёт устарел. Вернитесь в Optimize и пересчитайте распределение.', infeasible: 'Вариант невыполним. Измените цель или ограничения и пересчитайте.', dismissed: 'Предложение отклонено. Создайте новый расчёт.', changed: 'Это предложение заменено другим расчётом. Вернитесь в Optimize за актуальным результатом.', unavailable: 'Текущее состояние плана не позволяет применить предложение.',
    income: 'Прогноз дохода', incomeHint: 'Подтверждённый прогноз на месяц', required: 'Обязательные платежи', requiredHint: 'Защищённые обязательные суммы', floor: 'Минимальные накопления', floorHint: 'Подтверждённый минимум',
    allocation: 'Рекомендуемое распределение', allocationHelp: 'Текущие лимиты категорий в сравнении с результатом оптимизации на сервере.', calculation: 'Посмотреть расчёт', hideCalculation: 'Скрыть расчёт', all: 'Все', requiredFilter: 'Обязательные', flexibleFilter: 'Гибкие', categories: 'категорий', category: 'Категория', constraint: 'Ограничение', current: 'Сейчас', recommended: 'Рекомендовано', change: 'Изменение', total: 'Общее распределение', noCategories: 'В этой группе нет категорий.', protected: 'Защищено', fixed: 'Фиксированная', variable: 'Гибкая', requiredRole: 'Обязательная', flexibleRole: 'Гибкая', minimum: 'Минимум', balanced: 'Сбалансированный', comfortable: 'Комфортный', currentLevel: 'Выбранный уровень финансирования',
    target: 'Цель накоплений', actual: 'Накопления по расчёту', savingsFloor: 'Минимальные накопления', capacity: 'Бюджет для гибких категорий', unused: 'Неиспользованный остаток', coverage: 'Покрытие с учётом приоритетов', algorithm: 'Алгоритм', generated: 'Дата расчёта',
    recurring: 'Регулярные обязательства', recurringHelp: 'Включённые операции подтверждённого прогноза.', recurringIncome: 'Регулярный доход', recurringExpense: 'Обязательный расход', recurringOther: 'Регулярный расход', recurringEmpty: 'В подтверждённом прогнозе нет регулярных операций.', recurringUnavailable: 'Детали подтверждённых регулярных операций недоступны.', recurringMore: 'Других регулярных операций', recurringLink: 'К регулярным операциям', recurringNote: 'Применение бюджета меняет только лимиты: регулярные операции остаются без изменений.',
    optimization: 'Результат оптимизации', savingDelta: 'Изменение накоплений относительно текущих лимитов', flexibleAdjusted: 'Гибких категорий изменено', actualLabel: 'Фактические накопления', unusedLabel: 'Нераспределённый остаток',
    checks: 'Ограничения соблюдены', checksFailed: 'Проверки ограничений', checksEmpty: 'Алгоритм не вернул проверок ограничений.', requiredCheck: 'Обязательные платежи покрыты', savingsCheck: 'Цель накоплений достигнута', capacityCheck: 'Распределение в пределах бюджета', allChecks: 'Все возвращённые проверки пройдены', violations: 'Нарушения ограничений', shortfall: 'Недостаток',
    changes: 'Изменения расходов', changesHelp: 'Наибольшие сокращения лимитов; это не прогноз фактических трат.', changesEmpty: 'В предложении нет сокращений лимитов.', reduction: 'Лимит снижен на',
    basis: 'Основа прогноза', basisHelp: 'Суммы из подтверждённого прогноза. Для помесячного графика нужен отдельный временной ряд API.', basisUnavailable: 'Данные подтверждённого прогноза недоступны.', sourceIncome: 'Регулярные доходы', sourceExpenses: 'Регулярные расходы', sourceFlexible: 'Оценка гибких расходов', trendSoon: 'Помесячный график появится позже',
    keep: 'Оставить черновиком', keepHint: 'Предложение уже сохранено на сервере.', apply: 'Применить бюджет', applying: 'Применяем…', dismiss: 'Отклонить предложение', dismissing: 'Отклоняем…', confirmation: 'Применить этот бюджет?', confirmHelp: 'Указанные лимиты заменят текущие лимиты категорий за месяц. Транзакции и шаблоны регулярных платежей не изменятся.', confirmApply: 'Да, применить бюджет', confirmDismiss: 'Отклонить предложение?', confirmDismissHelp: 'Сохранённая рекомендация будет отклонена. Новый расчёт можно запустить в Optimize.', confirmDiscard: 'Отклонить предложение', cancel: 'Отмена', applied: 'Бюджет применён', appliedHelp: 'Рекомендуемые лимиты категорий сохранены в месячном бюджете.', budgetId: 'Бюджет', viewDashboard: 'На дашборд', alreadyApplied: 'Этот расчёт уже применён.', conflict: 'План изменился во время проверки. Загрузите актуальный расчёт перед применением.',
}

const money = (value: number, currency: Currency, locale: string) => new Intl.NumberFormat(locale, {style: 'currency', currency, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0}).format(value)
const signedMoney = (value: number, currency: Currency, locale: string) => `${value > 0 ? '+' : ''}${money(value, currency, locale)}`
const checkName = (code: string, c: Copy) => code === 'REQUIRED_PAYMENTS_FUNDED' ? c.requiredCheck : code === 'SAVINGS_TARGET_REACHED' ? c.savingsCheck : code === 'ALLOCATION_WITHIN_CAPACITY' ? c.capacityCheck : code.replaceAll('_', ' ')
const categoryIcon = (icon?: string | null): IconName => {
    const names: IconName[] = ['briefcase', 'cash', 'card', 'home', 'shopping-cart', 'transport', 'utensils', 'gift', 'heart', 'repeat', 'wallet', 'categories', 'credit-card', 'bank', 'receipt']
    return icon && names.includes(icon as IconName) ? icon as IconName : 'wallet'
}
const formatLevel = (level: string | null, c: Copy) => level === 'MINIMUM' ? c.minimum : level === 'BALANCED' ? c.balanced : level === 'COMFORTABLE' ? c.comfortable : c.protected
const percentWidth = (amount: number, max: number) => max > 0 ? `${Math.min(100, Math.max(0, amount / max * 100))}%` : '0%'
const monthLabel = (month: string, locale: string) => new Intl.DateTimeFormat(locale, {month: 'long', year: 'numeric'}).format(new Date(`${month}-01T00:00:00`))

type Props = {
    plan: BudgetPlan
    currency: Currency
    optimizationId: string | null
    onBack: () => void
    onEditForecast: () => void
    onEditConstraints: () => void
    onDismissed: (planVersion: number) => void
    onApplied: (result: BudgetOptimizationApplyResponse) => void
}

type Filter = 'ALL' | 'REQUIRED' | 'FLEXIBLE'

export function BudgetReviewDashboard({plan, currency, optimizationId, onBack, onEditForecast, onEditConstraints, onDismissed, onApplied}: Props) {
    const {locale} = useLanguage()
    const c: Copy = locale.startsWith('ru') ? ru : en
    const [currentPlan, setCurrentPlan] = useState<BudgetPlan | null>(null)
    const [run, setRun] = useState<BudgetOptimizationRun | null>(null)
    const [forecast, setForecast] = useState<BudgetForecast | null>(null)
    const [applied, setApplied] = useState<BudgetOptimizationApplyResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState<'apply' | 'dismiss' | null>(null)
    const [confirm, setConfirm] = useState<'apply' | 'dismiss' | null>(null)
    const [error, setError] = useState('')
    const [filter, setFilter] = useState<Filter>('ALL')
    const [showCalculation, setShowCalculation] = useState(false)
    const command = useRef<{key: string; planVersion: number; runId: string} | null>(null)
    const actionLock = useRef(false)

    const load = useCallback(async (signal?: AbortSignal) => {
        try {
            // Reading latest also updates server-side staleness before we inspect a selected run.
            const latest = await getLatestBudgetOptimization(plan.id, signal)
            const [fresh, selected, confirmed] = await Promise.all([
                getBudgetPlan(plan.id, signal),
                optimizationId && latest?.id !== optimizationId ? getBudgetOptimization(plan.id, optimizationId, signal) : Promise.resolve(latest),
                getConfirmedBudgetForecast(plan.id, signal).catch(() => null),
            ])
            if (signal?.aborted) return
            setCurrentPlan(fresh)
            setRun(selected)
            setForecast(confirmed?.revision === selected?.input.forecastRevision ? confirmed : null)
            setError('')
        } catch (caught) {
            if (signal?.aborted || (caught instanceof Error && caught.name === 'AbortError')) return
            setError(caught instanceof Error ? caught.message : c.loadError)
        } finally {
            if (!signal?.aborted) setLoading(false)
        }
    }, [plan.id, optimizationId, c.loadError])

    useEffect(() => {
        const controller = new AbortController()
        void Promise.resolve().then(() => {if (!controller.signal.aborted) return load(controller.signal)})
        return () => controller.abort()
    }, [load])

    const selectedIsCurrent = run != null && currentPlan?.currentOptimization?.id === run.id
    const alreadyApplied = applied != null || (run?.status === 'APPLIED' && currentPlan?.status === 'APPLIED')
    const valid = run?.status === 'GENERATED' && run.result != null && selectedIsCurrent && currentPlan?.status === 'DRAFT' && currentPlan.capabilities.canApply && currentPlan.version === run.planVersion && currentPlan.forecast.status === 'CURRENT' && currentPlan.forecast.revision === run.input.forecastRevision && currentPlan.constraints.status === 'CONFIRMED' && currentPlan.constraints.revision === run.input.constraintsRevision && run.constraintChecks.length > 0 && run.constraintChecks.every((check) => check.satisfied) && run.violations.length === 0
    const result = run?.result
    const message = !run ? c.noRun : !selectedIsCurrent ? c.changed : run.status === 'STALE' ? c.stale : run.status === 'INFEASIBLE' ? c.infeasible : run.status === 'DISMISSED' ? c.dismissed : run.status === 'APPLIED' ? c.alreadyApplied : !valid ? c.unavailable : ''
    const retry = () => {setLoading(true); setError(''); void load()}

    const apply = async () => {
        if (!valid || !run || busy || actionLock.current) return
        actionLock.current = true
        setBusy('apply')
        setError('')
        try {
            const latest = await getLatestBudgetOptimization(plan.id)
            const fresh = await getBudgetPlan(plan.id)
            setCurrentPlan(fresh)
            setRun(latest)
            if (!latest || latest.id !== run.id || latest.status !== 'GENERATED' || fresh.status !== 'DRAFT' || !fresh.capabilities.canApply || fresh.currentOptimization?.id !== run.id || latest.planVersion !== fresh.version || latest.input.forecastRevision !== fresh.forecast.revision || latest.input.constraintsRevision !== fresh.constraints.revision || latest.constraintChecks.length === 0 || latest.constraintChecks.some((check) => !check.satisfied) || latest.violations.length > 0) {
                command.current = null
                setError(c.conflict)
                return
            }
            const previous = command.current
            const pending = previous?.runId === run.id && previous.planVersion === fresh.version ? previous : {key: crypto.randomUUID(), runId: run.id, planVersion: fresh.version}
            command.current = pending
            const response = await applyBudgetOptimization(plan.id, run.id, pending.planVersion, pending.key)
            command.current = null
            setApplied(response)
            setRun({...latest, status: 'APPLIED', appliedAt: response.plan.appliedAt})
            setCurrentPlan({...fresh, status: 'APPLIED', currentStep: 'APPLIED', version: response.plan.version, currentOptimization: {...fresh.currentOptimization!, status: 'APPLIED'}, capabilities: {...fresh.capabilities, canApply: false, canRunOptimization: false, canEditForecast: false, canEditConstraints: false}})
            setConfirm(null)
            onApplied(response)
        } catch (caught) {
            if (caught instanceof ApiError && (caught.status === 409 || caught.status === 412)) {
                command.current = null
                setError(c.conflict)
                try {await load()} catch { /* preserve the conflict message */ }
                setError(c.conflict)
            } else {
                // Keep the same idempotency key after an uncertain network response.
                setError(caught instanceof Error ? caught.message : c.loadError)
            }
        } finally {
            actionLock.current = false
            setBusy(null)
        }
    }

    const dismiss = async () => {
        if (!valid || !run || busy || actionLock.current) return
        actionLock.current = true
        setBusy('dismiss')
        setError('')
        try {
            const latest = await getLatestBudgetOptimization(plan.id)
            const fresh = await getBudgetPlan(plan.id)
            if (!latest || latest.id !== run.id || latest.status !== 'GENERATED' || fresh.currentOptimization?.id !== run.id || fresh.status !== 'DRAFT' || fresh.version !== latest.planVersion) {
                setRun(latest)
                setCurrentPlan(fresh)
                setError(c.conflict)
                return
            }
            const response = await dismissBudgetOptimization(plan.id, run.id, fresh.version)
            setConfirm(null)
            onDismissed(response.planVersion)
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : c.loadError)
        } finally {
            actionLock.current = false
            setBusy(null)
        }
    }

    const decisions = run?.decisions ?? []
    const visibleDecisions = decisions.filter((decision) => filter === 'ALL' || decision.constraintRole === filter)
    const currentTotal = decisions.reduce((sum, decision) => sum + decision.currentLimit, 0)
    const largestLimit = Math.max(1, ...decisions.flatMap((decision) => [decision.currentLimit, decision.recommendedLimit]))
    const reductions = useMemo(() => decisions.filter((decision) => decision.change < 0).sort((a, b) => a.change - b.change).slice(0, 3), [decisions])
    const recurring: BudgetForecastItem[] | null = forecast ? forecast.items.filter((item) => item.included && item.sourceType === 'RECURRING') : null
    const adjustableCount = decisions.filter((decision) => decision.allocationType === 'VARIABLE' && decision.change !== 0).length
    const allChecksPassed = run != null && run.constraintChecks.length > 0 && run.constraintChecks.every((check) => check.satisfied) && run.violations.length === 0

    if (loading) return <div className="budget-state"><LoadingIndicator label={c.loading} layout="panel" showLabel size="medium"/></div>
    if (!currentPlan || !run || !result) return <div className="review-step"><section className="optimize-card review-unavailable" role="status"><Icon name="alert"/><h2>{c.title}</h2><p>{error || message || c.noRun}</p><div className="review-actions"><button type="button" className="secondary" onClick={onBack}>{c.back}</button><button type="button" className="secondary" onClick={retry}>{c.retry}</button></div></section></div>

    return <div className="review-step review-dashboard">
        <div className="review-dash-toolbar"><div><h2>{c.title}</h2><p>{c.subtitle}</p></div><div className="review-dash-toolbar-actions"><button type="button" className="secondary" onClick={onEditForecast} disabled={busy != null || alreadyApplied}><Icon name="edit"/>{c.editForecast}</button><button type="button" className="secondary" onClick={onEditConstraints} disabled={busy != null || alreadyApplied}><Icon name="settings"/>{c.editConstraints}</button><button type="button" className="primary" onClick={onBack} disabled={busy != null || alreadyApplied}><Icon name="repeat"/>{c.rerun}</button></div></div>
        {alreadyApplied && <section className="review-applied" role="status"><Icon name="check-circle"/><div><h2>{c.applied}</h2><p>{c.appliedHelp}</p><small>{c.budgetId}: {applied?.budget.id ?? currentPlan.id}</small></div><a href="/dashboard">{c.viewDashboard}<Icon name="arrow-right"/></a></section>}
        {!alreadyApplied && !valid && <div className="budget-action-error" role="alert">{message || c.unavailable}</div>}
        {error && <div className="budget-action-error" role="alert">{error}</div>}
        <div className="review-dashboard-layout"><div className="review-dash-main">
            <div className="review-dash-summary" aria-label={c.title}>
                <article className="review-dash-metric"><span className="review-dash-icon income"><Icon name="cash"/></span><span className="review-dash-metric-label">{c.income}</span><strong>{money(run.input.forecastIncome, currency, locale)}</strong><small>{c.incomeHint}</small></article>
                <article className="review-dash-metric"><span className="review-dash-icon required"><Icon name="card"/></span><span className="review-dash-metric-label">{c.required}</span><strong>{money(result.requiredAllocation, currency, locale)}</strong><small>{c.requiredHint}</small></article>
                <article className="review-dash-metric"><span className="review-dash-icon savings"><Icon name="piggy-bank"/></span><span className="review-dash-metric-label">{c.floor}</span><strong>{money(run.input.savingsFloorAmount, currency, locale)}</strong><small>{c.floorHint}</small></article>
            </div>
            <section className="review-dash-card review-dash-allocation">
                <header className="review-dash-card-head"><div><h2>{c.allocation}</h2><p>{c.allocationHelp}</p></div><button type="button" className="review-dash-calculation" onClick={() => setShowCalculation((shown) => !shown)} aria-expanded={showCalculation}><Icon name="gauge"/>{showCalculation ? c.hideCalculation : c.calculation}</button></header>
                {showCalculation && <div className="review-dash-calculation-grid" role="region" aria-label={c.calculation}>
                    {([[c.target, run.input.targetSavingsAmount], [c.actual, result.actualSavings], [c.savingsFloor, run.input.savingsFloorAmount], [c.capacity, run.input.flexibleCapacity], [c.unused, result.unusedCapacity]] as [string, number][]).map(([label, value]) => <div key={label}><span>{label}</span><strong>{money(value, currency, locale)}</strong></div>)}
                    <div><span>{c.coverage}</span><strong>{new Intl.NumberFormat(locale, {style: 'percent', maximumFractionDigits: 1}).format(result.coverageScore)}</strong></div>
                    <div><span>{c.algorithm}</span><strong>{run.algorithmVersion}</strong></div><div><span>{c.generated}</span><strong>{new Intl.DateTimeFormat(locale, {dateStyle: 'medium'}).format(new Date(run.createdAt))}</strong></div>
                </div>}
                <div className="review-dash-filters" role="group" aria-label={c.constraint}>{(['ALL', 'REQUIRED', 'FLEXIBLE'] as const).map((value) => <button key={value} type="button" className={filter === value ? 'active' : ''} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === 'ALL' ? c.all : value === 'REQUIRED' ? c.requiredFilter : c.flexibleFilter}</button>)}<span>{decisions.length} {c.categories}</span></div>
                <div className="review-dash-table-head review-dash-row" aria-hidden="true"><span>{c.category}</span><span>{c.constraint}</span><span>{c.current}</span><span>{c.recommended}</span><span>{c.change}</span></div>
                <div className="review-dash-rows">{visibleDecisions.map((decision) => <article className="review-dash-row" key={decision.category.id}>
                    <div className="review-dash-category"><span className="review-dash-category-icon" style={{color: decision.category.color}}><Icon name={categoryIcon(decision.category.icon)}/></span><div><strong>{decision.category.name}</strong><small title={c.currentLevel}>{decision.allocationType === 'FIXED' ? c.protected : `${c.currentLevel}: ${formatLevel(decision.selectedLevel, c)}`}</small></div></div>
                    <div className="review-dash-constraint"><span className={`review-dash-constraint-pill ${decision.allocationType.toLowerCase()}`}>{decision.allocationType === 'FIXED' ? c.fixed : c.variable} · {decision.constraintRole === 'REQUIRED' ? c.requiredRole : c.flexibleRole}</span></div>
                    <div className="review-dash-value" data-label={c.current}><strong>{money(decision.currentLimit, currency, locale)}</strong><div className="review-dash-track"><span className="review-dash-current-bar" style={{width: percentWidth(decision.currentLimit, largestLimit)}}/></div></div>
                    <div className="review-dash-value" data-label={c.recommended}><strong>{money(decision.recommendedLimit, currency, locale)}</strong><div className="review-dash-track"><span className="review-dash-recommended-bar" style={{width: percentWidth(decision.recommendedLimit, largestLimit)}}/></div></div>
                    <div className={`review-dash-delta ${decision.change < 0 ? 'reduction' : decision.change > 0 ? 'increase' : 'unchanged'}`} data-label={c.change}>{decision.change === 0 ? '—' : signedMoney(decision.change, currency, locale)}{decision.allocationType === 'FIXED' && <small>{c.protected}</small>}</div>
                </article>)}{visibleDecisions.length === 0 && <p className="review-dash-empty">{c.noCategories}</p>}</div>
                <div className="review-dash-row review-dash-total"><strong>{c.total}</strong><span/><strong>{money(currentTotal, currency, locale)}</strong><strong>{money(result.totalAllocation, currency, locale)}</strong><strong className={result.totalAllocation - currentTotal < 0 ? 'reduction' : ''}>{signedMoney(result.totalAllocation - currentTotal, currency, locale)}</strong></div>
            </section>
            <section className="review-dash-card review-dash-basis"><header><h2>{c.basis}</h2><p>{c.basisHelp}</p></header>{forecast ? <div className="review-dash-basis-bars">{([[c.sourceIncome, forecast.summary.recurringIncome ?? 0, 'income'], [c.sourceExpenses, forecast.summary.recurringExpenses, 'expenses'], [c.sourceFlexible, forecast.summary.flexibleEstimate, 'flexible']] as [string, number, string][]).map(([label, amount, tone]) => <div className="review-dash-basis-item" key={tone}><span>{label}</span><strong>{money(amount, currency, locale)}</strong><div className="review-dash-track"><i className={tone} style={{width: percentWidth(amount, Math.max(1, run.input.forecastIncome, forecast.summary.forecastExpenses))}}/></div></div>)}</div> : <p>{c.basisUnavailable}</p>}<small className="review-dash-basis-note">{c.trendSoon}</small></section>
        </div><aside className="review-dash-aside">
            <section className="review-dash-card review-dash-recurring"><header><span className="review-dash-icon savings"><Icon name="repeat"/></span><h2>{c.recurring}</h2></header><p>{c.recurringHelp}</p>{recurring == null ? <p>{c.recurringUnavailable}</p> : recurring.length === 0 ? <p>{c.recurringEmpty}</p> : <><div className="review-dash-recurring-list">{recurring.slice(0, 6).map((item) => <div key={item.sourceKey}><strong title={item.title}>{item.title}</strong><span className={item.operationType === 'INCOME' ? 'income' : ''}>{item.operationType === 'INCOME' ? '+' : '−'}{money(item.effectiveAmount, currency, locale)}</span><small>{item.operationType === 'INCOME' ? c.recurringIncome : item.defaultConstraintRole === 'REQUIRED' ? c.recurringExpense : c.recurringOther}</small></div>)}</div>{recurring.length > 6 && <small>{c.recurringMore}: {recurring.length - 6}</small>}</>}<a href="/transactions">{c.recurringLink}<Icon name="arrow-right"/></a><small className="review-dash-recurring-note">{c.recurringNote}</small></section>
            <section className="review-dash-card review-dash-outcome"><header><span className="review-dash-icon income"><Icon name="trend-up"/></span><h2>{c.optimization}</h2></header><strong className={result.additionalSavingsComparedWithCurrent < 0 ? 'negative' : 'positive'}>{signedMoney(result.additionalSavingsComparedWithCurrent, currency, locale)}</strong><p>{c.savingDelta}</p><p>{c.actualLabel}: <b>{money(result.actualSavings, currency, locale)}</b></p><p>{c.flexibleAdjusted}: <b>{adjustableCount}</b></p><p>{c.unusedLabel}: <b>{money(result.unusedCapacity, currency, locale)}</b></p></section>
            <section className="review-dash-card review-dash-checks"><header><span className="review-dash-icon income"><Icon name={allChecksPassed ? 'check-circle' : 'alert'}/></span><h2>{allChecksPassed ? c.checks : c.checksFailed}</h2></header>{run.constraintChecks.length ? <ul>{run.constraintChecks.map((check) => <li key={check.code} className={check.satisfied ? 'passed' : 'failed'} title={`${money(check.actual, currency, locale)} / ${money(check.required, currency, locale)}`}><Icon name={check.satisfied ? 'check-circle' : 'alert'}/><span>{checkName(check.code, c)}</span></li>)}</ul> : <p>{c.checksEmpty}</p>}{run.violations.length > 0 && <div className="review-violations"><strong>{c.violations}</strong>{run.violations.map((violation, index) => <p key={`${violation.code}-${index}`}>{violation.code.replaceAll('_', ' ')}{violation.shortfall != null ? ` · ${c.shortfall}: ${money(violation.shortfall, currency, locale)}` : ''}</p>)}</div>}</section>
            <section className="review-dash-card review-dash-changes"><header><span className="review-dash-icon warning"><Icon name="alert"/></span><h2>{c.changes}</h2></header><p>{c.changesHelp}</p>{reductions.length ? <ul>{reductions.map((decision) => <li key={decision.category.id}><span className="review-dash-warning-dot"/><span><strong>{decision.category.name}</strong>: {c.reduction} {money(-decision.change, currency, locale)}</span></li>)}</ul> : <p>{c.changesEmpty}</p>}</section>
            <div className="review-dash-actions"><button type="button" className="secondary" onClick={onBack} disabled={busy != null}>{c.keep}</button><button type="button" className="primary" onClick={() => setConfirm('apply')} disabled={!valid || busy != null}><Icon name="check-circle"/>{busy === 'apply' ? c.applying : `${c.apply} · ${monthLabel(plan.month, locale)}`}</button></div><small className="review-dash-action-note">{c.keepHint}</small><button type="button" className="review-dash-dismiss" onClick={() => setConfirm('dismiss')} disabled={!valid || busy != null}>{c.dismiss}</button>
        </aside></div>
        {confirm && <div className="review-dialog-backdrop" role="presentation" onMouseDown={() => {if (!busy) setConfirm(null)}}><section className="review-dialog optimize-card" role="dialog" aria-modal="true" aria-labelledby="review-confirm-title" onMouseDown={(event) => event.stopPropagation()}><header><Icon name={confirm === 'apply' ? 'check-circle' : 'alert'}/><h2 id="review-confirm-title">{confirm === 'apply' ? c.confirmation : c.confirmDismiss}</h2></header><p>{confirm === 'apply' ? c.confirmHelp : c.confirmDismissHelp}</p><div className="review-dialog-actions"><button type="button" className="secondary" disabled={busy != null} onClick={() => setConfirm(null)}>{c.cancel}</button><button type="button" className={confirm === 'apply' ? 'primary' : 'review-dismiss'} disabled={busy != null} onClick={() => void (confirm === 'apply' ? apply() : dismiss())}>{busy === 'apply' ? c.applying : busy === 'dismiss' ? c.dismissing : confirm === 'apply' ? c.confirmApply : c.confirmDiscard}</button></div></section></div>}
    </div>
}
