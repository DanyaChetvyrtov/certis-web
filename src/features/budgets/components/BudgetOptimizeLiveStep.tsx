import {useCallback, useEffect, useRef, useState} from 'react'
import type {CSSProperties} from 'react'
import {Icon} from '../../../components/Icons'
import {LoadingIndicator} from '../../../components/LoadingIndicator'
import type {IconName} from '../../../components/Icons'
import {useLanguage} from '../../../i18n/useLanguage'
import type {Currency} from '../../../shared/currency'
import {getBudgetConstraints} from '../api/budgetPlanningApi'
import type {BudgetCategoryConstraint, BudgetConstraintSet, BudgetPlan, BudgetPlanningViolation} from '../api/budgetPlanningApi'
import {generateBudgetOptimization, getBudgetPlan, getLatestBudgetOptimization} from '../api/budgetOptimizationApi'
import type {BudgetOptimizationRun, GenerateBudgetOptimizationRequest} from '../api/budgetOptimizationApi'
import './BudgetOptimizeStep.css'
import './BudgetOptimizeControls.css'
import './BudgetOptimizeLiveStep.css'

const translations = {
    en: {
        loading: 'Loading confirmed constraints and optimization', loadError: 'Could not load optimization data.', retry: 'Try again', back: 'Back to constraints',
        income: 'Forecast income', protected: 'Protected payments', capacity: 'Flexible capacity', confirmed: 'From confirmed constraints', atTarget: 'At the selected savings target',
        target: 'Savings target', targetHelp: 'Choose a savings goal, then generate an allocation for the remaining spending capacity.', selected: 'Selected savings target', floor: 'Minimum savings', max: 'Maximum possible savings', targetNote: 'Moving the slider updates capacity. Generate optimization to calculate new funding levels.',
        objective: 'Optimization objective', objectiveTitle: 'Maximize priority-weighted spending coverage', objectiveHelp: 'Choose one funding level per flexible category while preserving required payments and the savings target.', weights: 'High × 3 · Medium × 2 · Low × 1',
        options: 'Allocation options', optionsHelp: 'These confirmed funding levels are inputs, not the optimizer’s recommendations.', category: 'Category', priority: 'Priority', minimum: 'Minimum', balanced: 'Balanced', comfortable: 'Comfortable', fixed: 'Required · fixed', flexible: 'Flexible', high: 'High', medium: 'Medium', low: 'Low', empty: 'No categories to optimize.',
        results: 'Recommended allocation', resultsHelp: 'The server chose the funding levels shown below.', selectedLevel: 'Selected level', current: 'Current limit', recommended: 'Recommended limit', change: 'Change', fixedLevel: 'Protected',
        beforeAfter: 'Before and after', currentTotal: 'Current category limits', newTotal: 'Recommended category limits', targetSavings: 'Savings target', actualSavings: 'Actual savings', extraSavings: 'Change in savings vs. current limits', unused: 'Unused capacity', coverage: 'Weighted coverage',
        checks: 'Optimization checks', checksHelp: 'Checks and violations returned by the server.', satisfied: 'Passed', failed: 'Failed',
        readiness: 'Constraints readiness', ready: 'Confirmed constraints are ready for optimization.', blocked: 'Confirm feasible constraints and a current forecast first.', feasible: 'Feasible', notReady: 'Not ready',
        generate: 'Generate optimization', generating: 'Generating…', regenerate: 'Regenerate optimization', review: 'Continue to review', reviewUnavailable: 'Generate a current, feasible optimization to proceed.',
        noRun: 'Generate an optimization to see recommendations, savings, and checks.', changed: 'The savings target has changed. Generate again to see recommendations for this target.',
        stale: 'This optimization is no longer current. Generate a new result.', dismissed: 'This optimization was dismissed. Generate a new result.', infeasible: 'The selected savings target is not feasible with these funding levels.', invalid: 'The plan or constraints changed. Review the latest data before retrying.',
        requiredCheck: 'Required payments funded', savingsCheck: 'Savings target reached', capacityCheck: 'Allocation within capacity', shortfall: 'Shortfall', actual: 'Actual', requiredAmount: 'Required',
    },
    ru: {
        loading: 'Загружаем ограничения и оптимизацию', loadError: 'Не удалось загрузить данные оптимизации.', retry: 'Повторить', back: 'Назад к ограничениям',
        income: 'Прогноз дохода', protected: 'Защищённые платежи', capacity: 'Доступно на гибкие расходы', confirmed: 'По подтверждённым ограничениям', atTarget: 'При выбранной цели накоплений',
        target: 'Цель накоплений', targetHelp: 'Выберите цель накоплений и запустите расчёт распределения оставшегося бюджета.', selected: 'Выбранная цель накоплений', floor: 'Минимальные накопления', max: 'Максимально возможные накопления', targetNote: 'Ползунок меняет доступную сумму. Для новых уровней финансирования запустите оптимизацию.',
        objective: 'Цель оптимизации', objectiveTitle: 'Максимизировать покрытие расходов с учётом приоритетов', objectiveHelp: 'Выбрать один уровень для каждой гибкой категории, сохранив обязательные платежи и цель накоплений.', weights: 'Высокий × 3 · Средний × 2 · Низкий × 1',
        options: 'Варианты распределения', optionsHelp: 'Это подтверждённые варианты финансирования, а не рекомендации оптимизатора.', category: 'Категория', priority: 'Приоритет', minimum: 'Минимум', balanced: 'Сбалансированный', comfortable: 'Комфортный', fixed: 'Обязательная · фиксированная', flexible: 'Гибкая', high: 'Высокий', medium: 'Средний', low: 'Низкий', empty: 'Нет категорий для оптимизации.',
        results: 'Рекомендуемое распределение', resultsHelp: 'Выбранные сервером уровни финансирования.', selectedLevel: 'Выбранный уровень', current: 'Текущий лимит', recommended: 'Рекомендуемый лимит', change: 'Изменение', fixedLevel: 'Защищено',
        beforeAfter: 'До и после', currentTotal: 'Текущие лимиты категорий', newTotal: 'Рекомендуемые лимиты', targetSavings: 'Цель накоплений', actualSavings: 'Фактические накопления', extraSavings: 'Изменение накоплений относительно текущих лимитов', unused: 'Неиспользованный остаток', coverage: 'Взвешенное покрытие',
        checks: 'Проверки оптимизации', checksHelp: 'Проверки и нарушения, полученные от сервера.', satisfied: 'Пройдено', failed: 'Не пройдено',
        readiness: 'Готовность ограничений', ready: 'Подтверждённые ограничения готовы к оптимизации.', blocked: 'Сначала подтвердите выполнимые ограничения и актуальный прогноз.', feasible: 'Выполнимо', notReady: 'Не готово',
        generate: 'Запустить оптимизацию', generating: 'Рассчитываем…', regenerate: 'Пересчитать оптимизацию', review: 'Перейти к проверке', reviewUnavailable: 'Для перехода требуется актуальный выполнимый расчёт.',
        noRun: 'Запустите оптимизацию, чтобы увидеть рекомендации, накопления и проверки.', changed: 'Цель накоплений изменилась. Запустите расчёт повторно для новой цели.',
        stale: 'Оптимизация устарела. Запустите расчёт заново.', dismissed: 'Оптимизация отклонена. Запустите новый расчёт.', infeasible: 'При выбранной цели накоплений не удаётся обеспечить минимальное финансирование.', invalid: 'План или ограничения изменились. Проверьте актуальные данные перед повторным запуском.',
        requiredCheck: 'Обязательные платежи покрыты', savingsCheck: 'Цель накоплений достигнута', capacityCheck: 'Распределение в пределах бюджета', shortfall: 'Недостаток', actual: 'Фактически', requiredAmount: 'Требуется',
    },
} as const

