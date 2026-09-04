import type {CSSProperties} from 'react'
import {Icon} from '../../../components/Icons'
import type {Currency} from '../../../shared/currency'
import {
    isCategoryIcon,
} from '../api/categoriesApi'
import type {
    Category,
    CategoryCard as CategoryCardModel,
} from '../api/categoriesApi'
import type {CategoryStatus} from './CategoryControls'

type CategoryAccentStyle = CSSProperties & {
    '--category-accent': string
    '--category-progress': string
}

type CategoryCardProps = {
    category: CategoryCardModel
    currency: Currency
    isRestoring: boolean
    status: CategoryStatus
    onArchive: (
        category: Category,
        restoreFocusTarget: HTMLButtonElement,
    ) => void
    onEdit: (
        category: Category,
        restoreFocusTarget: HTMLButtonElement,
    ) => void
    onRestore: (category: Category) => void
}

const accentStyle = (
    color: string,
    percentage: number,
): CategoryAccentStyle => ({
    '--category-accent': color,
    '--category-progress': `${Math.min(Math.max(percentage, 0), 100)}%`,
})

const formatMoney = (
    amount: number,
    currency: Currency,
): string =>
    new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        currencyDisplay: 'narrowSymbol',
        maximumFractionDigits: 0,
    }).format(amount)

const formatTransactionCount = (count: number): string =>
    `${count} ${count === 1 ? 'transaction' : 'transactions'}`

export function CategoryCard({
    category,
    currency,
    isRestoring,
    status,
    onArchive,
    onEdit,
    onRestore,
}: CategoryCardProps) {
    const isArchived = status === 'ARCHIVED'

    return (
        <article
            className={
                isArchived
                    ? 'category-item archived'
                    : 'category-item'
            }
            style={accentStyle(
                category.color,
                category.monthlySharePercentage,
            )}
        >
            <div className="category-item-heading">
                <span className="category-item-icon">
                    <Icon
                        name={
                            isCategoryIcon(category.icon)
                                ? category.icon
                                : 'tag'
                        }
                    />
                </span>
                <div className="category-item-copy">
                    <h3>{category.name}</h3>
                    <p>
                        {formatTransactionCount(
                            category.monthlyTransactionCount,
                        )}
                    </p>
                </div>
                <div className="category-item-actions">
                    {!isArchived && (
                        <button
                            className="category-item-action edit"
                            type="button"
                            aria-label={`Edit ${category.name}`}
                            onClick={(event) =>
                                onEdit(category, event.currentTarget)
                            }
                        >
                            <Icon name="edit"/>
                            Edit
                        </button>
                    )}
                    <button
                        className={
                            isArchived
                                ? 'category-item-action restore'
                                : 'category-item-action archive'
                        }
                        type="button"
                        disabled={isRestoring}
                        aria-label={
                            isArchived
                                ? `Restore ${category.name}`
                                : `Archive ${category.name}`
                        }
                        onClick={(event) => {
                            if (isArchived) {
                                onRestore(category)
                                return
                            }

                            onArchive(category, event.currentTarget)
                        }}
                    >
                        <Icon
                            name={isArchived ? 'repeat' : 'trash'}
                        />
                        {isArchived
                            ? isRestoring
                                ? 'Restoring…'
                                : 'Restore'
                            : 'Archive'}
                    </button>
                </div>
            </div>

            <div className="category-item-stats">
                <span>This month</span>
                <div>
                    <strong>
                        {formatMoney(category.monthlyAmount, currency)}
                    </strong>
                    <b>
                        {category.monthlySharePercentage.toFixed(0)}%
                    </b>
                </div>
                <div
                    className="category-item-progress"
                    role="progressbar"
                    aria-label={`${category.name} share this month`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={category.monthlySharePercentage}
                >
                    <span/>
                </div>
            </div>

            {isArchived && (
                <p className="category-item-archive-note">
                    Existing history remains categorized
                </p>
            )}
        </article>
    )
}
