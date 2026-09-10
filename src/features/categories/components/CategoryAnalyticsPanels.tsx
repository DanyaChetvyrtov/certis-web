import type {CSSProperties} from 'react'
import {useTranslation} from 'react-i18next'
import {Icon} from '../../../components/Icons'
import type {Currency} from '../../../shared/currency'
import type {
    CategoryAnalytics,
    CategoryType,
} from '../api/categoriesApi'
import type {
    CategoryAnalyticsLoadState,
} from '../hooks/useCategoryAnalytics'
import './CategoryAnalyticsPanels.css'
import {useLanguage} from '../../../i18n/useLanguage'

type CategoryAnalyticsPanelsProps = {
    analytics: CategoryAnalytics | null
    currency: Currency
    loadError: string
    loadState: CategoryAnalyticsLoadState
    selectedType: CategoryType
    showCreateCategory: boolean
    onAddCategory: (restoreFocusTarget: HTMLButtonElement) => void
    onReviewUncategorized: (
        restoreFocusTarget: HTMLButtonElement,
    ) => void
    onRetry: () => void
}

type CategoryBarStyle = CSSProperties & {
    '--analytics-accent': string
    '--analytics-progress': string
}

const formatPercentage = (value: number, locale: string): string =>
    new Intl.NumberFormat(locale, {
        maximumFractionDigits: 1,
    }).format(value)

const progressStyle = (
    color: string,
    percentage: number,
): CategoryBarStyle => ({
    '--analytics-accent': color,
    '--analytics-progress': `${Math.min(Math.max(percentage, 0), 100)}%`,
})

function AnalyticsLoadingState() {
    const {t} = useTranslation()

    return (
        <div
            className="category-analytics-loading"
            aria-label={t('categories.analytics.loading')}
        >
            <span/>
            <span/>
            <span/>
        </div>
    )
}

function AnalyticsErrorState({
    message,
    onRetry,
}: {
    message: string
    onRetry: () => void
}) {
    const {t} = useTranslation()

    return (
        <div className="category-analytics-error" role="alert">
            <Icon name="alert"/>
            <p>{message}</p>
            <button type="button" onClick={onRetry}>
                {t('categories.tryAgain')}
            </button>
        </div>
    )
}

export function CategoryAnalyticsPanels({
    analytics,
    currency,
    loadError,
    loadState,
    selectedType,
    showCreateCategory,
    onAddCategory,
    onReviewUncategorized,
    onRetry,
}: CategoryAnalyticsPanelsProps) {
    const {t} = useTranslation()
    const {locale} = useLanguage()
    const type = selectedType === 'EXPENSE'
        ? t('categories.type.expenseLower')
        : t('categories.type.incomeLower')
    const total = selectedType === 'EXPENSE'
        ? t('categories.analytics.spending')
        : t('categories.analytics.income')
    const percentage = analytics?.coveragePercentage ?? null
    const uncategorizedCount =
        analytics?.uncategorizedTransactionCount ?? 0
    const topCategories = analytics?.topExpenseCategories ?? []

    return (
        <aside
            className="category-insights"
            aria-label={t('categories.analytics.label')}
        >
            <section className="category-analytics-card coverage">
                <header>
                    <h2>{t('categories.analytics.thisMonth')}</h2>
                    <p>
                        {t('categories.analytics.coverage', {
                            type: t(`categories.type.${selectedType}`),
                            currency,
                        })}
                    </p>
                </header>

                {loadState === 'loading' && <AnalyticsLoadingState/>}
                {loadState === 'error' && (
                    <AnalyticsErrorState
                        message={loadError}
                        onRetry={onRetry}
                    />
                )}
                {loadState === 'ready' && analytics && (
                    <div className="category-coverage-content">
                        {percentage === null ? (
                            <>
                                <strong>—</strong>
                                <p>
                                    {t('categories.analytics.noTransactions', {type})}
                                </p>
                            </>
                        ) : (
                            <>
                                <strong>
                                    {formatPercentage(percentage, locale)}%
                                </strong>
                                <p>{t('categories.analytics.categorizedValue')}</p>
                            </>
                        )}

                        <div
                            className="category-coverage-progress"
                            role="progressbar"
                            aria-label={t('categories.analytics.coverageLabel', {type})}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={percentage ?? 0}
                            style={progressStyle(
                                '#0abb88',
                                percentage ?? 0,
                            )}
                        >
                            <span/>
                        </div>

                        {analytics.totalTransactionCount > 0 && (
                            uncategorizedCount > 0 ? (
                                <button
                                    type="button"
                                    className="category-coverage-notice warning"
                                    aria-label={t('categories.analytics.categorize', {count: uncategorizedCount})}
                                    onClick={(event) =>
                                        onReviewUncategorized(
                                            event.currentTarget,
                                        )
                                    }
                                >
                                    <Icon name="alert"/>
                                    <span>
                                        {t('categories.analytics.needsCategory', {count: uncategorizedCount})}
                                    </span>
                                    <Icon name="chevron-right"/>
                                </button>
                            ) : (
                                <div className="category-coverage-notice complete">
                                    <Icon name="check-circle"/>
                                    <span>{t('categories.analytics.allCategorized')}</span>
                                </div>
                            )
                        )}
                    </div>
                )}
            </section>

            <section className="category-analytics-card top-categories">
                <header>
                    <h2>{t('categories.analytics.top', {type})}</h2>
                    <p>{t('categories.analytics.shareTotal', {total})}</p>
                </header>

                {loadState === 'loading' && <AnalyticsLoadingState/>}
                {loadState === 'error' && (
                    <AnalyticsErrorState
                        message={loadError}
                        onRetry={onRetry}
                    />
                )}
                {loadState === 'ready' && analytics && (
                    topCategories.length > 0 ? (
                        <ol className="top-category-list">
                            {topCategories.map((category) => (
                                <li
                                    key={category.categoryId}
                                    style={progressStyle(
                                        category.color,
                                        category.sharePercentage,
                                    )}
                                >
                                    <div>
                                        <span/>
                                        <strong>{category.name}</strong>
                                        <b>
                                            {formatPercentage(
                                                category.sharePercentage,
                                                locale,
                                            )}%
                                        </b>
                                    </div>
                                    <div
                                        className="top-category-progress"
                                        role="progressbar"
                                        aria-label={t('categories.analytics.shareLabel', {
                                            name: category.name,
                                            total,
                                        })}
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                        aria-valuenow={category.sharePercentage}
                                    >
                                        <span/>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <div className="top-categories-empty">
                            <Icon name="categories"/>
                            <p>
                                {t('categories.analytics.noCategorized', {type})}
                            </p>
                        </div>
                    )
                )}
            </section>

            {showCreateCategory && (
                <section className="category-create-card">
                    <span><Icon name="tag"/></span>
                    <div>
                        <h2>{t('categories.analytics.needAnother')}</h2>
                        <p>{t('categories.analytics.createDescription')}</p>
                    </div>
                    <button
                        type="button"
                        onClick={(event) =>
                            onAddCategory(event.currentTarget)
                        }
                    >
                        <Icon name="plus"/>
                        {t('categories.addCategory')}
                    </button>
                </section>
            )}
        </aside>
    )
}
