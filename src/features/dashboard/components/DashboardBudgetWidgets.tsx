import type {CSSProperties} from 'react'
import {Link} from 'react-router-dom'
import {useTranslation} from 'react-i18next'
import {Icon} from '../../../components/Icons'
import type {IconName} from '../../../components/Icons'
import {LoadingIndicator} from '../../../components/LoadingIndicator'
import {useLanguage} from '../../../i18n/useLanguage'
import type {Currency} from '../../../shared/currency'
import type {BudgetAllocation} from '../../budgets/api/budgetsApi'
import {BudgetRing} from './BudgetRing'
import {allocationUtilization, budgetOverview, topBudgetCategories} from '../utils/budgetOverview'
import type {useDashboardBudget} from '../hooks/useDashboardBudget'
import './DashboardBudgetWidgets.css'

type BudgetData = ReturnType<typeof useDashboardBudget>

type Props = {
    data: BudgetData
    currency: Currency
}

const copy = {
    en: {
        planned: 'Planned savings target for this month',
        savedOutOfIncome: '{{savings}} of {{income}} planned income',
        noBudget: 'Set a monthly budget to see your planned savings rate.',
        noIncome: 'Add planned income to calculate the savings rate.',
        unavailableCurrency: 'A budget for this currency is not available.',
        loadError: 'We could not load your monthly budget.',
        loading: 'Loading budget',
        spent: 'Spent',
        remaining: 'Remaining',
        overBudget: 'Over budget',
        totalLimit: 'Total category limits',
        categoryProgress: 'Category spending progress',
        overLimit: 'Over limit',
        noAllocations: 'Add category limits to track your budget here.',
        moreCategories: '+{{count}} more categories',
        create: 'Create a budget',
        retry: 'Try again',
    },
    ru: {
        planned: 'План накоплений на этот месяц',
        savedOutOfIncome: '{{savings}} из {{income}} планового дохода',
        noBudget: 'Создайте месячный бюджет, чтобы видеть плановую долю накоплений.',
        noIncome: 'Укажите плановый доход, чтобы рассчитать долю накоплений.',
        unavailableCurrency: 'Бюджет в выбранной валюте недоступен.',
        loadError: 'Не удалось загрузить месячный бюджет.',
        loading: 'Загружаем бюджет',
        spent: 'Потрачено',
        remaining: 'Осталось',
        overBudget: 'Превышение бюджета',
        totalLimit: 'Сумма лимитов категорий',
        categoryProgress: 'Расходы по категориям',
        overLimit: 'Сверх лимита',
        noAllocations: 'Добавьте лимиты категорий, чтобы видеть их здесь.',
        moreCategories: '+ ещё {{count}} категорий',
        create: 'Создать бюджет',
        retry: 'Повторить',
    },
} as const

const money = (amount: number, currency: Currency, locale: string) => new Intl.NumberFormat(locale, {
    style: 'currency', currency, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 2,
}).format(amount)

const percentage = (amount: number, locale: string) => `${new Intl.NumberFormat(locale, {maximumFractionDigits: 1}).format(amount)}%`

const iconForCategory = (icon: string): IconName => {
    const valid: IconName[] = ['home', 'shopping-cart', 'utensils', 'transport', 'wallet', 'heart', 'gift', 'briefcase', 'repeat', 'categories', 'cash', 'card', 'target']
    return valid.includes(icon as IconName) ? icon as IconName : 'categories'
}

function CategoryRow({allocation, currency, locale, overLimit}: {
    allocation: BudgetAllocation
    currency: Currency
    locale: string
    overLimit: string
}) {
    const usage = allocationUtilization(allocation)
    const over = allocation.spent > allocation.limit
    const barWidth = allocation.limit > 0 ? Math.min(100, Math.max(0, usage ?? 0)) : allocation.spent > 0 ? 100 : 0
    const color = /^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/.test(allocation.categoryColor)
        ? allocation.categoryColor : '#10b981'
    const style = {'--budget-category-color': color} as CSSProperties
    return <li className={`dashboard-budget-category${over ? ' is-over' : ''}`} style={style}>
        <span className="dashboard-budget-category-icon"><Icon name={iconForCategory(allocation.categoryIcon)}/></span>
        <div className="dashboard-budget-category-body">
            <div className="dashboard-budget-category-caption">
                <strong title={allocation.categoryName}>{allocation.categoryName}</strong>
                <small>{money(allocation.spent, currency, locale)} / {money(allocation.limit, currency, locale)}</small>
            </div>
            <div className="dashboard-budget-category-track" role="progressbar"
                aria-label={allocation.categoryName} aria-valuemin={0} aria-valuemax={100}
                aria-valuenow={Math.round(barWidth)} aria-valuetext={usage === null ? overLimit : percentage(usage, locale)}>
                <span style={{width: `${barWidth}%`}}/>
            </div>
        </div>
        <span className="dashboard-budget-category-percent">{usage === null ? (over ? overLimit : '—') : percentage(usage, locale)}</span>
    </li>
}

