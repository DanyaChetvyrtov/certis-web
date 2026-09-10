import {Cell, Pie, PieChart, ResponsiveContainer} from 'recharts'
import {useTranslation} from 'react-i18next'
import {Link} from 'react-router-dom'
import {Icon} from '../../../components/Icons'
import {LoadingIndicator} from '../../../components/LoadingIndicator'
import {useLanguage} from '../../../i18n/useLanguage'
import type {Currency} from '../../../shared/currency'
import type {
    CategoryAnalytics,
} from '../../categories/api/categoriesApi'
import type {
    DashboardCategoryAnalyticsLoadState,
} from '../hooks/useDashboardCategoryAnalytics'

type CategorySpendingPanelsProps = {
    analytics: CategoryAnalytics | null
    currency: Currency
    loadState: DashboardCategoryAnalyticsLoadState
    onRetry: () => void
}

type SpendingSlice = {
    id: string
    name: string
    amount: number
    percentage: number
    color: string
}

const OTHER_COLOR = '#7f9ab5'
const ROUNDING_TOLERANCE = 0.005

const positiveAmount = (value: number): number => {
    const amount = Number(value)

    return Number.isFinite(amount) && amount > 0 ? amount : 0
}

const buildSpendingSlices = (
    analytics: CategoryAnalytics,
    otherLabel: string,
): SpendingSlice[] => {
    const total = positiveAmount(analytics.totalSum)
    const topCategories = analytics.topExpenseCategories
        .map((category) => ({
            id: category.categoryId,
            name: category.name,
            amount: positiveAmount(category.amount),
            percentage: Math.min(
                100,
                Math.max(0, Number(category.sharePercentage) || 0),
            ),
            color: category.color || OTHER_COLOR,
        }))
        .filter((category) => category.amount > 0)

    const topCategoryTotal = topCategories.reduce(
        (sum, category) => sum + category.amount,
        0,
    )
    const otherAmount = Math.max(0, total - topCategoryTotal)

    if (otherAmount > ROUNDING_TOLERANCE) {
        topCategories.push({
            id: 'other',
            name: otherLabel,
            amount: otherAmount,
            percentage: total > 0 ? otherAmount / total * 100 : 0,
            color: OTHER_COLOR,
        })
    }

    return topCategories
}

export function CategorySpendingPanels({
    analytics,
    currency,
    loadState,
    onRetry,
}: CategorySpendingPanelsProps) {
    const {t} = useTranslation()
    const {locale} = useLanguage()
    const money = (value: number) => new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        currencyDisplay: 'narrowSymbol',
        minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
        maximumFractionDigits: 2,
    }).format(value)
    const percentage = (value: number) => new Intl.NumberFormat(locale, {
        maximumFractionDigits: 1,
    }).format(value)
    const total = analytics ? positiveAmount(analytics.totalSum) : 0
    const slices = analytics
        ? buildSpendingSlices(
            analytics,
            t('dashboard.categoryAnalytics.other'),
        )
        : []

    return (
        <section
            className="dashboard-category-insights-grid"
            aria-label={t('dashboard.categoryAnalytics.label')}
        >
            <article className="dashboard-panel dashboard-category-panel category-over-time-panel">
                <header className="dashboard-category-header">
                    <div>
                        <h2>{t('dashboard.categoryAnalytics.overTimeTitle')}</h2>
                        <p>
                            {t('dashboard.categoryAnalytics.monthlyComposition', {
                                currency,
                            })}
                        </p>
                    </div>
                    <span>{t('dashboard.categoryAnalytics.comingSoon')}</span>
                </header>

                <div className="category-over-time-placeholder">
                    <span><Icon name="trend-up"/></span>
                    <strong>{t('dashboard.categoryAnalytics.historyPending')}</strong>
                    <p>{t('dashboard.categoryAnalytics.historyPendingDescription')}</p>
                </div>
            </article>

            <article className="dashboard-panel dashboard-category-panel spending-by-category-panel">
                <header className="dashboard-category-header">
                    <div>
                        <h2>{t('dashboard.categoryAnalytics.spendingTitle')}</h2>
                        <p>
                            {t('dashboard.categoryAnalytics.expenseShare', {
                                currency,
                            })}
                        </p>
                    </div>
                    <Link to="/categories">
                        {t('dashboard.viewAll')}
                        <Icon name="chevron-right"/>
                    </Link>
                </header>

                {(loadState === 'idle' || loadState === 'loading') && (
                    <LoadingIndicator
                        label={t('dashboard.categoryAnalytics.loading')}
                        layout="panel"
                        showLabel
                        size="medium"
                    />
                )}

                {loadState === 'error' && (
                    <div className="category-spending-state error" role="alert">
                        <Icon name="alert"/>
                        <p>{t('dashboard.categoryAnalytics.error')}</p>
                        <button type="button" onClick={onRetry}>
                            {t('dashboard.tryAgain')}
                        </button>
                    </div>
                )}

                {loadState === 'ready' && analytics && total === 0 && (
                    <div className="category-spending-state empty">
                        <Icon name="categories"/>
                        <strong>{t('dashboard.categoryAnalytics.noSpending')}</strong>
                        <p>{t('dashboard.categoryAnalytics.noSpendingDescription')}</p>
                    </div>
                )}

                {loadState === 'ready' && analytics && total > 0 && (
                    <div className="spending-by-category-content">
                        <div
                            className="spending-category-donut"
                            role="img"
                            aria-label={t('dashboard.categoryAnalytics.chartLabel', {
                                amount: money(total),
                            })}
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart accessibilityLayer>
                                    <Pie
                                        data={slices}
                                        dataKey="amount"
                                        nameKey="name"
                                        innerRadius="67%"
                                        outerRadius="88%"
                                        paddingAngle={1.5}
                                        stroke="none"
                                        isAnimationActive={false}
                                    >
                                        {slices.map((slice) => (
                                            <Cell key={slice.id} fill={slice.color}/>
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <span className="spending-category-donut-value">
                                <strong>{money(total)}</strong>
                                <small>{t('dashboard.categoryAnalytics.spent')}</small>
                            </span>
                        </div>

                        <ol className="dashboard-category-breakdown">
                            {slices.map((slice) => (
                                <li
                                    key={slice.id}
                                    aria-label={t('dashboard.categoryAnalytics.itemLabel', {
                                        name: slice.name,
                                        amount: money(slice.amount),
                                        percentage: percentage(slice.percentage),
                                    })}
                                >
                                    <i style={{backgroundColor: slice.color}}/>
                                    <strong>{slice.name}</strong>
                                    <span>{money(slice.amount)}</span>
                                    <b>{percentage(slice.percentage)}%</b>
                                </li>
                            ))}
                        </ol>
                    </div>
                )}
            </article>
        </section>
    )
}