type Copy = typeof translations.en | typeof translations.ru
const money = (amount: number, currency: Currency, locale: string) =>
    new Intl.NumberFormat(locale, {style: 'currency', currency, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0}).format(amount)
const iconName = (icon?: string | null): IconName => {
    const supported: IconName[] = ['briefcase', 'cash', 'card', 'home', 'shopping-cart', 'transport', 'utensils', 'gift', 'heart', 'repeat', 'wallet', 'categories']
    return icon && supported.includes(icon as IconName) ? icon as IconName : 'wallet'
}
const levelAmount = (category: BudgetCategoryConstraint, level: 'MINIMUM' | 'BALANCED' | 'COMFORTABLE') =>
    category.fundingLevels.find((option) => option.level === level)?.amount
const labelLevel = (level: string | null, c: Copy) => level === 'MINIMUM' ? c.minimum : level === 'BALANCED' ? c.balanced : level === 'COMFORTABLE' ? c.comfortable : c.fixedLevel
const labelCheck = (code: string, c: Copy) => code === 'REQUIRED_PAYMENTS_FUNDED' ? c.requiredCheck : code === 'SAVINGS_TARGET_REACHED' ? c.savingsCheck : code === 'ALLOCATION_WITHIN_CAPACITY' ? c.capacityCheck : code.replaceAll('_', ' ')
const round4 = (value: number) => Math.round(value * 10000) / 10000