export function DashboardSavingsRateCard({data, currency}: Props) {
    const {t} = useTranslation()
    const {locale} = useLanguage()
    const c = locale.startsWith('ru') ? copy.ru : copy.en
    const loading = data.loadState === 'loading' || data.loadState === 'idle'
    const summary = data.budget ? budgetOverview(data.budget) : null
    const validIncome = data.budget && data.budget.monthlyIncome > 0
    const value = summary?.plannedSavingsPercentage == null ? '—' : percentage(summary.plannedSavingsPercentage, locale)
    const hint = data.loadState === 'error' ? c.loadError
        : data.loadState === 'currency-mismatch' ? c.unavailableCurrency
            : !data.budget ? c.noBudget
                : !validIncome ? c.noIncome
                    : c.savedOutOfIncome.replace('{{savings}}', money(data.budget.savingsTarget, currency, locale))
                        .replace('{{income}}', money(data.budget.monthlyIncome, currency, locale))

    return <article className="summary-card dashboard-budget-savings-card">
        <div className="summary-card-copy">
            <p>{t('dashboard.savingsRate')}</p>
            {loading ? <LoadingIndicator className="summary-card-loading" label={c.loading} showLabel/>
                : <strong>{value}</strong>}
            <span className="summary-card-hint" title={hint}>{loading ? t('dashboard.fetching') : hint}</span>
            {!loading && data.budget && validIncome && <span className="dashboard-budget-savings-caption">{c.planned}</span>}
        </div>
        <span className="summary-card-icon summary-card-icon-gold"><Icon name="piggy-bank"/></span>
    </article>
}

export function DashboardBudgetOverviewPanel({data, currency}: Props) {
    const {t} = useTranslation()
    const {locale} = useLanguage()
    const c = locale.startsWith('ru') ? copy.ru : copy.en
    const loading = data.loadState === 'loading' || data.loadState === 'idle'
    const summary = data.budget ? budgetOverview(data.budget) : null
    const allocations = data.budget?.allocations ?? []
    const moreCount = Math.max(0, allocations.length - 4)

    return <article className="dashboard-panel budget-panel dashboard-budget-widget">
        <header className="dashboard-panel-header"><div><p>{t('dashboard.thisMonth')}</p><h2>{t('dashboard.budgetOverview')}</h2></div>
            <Link to="/budgets">{t('dashboard.manage')}<Icon name="chevron-right"/></Link>
        </header>
        {loading ? <div className="dashboard-budget-state" aria-live="polite"><LoadingIndicator label={c.loading} showLabel size="medium"/></div>
            : data.loadState === 'error' ? <div className="dashboard-budget-state" role="alert"><p>{c.loadError}</p><button type="button" aria-label={`${c.retry}: ${t('dashboard.budgetOverview')}`} onClick={data.retry}>{c.retry}</button></div>
                : !data.budget || !summary ? <div className="dashboard-budget-state dashboard-budget-empty">
                    <span className="dashboard-budget-empty-icon"><Icon name="piggy-bank"/></span>
                    <strong>{t('dashboard.planMonth')}</strong>
                    <p>{data.loadState === 'currency-mismatch' ? c.unavailableCurrency : t('dashboard.budgetEmpty')}</p>
                    <Link to="/budgets">{c.create}<Icon name="arrow-right"/></Link>
                </div> : <>
                    <div className="dashboard-budget-topline">
                        <BudgetRing percentage={summary.usedPercentage ?? 0}/>
                        <div className="dashboard-budget-total"><span>{t('dashboard.totalBudget')}</span><strong>{money(summary.total, currency, locale)}</strong>
                            <small>{c.totalLimit}</small></div>
                        <div className="dashboard-budget-breakdown"><div><span>{c.spent}</span><strong>{money(summary.spent, currency, locale)}</strong></div>
                            <div className={summary.remaining < 0 ? 'over-budget' : ''}><span>{summary.remaining < 0 ? c.overBudget : c.remaining}</span>
                                <strong>{money(Math.abs(summary.remaining), currency, locale)}</strong></div></div>
                    </div>
                    {allocations.length > 0 ? <>
                        <ul className="dashboard-budget-categories" aria-label={c.categoryProgress}>
                            {topBudgetCategories(allocations).map(allocation => <CategoryRow key={allocation.id} allocation={allocation} currency={currency} locale={locale} overLimit={c.overLimit}/>)}
                        </ul>
                        {moreCount > 0 && <Link className="dashboard-budget-more" to="/budgets">{c.moreCategories.replace('{{count}}', String(moreCount))}<Icon name="chevron-right"/></Link>}
                    </> : <p className="dashboard-budget-no-allocations">{c.noAllocations}</p>}
                </>}
    </article>
}
