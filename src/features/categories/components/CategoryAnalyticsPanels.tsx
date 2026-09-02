import type {CSSProperties} from 'react'
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

const typeCopy: Record<CategoryType, {
    label: string
    noun: string
    total: string
}> = {
    EXPENSE: {
        label: 'Expense',
        noun: 'expense',
        total: 'spending',
    },
    INCOME: {
        label: 'Income',
        noun: 'income',
        total: 'income',
    },
}

const formatPercentage = (value: number): string =>
    new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 1,
    }).format(value)

const transactionLabel = (count: number): string =>
    `${count} ${count === 1 ? 'transaction' : 'transactions'}`

const progressStyle = (
    color: string,
    percentage: number,
): CategoryBarStyle => ({
    '--analytics-accent': color,
    '--analytics-progress': `${Math.min(Math.max(percentage, 0), 100)}%`,
})

function AnalyticsLoadingState() {
    return (
        <div
            className="category-analytics-loading"
            aria-label="Loading category statistics"
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
    return (
        <div className="category-analytics-error" role="alert">
            <Icon name="alert"/>
            <p>{message}</p>
            <button type="button" onClick={onRetry}>
                Try again
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
    const copy = typeCopy[selectedType]
    const percentage = analytics?.coveragePercentage ?? null
    const uncategorizedCount =
        analytics?.uncategorizedTransactionCount ?? 0
    const topCategories = analytics?.topExpenseCategories ?? []

    return (
        <aside
            className="category-insights"
            aria-label="Category statistics"
        >
            <section className="category-analytics-card coverage">
                <header>
                    <h2>This month</h2>
                    <p>
                        {copy.label} category coverage · {currency}
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
                                    No {copy.noun} transactions this month
                                </p>
                            </>
                        ) : (
                            <>
                                <strong>
                                    {formatPercentage(percentage)}%
                                </strong>
                                <p>of transaction value categorized</p>
                            </>
                        )}

                        <div
                            className="category-coverage-progress"
                            role="progressbar"
                            aria-label={`${copy.noun} category coverage`}
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
                                    aria-label={`Categorize ${transactionLabel(uncategorizedCount)}`}
                                    onClick={(event) =>
                                        onReviewUncategorized(
                                            event.currentTarget,
                                        )
                                    }
                                >
                                    <Icon name="alert"/>
                                    <span>
                                        {transactionLabel(uncategorizedCount)} {uncategorizedCount === 1 ? 'needs' : 'need'} a category
                                    </span>
                                    <Icon name="chevron-right"/>
                                </button>
                            ) : (
                                <div className="category-coverage-notice complete">
                                    <Icon name="check-circle"/>
                                    <span>All transactions are categorized</span>
                                </div>
                            )
                        )}
                    </div>
                )}
            </section>

            <section className="category-analytics-card top-categories">
                <header>
                    <h2>Top {copy.noun} categories</h2>
                    <p>Share of total {copy.total}</p>
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
                                            )}%
                                        </b>
                                    </div>
                                    <div
                                        className="top-category-progress"
                                        role="progressbar"
                                        aria-label={`${category.name} share of total ${copy.total}`}
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
                                No categorized {copy.noun} transactions this month.
                            </p>
                        </div>
                    )
                )}
            </section>

            {showCreateCategory && (
                <section className="category-create-card">
                    <span><Icon name="tag"/></span>
                    <div>
                        <h2>Need another category?</h2>
                        <p>
                            Create only what you actually use — the list stays easy to scan.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={(event) =>
                            onAddCategory(event.currentTarget)
                        }
                    >
                        <Icon name="plus"/>
                        Add category
                    </button>
                </section>
            )}
        </aside>
    )
}