export function BudgetOptimizeLiveStep({plan, currency, onBack, onReview}: {plan: BudgetPlan; currency: Currency; onBack: () => void; onReview: (optimizationId: string) => void}) {
    const {locale} = useLanguage()
    const c: Copy = locale.startsWith('ru') ? translations.ru : translations.en
    const [currentPlan, setCurrentPlan] = useState(plan)
    const [constraints, setConstraints] = useState<BudgetConstraintSet | null>(null)
    const [run, setRun] = useState<BudgetOptimizationRun | null>(null)
    const [targetPercent, setTargetPercent] = useState(0)
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)
    const [error, setError] = useState('')
    const pendingCommand = useRef<{key: string; body: GenerateBudgetOptimizationRequest} | null>(null)
    const generationLock = useRef(false)

    const load = useCallback(async (signal?: AbortSignal) => {
        try {
            const [latestPlan, latestConstraints, latestRun] = await Promise.all([
                getBudgetPlan(plan.id, signal),
                getBudgetConstraints(plan.id, signal),
                getLatestBudgetOptimization(plan.id, signal),
            ])
            if (signal?.aborted) return
            setCurrentPlan(latestPlan)
            setConstraints(latestConstraints)
            setRun(latestRun)
            const floor = latestConstraints.savingsFloorAmount
            const max = Math.max(floor, latestConstraints.feasibility.maximumSavingsAmount)
            const target = latestRun?.input.targetSavingsAmount ?? floor
            setTargetPercent(max > floor ? Math.round(Math.max(0, Math.min(100, (target - floor) / (max - floor) * 100))) : 0)
            pendingCommand.current = null
            setError('')
        } catch (caught) {
            if (signal?.aborted || (caught instanceof Error && caught.name === 'AbortError')) return
            setError(caught instanceof Error ? caught.message : c.loadError)
        } finally {
            if (!signal?.aborted) setLoading(false)
        }
    }, [plan.id, c.loadError])

    useEffect(() => {
        const controller = new AbortController()
        void load(controller.signal)
        return () => controller.abort()
    }, [load])

    const floor = constraints?.savingsFloorAmount ?? 0
    const maximum = Math.max(floor, constraints?.feasibility.maximumSavingsAmount ?? floor)
    const target = round4(floor + (maximum - floor) * targetPercent / 100)
    const income = constraints?.feasibility.forecastIncome ?? 0
    const required = constraints?.feasibility.requiredAmount ?? 0
    const capacity = Math.max(0, round4(income - required - target))
    const ready = currentPlan.status === 'DRAFT' && currentPlan.capabilities.canRunOptimization && currentPlan.forecast.status === 'CURRENT' && constraints?.status === 'CONFIRMED' && constraints.feasibility.status === 'FEASIBLE' && constraints.revision != null && constraints.revision === currentPlan.constraints.revision && constraints.basedOnForecastRevision === currentPlan.forecast.revision
    const sameTarget = run != null && Math.abs(run.input.targetSavingsAmount - target) < 0.00001 && run.input.forecastRevision === currentPlan.forecast.revision && run.input.constraintsRevision === constraints?.revision
    const displayedRun = sameTarget ? run : null
    const result = displayedRun?.status === 'GENERATED' ? displayedRun.result : null
    const canReview = result != null && displayedRun != null && ready && currentPlan.currentOptimization?.id === displayedRun.id && displayedRun.planVersion === currentPlan.version && displayedRun.constraintChecks.length > 0 && displayedRun.constraintChecks.every((check) => check.satisfied) && displayedRun.violations.length === 0
    const currentTotal = displayedRun?.decisions.reduce((sum, decision) => sum + decision.currentLimit, 0) ?? 0
    const errorText = (caught: unknown) => caught instanceof Error ? caught.message : c.loadError

    const generate = async () => {
        if (!ready || generating || generationLock.current || constraints?.revision == null || currentPlan.forecast.revision == null) return
        generationLock.current = true
        setGenerating(true)
        setError('')
        try {
            const fresh = await getBudgetPlan(plan.id)
            setCurrentPlan(fresh)
            if (fresh.status !== 'DRAFT' || !fresh.capabilities.canRunOptimization || fresh.forecast.revision !== constraints.basedOnForecastRevision || fresh.constraints.revision !== constraints.revision) {
                pendingCommand.current = null
                setError(c.invalid)
                return
            }
            const body: GenerateBudgetOptimizationRequest = {expectedVersion: fresh.version, forecastRevision: fresh.forecast.revision, constraintsRevision: constraints.revision, targetSavingsAmount: target}
            const existing = pendingCommand.current
            const command = existing && existing.body.targetSavingsAmount === body.targetSavingsAmount && existing.body.forecastRevision === body.forecastRevision && existing.body.constraintsRevision === body.constraintsRevision ? existing : {key: crypto.randomUUID(), body}
            pendingCommand.current = command
            const generated = await generateBudgetOptimization(plan.id, command.body, command.key)
            setRun(generated)
            setCurrentPlan((previous) => ({...previous, version: generated.planVersion, currentStep: generated.status === 'GENERATED' ? 'REVIEW' : 'OPTIMIZE', currentOptimization: {id: generated.id, status: generated.status, targetSavingsAmount: generated.input.targetSavingsAmount, actualSavingsAmount: generated.result?.actualSavings ?? null, createdAt: generated.createdAt}}))
            pendingCommand.current = null
        } catch (caught) {
            setError(errorText(caught))
            // Preserve the idempotency key for an uncertain server response.
        } finally {
            generationLock.current = false
            setGenerating(false)
        }
    }

    const changeTarget = (percent: number) => {
        setTargetPercent(percent)
        pendingCommand.current = null
        setError('')
    }
    const retry = () => {
        setLoading(true)
        void load()
    }
    const renderViolation = (violation: BudgetPlanningViolation, index: number) => <li key={`${violation.code}-${index}`}>
        <strong>{violation.code.replaceAll('_', ' ')}</strong>
        {violation.shortfall != null && <span>{c.shortfall}: {money(violation.shortfall, currency, locale)}</span>}
        {violation.requiredAmount != null && <span>{c.requiredAmount}: {money(violation.requiredAmount, currency, locale)}</span>}
        {violation.availableAmount != null && <span>{c.actual}: {money(violation.availableAmount, currency, locale)}</span>}
    </li>

    if (loading) return <div className="budget-state"><LoadingIndicator label={c.loading} layout="panel" showLabel size="medium"/></div>
    if (!constraints) return <div className="budget-state error" role="alert">{error || c.loadError}<button type="button" onClick={retry}>{c.retry}</button><button type="button" onClick={onBack}>{c.back}</button></div>

    return <div className="optimize-step"><div className="optimize-layout"><div className="optimize-primary">
        <section className="forecast-summary optimize-summary" aria-label={c.income}>
            <article><span className="green"><Icon name="cash"/></span><p>{c.income}</p><strong>{money(income, currency, locale)}</strong><small>{c.confirmed}</small></article>
            <article><span className="blue"><Icon name="shield"/></span><p>{c.protected}</p><strong>{money(required, currency, locale)}</strong><small>{c.confirmed}</small></article>
            <article><span className="gold"><Icon name="wallet"/></span><p>{c.capacity}</p><strong>{money(capacity, currency, locale)}</strong><small>{c.atTarget}</small></article>
        </section>
        <section className="optimize-card optimize-target"><header><Icon name="piggy-bank"/><h2>{c.target}</h2></header><p>{c.targetHelp}</p>
            <div className="optimize-target-metrics"><div className="optimize-target-current"><span>{c.selected}</span><strong aria-live="polite">{money(target, currency, locale)}</strong></div><div className="optimize-target-preview"><span>{c.capacity}</span><strong aria-live="polite">{money(capacity, currency, locale)}</strong></div></div>
            <input className="optimize-slider" type="range" min={0} max={100} step={1} value={targetPercent} onChange={(event) => changeTarget(Number(event.target.value))} disabled={!ready || generating || maximum <= floor} aria-label={c.selected} aria-valuetext={money(target, currency, locale)} style={{'--slider-progress': `${targetPercent}%`} as CSSProperties}/>
            <div className="optimize-slider-bounds"><span><small>{c.floor}</small><strong>{money(floor, currency, locale)}</strong></span><span><small>{c.max}</small><strong>{money(maximum, currency, locale)}</strong></span></div><small className="optimize-target-notice">{c.targetNote}</small>
        </section>
        <section className="optimize-card optimize-options"><header><div><h2>{c.options}</h2><p>{c.optionsHelp}</p></div></header><div className="optimize-options-scroll"><table><thead><tr><th>{c.category}</th><th>{c.priority}</th><th>{c.minimum}</th><th>{c.balanced}</th><th>{c.comfortable}</th></tr></thead><tbody>{constraints.categories.map((category) => {
            const fixed = category.allocationType === 'FIXED'
            const priority = (category.priority ?? 'LOW').toLowerCase() as 'high' | 'medium' | 'low'
            return <tr key={category.category.id}><td><div className="optimize-category"><span style={{color: category.category.color}}><Icon name={iconName(category.category.icon)}/></span><div><strong>{category.category.name}</strong><small>{fixed ? c.fixed : c.flexible}</small></div></div></td><td>{fixed ? <span className="optimize-priority fixed"><Icon name="lock"/>{c.fixed}</span> : <span className={`optimize-priority ${priority}`}>{c[priority]}</span>}</td>{(['MINIMUM', 'BALANCED', 'COMFORTABLE'] as const).map((level) => <td key={level}>{fixed ? (level === 'MINIMUM' ? money(category.requiredAmount, currency, locale) : '—') : levelAmount(category, level) == null ? '—' : money(levelAmount(category, level)!, currency, locale)}</td>)}</tr>
        })}</tbody></table>{constraints.categories.length === 0 && <p className="optimize-empty">{c.empty}</p>}</div></section>
        <section className="optimize-card optimize-live-results"><header><Icon name="target"/><h2>{c.results}</h2></header>
            {result && displayedRun ? <><p>{c.resultsHelp}</p><div className="optimize-options-scroll"><table><thead><tr><th>{c.category}</th><th>{c.selectedLevel}</th><th>{c.current}</th><th>{c.recommended}</th><th>{c.change}</th></tr></thead><tbody>{displayedRun.decisions.map((decision) => <tr key={decision.category.id}><td><strong>{decision.category.name}</strong></td><td><span className="optimize-selected-level">{labelLevel(decision.selectedLevel, c)}</span></td><td>{money(decision.currentLimit, currency, locale)}</td><td><strong>{money(decision.recommendedLimit, currency, locale)}</strong></td><td className={decision.change > 0 ? 'optimize-positive-change' : decision.change < 0 ? 'optimize-negative-change' : ''}>{decision.change > 0 ? '+' : ''}{money(decision.change, currency, locale)}</td></tr>)}</tbody></table></div></> : <p className="optimize-result-message" role="status">{run && !sameTarget ? c.changed : displayedRun?.status === 'INFEASIBLE' ? c.infeasible : displayedRun?.status === 'STALE' ? c.stale : displayedRun?.status === 'DISMISSED' ? c.dismissed : c.noRun}</p>}
        </section>
        {result && <section className="optimize-card optimize-live-comparison"><header><Icon name="trend-up"/><h2>{c.beforeAfter}</h2></header><div className="optimize-metrics-grid">{([[c.currentTotal, currentTotal], [c.newTotal, result.totalAllocation], [c.targetSavings, result.targetSavings], [c.actualSavings, result.actualSavings], [c.extraSavings, result.additionalSavingsComparedWithCurrent], [c.unused, result.unusedCapacity]] as [string, number][]).map(([label, amount]) => <div key={label}><span>{label}</span><strong>{money(amount, currency, locale)}</strong></div>)}<div><span>{c.coverage}</span><strong>{new Intl.NumberFormat(locale, {style: 'percent', maximumFractionDigits: 1}).format(result.coverageScore)}</strong></div></div></section>}
    </div><aside className="optimize-insights">
        <section className="optimize-card optimize-objective"><div className="optimize-objective-head"><div><Icon name="target"/><h2>{c.objective}</h2></div><span className="optimize-objective-label">MCKP · v1</span></div><h3>{c.objectiveTitle}</h3><p>{c.objectiveHelp}</p><div className="optimize-objective-weights"><span><b>{c.weights}</b></span></div></section>
        <section className="optimize-card optimize-readiness"><header><Icon name="check-circle"/><h2>{c.readiness}</h2></header><span className={`optimize-readiness-badge ${ready ? 'ready' : 'blocked'}`}>{ready ? c.feasible : c.notReady}</span><p>{ready ? c.ready : c.blocked}</p><div className="optimize-capacity"><span>{c.capacity}</span><strong>{money(capacity, currency, locale)}</strong><small>{c.atTarget}</small></div></section>
        <section className="optimize-card optimize-live-checks"><header><Icon name="shield"/><h2>{c.checks}</h2></header><p>{c.checksHelp}</p>{displayedRun ? <>{displayedRun.constraintChecks.length > 0 && <ul className="optimize-check-list">{displayedRun.constraintChecks.map((check) => <li key={check.code}><span className={check.satisfied ? 'optimize-check-ok' : 'optimize-check-failed'}><Icon name={check.satisfied ? 'check-circle' : 'alert'}/></span><div><strong>{labelCheck(check.code, c)}</strong><small>{c.actual}: {money(check.actual, currency, locale)} · {c.requiredAmount}: {money(check.required, currency, locale)}</small></div><b>{check.satisfied ? c.satisfied : c.failed}</b></li>)}</ul>}{displayedRun.violations.length > 0 && <ul className="optimize-violations">{displayedRun.violations.map(renderViolation)}</ul>}{displayedRun.constraintChecks.length === 0 && displayedRun.violations.length === 0 && <p>{c.noRun}</p>}</> : <p>{run && !sameTarget ? c.changed : c.noRun}</p>}</section>
    </aside></div>
        {error && <div className="budget-action-error" role="alert">{error}</div>}
        <footer className="optimize-footer"><button type="button" className="secondary" disabled={generating} onClick={onBack}><Icon name="arrow-down-left"/>{c.back}</button><div/><button type="button" className="primary" disabled={!ready || generating} onClick={() => void generate()}>{generating ? c.generating : run ? c.regenerate : c.generate}</button><span className="optimize-disabled-action" title={!canReview ? c.reviewUnavailable : undefined}><button type="button" className="secondary" disabled={!canReview || generating} onClick={() => {if (displayedRun) onReview(displayedRun.id)}}>{c.review}<Icon name="arrow-right"/></button></span></footer>
    </div>
}
