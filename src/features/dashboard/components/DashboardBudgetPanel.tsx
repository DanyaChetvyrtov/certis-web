import {Link} from 'react-router-dom'
import {useTranslation} from 'react-i18next'
import {Icon} from '../../../components/Icons'
import type {IconName} from '../../../components/Icons'
import {LoadingIndicator} from '../../../components/LoadingIndicator'
import type {Budget} from '../../budgets/api/budgetsApi'
import type {Currency} from '../../../shared/currency'
import type {DashboardBudgetLoadState} from '../hooks/useDashboardBudget'
import {dashboardBudgetCopy, formatDashboardMoney, getBudgetUsage} from '../dashboardBudgetPresentation'
import {BudgetRing} from './BudgetRing'
import './DashboardBudgetPanel.css'

const categoryIcon = (icon: string): IconName => {
    const supported: IconName[] = [
        'briefcase', 'cash', 'card', 'home', 'shopping-cart', 'transport',
        'utensils', 'gift', 'heart', 'repeat', 'wallet', 'categories', 'receipt',
    ]

    return supported.includes(icon as IconName) ? icon as IconName : 'categories'
}

export function DashboardBudgetPanel({
    budget,
    loadState,
    currency,
    locale,
}: {
    budget: Budget | null
    loadState: DashboardBudgetLoadState
    currency: Currency
    locale: string
}) {
    const {t} = useTranslation()
    const copy = dashboardBudgetCopy(locale)

    if (loadState === 'loading' || loadState === 'idle') {
        return (
            <article className="dashboard-panel budget-panel dashboard-budget-panel">
                <header className="dashboard-panel-header">
                    <div><p>{t('dashboard.thisMonth')}</p><h2>{t('dashboard.budgetOverview')}</h2></div>
                    <Link to="/budgets">{t('dashboard.manage')}<Icon name="chevron-right"/></Link>
                </header>
                <div className="dashboard-budget-state">
                    <LoadingIndicator label={copy.loadingBudget} showLabel/>
                </div>
            </article>
        )
    }

    if (loadState === 'error') {
        return (
            <article className="dashboard-panel budget-panel dashboard-budget-panel">
                <header className="dashboard-panel-header">
                    <div><p>{t('dashboard.thisMonth')}</p><h2>{t('dashboard.budgetOverview')}</h2></div>
                    <Link to="/budgets">{t('dashboard.manage')}<Icon name="chevron-right"/></Link>
                </header>
                <div className="dashboard-budget-state dashboard-budget-state-error" role="alert">
                    <Icon name="alert"/>
                    <span>{copy.budgetLoadError}</span>
                </div>
            </article>
        )
    }

    if (!budget) {
        return (
            <article className="dashboard-panel budget-panel dashboard-budget-panel">
                <header className="dashboard-panel-header">
                    <div><p>{t('dashboard.thisMonth')}</p><h2>{t('dashboard.budgetOverview')}</h2></div>
                    <Link to="/budgets">{t('dashboard.manage')}<Icon name="chevron-right"/></Link>
                </header>
                <div className="budget-overview">
                    <BudgetRing percentage={0}/>
                    <div>
                        <span>{t('dashboard.totalBudget')}</span>
                        <strong>{formatDashboardMoney(0, currency, locale)}</strong>
                        <small>{t('dashboard.noBudget')}</small>
                    </div>
                </div>
                <div className="dashboard-budget-empty">
                    <strong>{t('dashboard.planMonth')}</strong>
                    <p>{t('dashboard.budgetEmpty')}</p>
                    <Link to="/budgets">{t('dashboard.manage')}<Icon name="chevron-right"/></Link>
                </div>
            </article>
        )
    }

    const usage = getBudgetUsage(budget)
    const allocations = budget.allocations.slice(0, 4)

    return (
        <article className="dashboard-panel budget-panel dashboard-budget-panel">
            <header className="dashboard-panel-header">
                <div><p>{t('dashboard.thisMonth')}</p><h2>{t('dashboard.budgetOverview')}</h2></div>
                <Link to="/budgets">{t('dashboard.manage')}<Icon name="chevron-right"/></Link>
            </header>

            <div className="dashboard-budget-overview">
                <BudgetRing percentage={usage.percentage}/>
                <dl className="dashboard-budget-totals">
                    <div className="dashboard-budget-total-main">
                        <dt>{t('dashboard.totalBudget')}</dt>
                        <dd>{formatDashboardMoney(usage.totalBudget, currency, locale)}</dd>
                    </div>
                    <div>
                        <dt>{copy.spent}</dt>
                        <dd>{formatDashboardMoney(usage.spent, currency, locale)}</dd>
                    </div>
                    <div>
                        <dt>{copy.remaining}</dt>
                        <dd className="positive">{formatDashboardMoney(usage.remaining, currency, locale)}</dd>
                    </div>
                </dl>
            </div>

            <div className="dashboard-budget-progress" aria-label={copy.categoryProgress}>
                {allocations.length === 0 && <p className="dashboard-budget-no-allocations">{copy.noAllocations}</p>}
                {allocations.map((allocation) => {
                    const limit = Number(allocation.limit)
                    const spent = Number(allocation.spent)
                    const percentage = limit > 0 ? Math.round(spent / limit * 100) : 0
                    const barPercentage = Math.min(100, Math.max(0, percentage))

                    return (
                        <div className="dashboard-budget-category" key={allocation.id}>
                            <span className="dashboard-budget-category-icon" style={{color: allocation.categoryColor}}>
                                <Icon name={categoryIcon(allocation.categoryIcon)}/>
                            </span>
                            <div className="dashboard-budget-category-main">
                                <div className="dashboard-budget-category-copy">
                                    <strong>{allocation.categoryName}</strong>
                                    <span>{formatDashboardMoney(spent, currency, locale)} / {formatDashboardMoney(limit, currency, locale)}</span>
                                </div>
                                <span className="dashboard-budget-category-track">
                                    <i className={`status-${allocation.status.toLowerCase()}`} style={{width: `${barPercentage}%`, backgroundColor: allocation.categoryColor}}/>
                                </span>
                            </div>
                            <div className={`dashboard-budget-category-percent status-${allocation.status.toLowerCase()}`}>
                                <strong>{percentage}%</strong>
                                <small>{copy.ofLimit}</small>
                            </div>
                        </div>
                    )
                })}
                {budget.allocations.length > allocations.length && (
                    <Link className="dashboard-budget-more" to="/budgets">
                        +{budget.allocations.length - allocations.length} {t('dashboard.categoryAnalytics.other').toLowerCase()}
                    </Link>
                )}
            </div>
        </article>
    )
}
