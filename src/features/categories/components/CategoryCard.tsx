import type {CSSProperties} from 'react'
import {Icon} from '../../../components/Icons'
import {
    isCategoryIcon,
} from '../api/categoriesApi'
import type {
    Category,
    CategoryType,
} from '../api/categoriesApi'
import type {CategoryStatus} from './CategoryControls'

type CategoryAccentStyle = CSSProperties & {
    '--category-accent': string
}

type CategoryCardProps = {
    category: Category
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

const categoryTypeLabel: Record<CategoryType, string> = {
    EXPENSE: 'Expense',
    INCOME: 'Income',
}

const accentStyle = (
    color: string,
): CategoryAccentStyle => ({
    '--category-accent': color,
})

export function CategoryCard({
    category,
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
            style={accentStyle(category.color)}
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
                        {categoryTypeLabel[category.type]} category
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

            <div className="category-item-purpose">
                <span/>
                <p>
                    {isArchived
                        ? 'Existing history remains categorized'
                        : 'Ready for transactions and budgets'}
                </p>
            </div>
        </article>
    )
}
